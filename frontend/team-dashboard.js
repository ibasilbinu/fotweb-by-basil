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
