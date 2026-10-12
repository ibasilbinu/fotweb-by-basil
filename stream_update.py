"""Verify official YouTube stream metadata without guessing links or language."""
from datetime import datetime, timedelta, timezone
import re
import json
from yt_dlp import YoutubeDL
from season import validate_season
from fixture_update import fetch_text

CHANNEL = 'https://www.youtube.com/@IndianSuperLeague'
CHANNEL_ID = 'UCJk-aQ7NZtqYtpcqKDt_vZg'
HINDI = re.compile(r'\b(?:hindi|hin)\b|हिंदी|हिन्दी', re.I)
NON_ENGLISH = re.compile(r'\b(?:hindi|hin|malayalam|tamil|bangla|bengali|marathi|vertical|shorts)\b|हिंदी|हिन्दी', re.I)
ALIASES = {'Inter Kashi':['inter kashi'], 'Inter Kashi FC':['inter kashi'],
           'NorthEast United FC':['northeast united','north east united'],
           'Mohun Bagan Super Giant':['mohun bagan'], 'Kerala Blasters FC':['kerala blasters'],
           'Bengaluru FC':['bengaluru'], 'FC Goa':['fc goa','goa'], 'Chennaiyin FC':['chennaiyin']}


def mentioned(title, name):
    return any(re.search(r'\b'+re.escape(alias)+r'\b', title)
               for alias in ALIASES.get(name, [name.lower().removesuffix(' fc')]))


def extract_video_metadata(document, video, now):
    found = re.search(r'ytInitialPlayerResponse\s*=\s*(\{)', document)
    if not found:
        raise ValueError('Public YouTube player metadata unavailable')
    player, _ = json.JSONDecoder().raw_decode(document[found.start(1):])
    details = player.get('videoDetails') or {}
    live = (player.get('microformat', {}).get('playerMicroformatRenderer', {})
            .get('liveBroadcastDetails') or {})
    if details.get('videoId') != video or details.get('isPrivate'):
        raise ValueError('Video identity unavailable or private')
    start = datetime.fromisoformat(live['startTimestamp'].replace('Z', '+00:00'))
    if start.tzinfo is None or not details.get('isLiveContent'):
        raise ValueError('Not a dated live broadcast')
    status = ('is_live' if live.get('isLiveNow') is True else 'was_live'
              if live.get('endTimestamp') else 'is_upcoming'
              if details.get('isUpcoming') is True or start > now else None)
    if status is None:
        raise ValueError('Broadcast state unavailable')
    return {'channel_id':details.get('channelId'), 'title':details.get('title'),
            'release_timestamp':start.timestamp(), 'live_status':status}


def video_metadata(video, opts, now):
    # Read public schedule metadata directly. Media playback APIs are unnecessary
    # for links and may fail even while the public watch page is available.
    try:
        return extract_video_metadata(fetch_text('https://www.youtube.com/watch?v='+video), video, now)
    except (OSError, ValueError, TypeError, KeyError):
        with YoutubeDL({**opts, 'extract_flat':False}) as ydl:
            return ydl.extract_info('https://www.youtube.com/live/'+video, download=False)


def update_streams(season, stamp, failures=None):
    failures = failures if failures is not None else []
    opts = {'quiet':True, 'no_warnings':True, 'extract_flat':True, 'playlistend':100,
            'socket_timeout':15, 'retries':1, 'extractor_retries':1,
            'ignore_no_formats_error':True, 'skip_download':True}
    with YoutubeDL(opts) as ydl:
        listing = ydl.extract_info(CHANNEL+'/streams', download=False)
    if not listing or not isinstance(listing.get('entries'), list):
        raise ValueError('YouTube Live listing unavailable')
    if listing.get('channel_id') != CHANNEL_ID:
        raise ValueError('Official ISL channel identity mismatch')
    names = {t['id']:t['name'] for t in season['teams']}
    now = datetime.fromisoformat(stamp).astimezone(timezone.utc)
    fixtures = [f for f in season['fixtures'] if f['status'] == 'NS'
                and not f.get('needsConfirmation')
                and datetime.fromisoformat(f['kickoff']) >= now-timedelta(days=3)]
    entries = [e for e in listing['entries'] if isinstance(e, dict)]
    updates, selected = 0, set()
    for entry in entries:
        title = entry.get('title') or ''
        video = entry.get('id') or ''
        if (not re.fullmatch(r'[A-Za-z0-9_-]{11}', video) or NON_ENGLISH.search(title)
                or any(w in title.lower() for w in ('highlights', 'press conference', 'preview'))):
            continue
        # Find all published future fixtures, including later phases. Date matching
        # after metadata retrieval disambiguates the same clubs' return fixture.
        candidates = [f for f in fixtures if f['id'] not in selected
                      and mentioned(title.lower(), names[f['homeId']])
                      and mentioned(title.lower(), names[f['awayId']])]
        if not candidates:
            continue
        url = 'https://www.youtube.com/live/'+video
        try:
            meta = video_metadata(video, opts, now)
            if not meta or meta.get('channel_id') != CHANNEL_ID:
                raise ValueError('Official channel identity unavailable or mismatched')
            start = meta.get('release_timestamp')
            if start is None:
                raise ValueError('Scheduled stream start is not available yet')
            matches = [f for f in candidates
                       if abs(start-datetime.fromisoformat(f['kickoff']).timestamp()) <= 7200]
            if len(matches) != 1:
                continue
            f = matches[0]
            title = meta.get('title') or ''
            low = title.lower()
            if (NON_ENGLISH.search(title) or 'highlights' in low
                    or not all(mentioned(low, names[f[s+'Id']]) for s in ('home', 'away'))):
                continue
            candidate, old = f.get('streamCandidate', {}), f.get('broadcast', {})
            explicit = bool(re.search(r'\b(english|eng)\b', low))
            paired_hindi = any(HINDI.search(e.get('title') or '')
                               and '2026-27' in (e.get('title') or '')
                               and all(mentioned((e.get('title') or '').lower(), names[f[s+'Id']])
                                       for s in ('home', 'away')) for e in entries)
            corroborated = paired_hindi or any(x.get('url') == url and x.get('language') == 'English'
                                               for x in (candidate, old))
            if not explicit and not corroborated:
                failures.append('YouTube '+video+': English language confirmation pending')
                continue
            status = {'is_upcoming':'scheduled','is_live':'live','was_live':'ended',
                      'post_live':'ended'}.get(meta.get('live_status'))
            if not status:
                continue
            broadcast = {'url':url, 'title':title, 'channelUrl':CHANNEL, 'language':'English',
                         'status':status, 'verifiedAt':stamp}
            if not explicit:
                broadcast['languageEvidence'] = 'official-default-unlabelled'
            trial = {**season, 'fixtures':[{**x, 'broadcast':broadcast} if x['id'] == f['id'] else x
                                          for x in season['fixtures']]}
            validate_season(trial)
            if {k:v for k,v in old.items() if k!='verifiedAt'} != {k:v for k,v in broadcast.items() if k!='verifiedAt'}:
                f['broadcast'] = broadcast
                f.pop('streamCandidate', None)
                updates += 1
            selected.add(f['id'])
        except Exception as exc:
            # One inaccessible video cannot prevent the remaining scheduled streams.
            failures.append('YouTube '+video+': '+str(exc)[:180])
    return updates
