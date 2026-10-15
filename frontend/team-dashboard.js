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

/* Form shows cumulative league points after each verified completed match. */
function tdFormRows(matches,team){
  const history=matches.filter(m=>tdIsLeagueMatch(m)&&tdClubSide(m,team))
    .slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)))
    .map((m,index)=>{
      const side=tdClubSide(m,team),home=side==='home';
      const scored=home?m.homeGoals:m.awayGoals,conceded=home?m.awayGoals:m.homeGoals;
      const points=scored>conceded?3:scored===conceded?1:0;
      return {index:index+1,date:m.date,opponent:home?m.away:m.home,
        venue:home?'Home':'Away',score:scored+'–'+conceded,points,
        result:points===3?'Win':points===1?'Draw':'Loss'};
    });
  let cumulative=0;
  return history.map(row=>({...row,cumulative:(cumulative+=row.points)}));
}
function tdFormPanel(matches,team){
  const rows=tdFormRows(matches,team);
  const heading='<section class="td-panel td-form"><div class="td-panel-title"><h2>Team form</h2>'+
    '<small>Points earned per league match · Win 3 · Draw 1 · Loss 0</small></div>';
  if(!rows.length)return heading+'<p class="report-note">The form graph will appear after this club’s first verified completed league match.</p></section>';
  const W=760,H=260,L=50,R=28,T=28,B=54,plotW=W-L-R,plotH=H-T-B;
  const x=i=>rows.length===1?L+plotW/2:L+i*plotW/(rows.length-1);
  const y=value=>T+(3-value)*plotH/3;
  const step=Math.max(1,Math.ceil(rows.length/14));
  let grid='',labels='',dots='';
  for(let points=0;points<=3;points++)grid+='<line x1="'+L+'" y1="'+y(points)+'" x2="'+(W-R)+'" y2="'+y(points)+'" class="td-form-gridline"/>'+
    '<text x="'+(L-15)+'" y="'+(y(points)+4)+'" text-anchor="end" class="td-form-axis">'+points+'</text>';
  rows.forEach((row,i)=>{
    const description='Match '+row.index+' · '+row.date+' · '+row.venue+' vs '+row.opponent+' · '+row.score+' · '+row.result+' · '+row.points+' points earned';
    dots+='<circle cx="'+x(i)+'" cy="'+y(row.points)+'" r="6" class="td-form-dot td-form-'+row.result.toLowerCase()+'" tabindex="0" role="button" data-td-form-point data-form-title="'+esc('Match '+row.index+' · '+row.result+' · '+row.points+' points earned')+'" data-form-opponent="'+esc(row.opponent)+'" data-form-date="'+esc(row.date+' · '+row.venue)+'" data-form-score="'+esc(row.score)+'" aria-label="'+esc(description)+'"><title>'+esc(description)+'</title></circle>';
    if(i%step===0||i===rows.length-1)labels+='<text x="'+x(i)+'" y="'+(H-B+23)+'" text-anchor="middle" class="td-form-axis">M'+row.index+'</text>';
  });
  const path=rows.length>1?'<polyline points="'+rows.map((r,i)=>x(i)+','+y(r.points)).join(' ')+'" class="td-form-line"/>':'';
  return heading+'<p class="td-form-caption">'+rows.length+' verified '+(rows.length===1?'match · The line will connect as more results are added.':'matches · Oldest to newest. Each point shows points earned in that match.')+'</p>'+
    '<div class="td-form-chart"><div class="td-form-scroll"><svg viewBox="0 0 '+W+' '+H+'" role="group" aria-label="'+esc(team)+' points earned per completed league match">'+
    '<text x="'+L+'" y="15" class="td-form-axis">Match points</text>'+grid+path+dots+labels+
    '<text x="'+(L+plotW/2)+'" y="'+(H-8)+'" text-anchor="middle" class="td-form-axis">Completed league matches</text></svg></div><div class="td-form-tooltip" role="status" aria-live="polite" hidden><strong data-form-tip-title></strong><span data-form-tip-opponent></span><span data-form-tip-date></span><span data-form-tip-score></span></div></div>'+
    '<details class="td-form-details"><summary>Match-by-match form</summary><div class="td-form-table-wrap"><table class="td-form-table">'+
    '<thead><tr><th scope="col">Match</th><th scope="col">Date</th><th scope="col">Opponent</th><th scope="col">Venue</th><th scope="col">Score</th><th scope="col">Result</th><th scope="col">Points</th></tr></thead><tbody>'+
    rows.map(r=>'<tr><th scope="row">M'+r.index+'</th><td>'+esc(r.date)+'</td><td>'+esc(r.opponent)+'</td><td>'+r.venue+'</td><td>'+esc(r.score)+'</td><td>'+r.result+'</td><td>'+r.points+'</td></tr>').join('')+
    '</tbody></table></div></details></section>';
}
function tdBindFormTooltips(){
  $$('.td-form-chart').forEach(plot=>{
    const tip=plot.querySelector('.td-form-tooltip');
    if(!tip)return;
    const hide=()=>{tip.hidden=true;};
    const show=dot=>{
      tip.querySelector('[data-form-tip-title]').textContent=dot.dataset.formTitle;
      tip.querySelector('[data-form-tip-opponent]').textContent='vs '+dot.dataset.formOpponent;
      tip.querySelector('[data-form-tip-date]').textContent=dot.dataset.formDate;
      tip.querySelector('[data-form-tip-score]').textContent='Final score: '+dot.dataset.formScore;
      tip.hidden=false;
      const area=plot.getBoundingClientRect(),point=dot.getBoundingClientRect();
      const width=Math.min(260,Math.max(0,area.width-16));
      tip.style.width=width+'px';
      tip.style.left=Math.max(8,Math.min(area.width-width-8,point.left+point.width/2-area.left-width/2))+'px';
      const above=point.top-area.top-tip.offsetHeight-12;
      tip.style.top=(above>=0?above:point.bottom-area.top+12)+'px';
    };
    plot.querySelectorAll('[data-td-form-point]').forEach(dot=>{
      dot.onpointerenter=()=>show(dot);
      dot.onpointerleave=()=>{if(document.activeElement!==dot)hide();};
      dot.onfocus=()=>show(dot);
      dot.onblur=hide;
      dot.onclick=e=>{e.stopPropagation();show(dot);};
      dot.onkeydown=e=>{
        if(e.key==='Enter'||e.key===' '){e.preventDefault();show(dot);}
        if(e.key==='Escape'){e.preventDefault();hide();}
      };
    });
    plot.querySelector('.td-form-scroll').onscroll=hide;
    plot.onclick=e=>{if(!e.target.closest('[data-td-form-point]'))hide();};
  });
}

function tdSeasonFormPath(points){
  if(!points.length)return '';
  const slopes=points.slice(1).map((p,i)=>(p[1]-points[i][1])/(p[0]-points[i][0]));
  const tangents=points.map((p,i)=>{
    if(i===0)return slopes[0]||0;
    if(i===points.length-1)return slopes[i-1]||0;
    const before=slopes[i-1],after=slopes[i];
    return before*after>0?2*before*after/(before+after):0;
  });
  return 'M'+points[0].join(',')+points.slice(1).map((p,i)=>{
    const previous=points[i],third=(p[0]-previous[0])/3;
    return 'C'+[previous[0]+third,previous[1]+tangents[i]*third,
      p[0]-third,p[1]-tangents[i+1]*third,p[0],p[1]].join(',');
  }).join('');
}
function tdSeasonFormPanel(){
  const formColors=['#ff5252','#298dff','#ff931e','#b471ff','#00d8e5','#ff55b5','#ffe22b','#36d67a','#f2f5fc','#d89967','#c5ec68','#7c85ff','#aeafb9'];
  const series=seasonData.teams.map((team,i)=>({team,color:formColors[i%formColors.length],
    rows:tdFormRows(resultsData.matches||[],team.name)}));
  const maxGames=Math.max(0,...series.map(s=>s.rows.length));
  const maxPoints=Math.max(3,...series.map(s=>s.rows.length?s.rows[s.rows.length-1].cumulative:0));
  const W=820,H=290,L=50,R=88,T=30,B=54,plotW=W-L-R,plotH=H-T-B;
  const x=number=>L+number*plotW/Math.max(2,maxGames);
  const tickStep=Math.max(1,Math.ceil(maxPoints/6)),axisMax=Math.ceil(maxPoints/tickStep)*tickStep;
  const y=points=>T+(axisMax-points)*plotH/axisMax;
  let grid='',paths='';
  if(maxGames){
    for(let points=0;points<=axisMax;points+=tickStep)grid+='<line x1="'+L+'" y1="'+y(points)+'" x2="'+(W-R)+'" y2="'+y(points)+'" class="td-form-gridline"/>'+
      '<text x="'+(L-15)+'" y="'+(y(points)+4)+'" text-anchor="end" class="td-form-axis">'+points+'</text>';
    const step=Math.max(1,Math.ceil(maxGames/14));
    grid+='<text x="'+x(0)+'" y="'+(H-B+23)+'" text-anchor="middle" class="td-form-axis">M0</text>';
    for(let number=1;number<=maxGames;number++)if((number-1)%step===0||number===maxGames)
      grid+='<text x="'+x(number)+'" y="'+(H-B+23)+'" text-anchor="middle" class="td-form-axis">M'+number+'</text>';
    paths=series.map(s=>{
      if(!s.rows.length)return '';
      const line='<path d="'+tdSeasonFormPath([[x(0),y(0)],...s.rows.map(r=>[x(r.index),y(r.cumulative)])])+'" class="td-form-line" style="stroke:'+s.color+'"/>';
      const dots=s.rows.map(row=>{
        const title=s.team.name+' · M'+row.index+' · '+row.result+' · +'+row.points+' pts · Total '+row.cumulative+' pts';
        const detail=row.date+' · '+row.venue;
        const description=title+' · '+detail+' vs '+row.opponent+' · '+row.score;
        return '<circle cx="'+x(row.index)+'" cy="'+y(row.cumulative)+'" r="6" class="td-form-dot" style="fill:'+s.color+'" tabindex="0" role="button" data-td-form-point'+
          ' data-form-title="'+esc(title)+'" data-form-opponent="'+esc(row.opponent)+'" data-form-date="'+esc(detail)+'" data-form-score="'+esc(row.score)+'" aria-label="'+esc(description)+'"><title>'+esc(description)+'</title></circle>';
      }).join('');
      const end=s.rows[s.rows.length-1],endX=x(end.index),endY=y(end.cumulative);
      const label='<path data-form-end-link fill="none" stroke="'+s.color+'" stroke-width="1"/>'+
        '<text data-form-end-label x="'+(endX+16)+'" y="'+(endY+4)+'" class="td-form-axis" style="fill:'+s.color+';font-weight:600;pointer-events:none">'+esc(s.team.short)+'</text>';
      return '<g data-season-form-series="'+esc(s.team.id)+'">'+line+dots+label+'</g>';
    }).join('');
  }
  const legend='<div class="td-season-form-legend" aria-label="Select clubs to compare form">'+
    '<button type="button" data-season-form-club="all" aria-pressed="true">All clubs</button>'+
    series.map(s=>'<button type="button" data-season-form-club="'+esc(s.team.id)+'" aria-pressed="false" '+(!s.rows.length?'disabled':'')+'>'+
      '<span class="td-season-form-swatch" style="background:'+s.color+'"></span>'+esc(s.team.name)+
      (!s.rows.length?' <small>No matches yet</small>':'')+'</button>').join('')+'</div>';
  return '<section class="td-panel td-season-form"><div class="td-panel-title"><h2>Club form · All teams</h2>'+
    '<small>Cumulative league points · Win +3 · Draw +1 · Loss +0</small></div>'+
    (maxGames?'<p class="td-form-caption">'+series.filter(s=>s.rows.length).length+' of '+series.length+' clubs have verified results. Select multiple clubs below to compare their running totals. Click a selected club again to remove it; All clubs resets the chart.</p>'+
      '<div class="td-form-chart"><div class="td-form-scroll"><svg viewBox="0 0 '+W+' '+H+'" role="group" aria-label="All clubs’ cumulative league points after completed league matches">'+
      '<text x="'+L+'" y="15" class="td-form-axis">Total points</text>'+grid+paths+
      '<text x="'+(L+plotW/2)+'" y="'+(H-8)+'" text-anchor="middle" class="td-form-axis">Each club’s completed league match number</text></svg></div>'+
      '<div class="td-form-tooltip" role="status" aria-live="polite" hidden><strong data-form-tip-title></strong><span data-form-tip-opponent></span><span data-form-tip-date></span><span data-form-tip-score></span></div></div>':
      '<p class="report-note">Club form will appear as completed league results are verified.</p>')+
    legend+'<p class="td-form-caption" data-form-selection role="status"></p><p class="td-explainer">Each colour represents one club. M0 starts at zero league points, M1 is that club’s first completed match, M2 its second, and so on. Wins add 3, draws add 1, and losses leave the total unchanged. Hover, tap or focus a point to see the score, match points and cumulative total. Clubs without completed league matches are unplotted.</p></section>';
}
function tdBindSeasonFormLegend(){
  $$('.td-season-form').forEach(panel=>{
    const buttons=[...panel.querySelectorAll('[data-season-form-club]')];
    const groups=[...panel.querySelectorAll('[data-season-form-series]')];
    const available=new Set(groups.map(g=>g.dataset.seasonFormSeries));
    const selected=new Set((state.analyticsFormClubs||[]).filter(id=>available.has(id)));
    const update=()=>{
      const tip=panel.querySelector('.td-form-tooltip');if(tip)tip.hidden=true;
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(
        button.dataset.seasonFormClub==='all'?selected.size===0:selected.has(button.dataset.seasonFormClub))));
      groups.forEach(group=>{
        const hidden=selected.size>0&&!selected.has(group.dataset.seasonFormSeries);
        group.classList.toggle('is-muted',hidden);
        group.querySelectorAll('[data-td-form-point]').forEach(dot=>{
          dot.setAttribute('tabindex',hidden?'-1':'0');
          dot.setAttribute('aria-hidden',String(hidden));
        });
      });
      const labels=groups.filter(group=>!group.classList.contains('is-muted')).map(group=>{
        const dots=group.querySelectorAll('[data-td-form-point]'),dot=dots[dots.length-1];
        return {group,x:Number(dot.getAttribute('cx')),y:Number(dot.getAttribute('cy'))};
      }).sort((a,b)=>a.y-b.y);
      labels.forEach((label,i)=>{label.labelY=Math.max(label.y,i?labels[i-1].labelY+16:36);});
      if(labels.length&&labels[labels.length-1].labelY>232){
        labels[labels.length-1].labelY=232;
        for(let i=labels.length-2;i>=0;i--)labels[i].labelY=Math.min(labels[i].labelY,labels[i+1].labelY-16);
      }
      labels.forEach(label=>{
        label.group.querySelector('[data-form-end-label]').setAttribute('y',label.labelY+4);
        label.group.querySelector('[data-form-end-link]').setAttribute('d',
          'M'+(label.x+7)+','+label.y+'L'+(label.x+12)+','+label.labelY);
      });
      const status=panel.querySelector('[data-form-selection]');
      if(status)status.textContent=selected.size?selected.size+' '+(selected.size===1?'club selected.':'clubs selected for comparison.'):'All clubs shown.';
      state.analyticsFormClubs=[...selected];
    };
    buttons.forEach(button=>button.onclick=()=>{
      const id=button.dataset.seasonFormClub;
      if(id==='all')selected.clear();
      else if(selected.has(id))selected.delete(id);
      else selected.add(id);
      update();
      if(selected.has(id)){
        const chosen=groups.find(g=>g.dataset.seasonFormSeries===id);
        if(chosen)chosen.parentNode.appendChild(chosen);
      }
    });
    update();
  });
}
