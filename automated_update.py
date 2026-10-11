"""Import identity-checked official ISL match payloads; preserve unavailable data."""
import html
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote
from urllib.request import Request, urlopen
from postmatch import validate_results
from season import validate_season
from update_log import validate_update_log

ROOT = Path(__file__).resolve().parent
EVENT_STATS = {'shots':'shots','shots_on_target':'shotsOnTarget','corner_kicks':'corners','fouls_committed':'fouls','offsides':'offsides','yellow_cards':'yellowCards','red_cards':'redCards'}
TOUCH_STATS = {'total_passes':'passes','pass_accuracy_percentage':'passAccuracy','tackles':'tackles','interceptions':'interceptions','clearance':'clearances','saves':'saves'}

def extract_match(document):
    for _, encoded in re.findall(r'''=(["'])(%7[Bb].*?)\1''', document):
        try:
            data = json.loads(unquote(html.unescape(encoded)))
        except (ValueError, TypeError):
            continue
        if isinstance(data, dict) and isinstance(data.get('matchData'), dict):
            return data['matchData']
    raise ValueError('Official structured match payload unavailable')

def lineup(team):
    starters = [{'name':p['name'], 'number':int(p['jersey_no'])} for p in team.get('players',[]) if p.get('is_started') is True]
    if len(starters) != 11 or len({p['name'] for p in starters}) != 11:
        return None
    value = {'starters':starters}
    if team.get('formation'): value['formation'] = team['formation']
    return value

def convert(data, fixture, names, stamp):
    detail = data['match_detail']
    if str(detail['match_id']) != fixture['id'] or detail['series']['name'] != 'Indian Super League, 2026-27':
        raise ValueError('Match identity or season mismatch')
    sides = {('home' if t['is_home_team'] else 'away'):t for t in data['teams']}
    if set(sides) != {'home','away'} or any(str(sides[s]['id']) != str(fixture[s+'Id']) for s in sides):
        raise ValueError('Club identity mismatch')
    actual_date = datetime.strptime(detail['matchdate_ist'], '%m/%d/%Y').date().isoformat()
    if actual_date != datetime.fromisoformat(fixture['kickoff']).astimezone(timezone(timedelta(hours=5,minutes=30))).date().isoformat():
        raise ValueError('Fixture date mismatch')
    url = 'https://www.indiansuperleague.com/matchcentre/' + fixture['id']
    lineups = {s:lineup(t) for s,t in sides.items() if lineup(t)}
    if detail.get('is_completed') is not True:
        return None, lineups
    if detail.get('is_shootout') or detail.get('match_stage') != 'League' or detail.get('clock',{}).get('minutes',0) > 90:
        raise ValueError('Unsupported non-league or extra-time result')
    match = {'id':fixture['id'],'date':actual_date,'home':names[fixture['homeId']],'away':names[fixture['awayId']], 'homeGoals':sides['home']['score'],'awayGoals':sides['away']['score'],'status':'FT','phase':'league','verifiedAt':stamp,'sources':[{'label':'Indian Super League official match centre','url':url}], 'matchUrl':url,'lineups':lineups,'stats':{},'players':[]}
    if detail.get('venue',{}).get('name'): match['venue'] = detail['venue']['name']
    match['report'] = f"{match['home']} {match['homeGoals']}–{match['awayGoals']} {match['away']}. Full-time result confirmed by the official ISL match centre."
    for side,team in sides.items():
        stats = team.get('stats',{})
        values = {}
        if stats.get('possession_percentage') is not None: values['possession'] = stats['possession_percentage']
        for section,mapping in [('events',EVENT_STATS),('touches',TOUCH_STATS)]:
            for key,target in mapping.items():
                if stats.get(section,{}).get(key) is not None: values[target] = stats[section][key]
        match['stats'][side] = values
        for p in team.get('players',[]):
            if not p.get('is_started') and not p.get('minutes_played',0): continue
            player = {'name':p['name'],'side':side,'position':p['position']}
            for section,mapping in [('events',{'goals':'goals','assists':'assists','shots':'shots'}),('touches',{'total_passes':'passes','tackles':'tackles','saves':'saves'})]:
                for key,target in mapping.items():
                    if p.get(section,{}).get(key) is not None: player[target] = p[section][key]
            match['players'].append(player)
    events = []
    kinds = {'Substitution':'substitution','Goal':'goal','Own Goal':'own_goal','Yellow Card':'yellow_card','Red Card':'red_card','Second Yellow Card':'second_yellow_red'}
    for e in data.get('events',[]):
        side = next((s for s,t in sides.items() if str(t['id']) == str(e.get('team_id'))),None)
        actor = e.get('offensive_player',{}).get('player_name')
        sub = e.get('substitution',{})
        if e.get('event') == 'Substitution': actor = sub.get('player_in',{}).get('player_full_name')
        if e.get('event') not in kinds or not side or not actor: continue
        ev = {'minute':int(e['time']['minutes']),'side':side,'type':kinds[e['event']],'player':actor}
        if e.get('event') == 'Substitution':
            ev.pop('player')
            ev['playerIn'] = actor
            ev['playerOut'] = sub['player_out']['player_full_name']
        if e['time'].get('additional_minutes'): ev['addedMinute'] = int(e['time']['additional_minutes'])
        assist = e.get('assisting_player',{}).get('full_name') or e.get('assisting_player',{}).get('player_name')
        if assist: ev['assist'] = assist
        events.append(ev)
    if events: match['events'] = events
    return match,lineups

def main():
    kind = sys.argv[1] if len(sys.argv)>1 else 'hourly'
    if kind not in ('hourly','post-match-early','post-match-late'): raise ValueError('Invalid check kind')
    season = json.loads((ROOT/'data/isl-season.json').read_text())
    results = json.loads((ROOT/'data/isl-results.json').read_text())
    log = json.loads((ROOT/'data/update-log.json').read_text())
    now = datetime.now(timezone.utc)
    stamp = now.isoformat()
    names = {t['id']:t['name'] for t in season['teams']}
    known = {m['id']:m for m in results['matches']}
    changed = 0
    links, failures, pending = [], [], []
    for f in season['fixtures']:
        delta = datetime.fromisoformat(f['kickoff']).astimezone(timezone.utc)-now
        if delta > timedelta(hours=3) or (delta < -timedelta(days=3) and f['id'] in known): continue
        url = 'https://www.indiansuperleague.com/matchcentre/'+f['id']
        try:
            with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 FotWeb/1.0'}),timeout=30) as response:
                document = response.read(4_000_000).decode('utf-8')
            match,xis = convert(extract_match(document),f,names,stamp)
            if not match and delta < -timedelta(hours=2): pending.append(f['id'])
            links.append({'label':(names[f['homeId']]+' vs '+names[f['awayId']])[:80],'url':url})
            if match:
                old = known.get(f['id'],{})
                merged = {**old,**match}
                if old.get('report') and (old.get('homeGoals'),old.get('awayGoals')) == (match['homeGoals'],match['awayGoals']): merged['report'] = old['report']
                merged['sources'] = list({s['url']:s for s in old.get('sources',[])+match['sources']}.values())
                if 'events' not in match and old.get('events'): merged['events'] = old['events']
                merged['lineups'] = {**old.get('lineups',{}),**match['lineups']}
                merged['stats'] = {s:{**old.get('stats',{}).get(s,{}),**match['stats'][s]} for s in ('home','away')}
                if {k:v for k,v in old.items() if k!='verifiedAt'} != {k:v for k,v in merged.items() if k!='verifiedAt'}:
                    candidate = {**results,'matches':[m for m in known.values() if m['id'] != f['id']]+[merged]}
                    validate_results(candidate)
                    known[f['id']] = merged
                    changed += 1
            elif xis:
                updated = {**f.get('lineups',{}),**xis,'sourceUrl':url,'verifiedAt':stamp}
                if {k:v for k,v in updated.items() if k!='verifiedAt'} != {k:v for k,v in f.get('lineups',{}).items() if k!='verifiedAt'}:
                    previous = f.get('lineups')
                    f['lineups'] = updated
                    try: validate_season(season)
                    except Exception:
                        if previous is None: f.pop('lineups',None)
                        else: f['lineups'] = previous
                        raise
                    changed += 1
        except Exception as exc:
            failures.append(f['id']+': '+str(exc)[:90])
    if kind == 'hourly':
        try:
            from stream_update import update_streams
            changed += update_streams(season, stamp)
            links.append({'label':'Official ISL YouTube Live listing','url':'https://www.youtube.com/@IndianSuperLeague/streams'})
        except Exception as exc:
            failures.append('YouTube: '+str(exc)[:100])
    results['matches'] = list(known.values())
    if changed: results['updatedAt'] = stamp
    summary = f"Official match import: {len(links)} checked, {changed} updates, {len(failures)} failures, {len(pending)} awaiting FT (retried on subsequent runs). Squad and schedule discovery not covered. Streams checked hourly only."
    log['checks'] = [{'checkedAt':datetime.now(timezone.utc).isoformat(),'kind':kind,'outcome':('error' if failures and not links else 'partial' if failures or pending else 'updated' if changed else 'no-change'),'summary':summary,'links':links[:8]}]+log['checks'][:335]
    validate_results(results); validate_season(season); validate_update_log(log)
    for name,value in [('isl-season',season),('isl-results',results),('update-log',log)]:
        (ROOT/('data/'+name+'.json')).write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
    print(summary)
    for failure in failures: print('WARNING:',failure)
    for match_id in pending: print('PENDING FT:',match_id)
    if failures and not links: raise SystemExit(1)

if __name__ == '__main__': main()
