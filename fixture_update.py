"""Discover published ISL fixtures without replacing a good snapshot with a partial feed."""
from copy import deepcopy
from datetime import datetime
from http.client import HTTPException
import json
import re
from urllib.request import Request, urlopen

from season import validate_season

SEASON_NAME = 'Indian Super League, 2026-27'
SCHEDULE_URL = 'https://www.indiansuperleague.com/schedule-fixtures'
SEASON_URL = SCHEDULE_URL + '/2026'


def fetch_text(url):
    for attempt in range(2):
        try:
            request = Request(url, headers={
                'User-Agent': 'Mozilla/5.0 FotWeb/1.0', 'Cache-Control': 'no-cache'})
            with urlopen(request, timeout=20) as response:
                return response.read(8_000_000).decode('utf-8')
        except (OSError, HTTPException):
            if attempt == 1:
                raise


def extract_schedule(document):
    # ISL embeds ordinary JSON objects in its schedule widget. Decode JSON only;
    # never evaluate the page's JavaScript. Duplicate desktop/mobile widgets are normal.
    records = {}
    decoder = json.JSONDecoder()
    def rows(value):
        if isinstance(value, dict):
            if value.get('sport') == 'football' and 'game_id' in value:
                yield value
            else:
                for child in value.values():
                    yield from rows(child)
        elif isinstance(value, list):
            for child in value:
                yield from rows(child)
    # Parse complete widget assignments: property order differs across fixtures.
    containers = []
    for found in re.finditer(r'(?:^|=)\s*([\{\[])', document):
        try:
            value, _ = decoder.raw_decode(document[found.start(1):])
            containers.append(value)
        except ValueError:
            continue
    for row in (row for value in containers for row in rows(value)):
        if row.get('series_name') != SEASON_NAME or row.get('league_code') != 'india_sl':
            continue
        match_id = str(row.get('game_id', ''))
        if not match_id.isdigit():
            continue
        old = records.get(match_id)
        fields = ('start_date', 'participants', 'event_stage', 'event_status_id', 'venue_name')
        if old and any(old.get(k) != row.get(k) for k in fields):
            raise ValueError('Conflicting official schedule entries for ' + match_id)
        records[match_id] = row
    if not records:
        raise ValueError('No structured fixtures for ISL 2026-27; retained saved schedule')
    return list(records.values())


def competition_phase(stage):
    stage = str(stage).lower()
    if stage == 'league':
        return 'league'
    if any(word in stage for word in ('final', 'play', 'knockout', 'eliminator')):
        return 'playoff'
    return 'unknown'


def merge_fixtures(season, records, stamp):
    candidate = deepcopy(season)
    known = {f['id']: f for f in candidate['fixtures']}
    # Retain explicit duplicate resolutions across repeated source imports.
    # A resolution is scoped to the exact old ID and the same home/away clubs;
    # a new phase or a different fixture ID is still discovered normally.
    superseded = {old_id: f for f in known.values()
                  for old_id in f.get('supersedesFixtureIds', [])}
    team_ids = {t['id'] for t in season['teams']}
    changed, failures = 0, []
    for row in records:
        match_id = str(row['game_id'])
        try:
            teams = row['participants']
            # The official schedule reserves some playoff slots with both clubs
            # linked to its TBC profile (club ID 0). They are not fixtures yet.
            if (isinstance(teams, list) and len(teams) == 2
                    and all(isinstance(team, dict) and str(team.get('id')) == '0'
                            for team in teams)):
                continue
            if len(teams) != 2 or any(str(t['id']) not in team_ids for t in teams):
                raise ValueError('Clubs not confirmed; will retry discovery')
            source_kickoff = datetime.fromisoformat(row['start_date'])
            if source_kickoff.tzinfo is None or source_kickoff.year not in (2026, 2027):
                raise ValueError('Invalid or unconfirmed kickoff')
            old = known.get(match_id, {})
            home, away = str(teams[0]['id']), str(teams[1]['id'])
            if match_id in superseded:
                replacement = superseded[match_id]
                if (replacement['homeId'], replacement['awayId']) != (home, away):
                    raise ValueError('Resolved duplicate clubs changed; needs review')
                continue
            effective_kickoff = row['start_date']
            use_saved_correction = False
            clear_correction = False
            correction = old.get('identityCorrection')
            if correction:
                previous = correction['previous']
                current = correction['current']
                source_identity = (home, away, source_kickoff)
                previous_identity = (previous['homeId'], previous['awayId'],
                                     datetime.fromisoformat(previous['kickoff']))
                current_identity = (current['homeId'], current['awayId'],
                                    datetime.fromisoformat(current['kickoff']))
                if source_identity == previous_identity:
                    # The public schedule widget is still serving the exact old
                    # identity. Keep the match-centre-verified correction until
                    # the schedule source catches up.
                    home, away = current['homeId'], current['awayId']
                    effective_kickoff = current['kickoff']
                    use_saved_correction = True
                elif source_identity == current_identity:
                    clear_correction = True
                elif (home, away) == (old['homeId'], old['awayId']):
                    # Same corrected clubs with a newer official kickoff: treat
                    # it as a new schedule change and reverify pre-match links.
                    clear_correction = True
                else:
                    raise ValueError('Fixture identity differs from both the saved schedule and its verified match-centre correction')
            elif old and (old['homeId'], old['awayId']) != (home, away):
                raise ValueError('Fixture clubs changed; retained verified identity')
            kickoff = datetime.fromisoformat(effective_kickoff)
            if kickoff.tzinfo is None or kickoff.year not in (2026, 2027):
                raise ValueError('Invalid or unconfirmed corrected kickoff')
            status_text = str(row.get('event_status', '')).lower()
            status = ('CANC' if 'cancel' in status_text else 'PST'
                      if any(w in status_text for w in ('postpon', 'suspend', 'abandon')) else 'NS')
            updated = {**old, 'id': match_id, 'homeId': home, 'awayId': away,
                       'kickoff': effective_kickoff, 'status': status,
                       'phase': competition_phase(row.get('event_stage')),
                       'officialStage': row.get('event_stage', ''),
                       'label': row.get('event_name') or old.get('label', 'ISL match'),
                       'sourceUrl': SCHEDULE_URL}
            if use_saved_correction:
                updated['identityCorrection'] = correction
                updated['venue'] = correction['current']['venue']
            else:
                if clear_correction:
                    updated.pop('identityCorrection', None)
                # Missing venue fields in this listing must not undo a sourced venue.
                venue = row.get('venue_name')
                if venue and venue.strip().lower() not in ('tbc', 'tbd', 'venue tbc'):
                    updated['venue'] = venue
                else:
                    updated['venue'] = old.get('venue')
                    if old.get('sourceUrl'):
                        updated['sourceUrl'] = old['sourceUrl']
            if old.get('kickoff') and datetime.fromisoformat(old['kickoff']) != kickoff:
                # A rescheduled game needs a fresh XI and a freshly verified broadcast.
                updated.pop('lineups', None)
                updated.pop('broadcast', None)
                updated.pop('streamCandidate', None)
            if updated != old:
                trial = {**candidate, 'fixtures': [f for k, f in known.items()
                                                  if k != match_id] + [updated]}
                validate_season(trial)
                known[match_id] = updated
                changed += 1
        except (KeyError, ValueError, TypeError) as exc:
            failures.append('Fixture ' + match_id + ': ' + str(exc))
    candidate['fixtures'] = sorted(known.values(), key=lambda f: (f['kickoff'], f['id']))
    if changed:
        candidate['verifiedAt'] = stamp
    validate_season(candidate)
    season.clear()
    season.update(candidate)
    return changed, failures


def update_fixtures(season, stamp):
    errors = []
    for url in (SCHEDULE_URL, SEASON_URL):
        try:
            records = extract_schedule(fetch_text(url))
            changed, failures = merge_fixtures(season, records, stamp)
            return changed, failures, records
        except (OSError, ValueError) as exc:
            errors.append(str(exc))
    raise ValueError('Schedule discovery failed: ' + '; '.join(errors))


def update_lifecycle(season, results, state, stamp):
    """Phase gaps never end the watcher. Only a sourced, completed final does."""
    if state.get('champion'):
        return
    fixtures = {f['id']: f for f in season['fixtures']}
    completed = {m['id']: m for m in results['matches']}
    superseded = {old_id for f in fixtures.values()
                  for old_id in f.get('supersedesFixtureIds', [])}
    baseline = set(state['phaseOneFixtureIds']) - superseded
    phase_one_done = all(i in completed or fixtures.get(i, {}).get('status') == 'CANC'
                         for i in baseline)
    later = any(f['phase'] == 'playoff' or
                (f['id'] not in baseline and f['kickoff'] > state['phaseOneLastKickoff'])
                for f in season['fixtures'])
    state['phase'] = 'later-phases' if later else 'awaiting-next-phase' if phase_one_done else 'phase-one'
    if later:
        season['scheduleScope'] = 'Published fixtures · all announced phases'
    elif phase_one_done:
        season['scheduleScope'] = 'Phase 1 completed · checking for the next published phase'
    for match in completed.values():
        # "Semi-final" and league leaders must never terminate the season.
        if str(match.get('officialStage', '')).strip().lower() != 'final':
            continue
        winner = match.get('winnerId')
        fixture = fixtures.get(match['id'], {})
        if winner not in (fixture.get('homeId'), fixture.get('awayId')) or not winner:
            continue
        state['phase'] = 'complete'
        state['completedAt'] = stamp
        state['champion'] = {'teamId': winner, 'matchId': match['id'],
                             'sourceUrl': match['matchUrl'], 'verifiedAt': stamp}
        season['champion'] = state['champion']
        season['scheduleScope'] = 'Season completed · champions confirmed'
        break
