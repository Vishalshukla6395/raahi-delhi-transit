"""Full-file profiling and typed aggregate creation. Raw records never served by API."""

import json
import time
import duckdb
from .config import RAW, PROCESSED, REPORTS, ROOT


def ingest():
    started = time.perf_counter()
    path = RAW / "tickets" / "October-Delhi.csv"
    if not path.exists():
        raise FileNotFoundError("Run python -m raahi.cli acquire first")
    db = duckdb.connect(str(PROCESSED / "tickets.duckdb"))
    db.execute("SET TimeZone='Asia/Kolkata'")
    db.execute("SET memory_limit='2GB'")
    db.execute(
        "CREATE OR REPLACE TABLE raw AS SELECT * FROM read_csv(?, all_varchar=true, nullstr=['','NULL'])",
        [str(path)],
    )
    cols = [r[0] for r in db.execute("DESCRIBE raw").fetchall()]
    missing = {
        c: db.execute(
            f'SELECT count(*) FROM raw WHERE "{c}" IS NULL OR trim("{c}")=\'\''
        ).fetchone()[0]
        for c in cols
    }
    db.execute("""CREATE OR REPLACE TABLE typed AS SELECT *,
        try_cast(passenger_count AS DOUBLE) AS passengers,
        CASE WHEN regexp_matches(created_at, '(Z|[+-][0-9]{2}:[0-9]{2})$')
             THEN try_cast(created_at AS TIMESTAMPTZ) END AS ts
        FROM raw""")
    db.execute("""CREATE OR REPLACE TABLE classified AS SELECT *,
        CASE WHEN passengers IS NULL OR NOT isfinite(passengers) OR passengers<=0 OR passengers!=floor(passengers)
             THEN 'invalid_passenger_count'
             WHEN ts IS NULL THEN 'invalid_timestamp'
             WHEN route IS NULL OR trim(route)='' OR start_stop_name IS NULL OR end_stop_name IS NULL
             OR trim(start_stop_name)='' OR trim(end_stop_name)='' THEN 'missing_journey_fields'
             ELSE 'valid' END AS quality FROM typed""")
    total = db.execute("SELECT count(*) FROM raw").fetchone()[0]
    unique = db.execute("SELECT count(*) FROM (SELECT DISTINCT * FROM raw)").fetchone()[
        0
    ]
    quality = dict(
        db.execute(
            "SELECT quality,count(*) FROM classified GROUP BY quality"
        ).fetchall()
    )
    db.execute("""CREATE OR REPLACE TABLE tickets AS SELECT
        regexp_replace(lower(trim(route)), '[^a-z0-9]', '', 'g') AS route_key,
        route, start_stop_name, end_stop_name, passengers::BIGINT AS passengers,
        ts, ts::DATE AS date, hour(ts)::INTEGER AS hour,
        (hour(ts)*4+floor(minute(ts)/15))::INTEGER AS bucket15,
        (isodow(ts)>=6)::INTEGER AS day_type, isodow(ts)::INTEGER AS weekday,
        vehicle_number, is_ac FROM classified WHERE quality='valid'""")
    # A duplicated row is not proof of a duplicated transaction: no transaction IDs supplied.
    db.execute(
        "CREATE OR REPLACE TABLE od_daily AS SELECT route_key,start_stop_name,end_stop_name,date,bucket15,day_type,sum(passengers)::DOUBLE AS passengers,count(*) AS tickets FROM tickets GROUP BY ALL"
    )
    db.execute(
        "CREATE OR REPLACE TABLE route_daily AS SELECT route_key,date,bucket15,day_type,sum(passengers)::DOUBLE AS passengers,count(*) AS tickets FROM tickets GROUP BY ALL"
    )
    for table in ("od_daily", "route_daily"):
        db.execute(
            f"COPY {table} TO ? (FORMAT PARQUET)", [str(PROCESSED / f"{table}.parquet")]
        )
    private = REPORTS / "private"
    private.mkdir(exist_ok=True)
    db.execute(
        "COPY (SELECT * FROM classified WHERE quality!='valid') TO ? (FORMAT PARQUET)",
        [str(private / "invalid-records.parquet")],
    )
    db.execute(
        "COPY (SELECT *, count(*) AS multiplicity FROM raw GROUP BY ALL HAVING count(*)>1) TO ? (FORMAT PARQUET)",
        [str(private / "duplicate-groups.parquet")],
    )

    def records(sql):
        cursor = db.execute(sql)
        names = [c[0] for c in cursor.description]
        return [dict(zip(names, row)) for row in cursor.fetchall()]

    coverage = records(
        "SELECT min(date)::VARCHAR AS first_date,max(date)::VARCHAR AS last_date,count(DISTINCT date) AS dates,count(DISTINCT route_key) AS routes,count(DISTINCT start_stop_name) AS boarding_stops,count(DISTINCT end_stop_name) AS alighting_stops,sum(passengers) AS sampled_passengers FROM tickets"
    )[0]
    report = dict(
        total_records=total,
        valid_records=quality.get("valid", 0),
        quality=quality,
        missing_values=missing,
        exact_duplicate_surplus=total - unique,
        duplicate_policy="Retained: no transaction ID distinguishes duplicate export rows from separate identical purchases.",
        invalid_passenger_counts=db.execute(
            "SELECT count(*) FROM typed WHERE passengers IS NULL OR NOT isfinite(passengers) OR passengers<=0 OR passengers!=floor(passengers)"
        ).fetchone()[0],
        invalid_timestamps=db.execute(
            "SELECT count(*) FROM typed WHERE ts IS NULL"
        ).fetchone()[0],
        unusually_large_passenger_counts=db.execute(
            "SELECT count(*) FROM typed WHERE passengers>20"
        ).fetchone()[0],
        passenger_count_distribution=records(
            "SELECT passenger_count,count(*) AS records FROM raw GROUP BY 1 ORDER BY records DESC LIMIT 20"
        ),
        vehicle_available=db.execute(
            "SELECT count(*) FROM tickets WHERE vehicle_number IS NOT NULL AND trim(vehicle_number)!=''"
        ).fetchone()[0],
        ac_distribution=records(
            "SELECT is_ac,count(*) AS tickets FROM tickets GROUP BY 1"
        ),
        hourly=records(
            "SELECT hour,sum(passengers) AS passengers,count(*) AS tickets FROM tickets GROUP BY hour ORDER BY hour"
        ),
        weekdays=records(
            "SELECT weekday,sum(passengers) AS passengers,count(*) AS tickets,count(DISTINCT date) AS days FROM tickets GROUP BY weekday ORDER BY weekday"
        ),
        route_alias_collisions=records(
            "SELECT route_key,count(DISTINCT route) AS spellings FROM tickets GROUP BY 1 HAVING spellings>1"
        ),
        top_routes=records(
            "SELECT route_key AS id,min(route) AS name,count(*) AS tickets,sum(passengers) AS passengers FROM tickets GROUP BY route_key ORDER BY tickets DESC LIMIT 40"
        ),
        route_names=records(
            "SELECT route_key AS id,min(route) AS name,count(*) AS tickets FROM tickets GROUP BY route_key ORDER BY name"
        ),
        coverage=coverage,
        elapsed_seconds=round(time.perf_counter() - started, 2),
        matching={
            "status": "pending",
            "reason": "Run network processing with authorised complete GTFS",
        },
    )
    (REPORTS / "data-quality.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    summary = "# Data quality report\n\nGenerated by `python -m raahi.cli ingest` from the entire official October CSV.\n\n"
    summary += "| Measurement | Actual result |\n|---|---:|\n"
    for key in (
        "total_records",
        "valid_records",
        "exact_duplicate_surplus",
        "invalid_passenger_counts",
        "invalid_timestamps",
        "vehicle_available",
        "unusually_large_passenger_counts",
    ):
        summary += f"| {key} | {report[key]:,} |\n"
    summary += (
        "\n"
        + report["duplicate_policy"]
        + "\n\nValues above 20 passengers are flagged for review, not discarded. Original invalid rows and duplicate groups stay in ignored private Parquet diagnostics.\n\n"
    )
    summary += "## Coverage\n\n```json\n" + json.dumps(coverage, indent=2) + "\n```\n\n"
    for key in (
        "missing_values",
        "passenger_count_distribution",
        "ac_distribution",
        "hourly",
        "weekdays",
        "route_alias_collisions",
    ):
        summary += f"## {key.replace('_', ' ').title()}\n\n```json\n{json.dumps(report[key], indent=2)}\n```\n\n"
    summary += "## Matching\n\nSee `data/reports/network-quality.json` and `docs/data/network-quality.md` after network processing. Full GTFS access is required; sample stop names alone cannot establish physical route continuity.\n"
    (ROOT / "docs/data/data-quality-report.md").write_text(summary, encoding="utf-8")
    db.close()
    print(
        json.dumps(
            {
                k: report[k]
                for k in (
                    "total_records",
                    "valid_records",
                    "exact_duplicate_surplus",
                    "coverage",
                    "elapsed_seconds",
                )
            },
            indent=2,
        )
    )
