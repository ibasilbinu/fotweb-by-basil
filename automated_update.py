"""Import identity-checked official ISL match payloads; preserve unavailable data."""
import html
import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote
from fixture_update import (fetch_text, competition_phase, update_fixtures,
                            update_lifecycle, SCHEDULE_URL)
from postmatch import validate_results
from season import validate_season
from update_log import KINDS, validate_update_log
from lineup_data import validate_substitutes

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

def lineup(team, warnings=None):
    starters = []
    for p in team.get('players', []):
        if p.get('is_started') is not True:
            continue
        if not isinstance(p.get('name'), str) or not p['name'].strip():
            return None
        starter = {'name': p['name']}
        if str(p.get('jersey_no', '')).isdigit():
            starter['number'] = int(p['jersey_no'])
        starters.append(starter)
    if len(starters) != 11 or len({p['name'] for p in starters}) != 11:
        return None
    value = {'starters':starters}
    if team.get('formation'): value['formation'] = team['formation']
    # Explicit match-sheet flags distinguish named substitutes from a club squad.
    # Used substitutes cease to be on the bench, but remain part of this list.
    substitutes = []
    for p in team.get('players', []):
        if p.get('is_started') is not False or not (p.get('is_onbench') is True or p.get('is_substitute') is True):
            continue
        player = {'name':p.get('name')}
        if str(p.get('jersey_no', '')).isdigit():
            player['number'] = int(p['jersey_no'])
        if p.get('position'):
            player['position'] = p['position']
        substitutes.append(player)
    if substitutes:
        try:
            validate_substitutes({**value, 'substitutes':substitutes})
            value['substitutes'] = substitutes
        except ValueError as exc:
            if warnings is not None:
                warnings.append(f"Team {team.get('id')}: {exc}; retained confirmed XI")
    return value

def merge_lineups(previous, incoming):
    """Keep verified fields when a later official response omits them."""
    merged = {**previous, **incoming}
    for side in ('home', 'away'):
        if side not in previous and side not in incoming:
            continue
        merged[side] = {**previous.get(side, {}), **incoming.get(side, {})}
        if 'substitutes' in merged[side]:
            starters = {p['name'].strip().casefold() for p in merged[side].get('starters', [])}
            substitutes = [p for p in merged[side]['substitutes'] if p['name'].strip().casefold() not in starters]
            if substitutes:
                merged[side]['substitutes'] = substitutes
            else:
                merged[side].pop('substitutes')
    return merged

def repair_result_lineup_metadata(results):
    """Remove fixture-only provenance keys accidentally copied into FT lineups."""
    repaired = 0
    allowed_metadata = {'sourceUrl', 'verifiedAt'}
    for match in results.get('matches', []):
        lineups = match.get('lineups')
        if not isinstance(lineups, dict):
            continue
        extra = set(lineups) - {'home', 'away'}
        if extra and extra <= allowed_metadata:
            match['lineups'] = {side: lineups[side] for side in ('home', 'away') if side in lineups}
            repaired += 1
    return repaired

def convert(data, fixture, names, stamp, warnings=None):
    warnings = warnings if warnings is not None else []
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
    lineups = {}
    for side, team in sides.items():
        confirmed = lineup(team, warnings)
        if confirmed:
            lineups[side] = confirmed
    if detail.get('is_completed') is not True:
        return None, lineups
    stage = detail.get('match_stage') or fixture.get('officialStage', '')
    status = ('PEN' if detail.get('is_shootout') is True else 'AET'
              if (detail.get('clock',{}).get('minutes') or 0) > 90 else 'FT')
    match = {'id':fixture['id'],'date':actual_date,'home':names[fixture['homeId']],'away':names[fixture['awayId']], 'homeGoals':sides['home']['score'],'awayGoals':sides['away']['score'],'status':status,'phase':competition_phase(stage),'officialStage':stage,'verifiedAt':stamp,'sources':[{'label':'Indian Super League official match centre','url':url}], 'matchUrl':url,'lineups':lineups,'stats':{},'players':[]}
    winner = str((detail.get('result') or {}).get('winning_team_id', ''))
    score_winner = (fixture['homeId'] if match['homeGoals'] > match['awayGoals'] else
                    fixture['awayId'] if match['awayGoals'] > match['homeGoals'] else None)
    if status == 'PEN':
        penalties = {s: t.get('shootout_score') for s, t in sides.items()}
        if all(type(n) is int and 0 <= n <= 100 for n in penalties.values()):
            match['penalties'] = penalties
            score_winner = (fixture['homeId'] if penalties['home'] > penalties['away'] else
                            fixture['awayId'] if penalties['away'] > penalties['home'] else None)
    if winner == score_winner:
        match['winnerId'] = winner
    if detail.get('venue',{}).get('name'): match['venue'] = detail['venue']['name']
    ending = {'FT': 'Full-time', 'AET': 'After extra time', 'PEN': 'After a penalty shootout'}[status]
    match['report'] = f"{match['home']} {match['homeGoals']}–{match['awayGoals']} {match['away']}. {ending}; result confirmed by the official ISL match centre."
    if 'penalties' in match:
        match['report'] += f" Penalty shootout: {match['penalties']['home']}–{match['penalties']['away']}."
    try:
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
                player = {'name':p['name'],'side':side}
                if p.get('position'): player['position'] = p['position']
                for section,mapping in [('events',{'goals':'goals','assists':'assists','shots':'shots'}),('touches',{'total_passes':'passes','tackles':'tackles','saves':'saves'})]:
                    for key,target in mapping.items():
                        if p.get(section,{}).get(key) is not None: player[target] = p[section][key]
                match['players'].append(player)
        events = []
        kinds = {'Substitution':'substitution','Goal':'goal','Own Goal':'own_goal','Yellow Card':'yellow_card','Red Card':'red_card','Second Yellow Card':'second_yellow_red'}
        for e in data.get('events',[]):
            side = next((s for s,t in sides.items() if str(t['id']) == str(e.get('team_id'))),None)
            actor = (e.get('offensive_player') or {}).get('player_name')
            sub = e.get('substitution',{})
            if e.get('event') == 'Substitution': actor = sub.get('player_in',{}).get('player_full_name')
            if e.get('event') not in kinds or not side or not actor or not isinstance(e.get('time',{}).get('minutes'),int): continue
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
    except (KeyError, TypeError, ValueError, AttributeError) as exc:
        warnings.append(f"{fixture['id']} optional details: {exc}")
    # Bad optional enrichment must never delay an otherwise confirmed final score.
    optional = {k: match.pop(k) for k in ('lineups', 'stats', 'players', 'events') if k in match}
    def validate(value):
        validate_results({'schemaVersion':1, 'season':'2026-27', 'updatedAt':stamp, 'matches':[value]})
    validate(match)
    for key, value in optional.items():
        try:
            validate({**match, key: value})
            match[key] = value
        except (ValueError, TypeError, KeyError) as exc:
            warnings.append(f"{fixture['id']} {key}: {exc}")
    match.setdefault('lineups', {})
    match.setdefault('stats', {})
    match.setdefault('players', [])
    return match,lineups

def run(kind='hourly', root=ROOT, now=None):
    if kind not in KINDS:
        raise ValueError('Invalid check kind')
    season = json.loads((root/'data/isl-season.json').read_text())
    results = json.loads((root/'data/isl-results.json').read_text())
    log = json.loads((root/'data/update-log.json').read_text())
    state = json.loads((root/'data/automation-state.json').read_text())
    if state.get('season') != '2026-27' or not state.get('phaseOneFixtureIds'):
        raise ValueError('Invalid season automation state')
    repaired_results = repair_result_lineup_metadata(results)
    validate_season(season); validate_results(results); validate_update_log(log)
    now = now or datetime.now(timezone.utc)
    stamp = now.isoformat()
    # Keep a seven-day enrichment window after a verified final, then archive.
    if state.get('champion') and now - datetime.fromisoformat(state['completedAt']) > timedelta(days=7):
        print('Season completed; champions and final data retained. No source checks required.')
        return 0
    names = {t['id']:t['name'] for t in season['teams']}
    known = {m['id']:m for m in results['matches']}
    changes = {'fixtures':0, 'results':repaired_results, 'lineups':0, 'streams':0}
    links, failures, pending = [], [], []
    sources = state.setdefault('sources', {})
    if kind in ('hourly', 'morning'):
        try:
            changes['fixtures'], issues, _ = update_fixtures(season, stamp)
            failures.extend(issues)
            sources['fixtures'] = {'checkedAt':stamp, 'outcome':'partial' if issues else 'ok'}
            links.append({'label':'Official ISL fixture discovery', 'url':SCHEDULE_URL})
        except Exception as exc:
            failures.append('Fixtures: ' + str(exc))
            sources['fixtures'] = {'checkedAt':stamp, 'outcome':'error', 'error':str(exc)[:250]}
    targets = []
    last_checked = state.setdefault('matchCheckedAt', {})
    for fixture in season['fixtures']:
        delta = datetime.fromisoformat(fixture['kickoff']).astimezone(timezone.utc)-now
        if fixture['status'] != 'NS' or fixture.get('needsConfirmation'):
            continue
        if delta > timedelta(hours=1) or (delta < -timedelta(days=3) and fixture['id'] in known):
            continue
        targets.append(fixture)
    # Current match windows first, then rotate unresolved older fixtures. A backlog
    # never drops a missing result and never prevents today's match from updating.
    targets.sort(key=lambda f: (
        not (-timedelta(hours=6) <= datetime.fromisoformat(f['kickoff'])-now <= timedelta(hours=1)),
        last_checked.get(f['id'], ''), f['kickoff']))
    deferred = targets[24:]
    targets = targets[:24]
    pending.extend('FT ' + f['id'] for f in deferred if f['id'] not in known)
    def read_match(fixture):
        try:
            return extract_match(fetch_text('https://www.indiansuperleague.com/matchcentre/'+fixture['id'])), None
        except Exception as exc:
            return None, exc
    with ThreadPoolExecutor(max_workers=4) as pool:
        payloads = list(pool.map(read_match, targets))
    checked = 0
    for f, (data, error) in zip(targets, payloads):
        url = 'https://www.indiansuperleague.com/matchcentre/'+f['id']
        last_checked[f['id']] = stamp
        delta = datetime.fromisoformat(f['kickoff']).astimezone(timezone.utc)-now
        try:
            if error:
                raise error
            match, xis = convert(data, f, names, stamp, failures)
            checked += 1
            links.append({'label':(names[f['homeId']]+' vs '+names[f['awayId']])[:80],'url':url})
            if not match and delta < -timedelta(hours=2):
                pending.append('FT ' + f['id'])
            if not match and -timedelta(hours=2) < delta <= timedelta(minutes=30) and len(xis) < 2:
                pending.append('XI ' + f['id'])
            if not match and len(xis) == 2 and -timedelta(hours=2) < delta <= timedelta(minutes=30) and any(
                    not xis.get(side, {}).get('substitutes') for side in ('home', 'away')):
                pending.append('Substitutes ' + f['id'])
            if match:
                old = known.get(f['id'], {})
                merged = {**old, **match}
                score_keys = ('homeGoals', 'awayGoals', 'status', 'penalties')
                if old.get('report') and all(old.get(k) == match.get(k) for k in score_keys):
                    merged['report'] = old['report']
                merged['sources'] = list({s['url']:s for s in old.get('sources',[])+match['sources']}.values())
                if 'events' not in match and old.get('events'):
                    merged['events'] = old['events']
                if not match['players'] and old.get('players'):
                    merged['players'] = old['players']
                fixture_lineups = {s:f['lineups'][s] for s in ('home','away') if s in f.get('lineups',{})}
                merged['lineups'] = merge_lineups(merge_lineups(fixture_lineups, old.get('lineups',{})), match['lineups'])
                merged['stats'] = {side:{**old.get('stats',{}).get(side,{}), **match['stats'].get(side,{})}
                                   for side in ('home','away')}
                # A completed feed can reset an optional metric to placeholder
                # zeros. Preserve the verified pair until the conflict is resolved.
                previous_clearances = [old.get('stats', {}).get(side, {}).get('clearances')
                                       for side in ('home', 'away')]
                if (all(old.get(k) == match.get(k) for k in score_keys)
                        and all(type(v) in (int, float) and v > 0 for v in previous_clearances)
                        and all(match['stats'].get(side, {}).get('clearances') == 0
                                for side in ('home', 'away'))):
                    for side, value in zip(('home', 'away'), previous_clearances):
                        merged['stats'][side]['clearances'] = value
                    failures.append(f"{f['id']}: both clearance totals reset to zero; retained verified values pending confirmation")
                    pending.append('Clearances ' + f['id'])
                if {k:v for k,v in old.items() if k!='verifiedAt'} != {k:v for k,v in merged.items() if k!='verifiedAt'}:
                    candidate = {**results,'matches':[m for m in known.values() if m['id'] != f['id']]+[merged]}
                    validate_results(candidate)
                    known[f['id']] = merged
                    changes['results'] += 1
            elif xis:
                updated = {**merge_lineups(f.get('lineups',{}), xis), 'sourceUrl':url, 'verifiedAt':stamp}
                if {k:v for k,v in updated.items() if k!='verifiedAt'} != {k:v for k,v in f.get('lineups',{}).items() if k!='verifiedAt'}:
                    previous = f.get('lineups')
                    f['lineups'] = updated
                    try:
                        validate_season(season)
                    except Exception:
                        if previous is None:
                            f.pop('lineups',None)
                        else:
                            f['lineups'] = previous
                        raise
                    changes['lineups'] += 1
        except Exception as exc:
            failures.append(f['id'] + ': ' + str(exc))
            if f['id'] not in known:
                pending.append(('FT ' if delta < -timedelta(hours=2) else 'XI ') + f['id'])
    if kind in ('hourly', 'morning', 'lineup-early', 'lineup-late'):
        try:
            from stream_update import update_streams
            stream_issues = []
            changes['streams'] = update_streams(season, stamp, failures=stream_issues)
            failures.extend(stream_issues)
            sources['streams'] = {'checkedAt':stamp, 'outcome':'partial' if stream_issues else 'ok'}
            links.append({'label':'Official ISL YouTube Live listing','url':'https://www.youtube.com/@IndianSuperLeague/streams'})
        except Exception as exc:
            failures.append('YouTube: ' + str(exc))
            sources['streams'] = {'checkedAt':stamp, 'outcome':'error', 'error':str(exc)[:250]}
    results['matches'] = sorted(known.values(), key=lambda m:(m['date'], m['id']))
    if changes['results']:
        results['updatedAt'] = stamp
    update_lifecycle(season, results, state, stamp)
    state['pending'] = sorted(set(pending))
    state['lastCheck'] = {'checkedAt':stamp, 'kind':kind, 'failures':failures, 'changes':changes}
    changed = sum(changes.values())
    summary = (f"{checked} match centres checked; updates: " +
               ', '.join(f"{k} {v}" for k,v in changes.items()) +
               f". Phase: {state['phase']}. {len(pending)} pending; {len(failures)} errors.")
    if failures:
        summary += ' ' + '; '.join(failures)
    elif pending:
        summary += ' Retrying ' + ', '.join(pending) + '.'
    outcome = ('error' if failures and not links else 'partial' if failures or pending
               else 'updated' if changed else 'no-change')
    record = {'checkedAt':datetime.now(timezone.utc).isoformat(), 'kind':kind,
              'outcome':outcome, 'summary':summary[:400], 'links':links[:8]}
    log['checks'] = sorted([record]+log['checks'], key=lambda r:r['checkedAt'], reverse=True)[:336]
    validate_results(results); validate_season(season); validate_update_log(log)
    # Validate everything before touching any snapshot. Git publishes the set atomically.
    for name, value in [('isl-season',season), ('isl-results',results),
                        ('update-log',log), ('automation-state',state)]:
        path = root/('data/'+name+'.json')
        temporary = path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(value,indent=2,ensure_ascii=False)+'\n')
        temporary.replace(path)
    print(summary[:400])
    for failure in failures:
        print('WARNING:', failure)
    # An incomplete source check is visible as a failed Action, even when its
    # successfully verified records and error log were committed.
    return 1 if failures else 0


def main():
    raise SystemExit(run(sys.argv[1] if len(sys.argv)>1 else 'hourly'))


if __name__ == '__main__':
    main()
