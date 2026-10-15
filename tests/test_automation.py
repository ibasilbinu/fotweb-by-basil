"""Regression tests for publication, phase gaps and partial upstream failures."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from http.client import IncompleteRead
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import quote

import automated_update as importer
from fixture_update import extract_schedule, merge_fixtures, update_lifecycle
import stream_update
import fixture_update
from season import validate_season
from postmatch import validate_results

ROOT = Path(__file__).resolve().parents[1]
STAMP = '2026-10-12T17:50:00+00:00'


def sample_season():
    return deepcopy(json.loads((ROOT/'data/isl-season.json').read_text()))


def payload(fixture, complete=True, stage='League', minutes=90):
    day = datetime.fromisoformat(fixture['kickoff']).strftime('%m/%d/%Y')
    return {'match_detail':{'match_id':int(fixture['id']),
            'series':{'name':'Indian Super League, 2026-27'}, 'matchdate_ist':day,
            'is_completed':complete, 'match_stage':stage, 'clock':{'minutes':minutes},
            'result':{'winning_team_id':int(fixture['homeId'])}},
            'teams':[{'id':int(fixture[s+'Id']), 'is_home_team':s=='home', 'score':2 if s=='home' else 1,
                      'players':[{'name':s+str(i), 'jersey_no':str(i), 'is_started':True} for i in range(1,12)]}
                     for s in ('home','away')]}


def schedule_row(f):
    return {'sport':'football', 'series_name':'Indian Super League, 2026-27',
            'league_code':'india_sl', 'game_id':f['id'], 'start_date':f['kickoff'],
            'participants':[{'id':f['homeId']},{'id':f['awayId']}], 'event_stage':'league',
            'venue_name':None, 'event_name':f.get('label', 'Match'), 'event_status':'Yet to begin'}


class MatchTests(unittest.TestCase):
    def setUp(self):
        self.season = sample_season()
        self.f = self.season['fixtures'][0]
        self.names = {t['id']:t['name'] for t in self.season['teams']}

    def convert(self, data, warnings=None):
        return importer.convert(data, self.f, self.names, STAMP, warnings)

    def test_apostrophe_in_encoded_payload(self):
        data = payload(self.f)
        data['teams'][0]['players'][0]['name'] = "L'engmawia"
        document = '<script>window.x="'+quote(json.dumps({'matchData':data}), safe="'")+'";</script>'
        self.assertEqual(importer.extract_match(document), data)

    def test_incomplete_game_only_publishes_confirmed_xi(self):
        match, xis = self.convert(payload(self.f, complete=False))
        self.assertIsNone(match)
        self.assertEqual(len(xis['home']['starters']), 11)
        d = payload(self.f, complete=False); d['teams'][0]['players'].pop()
        self.assertNotIn('home', self.convert(d)[1])

    def test_wrong_season_clubs_and_date_rejected(self):
        for field in ('season', 'clubs', 'date'):
            data = payload(self.f)
            if field == 'season': data['match_detail']['series']['name'] = 'Indian Super League, 2025-26'
            if field == 'clubs': data['teams'][0]['id'] = 9999
            if field == 'date': data['match_detail']['matchdate_ist'] = '10/30/2026'
            with self.subTest(field=field), self.assertRaises(ValueError): self.convert(data)

    def test_bad_optional_stats_do_not_block_confirmed_score(self):
        data = payload(self.f); data['teams'][0]['stats'] = {'possession_percentage':300}
        warnings = []; match, _ = self.convert(data, warnings)
        self.assertEqual((match['status'], match['homeGoals']), ('FT', 2))
        self.assertTrue(warnings)
        validate_results({'schemaVersion':1, 'season':'2026-27', 'matches':[match]})

    def test_null_optional_details_do_not_block_ft(self):
        data = payload(self.f); data['teams'][0]['stats'] = None
        warnings = []; match, _ = self.convert(data, warnings)
        self.assertEqual(match['status'], 'FT'); self.assertTrue(warnings)

    def test_final_after_extra_time_and_penalties(self):
        data = payload(self.f, stage='Final', minutes=120)
        match, _ = self.convert(data)
        self.assertEqual((match['status'], match['phase'], match['winnerId']), ('AET','playoff',self.f['homeId']))
        data['match_detail']['is_shootout'] = True
        for t, pens in zip(data['teams'], (4,3)): t.update(score=1, shootout_score=pens)
        match, _ = self.convert(data)
        self.assertEqual(match['status'], 'PEN')
        self.assertEqual(match['penalties'], {'home':4,'away':3})
        self.assertEqual(match['homeGoals'], 1)


class FixtureTests(unittest.TestCase):
    def setUp(self):
        self.season = sample_season(); self.f = self.season['fixtures'][0]

    def test_duplicate_widgets_and_season_filter(self):
        row = schedule_row(self.f)
        wrong = {**row, 'series_name':'Indian Super League, 2025-26'}
        self.assertEqual(extract_schedule(json.dumps([row, row, wrong])), [row])
        with self.assertRaises(ValueError): extract_schedule(json.dumps([wrong]))
        with self.assertRaises(ValueError): extract_schedule(json.dumps([row, {**row, 'start_date':'2027-01-01T17:00+05:30'}]))

    def test_widget_with_reordered_record_properties(self):
        row = schedule_row(self.f)
        reordered = {'game_id':row['game_id'], **row}
        document = '<script>window.fixtures_11_1 = '+json.dumps({'matches':[reordered]})+';</script>'
        self.assertEqual(extract_schedule(document),[reordered])

    def test_truncated_http_response_is_retried_without_using_partial_data(self):
        with patch.object(fixture_update, 'urlopen') as open_url:
            response = open_url.return_value.__enter__.return_value
            response.read.side_effect = [IncompleteRead(b'partial'), b'complete']
            self.assertEqual(fixture_update.fetch_text('https://example.com'), 'complete')
            self.assertEqual(open_url.call_count, 2)

    def test_incomplete_listing_preserves_all_existing_records(self):
        before = deepcopy(self.season)
        changed, errors = merge_fixtures(self.season, [schedule_row(self.f)], STAMP)
        self.assertFalse(errors); self.assertEqual(len(self.season['fixtures']), len(before['fixtures']))
        self.assertEqual(self.season['fixtures'][0]['broadcast'], self.f['broadcast'])
        self.assertEqual(self.season['fixtures'][0]['venue'], self.f['venue'])

    def test_phase_two_discovered_and_reschedule_invalidates_stale_links(self):
        row = schedule_row(self.f); row.update(game_id='999001', start_date='2027-02-01T17:00+05:30')
        _, errors = merge_fixtures(self.season, [row], STAMP)
        self.assertFalse(errors); self.assertIn('999001', [f['id'] for f in self.season['fixtures']])
        row = schedule_row(self.f); row['start_date'] = '2026-10-18T17:00+05:30'
        merge_fixtures(self.season, [row], STAMP)
        updated = next(f for f in self.season['fixtures'] if f['id'] == self.f['id'])
        self.assertNotIn('broadcast', updated)
        validate_season(self.season)

    def test_resolved_duplicate_is_not_restored_or_counted_as_unplayed(self):
        kept = next(f for f in self.season['fixtures'] if f['id'] == '194691')
        duplicate = schedule_row(kept)
        duplicate.update(game_id='194690', start_date='2026-11-17T19:30+05:30')
        _, errors = merge_fixtures(self.season, [duplicate, schedule_row(kept)], STAMP)
        self.assertFalse(errors)
        self.assertNotIn('194690', [f['id'] for f in self.season['fixtures']])
        self.assertNotIn('needsConfirmation', kept)
        self.assertEqual(kept['kickoff'], '2026-12-17T19:30+05:30')
        self.season['fixtures'] = [kept]
        state = {'phaseOneFixtureIds':['194690','194691'],
                 'phaseOneLastKickoff':kept['kickoff']}
        update_lifecycle(self.season, {'matches':[{'id':'194691'}]}, state, STAMP)
        self.assertEqual(state['phase'], 'awaiting-next-phase')

    def test_resolved_duplicate_does_not_hide_changed_clubs(self):
        kept = next(f for f in self.season['fixtures'] if f['id'] == '194691')
        duplicate = schedule_row(kept)
        duplicate['game_id'] = '194690'
        duplicate['participants'][1]['id'] = '505'
        _, errors = merge_fixtures(self.season, [duplicate], STAMP)
        self.assertTrue(errors)
        self.assertNotIn('194690', [f['id'] for f in self.season['fixtures']])

    def test_unknown_clubs_do_not_delete_valid_schedule(self):
        row = schedule_row(self.f); row['participants'][0]['id'] = '9999'
        before = deepcopy(self.season)
        _, errors = merge_fixtures(self.season, [row], STAMP)
        self.assertTrue(errors); self.assertEqual(self.season, before)

    def test_phase_gap_and_semifinal_do_not_end_season(self):
        self.season['fixtures'] = [self.f]
        state = {'phaseOneFixtureIds':[self.f['id']], 'phaseOneLastKickoff':self.f['kickoff']}
        names = {t['id']:t['name'] for t in self.season['teams']}
        match, _ = importer.convert(payload(self.f), self.f, names, STAMP)
        update_lifecycle(self.season, {'matches':[match]}, state, STAMP)
        self.assertEqual(state['phase'], 'awaiting-next-phase'); self.assertNotIn('champion',state)
        match['officialStage'] = 'Semi Final'
        update_lifecycle(self.season, {'matches':[match]}, state, STAMP)
        self.assertNotIn('champion', state)
        row = schedule_row(self.f); row.update(game_id='999001', start_date='2027-02-01T17:00+05:30')
        merge_fixtures(self.season, [row], STAMP)
        update_lifecycle(self.season, {'matches':[match]}, state, STAMP)
        self.assertEqual(state['phase'], 'later-phases')
        match['officialStage'] = 'Final'
        update_lifecycle(self.season, {'matches':[match]}, state, STAMP)
        self.assertEqual(state['phase'], 'complete')
        self.assertEqual(state['champion']['teamId'],self.f['homeId'])


class StreamTests(unittest.TestCase):
    def setUp(self):
        self.season = sample_season()
        base = deepcopy(self.season['fixtures'][0]); base.update(id='999100', kickoff='2027-02-01T17:00+05:30')
        base.pop('broadcast',None)
        other = {**base, 'id':'999101', 'kickoff':'2027-03-01T17:00+05:30'}
        self.season['fixtures'] = [base,other]
        self.title = 'LIVE Bengaluru FC vs Sporting Club Delhi | ISL 2026-27 | English'
        self.video = 'abcdefghijk'
        self.meta = {'channel_id':stream_update.CHANNEL_ID,'release_timestamp':datetime.fromisoformat(base['kickoff']).timestamp(),
                     'title':self.title, 'live_status':'is_upcoming'}

    def update(self, entries, metadata):
        listing = {'channel_id':stream_update.CHANNEL_ID, 'entries':entries}
        def extract(url, download=False):
            if url.endswith('/streams'): return listing
            value = metadata[url.split('v=')[-1] if 'v=' in url else url.rsplit('/',1)[-1]]
            if isinstance(value, Exception): raise value
            return value
        with patch.object(stream_update, 'fetch_text', side_effect=OSError('use alternate metadata')), patch.object(stream_update, 'YoutubeDL') as ydl:
            ydl.return_value.__enter__.return_value.extract_info.side_effect = extract
            failures = []; changed = stream_update.update_streams(self.season, STAMP, failures)
        return changed, failures

    def test_official_live_tab_refreshes_only_existing_verified_replays(self):
        self.season['fixtures'] = [self.season['fixtures'][0]]
        f = self.season['fixtures'][0]
        f['kickoff'] = '2026-10-12T19:30:00+05:30'
        f['broadcast'] = {'url':'https://www.youtube.com/live/'+self.video,
            'title':self.title,'channelUrl':stream_update.CHANNEL,'language':'English',
            'status':'scheduled','verifiedAt':STAMP}
        entry = {'id':self.video,'title':self.title.replace('LIVE','FULL REPLAY'), 'live_status':'was_live'}
        changed, failures = self.update([entry], {})
        self.assertEqual(changed,1); self.assertFalse(failures)
        self.assertEqual(f['broadcast']['status'],'ended')
        f.pop('broadcast')
        changed, failures = self.update([entry], {self.video:OSError('metadata unavailable')})
        self.assertEqual(changed,0); self.assertTrue(failures)
        self.assertNotIn('broadcast',f)

    def test_official_replay_listing_rejects_conflicting_channel(self):
        f = self.season['fixtures'][0]
        f['kickoff'] = '2026-10-12T19:30:00+05:30'
        f['broadcast'] = {'url':'https://www.youtube.com/live/'+self.video,
            'title':self.title,'channelUrl':stream_update.CHANNEL,'language':'English',
            'status':'scheduled','verifiedAt':STAMP}
        entry = {'id':self.video,'title':self.title, 'live_status':'was_live', 'channel_id':'wrong-channel'}
        changed, failures = self.update([entry], {self.video:{**self.meta, 'channel_id':'wrong-channel'}})
        self.assertEqual(changed,0); self.assertTrue(failures)
        self.assertEqual(f['broadcast']['status'],'scheduled')

    def test_verified_existing_feed_wins_over_duplicate_unlabelled_replay(self):
        self.season['fixtures'][0]['broadcast'] = {'url':'https://www.youtube.com/live/'+self.video,
            'title':self.title,'channelUrl':stream_update.CHANNEL,'language':'English',
            'status':'scheduled','verifiedAt':STAMP}
        duplicate = 'duplicate01'
        changed, failures = self.update([{'id':duplicate,'title':self.title},{'id':self.video,'title':self.title}],
            {duplicate:self.meta,self.video:self.meta})
        self.assertEqual(changed,0); self.assertFalse(failures)
        self.assertTrue(self.season['fixtures'][0]['broadcast']['url'].endswith(self.video))

    def test_public_watch_metadata_handles_upcoming_and_ended(self):
        player = {'videoDetails':{'videoId':self.video, 'channelId':stream_update.CHANNEL_ID,
                  'title':self.title,'isLiveContent':True},
                  'microformat':{'playerMicroformatRenderer':{'liveBroadcastDetails':
                      {'isLiveNow':False,'startTimestamp':'2027-02-01T11:00:00Z'}}}}
        doc = 'var ytInitialPlayerResponse = '+json.dumps(player)+';'
        meta = stream_update.extract_video_metadata(doc,self.video,datetime.fromisoformat(STAMP))
        self.assertEqual(meta['live_status'],'is_upcoming')
        player['videoDetails'].pop('channelId')
        player['microformat']['playerMicroformatRenderer']['externalChannelId'] = stream_update.CHANNEL_ID
        alt = stream_update.extract_video_metadata('ytInitialPlayerResponse = '+json.dumps(player),self.video,datetime.fromisoformat(STAMP))
        self.assertEqual(alt['channel_id'],stream_update.CHANNEL_ID)
        player['microformat']['playerMicroformatRenderer']['liveBroadcastDetails']['endTimestamp'] = '2027-02-01T14:00:00Z'
        meta = stream_update.extract_video_metadata('ytInitialPlayerResponse = '+json.dumps(player),self.video,datetime.fromisoformat(STAMP))
        self.assertEqual(meta['live_status'],'was_live')
        with self.assertRaises(ValueError):
            stream_update.extract_video_metadata(doc,'wrongvideo1',datetime.fromisoformat(STAMP))

    def test_distant_scheduled_stream_and_return_fixture_disambiguation(self):
        changed, failures = self.update([{'id':self.video,'title':self.title}], {self.video:self.meta})
        self.assertEqual(changed,1); self.assertFalse(failures)
        self.assertIn('broadcast',self.season['fixtures'][0]); self.assertNotIn('broadcast',self.season['fixtures'][1])

    def test_one_video_failure_does_not_block_other_video(self):
        bad = 'badbadbad11'
        changed, failures = self.update([{'id':bad,'title':self.title},{'id':self.video,'title':self.title}],
                                        {bad:OSError('temporary source error'),self.video:self.meta})
        self.assertEqual(changed,1); self.assertEqual(len(failures),1)

    def test_wrong_channel_and_hindi_are_not_published(self):
        meta = {**self.meta,'channel_id':'different-channel'}
        changed, failures = self.update([{'id':self.video,'title':self.title}], {self.video:meta})
        self.assertEqual(changed,0); self.assertTrue(failures)
        changed, _ = self.update([{'id':self.video,'title':self.title.replace('English','Hindi')}], {})
        self.assertEqual(changed,0)

    def test_unlabelled_official_default_with_hindi_alternative(self):
        title = self.title.replace(' | English','')
        changed, failures = self.update([{'id':self.video,'title':title}, {'id':'hindihindi1','title':title+' | Hindi'}],
                                        {self.video:{**self.meta,'title':title}})
        self.assertEqual(changed,1); self.assertFalse(failures)
        self.assertEqual(self.season['fixtures'][0]['broadcast']['languageEvidence'],'official-default-unlabelled')


class RunTests(unittest.TestCase):
    def setup_root(self, path):
        (path/'data').mkdir()
        season = sample_season(); season['fixtures'] = [season['fixtures'][0]]
        values = {'isl-season':season, 'isl-results':{'schemaVersion':1,'season':'2026-27','matches':[],'updatedAt':None},
                  'update-log':{'schemaVersion':1,'season':'2026-27','checks':[]},
                  'automation-state':{'schemaVersion':1,'season':'2026-27','phaseOneFixtureIds':[season['fixtures'][0]['id']],
                                      'phaseOneLastKickoff':season['fixtures'][0]['kickoff']}}
        for name,value in values.items(): (path/f'data/{name}.json').write_text(json.dumps(value))
        return season

    def test_source_failure_keeps_ft_publication_and_records_error(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); season = self.setup_root(root)
            data = payload(season['fixtures'][0])
            doc = 'x="'+quote(json.dumps({'matchData':data}))+'"'
            with patch.object(importer,'fetch_text',return_value=doc), patch.object(importer,'update_fixtures',side_effect=OSError('upstream unavailable')), patch.object(stream_update,'update_streams',return_value=0):
                status = importer.run('hourly',root,datetime.fromisoformat(STAMP))
            self.assertEqual(status,1)
            result = json.loads((root/'data/isl-results.json').read_text())
            self.assertEqual(result['matches'][0]['homeGoals'],2)
            log = json.loads((root/'data/update-log.json').read_text())
            self.assertEqual(log['checks'][0]['outcome'],'partial')
            self.assertIn('upstream unavailable',log['checks'][0]['summary'])

    def test_old_unresolved_match_is_retried_not_expired(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); season = self.setup_root(root)
            data = payload(season['fixtures'][0])
            doc = 'x="'+quote(json.dumps({'matchData':data}))+'"'
            with patch.object(importer,'fetch_text',return_value=doc) as fetch:
                self.assertEqual(importer.run('match-retry',root,datetime.fromisoformat('2026-11-01T12:00:00+00:00')),0)
            fetch.assert_called_once()
            self.assertEqual(len(json.loads((root/'data/isl-results.json').read_text())['matches']),1)

    def test_clearance_pair_reset_is_preserved_and_pending_but_single_zero_is_allowed(self):
        for incoming, protected in [((0, 0), True), ((0, 22), False), ((26, 21), False)]:
            with self.subTest(incoming=incoming), tempfile.TemporaryDirectory() as directory:
                root = Path(directory); season = self.setup_root(root)
                fixture = season['fixtures'][0]
                names = {t['id']: t['name'] for t in season['teams']}
                data = payload(fixture)
                for team, value in zip(data['teams'], (26, 22)):
                    team['stats'] = {'touches': {'clearance': value}}
                old, _ = importer.convert(data, fixture, names, STAMP)
                results = {'schemaVersion': 1, 'season': '2026-27', 'matches': [old], 'updatedAt': STAMP}
                (root/'data/isl-results.json').write_text(json.dumps(results))
                for team, value in zip(data['teams'], incoming):
                    team['stats']['touches']['clearance'] = value
                doc = 'x="'+quote(json.dumps({'matchData': data}))+'"'
                with patch.object(importer, 'fetch_text', return_value=doc):
                    status = importer.run('match-retry', root, datetime.fromisoformat(STAMP))
                saved = json.loads((root/'data/isl-results.json').read_text())
                pair = tuple(saved['matches'][0]['stats'][side]['clearances'] for side in ('home', 'away'))
                self.assertEqual(pair, (26, 22) if protected else incoming)
                self.assertEqual(status, int(protected))
                state = json.loads((root/'data/automation-state.json').read_text())
                self.assertEqual('Clearances '+fixture['id'] in state['pending'], protected)
                if protected:
                    self.assertEqual(saved, results)
                    self.assertEqual(state['lastCheck']['changes']['results'], 0)
                    log = json.loads((root/'data/update-log.json').read_text())
                    self.assertEqual(log['checks'][0]['outcome'], 'partial')

    def test_missing_xi_is_pending_and_existing_scores_remain(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); season = self.setup_root(root)
            data = payload(season['fixtures'][0],complete=False)
            for t in data['teams']: t['players'] = []
            doc = 'x="'+quote(json.dumps({'matchData':data}))+'"'
            now = datetime.fromisoformat(season['fixtures'][0]['kickoff'])-timedelta(minutes=30)
            with patch.object(importer,'fetch_text',return_value=doc), patch.object(stream_update,'update_streams',return_value=0):
                importer.run('lineup-early',root,now)
            state = json.loads((root/'data/automation-state.json').read_text())
            self.assertEqual(state['pending'],['XI '+season['fixtures'][0]['id']])


if __name__ == '__main__': unittest.main()
