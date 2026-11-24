"""Reconcile selected OD passenger traversals against the produced segment features."""
import csv, io, json, zipfile
from collections import defaultdict
from pathlib import Path
import pandas as pd
from raahi.network import Network
from raahi.domain import normalize

root=Path(__file__).resolve().parents[1]
processed=root/"data/processed"
n=Network.from_dict(json.loads((processed/"network.json").read_text()))
with zipfile.ZipFile(root/"data/raw/gtfs.zip") as z:
    routes={r["route_id"]:r for r in csv.DictReader(io.StringIO(z.read("routes.txt").decode("utf-8-sig")))}
n.aliases=defaultdict(set)
for pid,p in n.patterns.items():
    for col in ("route_short_name","route_long_name"):
        n.aliases[normalize(routes[p["route_id"]][col])].add(pid)
f=pd.read_parquet(processed/"segment_daily.parquet")
selected={k.split(":")[0] for k in f.key.unique()}
aliases={name for name,pids in n.aliases.items() if pids & selected}
ods=pd.read_parquet(processed/"od_daily.parquet")
ods=ods[ods.route_key.isin(aliases)]
ods=ods.groupby(["route_key","start_stop_name","end_stop_name"],as_index=False)[["tickets","passengers"]].sum()
ticket_count=0; expected_traversals=0; samples=[]
for r in ods.itertuples(index=False):
    match,reason=n.match(r.route_key,r.start_stop_name,r.end_stop_name)
    if match and match[0] in selected:
        pid,i,j=match
        ticket_count+=int(r.tickets)
        expected_traversals+=int(r.passengers)*(j-i)
        if len(samples)<8:
            samples.append(dict(route=r.route_key,board=r.start_stop_name,alight=r.end_stop_name,pattern=pid,board_index=i,alight_index=j,segments=j-i))
actual=int(f.passengers.sum())
report=json.loads((root/"data/reports/network-quality.json").read_text())
assert ticket_count==report["modeled_tickets"]
assert actual==expected_traversals
out=dict(status="PASS",modeled_tickets=ticket_count,expected_passenger_segment_traversals=expected_traversals,actual_passenger_segment_traversals=actual,segment_keys=f.key.nunique(),aggregate_rows=len(f),sample_matches=samples,scope="Independent reconciliation of selected-pattern OD totals and segment totals; not geographic field validation")
(root/"data/reports/segment-reconciliation.json").write_text(json.dumps(out,indent=2),encoding="utf-8")
print(json.dumps(out,indent=2))
