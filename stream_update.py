"""Verify official YouTube stream metadata without guessing links or language."""
from datetime import datetime, timedelta, timezone
import re
from yt_dlp import YoutubeDL

CHANNEL = 'https://www.youtube.com/@IndianSuperLeague'
CHANNEL_ID = 'UCJk-aQ7NZtqYtpcqKDt_vZg'
HINDI = re.compile(r'\b(?:hindi|hin)\b|हिंदी|हिन्दी', re.I)
NON_ENGLISH = re.compile(r'\b(?:hindi|hin|malayalam|tamil|bangla|bengali|marathi|vertical|shorts)\b|हिंदी|हिन्दी', re.I)

def update_streams(season, stamp):
    opts = {'quiet':True,'no_warnings':True,'extract_flat':True,'playlistend':30,'socket_timeout':15,'retries':1,'ignore_no_formats_error':True,'skip_download':True}
    with YoutubeDL(opts) as ydl:
        listing = ydl.extract_info(CHANNEL+'/streams',download=False)
    if not listing or not isinstance(listing.get('entries'),list):
        raise ValueError('YouTube Live listing unavailable')
    if listing.get('channel_id') != CHANNEL_ID:
        raise ValueError('Official ISL channel identity mismatch')
    names = {t['id']:t['name'] for t in season['teams']}
    aliases = {'Inter Kashi FC':['inter kashi'],'NorthEast United FC':['northeast united','north east united'],'Mohun Bagan Super Giant':['mohun bagan'],'Kerala Blasters FC':['kerala blasters'],'Bengaluru FC':['bengaluru'],'FC Goa':['fc goa','goa'],'Chennaiyin FC':['chennaiyin']}
    def mentioned(title, name):
        return any(x in title for x in aliases.get(name,[name.lower().removesuffix(' fc')]))
    now = datetime.now(timezone.utc)
    updates = 0
    for entry in listing['entries']:
        title = entry.get('title','')
        low = title.lower()
        video = entry.get('id','')
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}',video) or NON_ENGLISH.search(title) or any(x in low for x in ['highlights','press conference']): continue
        matches = [f for f in season['fixtures'] if -timedelta(days=3) <= datetime.fromisoformat(f['kickoff']).astimezone(timezone.utc)-now <= timedelta(days=14) and mentioned(low,names[f['homeId']]) and mentioned(low,names[f['awayId']])]
        if len(matches)!=1: continue
        f=matches[0]
        url='https://www.youtube.com/live/'+video
        with YoutubeDL({**opts,'extract_flat':False}) as ydl:
            meta=ydl.extract_info(url,download=False)
        if meta.get('channel_id') != listing.get('channel_id') or not meta.get('channel_id'):
            continue
        start=meta.get('release_timestamp')
        if start is None: continue
        kickoff=datetime.fromisoformat(f['kickoff']).timestamp()
        if abs(start-kickoff)>7200: continue
        title=meta.get('title','');low=title.lower()
        if NON_ENGLISH.search(title) or 'highlights' in low: continue
        candidate=f.get('streamCandidate',{})
        old=f.get('broadcast',{})
        explicit=bool(re.search(r'\b(english|eng)\b',low))
        paired_hindi=any(HINDI.search(e.get('title','')) and '2026-27' in e.get('title','') and mentioned(e.get('title','').lower(),names[f['homeId']]) and mentioned(e.get('title','').lower(),names[f['awayId']]) for e in listing['entries'])
        corroborated=paired_hindi or (candidate.get('url')==url and candidate.get('language')=='English') or (old.get('url')==url and old.get('language')=='English')
        if not explicit and not corroborated: continue
        status={'is_upcoming':'scheduled','is_live':'live','was_live':'ended','post_live':'ended'}.get(meta.get('live_status'))
        if not status: continue
        broadcast={'url':url,'title':title,'channelUrl':CHANNEL,'language':'English','status':status,'verifiedAt':stamp}
        if not explicit: broadcast['languageEvidence']='official-default-unlabelled'
        if {k:v for k,v in old.items() if k!='verifiedAt'} != {k:v for k,v in broadcast.items() if k!='verifiedAt'}:
            f['broadcast']=broadcast
            f.pop('streamCandidate',None)
            updates+=1
    return updates

