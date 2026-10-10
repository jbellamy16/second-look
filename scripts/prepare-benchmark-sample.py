"""Prepare a predeclared season-spanning Wyscout sample from checksum-verified originals.
Usage: python3 scripts/prepare-benchmark-sample.py /tmp/btl-wyscout
Uses the existing licensed cache; does not download or add production fixtures.
"""
import hashlib, json, pathlib, re, sys, zipfile
root=pathlib.Path(__file__).resolve().parents[1]
cache=pathlib.Path(sys.argv[1])
for item in json.loads((root/'data/historical/sources.json').read_text()):
    if item['name'] in ['events.zip','matches.zip','teams.json','players.json']:
        assert hashlib.md5((cache/item['name']).read_bytes()).hexdigest()==item['md5'], item['name']
        assert item['license']['name']=='CC BY 4.0'
with zipfile.ZipFile(cache/'matches.zip') as z:
    matches=json.loads(z.read('matches_England.json'))
reference={2499719,2499943,2499841}
candidates=sorted([m for m in matches if m['wyId'] not in reference],key=lambda m:(m['dateutc'],m['wyId']))
# Fix the selection before reading event-level metrics. No score or performance filter.
selected=candidates[5::10]
out=root/'.cache/wyscout-benchmark';out.mkdir(parents=True,exist_ok=True)
manifest={'selection':'Chronological non-reference Premier League 2017–18 fixtures, index 5 then every tenth; fixed before event metrics. No score filter.','referenceExcluded':sorted(reference),'ids':[m['wyId'] for m in selected],'attribution':'Wyscout · Pappalardo & Massucco (2019) · CC BY 4.0; data/historical/LICENSE.md','fixtures':[{'id':m['wyId'],'date':m['dateutc'],'teams':sorted(m['teamsData'])} for m in selected]}
(out/'selection.json').write_text(json.dumps(manifest,indent=2)+'\n')
with zipfile.ZipFile(cache/'events.zip') as z:
    all_events=json.loads(z.read('events_England.json'))
by_match={m['wyId']:[] for m in selected}
for e in all_events:
    if e['matchId'] in by_match:by_match[e['matchId']].append(e)
players=json.loads((cache/'players.json').read_text()); teams=json.loads((cache/'teams.json').read_text())
def decode(s): return re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m[1],16)),s)
for m in selected:
    events=by_match[m['wyId']]; player_ids={e['playerId'] for e in events}
    for t in m['teamsData'].values():player_ids.update(p['playerId'] for p in t['formation']['lineup']+t['formation']['bench'])
    payload={'match':m,'events':events,'teams':[dict(wyId=t['wyId'],name=decode(t['name'])) for t in teams if str(t['wyId']) in m['teamsData']], 'players':[dict(wyId=p['wyId'],shortName=decode(p['shortName']),role=p['role']['name']) for p in players if p['wyId'] in player_ids]}
    (out/f"{m['wyId']}.json").write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n')
print(f"Prepared {len(selected)} held-out fixtures across {len({t for m in selected for t in m['teamsData']})} teams.")
