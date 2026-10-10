/* Team Dashboard: league-stage sourced aggregates only.
   Missing classifications and player details are never manufactured. */
const tdGoalKinds=[
  ['open_play','Open play'],
  ['set_piece','Set piece'],
  ['free_kick','Free kick'],
  ['penalty','Penalty'],
  ['own_goal','Own goal']
];
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
function tdGoalOrigin(event){
  if(event.type==='own_goal')return 'own_goal';
  if(event.type==='penalty_goal')return 'penalty';
  if(event.type!=='goal')return null;
  return tdGoalKinds.some(([kind])=>kind===event.goalType)?event.goalType:null;
}
function tdGoalCounts(matches,team){
  const counts=Object.fromEntries(tdGoalKinds.map(([key])=>[key,0]));
  let total=0,classified=0;
  for(const m of matches){
    const side=tdClubSide(m,team);
    if(!side)continue;
    total+=side==='home'?m.homeGoals:m.awayGoals;
    for(const e of (m.events||[])){
      if(e.side!==side)continue;
      const kind=tdGoalOrigin(e);
      if(kind){counts[kind]++;classified++;}
    }
  }
  return {counts,total,classified,unclassified:Math.max(0,total-classified),consistent:classified<=total};
}
function tdGoalChart(matches,team){
  const data=tdGoalCounts(matches,team);
  const hasGames=matches.length>0;
  const complete=hasGames&&data.unclassified===0&&data.consistent;
  const available=data.classified>0||complete;
  const info=available?'':(hasGames?'Verified goal-type breakdowns are not available for this club yet.':'No verified completed league matches yet.');
  const W=760,H=312,L=48,R=22,T=26,B=82,plotW=W-L-R,plotH=H-T-B;
  const maximum=Math.max(1,...Object.values(data.counts));
  const yMax=Math.max(2,maximum+1);
  const Y=value=>T+plotH-(value/yMax)*plotH;
  const X=i=>L+plotW*(i+0.5)/tdGoalKinds.length;
  let grid='';
  for(let n=0;n<=4;n++){
    const tick=Math.round((yMax*n/4)*10)/10;
    const y=Y(tick);
    grid+='<line class="td-goal-grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'"></line>'+
      '<text class="td-goal-axis" x="'+(L-11)+'" y="'+(y+4)+'" text-anchor="end">'+tick+'</text>';
  }
  const lines=tdGoalKinds.map(([kind,label],i)=>{
    const value=data.counts[kind];
    const definite=complete||value>0;
    const x=X(i),y=Y(value),base=Y(0);
    const labelX=esc(label);
    return '<g class="td-goal-column">'+
      (definite?
        '<line class="td-goal-stem" x1="'+x+'" y1="'+base+'" x2="'+x+'" y2="'+y+'"></line>'+
        '<circle class="td-goal-dot" cx="'+x+'" cy="'+y+'" r="7" tabindex="0" role="img" aria-label="'+
        labelX+': '+value+' verified goals"><title>'+labelX+': '+value+
        ' verified goals'+(data.unclassified?' (partial classification)':'')+'</title></circle>':'')+
      '<text class="td-goal-number" x="'+x+'" y="'+(definite?Math.max(T+1,y-14):base-13)+'" text-anchor="middle">'+
      (definite?value:'—')+'</text>'+
      '<text class="td-goal-label" x="'+x+'" y="'+(H-46)+'" text-anchor="middle">'+labelX+'</text></g>';
  }).join('');
  const note=data.consistent?
    (complete?'All '+data.total+' recorded league goals have a verified classification.':
      data.classified+' of '+data.total+' league goals have verified types; '+data.unclassified+
      ' remain unclassified. Dashes mean unavailable, not zero.') :
    'Event classification and verified final scores disagree; check the source before interpreting this chart.';
  return '<section class="td-panel"><div class="td-panel-title"><h2>Goals by scoring situation</h2>'+
    '<small>Vertical line graph · league-stage goals</small></div>'+
    '<div class="td-goal-plot"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+
    esc('Confirmed goal breakdown for '+team+'. '+note)+'">'+grid+lines+'</svg></div>'+
    (info?'<p class="td-status">'+esc(info)+'</p>':'')+
    '<p class="td-explainer">Open play, indirect set pieces, direct free kicks, penalties and own goals are separate categories; '+
    'an unlabelled goal is never assumed to be open play. '+esc(note)+'</p></section>';
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
      detail:(p.goalKnown?p.goals:'—')+' goals · '+(p.assistKnown?p.assists:'—')+' assists'}))
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
  const empty=matches.length?'No verified player-level records yet.':'Awaiting completed league matches.';
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
    tdPlayerBoard('Yellow cards',p.yellow,empty,missingYellow)+
    tdPlayerBoard('Red cards',p.red,empty,missingRed)+
    '</div><p class="td-explainer">Rankings are limited to verified league match records for this club. '+
    'A missing player statistic is not automatically zero; unnamed disciplinary events may make player totals incomplete.</p></section>';
}
