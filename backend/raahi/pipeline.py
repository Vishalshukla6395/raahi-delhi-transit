import json
from collections import Counter
from pathlib import Path
import pandas as pd
from .config import RAW, PROCESSED, REPORTS, ROOT
from .network import Network
from .model import fit


def model_routes():
    frame = pd.read_parquet(PROCESSED / "route_daily.parquet").rename(
        columns={"route_key": "key"}
    )
    variants = [fit(frame, m) for m in (15, 30)]
    # Compare WAPE because absolute MAE has different units with different bin widths.
    selected = min(variants, key=lambda m: m["evaluation"]["seasonal"]["wape"])
    (PROCESSED / "route-model.json").write_text(
        json.dumps(selected, separators=(",", ":")), encoding="utf-8"
    )
    evaluations = [m["evaluation"] for m in variants]
    (REPORTS / "validation.json").write_text(
        json.dumps(
            dict(
                scope="Route-level ticket demand; segment metrics are reported separately",
                selected_minutes=selected["minutes"],
                variants=evaluations,
            ),
            indent=2,
        ),
        encoding="utf-8",
    )
    doc = "# Model validation\n\nExecuted on all valid October ticket records. This is validation of a transaction-derived demand proxy, not occupancy accuracy.\n\n"
    doc += "Chronological first 75% of source dates train the candidate models; remaining dates are validation. No random split. The same validation period selects time-bin width, so it is not an untouched final test set.\n\n"
    doc += "Baseline: each route's training-period mean across all bins. Candidate: day-type/time-slot mean shrunk toward the all-day slot mean with three pseudo-days. Zero bins are included.\n\n"
    doc += "| Bin | Model | MAE (sampled passengers/bin) | WAPE | Spearman rank | Cells |\n|---|---|---:|---:|---:|---:|\n"
    for e in evaluations:
        for name in ("baseline", "same_slot", "seasonal"):
            v = e[name]
            doc += f"| {e['minutes']} min | {name} | {v['mae']} | {v['wape']} | {v['rank_correlation']} | {v['cells']} |\n"
    doc += f"\nSelected bin: {selected['minutes']} minutes using lower WAPE. MAE across different bin widths is not directly comparable.\n\n"
    doc += (
        "Train dates: "
        + ", ".join(evaluations[0]["train_dates"])
        + "\n\nValidation dates: "
        + ", ".join(evaluations[0]["validation_dates"])
        + "\n\n"
    )
    doc += "The deployed profile is refit on all source dates. Route profiles include no service denominator. Future-date predictions assume October weekly patterns persist; holidays, disruptions and seasonality are unknown. Segment validation is reported separately when a valid network is processed; physical occupancy remains unvalidated.\n"
    (ROOT / "docs/model/model-validation.md").write_text(doc, encoding="utf-8")
    print(
        json.dumps(
            {"selected_minutes": selected["minutes"], "variants": evaluations}, indent=2
        )
    )


def network_pipeline(path=None, max_patterns=100):
    source = Path(path) if path else RAW / "gtfs.zip"
    if not source.exists():
        result = {
            "status": "blocked",
            "reason": "Authorised complete GTFS ZIP not present at data/raw/gtfs.zip",
            "matched_tickets": None,
            "matching_coverage": None,
        }
        # Remove stale routable artifacts only when explicitly rebuilding with missing/invalid source.
        for name in ("network.json", "segment-model.json", "segment_daily.parquet"):
            (PROCESSED / name).unlink(missing_ok=True)
        (REPORTS / "segment-validation.json").unlink(missing_ok=True)
        save_network_report(result)
        print(json.dumps(result))
        return result
    try:
        network = Network(source)
    except (ValueError, KeyError) as e:
        result = {
            "status": "blocked",
            "reason": str(e),
            "matched_tickets": None,
            "matching_coverage": None,
        }
        for name in ("network.json", "segment-model.json", "segment_daily.parquet"):
            (PROCESSED / name).unlink(missing_ok=True)
        (REPORTS / "segment-validation.json").unlink(missing_ok=True)
        save_network_report(result)
        print(json.dumps(result))
        return result
    print(f"Loaded GTFS: {network.quality}", flush=True)
    ods = pd.read_parquet(PROCESSED / "od_daily.parquet")
    unique = ods[["route_key", "start_stop_name", "end_stop_name"]].drop_duplicates()
    print(f"Matching {len(unique):,} distinct route/OD combinations", flush=True)
    mapping = {}
    diagnostics = []
    # Index normalised stop positions once; avoid rescanning every stop for each
    # of the hundreds of thousands of route/OD combinations.
    from .domain import normalize
    from collections import defaultdict
    positions = {}
    for pid, pattern in network.patterns.items():
        by_name = defaultdict(list)
        for i, sid in enumerate(pattern['stops']):
            by_name[normalize(network.stops[sid]['name'])].append(i)
        positions[pid] = by_name
    for row in unique.itertuples(index=False):
        candidates = network.aliases.get(normalize(row.route_key), set())
        found = []
        board, alight = normalize(row.start_stop_name), normalize(row.end_stop_name)
        for pid in candidates:
            pos = positions[pid]
            found.extend((pid, i, j) for i in pos.get(board, ()) for j in pos.get(alight, ()) if i < j)
            if len(found) > 1:
                break
        match = found[0] if len(found) == 1 else None
        reason = 'matched' if match else ('ambiguous_path' if found else ('unknown_route' if not candidates else 'unmatched_stops_or_direction'))
        key = (row.route_key, row.start_stop_name, row.end_stop_name)
        mapping[key] = (match, reason)
        if match is None:
            diagnostics.append(
                dict(zip(("route", "board", "alight"), key)) | {"reason": reason}
            )
    counts = Counter()
    pattern_volume = Counter()
    for r in ods.itertuples(index=False):
        match, reason = mapping[(r.route_key, r.start_stop_name, r.end_stop_name)]
        counts[reason] += int(r.tickets)
        if match:
            pattern_volume[match[0]] += int(r.tickets)
    selected = {p for p, _ in pattern_volume.most_common(max_patterns)}
    print(
        f"Matched {counts['matched']:,} tickets; expanding {len(selected)} patterns",
        flush=True,
    )
    # Aggregate while expanding instead of materialising millions of duplicate
    # Python dictionaries before a groupby.
    aggregate = Counter()
    expanded_traversals = 0
    for r in ods.itertuples(index=False):
        match, _ = mapping[(r.route_key, r.start_stop_name, r.end_stop_name)]
        if match and match[0] in selected:
            pid, i, j = match
            for segment in range(i, j):
                k=(f"{pid}:{segment}",r.date,int(r.bucket15),int(r.day_type))
                prev = aggregate.get(k, (0, 0))
                aggregate[k] = (prev[0] + int(r.passengers), prev[1] + int(r.tickets))
                expanded_traversals += int(r.passengers)
    private = REPORTS / "private"
    private.mkdir(exist_ok=True)
    (private / "rejected-gtfs-trips.json").write_text(
        json.dumps(network.errors, indent=2), encoding="utf-8"
    )
    pd.DataFrame(diagnostics).to_json(
        private / "unmatched-od.json", orient="records", indent=2
    )
    (PROCESSED / "network.json").write_text(
        json.dumps(network.to_dict()), encoding="utf-8"
    )
    total = int(ods.tickets.sum())
    modeled = sum(pattern_volume[p] for p in selected)
    result = dict(
        status="ready",
        **network.quality,
        matching_coverage=counts["matched"] / total if total else 0,
        matched_tickets=counts["matched"],
        total_valid_tickets=total,
        reasons=dict(counts),
        modeled_patterns=len(selected),
        modeled_tickets=modeled,
        modeled_ticket_share=modeled / total if total else 0,
        modeled_share_of_unambiguous_matches=modeled / counts['matched'] if counts['matched'] else 0,
        scope=f"Top {max_patterns} unambiguously matched patterns by ticket volume; other journeys retain unavailable predictions.",
        scheduled_denominator="Not used: transaction times do not identify services or downstream traversal times reliably.",
        feed_info=network.feed_info,
    )
    if aggregate:
        print(f"Aggregated {expanded_traversals:,} passenger-segment traversals into {len(aggregate):,} daily feature rows", flush=True)
        f = pd.DataFrame([
            dict(key=k[0],date=k[1],bucket15=k[2],day_type=k[3],passengers=v[0],tickets=v[1])
            for k,v in aggregate.items()
        ])
        f.to_parquet(PROCESSED / "segment_daily.parquet", index=False)
        minutes = json.loads((REPORTS / "validation.json").read_text())[
            "selected_minutes"
        ]
        model = fit(f, minutes, strategy="same_slot")
        print(f"Fitted {len(model['models']):,} segment profiles", flush=True)
        # Shared scale across modeled segments, explicitly subject to route sampling bias.
        model["global_reference"] = sorted(
            v["expected"]
            for p in model["models"].values()
            for v in p["slots"].values()
            if v["expected"] > 0
        )
        (PROCESSED / "segment-model.json").write_text(
            json.dumps(model, separators=(",", ":")), encoding="utf-8"
        )
        (REPORTS / "segment-validation.json").write_text(
            json.dumps(model["evaluation"], indent=2), encoding="utf-8"
        )
    else:
        (PROCESSED / "segment-model.json").unlink(missing_ok=True)
        (PROCESSED / "segment_daily.parquet").unlink(missing_ok=True)
        (REPORTS / "segment-validation.json").unlink(missing_ok=True)
        result["model_status"] = (
            "No unambiguous ticket matches; no predictions fabricated"
        )
    save_network_report(result)
    print(json.dumps(result, indent=2))
    return result


def save_network_report(result):
    (REPORTS / "network-quality.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )
    (ROOT / "docs/data/network-quality.md").write_text(
        "# Network quality and matching\n\n```json\n"
        + json.dumps(result, indent=2)
        + "\n```\n\nUnmatched records are retained in private diagnostics. Fuzzy stop assignments are never accepted automatically. The public sample was examined and rejected for broken foreign-key references.\n",
        encoding="utf-8",
    )
