"""Independent inventory of uniquely matched ticket volume by GTFS pattern."""
import json
from collections import Counter, defaultdict
from pathlib import Path
import pandas as pd
from raahi.domain import normalize
from raahi.network import Network

root=Path(__file__).resolve().parents[1]
n=Network.from_dict(json.loads((root/'data/processed/network.json').read_text()))
import csv,io,zipfile
with zipfile.ZipFile(root/'data/raw/gtfs.zip') as z:
    routes={r['route_id']:r for r in csv.DictReader(io.StringIO(z.read('routes.txt').decode('utf-8-sig')))}
aliases=defaultdict(set); route_name={}
for pid,p in n.patterns.items():
    for col in ('route_short_name','route_long_name'):
        name=normalize(routes[p['route_id']].get(col,''))
        if name:
            aliases[name].add(pid)
            route_name[name]=routes[p['route_id']].get('route_short_name') or routes[p['route_id']]['route_long_name']
positions={}
for pid,p in n.patterns.items():
    pos=defaultdict(list)
    for i,sid in enumerate(p['stops']): pos[normalize(n.stops[sid]['name'])].append(i)
    positions[pid]=pos
f=pd.read_parquet(root/'data/processed/od_daily.parquet')
unique=f.groupby(['route_key','start_stop_name','end_stop_name'],as_index=False).tickets.sum()
counts=Counter(); reasons=Counter()
for row in unique.itertuples(index=False):
    pats=aliases.get(row.route_key)
    if not pats: reasons['unknown_route']+=row.tickets; continue
    found=[]; a=normalize(row.start_stop_name); b=normalize(row.end_stop_name)
    for pid in pats:
        pos=positions[pid]
        found.extend((pid,i,j) for i in pos.get(a,()) for j in pos.get(b,()) if i<j)
    if len(found)==1: counts[found[0][0]]+=int(row.tickets); reasons['matched']+=int(row.tickets)
    else: reasons['ambiguous_path' if found else 'unmatched_stops_or_direction']+=int(row.tickets)
rank=counts.most_common(); cumulative=0
out=[]
for i,(pid,tickets) in enumerate(rank,1):
    cumulative+=tickets
    if i in (30,60,100,150,250,500,len(rank)):
        out.append(dict(top_patterns=i,share_of_unique_matched_tickets=round(cumulative/reasons['matched'],4),share_of_all_valid_tickets=round(cumulative/int(f.tickets.sum()),4),network_pattern_share=round(i/len(n.patterns),4),modeled_ticket_count=cumulative))
report=dict(status='PASS',unique_route_od_pairs=len(unique),pattern_count=len(rank),network_patterns=len(n.patterns),valid_tickets=int(f.tickets.sum()),reasons=dict(reasons),ranked_patterns=[dict(id=pid,tickets=int(tickets)) for pid,tickets in rank[:100]],coverage=out,caveat='Only actual unambiguous route/OD pattern matches are counted. Ticket coverage is a digital-record share, not a share of total bus passengers.')
(root/'data/reports/pattern-coverage-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
