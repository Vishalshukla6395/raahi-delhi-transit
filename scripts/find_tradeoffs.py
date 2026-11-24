"""Deterministic search for real illustrative cases, not an efficacy evaluation."""
import json
from datetime import datetime
from pathlib import Path
from raahi.network import Network
from raahi.model import DemandModel
from raahi.planner import Planner
from raahi.domain import IST

root=Path(__file__).resolve().parents[1]
n=Network.from_dict(json.loads((root/'data/processed/network.json').read_text()))
m=DemandModel(json.loads((root/'data/processed/segment-model.json').read_text()))
p=Planner(n,m)
pids=sorted({k.split(':')[0] for k in m.data['models']})
cases=[]; checked=0
for pid in pids:
    stops=n.patterns[pid]['stops']
    for i in (0,len(stops)//3,len(stops)//2):
        j=min(i+10,len(stops)-1)
        if i==j: continue
        for hour in (8,12,18,20):
            when=datetime(2026,11,24,hour,tzinfo=IST)
            fast=p.search(stops[i],stops[j],when,'fastest',False)
            comfort=p.search(stops[i],stops[j],when,'less_crowded',False)
            checked+=1
            if not fast or not comfort: continue
            a,b=fast[0],comfort[0]
            if a['prediction_coverage']!=1 or b['prediction_coverage']!=1: continue
            delta=a['demand_index']-b['demand_index']
            if delta>=10 and b['duration_minutes']>a['duration_minutes'] and a['evidence']==b['evidence']=='moderate':
                cases.append(dict(origin=n.stops[stops[i]],destination=n.stops[stops[j]],departure=when.isoformat(),index_points_lower=delta,extra_minutes=b['duration_minutes']-a['duration_minutes'],fastest=a,comfort=b))
    print(n.patterns[pid]['name'], 'checked',checked,'cases',len(cases),flush=True)
cases.sort(key=lambda c:(-c['index_points_lower'],c['extra_minutes']))
out=dict(protocol='100 covered patterns x three origin positions x four times; direct only, weekday. Search for examples, not representative impact evaluation. Both alternatives require complete coverage and Moderate evidence.',checked=checked,case_count=len(cases),cases=cases[:12])
(root/'data/reports/tradeoff-examples.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print('SAVED',len(cases),flush=True)
