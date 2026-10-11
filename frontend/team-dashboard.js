/* Team Dashboard: league-stage sourced aggregates only.
   Missing player details are never manufactured. */
const tdIsLeagueMatch=m=>m.phase==='league'&&m.status==='FT';
function tdClubSide(match,team){
  if(canonical(match.home)===team)return 'home';
  if(canonical(match.away)===team)return 'away';
  return null;
}
function tdLeagueResults(team){
  return (resultsData.matches||[]).filter(m=>tdIsLeagueMatch(m)&&tdClubSide(m,team));
}
function tdVenuePoints(matches,team){
  const p={home:{points:0,w:0,d:0,l:0,games:0},away:{points:0,w:0,d:0,l:0,games:0}};
  for(const m of matches){
    const side=tdClubSide(m,team);
    if(!side)continue;
    const our=side==='home'?m.homeGoals:m.awayGoals;
    const their=side==='home'?m.awayGoals:m.homeGoals;
    const row=p[side];row.games++;
    if(our>their){row.w++;row.points+=3;}
    else if(our===their){row.d++;row.points++;}
    else row.l++;
  }
  return p;
}
function tdVenuePanel(matches,team){
  const p=tdVenuePoints(matches,team);
  return '<section class="td-panel"><div class="td-panel-title"><h2>Points earned · Home vs away</h2>'+
    '<small>Verified league results · 3 points per win, 1 per draw</small></div>'+
    '<div class="td-venue-points">'+
    [['home','Home points','⌂'],['away','Away points','↗']].map(([side,title,icon])=>
      '<div class="td-venue-card"><span>'+icon+' '+title+'</span>'+
      '<strong>'+p[side].points+'</strong>'+
      '<small>'+p[side].games+' played · '+p[side].w+' W · '+p[side].d+
      ' D · '+p[side].l+' L</small></div>').join('')+
    '</div></section>';
}
function tdName(value){
  return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function tdPlayerLeaders(matches,team){
  const players=new Map(),cards={yellow:new Map(),red:new Map()};
  const getPlayer=name=>{
    const key=tdName(name);if(!key)return null;
    if(!players.has(key))players.set(key,{name,goals:0,assists:0,goalKnown:false,assistKnown:false});
    return players.get(key);
  };
  let yellowAggregate=0,redAggregate=0,yellowCover=0,redCover=0;
  for(const m of matches){
    const side=tdClubSide(m,team);
    if(!side)continue;
    const sidePlayers=(m.players||[]).filter(p=>p.side===side);
    for(const p of sidePlayers){
      const row=getPlayer(p.name);if(!row)continue;
      for(const [key,flag] of [['goals','goalKnown'],['assists','assistKnown']]){
        if(typeof p[key]==='number'&&Number.isFinite(p[key])&&p[key]>=0){
          row[key]+=p[key];row[flag]=true;
        }
      }
    }
    const totals=m.stats?.[side]||{};
    for(const [key,bucket] of [['yellowCards','yellow'],['redCards','red']]){
      if(Number.isInteger(totals[key])&&totals[key]>=0){
        if(bucket==='yellow'){yellowCover++;yellowAggregate+=totals[key];}
        else{redCover++;redAggregate+=totals[key];}
      }
    }
    for(const e of (m.events||[])){
      if(e.side!==side||!e.player)continue;
      const kind=e.type==='yellow_card'?'yellow':
        ['red_card','second_yellow_red'].includes(e.type)?'red':null;
      if(!kind)continue;
      const target=tdName(e.player),tokens=target.split(' ');
      let player=sidePlayers.find(p=>tdName(p.name)===target);
      if(!player&&tokens.length>1){
        const candidates=sidePlayers.filter(p=>{
          const bits=tdName(p.name).split(' ');
          return tokens.every(bit=>bits.includes(bit));
        });
        if(candidates.length===1)player=candidates[0];
      }
      const name=player?.name||e.player,key=tdName(name),bucket=cards[kind];
      const item=bucket.get(key)||{name,value:0};
      item.value++;bucket.set(key,item);
    }
  }
  const rows=[...players.values()];
  const by=(key,flag)=>rows.filter(p=>p[flag]&&p[key]>0)
    .map(p=>({name:p.name,value:p[key]}))
    .sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,5);
  const ga=rows.filter(p=>(p.goalKnown&&p.goals>0)||(p.assistKnown&&p.assists>0))
    .map(p=>({name:p.name,value:p.goals+p.assists,
      detail:(p.goalKnown?p.goals+' '+(p.goals===1?'goal':'goals'):'— goals')+
        ' · '+(p.assistKnown?p.assists+' '+(p.assists===1?'assist':'assists'):'— assists')}))
    .sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,5);
  const cardList=bucket=>[...cards[bucket].values()]
    .sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name)).slice(0,5);
  return {goals:by('goals','goalKnown'),assists:by('assists','assistKnown'),
    ga,yellow:cardList('yellow'),red:cardList('red'),
    yellowAggregate,redAggregate,yellowCover,redCover,
    yellowNamed:[...cards.yellow.values()].reduce((a,p)=>a+p.value,0),
    redNamed:[...cards.red.values()].reduce((a,p)=>a+p.value,0)};
}
function tdPlayerBoard(title,rows,empty,note){
  return '<article class="td-leader-card"><h3>'+esc(title)+'</h3>'+
    (rows.length?'<ol class="td-leader-list">'+rows.map((r,i)=>
      '<li><span class="td-leader-index">'+(i+1)+'</span>'+
      '<span class="td-leader-person"><strong>'+esc(r.name)+'</strong>'+
      (r.club?'<small class="td-leader-club">'+esc(r.club)+'</small>':'')+
      (r.detail?'<small>'+esc(r.detail)+'</small>':'')+'</span>'+
      '<span class="td-leader-score">'+r.value+'</span></li>').join('')+'</ol>':
      '<p class="td-leader-empty">'+esc(empty)+'</p>')+
    (note?'<p class="td-leader-note">'+esc(note)+'</p>':'')+'</article>';
}
function tdPlayersPanel(matches,team){
  const p=tdPlayerLeaders(matches,team);
  const empty=matches.length?'No verified player-level contributions published yet.':'Awaiting completed league matches.';
  const cardEmpty=(colour,cover,total)=>{
    if(!matches.length)return 'Awaiting completed league matches.';
    if(cover===matches.length&&total===0)return 'No '+colour+' cards recorded in verified matches.';
    return 'No named '+colour+' cards available yet.';
  };
  const missingYellow=p.yellowAggregate>p.yellowNamed?
    'Named cards: '+p.yellowNamed+' of '+p.yellowAggregate+' recorded.':'Only verified named card events.';
  const missingRed=p.redAggregate>p.redNamed?
    'Named cards: '+p.redNamed+' of '+p.redAggregate+' recorded.':'Only verified named card events.';
  return '<section class="td-panel"><div class="td-panel-title"><h2>Top players</h2>'+
    '<small>Verified individual match records · top five in each category</small></div>'+
    '<div class="td-leader-grid">'+
    tdPlayerBoard('Top scorers',p.goals,empty,'Goals credited to players only; own goals excluded.')+
    tdPlayerBoard('Top assists',p.assists,empty,'Only officially recorded assists.')+
    tdPlayerBoard('Goals + assists',p.ga,empty,'Minimum recorded goal contributions; blank fields are unavailable.')+
    tdPlayerBoard('Yellow cards',p.yellow,cardEmpty('yellow',p.yellowCover,p.yellowAggregate),missingYellow)+
    tdPlayerBoard('Red cards',p.red,cardEmpty('red',p.redCover,p.redAggregate),missingRed)+
    '</div><p class="td-explainer">Rankings are limited to verified league match records for this club. '+
    'A missing player statistic is not automatically zero; unnamed disciplinary events may make player totals incomplete.</p></section>';
}


/* Season Overview player leaders combine all participating clubs. Match
   records remain the single source of truth: no extra API or assumed zeros.
   Player identities with the same full verified name are merged if they
   appear for more than one club during the season. */
function tdSeasonLeaders(){
  const matches=(resultsData.matches||[]).filter(tdIsLeagueMatch);
  const buckets={goals:new Map(),assists:new Map(),ga:new Map(),
    yellow:new Map(),red:new Map()};
  const categoryNames=['goals','assists','ga','yellow','red'];
  for(const t of seasonData.teams){
    const summary=tdPlayerLeaders(tdLeagueResults(t.name),t.name);
    for(const category of categoryNames){
      for(const row of summary[category]){
        const key=tdName(row.name);
        if(!key)continue;
        const map=buckets[category],previous=map.get(key);
        if(previous){
          previous.value+=row.value;
          if(!previous.clubs.includes(t.name))previous.clubs.push(t.name);
          /* A transfer can combine partial G+A contributions: retain the
             published per-club detail, not a guessed split. */
          if(row.detail)previous.parts.push(t.name+': '+row.detail);
        }else{
          map.set(key,{name:row.name,value:row.value,clubs:[t.name],
            parts:row.detail?[t.name+': '+row.detail]:[]});
        }
      }
    }
  }
  const rankings={};
  for(const category of categoryNames){
    rankings[category]=[...buckets[category].values()]
      .sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name))
      .slice(0,5).map(row=>({
        name:row.name,value:row.value,
        club:row.clubs.join(' · '),
        detail:category==='ga'?
          (row.parts.length===1?row.parts[0].slice(row.parts[0].indexOf(': ')+2):
            row.parts.join(' · ')):undefined
      }));
  }
  const cardCoverage={yellow:{recorded:0,named:0,knownSides:0},
    red:{recorded:0,named:0,knownSides:0}};
  for(const m of matches){
    for(const side of ['home','away']){
      for(const [category,key] of [['yellow','yellowCards'],['red','redCards']]){
        const n=m.stats?.[side]?.[key];
        if(Number.isInteger(n)&&n>=0){
          cardCoverage[category].knownSides++;
          cardCoverage[category].recorded+=n;
        }
      }
      for(const event of m.events||[]){
        if(event.side!==side||!event.player)continue;
        if(event.type==='yellow_card')cardCoverage.yellow.named++;
        if(event.type==='red_card'||event.type==='second_yellow_red')
          cardCoverage.red.named++;
      }
    }
  }
  return {matches:matches.length,rankings,cardCoverage};
}
function tdSeasonPlayersPanel(){
  const result=tdSeasonLeaders();
  const empty=result.matches?
    'No verified player contributions available yet.':
    'Awaiting completed league matches.';
  const disciplinary=(category,label)=>{
    const record=result.cardCoverage[category];
    if(!result.matches)return 'Awaiting completed league matches.';
    if(!result.rankings[category].length){
      if(record.knownSides===2*result.matches&&record.recorded===0)
        return 'No '+label+' cards recorded in verified league matches.';
      return 'No verified named '+label+' card recipients yet.';
    }
    return empty;
  };
  const cardNote=category=>{
    const record=result.cardCoverage[category];
    if(!result.matches)return '';
    const out='Named card events: '+record.named;
    if(record.knownSides===2*result.matches)
      return out+' of '+record.recorded+' team cards recorded across '+
        result.matches+' verified '+(result.matches===1?'match':'matches')+'.';
    return out+'. Team-level card coverage is incomplete.';
  };
  return '<section class="td-panel td-season-leaders"><div class="td-panel-title">'+
    '<h2>Season player leaders</h2>'+
    '<small>ISL 2026–27 · All '+seasonData.teams.length+' clubs · '+
    result.matches+' verified league '+(result.matches===1?'match':'matches')+
    ' · Top 5 per category</small></div>'+
    '<div class="td-leader-grid">'+
    tdPlayerBoard('Top scorers',result.rankings.goals,empty,
      'Own goals are excluded. Only verified player goals are counted.')+
    tdPlayerBoard('Top assists',result.rankings.assists,empty,
      'Published assists only; unavailable values are not zero.')+
    tdPlayerBoard('Goals + assists',result.rankings.ga,empty,
      'Recorded goal contributions only; incomplete player records may undercount.')+
    tdPlayerBoard('Yellow cards',result.rankings.yellow,
      disciplinary('yellow','yellow'),cardNote('yellow'))+
    tdPlayerBoard('Red cards',result.rankings.red,
      disciplinary('red','red'),cardNote('red'))+
    '</div><p class="td-explainer">Rankings use published player statistics and named card events from verified ISL league matches. '+
    'Each player’s club is shown below their name. Missing player data is never inferred, and the lists update when new verified match records are added.</p></section>';
}

/* Squad identities come from official club listings, separate from match stats. */
function tdSquadPortrait(person){
  return '<div class="td-squad-portrait"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="35" r="17"/><path d="M17 94v-13a33 33 0 0 1 66 0v13z"/></svg>'+
    (person.photo?'<img class="td-squad-photo" src="'+esc(person.photo)+'" alt="'+esc(person.name)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer">':'')+'</div>';
}
function tdSquadPerson(person){
  return '<article class="td-squad-person">'+tdSquadPortrait(person)+
    '<div><span class="td-squad-role">'+esc(person.position)+
    (person.number!=null?' · #'+esc(person.number):'')+'</span><h4>'+esc(person.name)+'</h4>'+
    (person.profileUrl?sourceLink(person.profileUrl,person.position==='Head coach'?'Coach profile':'Player profile'):'')+'</div></article>';
}
function tdSquadPanel(team){
  const squad=(squadData.teams||[]).find(s=>s.teamId===team.id);
  const players=squad?.players||[];
  const groups=[['Goalkeeper','Goalkeepers'],['Defender','Defenders'],['Midfielder','Midfielders'],['Forward','Forwards']];
  return '<section class="td-panel td-squad"><div class="td-panel-title"><h2>Squad & head coach</h2><small>'+players.length+' listed players</small></div>'+
    '<div class="td-squad-coach">'+(squad?.coach?tdSquadPerson(squad.coach):'<p class="report-note">Head coach details are not available from the official listing yet.</p>')+'</div>'+
    (players.length?groups.map(([position,title])=>{
      const rows=players.filter(p=>p.position===position);
      return rows.length?'<div class="td-squad-group"><h3>'+title+' <span>'+rows.length+'</span></h3><div class="td-squad-grid">'+rows.map(tdSquadPerson).join('')+'</div></div>':'';
    }).join(''):'<p class="report-note">Squad details are not available from the official club listing yet.</p>')+
    '<p class="td-explainer">'+sourceLink(squad?.sourceUrl||team.profileUrl.replace(/\/$/,'')+'/squad','Official squad source')+
    (squad?.verifiedAt?' · Checked '+esc(formatDate(squad.verifiedAt))+' at '+esc(formatTime(squad.verifiedAt))+' IST':'')+
    '. Club listings can change during the season. A silhouette is shown when a photo is unavailable.</p></section>';
}
// Capture image failures, including lazy images; never loop on a failed fallback.
document.addEventListener('error',event=>{
  if(event.target.matches?.('.td-squad-photo'))event.target.remove();
},true);
