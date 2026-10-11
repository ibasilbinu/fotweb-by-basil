"""Load the official club squad snapshots without inventing missing identities."""
import json
from datetime import datetime
from urllib.parse import urlparse


def validate_squads(data, team_ids):
    if data.get('schemaVersion') != 1 or data.get('season') != '2026-27':
        raise ValueError('Invalid squad metadata')
    seen = set()
    for team in data['teams']:
        tid = team['teamId']
        if tid not in team_ids or tid in seen:
            raise ValueError('Invalid squad club')
        seen.add(tid)
        source = urlparse(team['sourceUrl'])
        if source.scheme != 'https' or source.hostname != 'www.indiansuperleague.com' or not source.path.startswith('/clubs/'+tid+'-') or not source.path.endswith('/squad'):
            raise ValueError('Invalid squad source')
        if team.get('verifiedAt'):
            if datetime.fromisoformat(team['verifiedAt'].replace('Z', '+00:00')).tzinfo is None:
                raise ValueError('Squad timestamp requires timezone')
        names = set()
        for person in team['players'] + ([team['coach']] if team.get('coach') else []):
            if not isinstance(person['name'], str) or not 0 < len(person['name'].strip()) <= 120 or person['name'].casefold() in names:
                raise ValueError('Invalid or duplicate squad name')
            names.add(person['name'].casefold())
            if person['position'] not in ('Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Head coach'):
                raise ValueError('Invalid squad position')
            if person.get('number') is not None and (type(person['number']) is not int or not 0 <= person['number'] <= 99):
                raise ValueError('Invalid squad number')
            for field in ('photo', 'profileUrl'):
                if person.get(field):
                    url = urlparse(person[field])
                    if url.scheme != 'https' or url.hostname != 'www.indiansuperleague.com' or url.username or url.password:
                        raise ValueError('Invalid squad asset or profile')
    return data


def load_squads(path, team_ids):
    return validate_squads(json.loads(path.read_text(encoding='utf-8')), team_ids)
