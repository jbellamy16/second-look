"""Reproduce the small CC BY 4.0 selection from pinned, checksum-verified originals.
Usage: python3 scripts/import-wyscout.py [download-cache-directory]
Downloads ~80 MB once. No credentials, paid API, or scraping.
"""
import hashlib, json, pathlib, sys, urllib.request, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/btl-wyscout')
CACHE.mkdir(parents=True, exist_ok=True)
SOURCES = [
    (7770599, 1, 'events.zip', 14464685, '7c20e8647e7eda58d7838a0c7b1ec6ab'),
    (7770422, 1, 'matches.zip', 14464622, '51d80beb17480919f69a53a0152c2d71'),
    (7765310, 3, 'teams.json', 15073697, '1381ff9449f21105090729cf0e086b5b'),
    (7765196, 3, 'players.json', 15073721, 'f28ddf6326281efeda6488b2169f5609'),
    (7765316, 4, 'competitions.json', 15073685, '3dc210a4805dda5337b0ff9f7eaa407a'),
    (11743836, 1, 'eventid2name.csv', 21385245, '46daf16100ece0c743eedc9adcfea162'),
    (11743818, 1, 'tags2name.csv', 21385239, 'e7acb14918d00e40c80a898b1da8fc39'),
]
metadata = []
for article, version, name, file_id, checksum in SOURCES:
    url = f'https://ndownloader.figshare.com/files/{file_id}'
    path = CACHE / name
    if not path.exists(): urllib.request.urlretrieve(url, path)
    assert hashlib.md5(path.read_bytes()).hexdigest() == checksum, name
    info = json.load(urllib.request.urlopen(f'https://api.figshare.com/v2/articles/{article}/versions/{version}'))
    assert info['license']['name'] == 'CC BY 4.0', name
    metadata.append(dict(articleId=article, version=version, title=info['title'], doi=info['doi'],
        license=info['license'], fileId=file_id, name=name, url=url, md5=checksum))

def zipped(name, member):
    with zipfile.ZipFile(CACHE / name) as z: return json.loads(z.read(member))
def decode(s):
    # The published names contain literal JSON unicode escape sequences.
    import re
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m[1],16)), s)

matches = zipped('matches.zip', 'matches_England.json')
events = zipped('events.zip', 'events_England.json')
players = json.loads((CACHE / 'players.json').read_text())
teams = json.loads((CACHE / 'teams.json').read_text())
competition = next(c for c in json.loads((CACHE / 'competitions.json').read_text()) if c['wyId'] == 364)
out = ROOT / 'data/historical'; out.mkdir(exist_ok=True, parents=True)
for match_id in [2499719, 2499943, 2499841]:
    match = next(m for m in matches if m['wyId'] == match_id)
    ev = [e for e in events if e['matchId'] == match_id]
    team_ids = {int(t) for t in match['teamsData']}
    player_ids = {e['playerId'] for e in ev}
    for t in match['teamsData'].values():
        for p in t['formation']['lineup'] + t['formation']['bench']: player_ids.add(p['playerId'])
    ps = [dict(wyId=p['wyId'], shortName=decode(p['shortName']), role=p['role']['name']) for p in players if p['wyId'] in player_ids]
    ts = [dict(wyId=t['wyId'], name=decode(t['name'])) for t in teams if t['wyId'] in team_ids]
    payload = dict(match=match, events=ev, players=ps, teams=ts, competition=competition)
    encoded = json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n'
    (out / f'{match_id}.json').write_text(encoded)
    print(match_id, match['label'], len(ev), 'recorded events', len(encoded.encode()), 'bytes')
(out / 'sources.json').write_text(json.dumps(metadata, indent=2) + '\n')
for name in ['eventid2name.csv', 'tags2name.csv']:
    (out / name).write_bytes((CACHE / name).read_bytes())
