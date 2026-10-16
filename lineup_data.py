"""Validation shared by fixture and completed-match substitute lists."""


def validate_substitutes(info):
    if 'substitutes' not in info:
        return
    players = info['substitutes']
    if not isinstance(players, list) or not 1 <= len(players) <= 30:
        raise ValueError('Invalid substitutes list; omit unavailable lists')
    seen = {p['name'].strip().casefold() for p in info.get('starters', [])}
    for player in players:
        if not isinstance(player, dict) or not set(player).issubset({'name', 'number', 'position'}):
            raise ValueError('Unsupported substitute field')
        name = player.get('name')
        if not isinstance(name, str) or not 0 < len(name.strip()) <= 120 or name.strip().casefold() in seen:
            raise ValueError('Invalid, duplicate or starting substitute')
        seen.add(name.strip().casefold())
        if 'number' in player and (type(player['number']) is not int or not 0 <= player['number'] <= 99):
            raise ValueError('Invalid substitute shirt number')
        if 'position' in player and (not isinstance(player['position'], str) or not 1 <= len(player['position']) <= 40):
            raise ValueError('Invalid published substitute role')
