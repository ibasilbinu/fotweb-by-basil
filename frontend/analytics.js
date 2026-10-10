/* Club Analytics: calculated locally from the verified FotWeb results dataset.
   These charts do not use external paid feeds or invent unavailable statistics. */
const caColors=['#d4f76b','#f7ab70','#81b9ff','#d6a4ff','#73d5ba','#ffe09c','#eb91a7','#9db6bd','#bbca81','#b0a3ef','#f5c4a2','#88bed9','#bde4b8'];
const caMetricChoices=[
  ['shots','Shots taken'],['shotsAgainst','Shots conceded'],
  ['goals','Goals scored'],['goalsAgainst','Goals conceded'],
  ['points','Cumulative league points']
];
function caLeagueMatches(){
  return (resultsData.matches||[]).filter(m=>m.phase==='league'&&m.status==='FT');
}
function caTeamHistory(name){
  return caLeagueMatches().filter(m=>canonical(m.home)===name||canonical(m.away)===name)
    .sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
}
function caIsHome(m,name){return canonical(m.home)===name;}
function caOpp(m,name){return caIsHome(m,name)?canonical(m.away):canonical(m.home);}
function caMatchValue(m,name,key){
  if(key==='goals')return caIsHome(m,name)?m.homeGoals:m.awayGoals;
  if(key==='goalsAgainst')return caIsHome(m,name)?m.awayGoals:m.homeGoals;
  if(key==='points'){
    const gf=caMatchValue(m,name,'goals'),ga=caMatchValue(m,name,'goalsAgainst');
    return gf>ga?3:gf===ga?1:0;
  }
  const theirs=key==='shotsAgainst';
  const side=caIsHome(m,name)?(theirs?'away':'home'):(theirs?'home':'away');
  const field=key==='shotsAgainst'?'shots':key;
  const v=m.stats?.[side]?.[field];
  return Number.isFinite(v)&&v>=0?v:null;
}
function caClubSummary(t){
  const history=caTeamHistory(t.name);
  let gf=0,ga=0,pts=0;
  const sums={};
  for(const m of history){
    gf+=caMatchValue(m,t.name,'goals');
    ga+=caMatchValue(m,t.name,'goalsAgainst');
    pts+=caMatchValue(m,t.name,'points');
    const own=caIsHome(m,t.name)?m.stats?.home:m.stats?.away;
    const opp=caIsHome(m,t.name)?m.stats?.away:m.stats?.home;
    for(const [key,val] of Object.entries({
      shots:own?.shots,shotsAgainst:opp?.shots,shotsOnTarget:own?.shotsOnTarget,
      possession:own?.possession,passAccuracy:own?.passAccuracy,passes:own?.passes,
      tackles:own?.tackles,interceptions:own?.interceptions,clearances:own?.clearances
    })){
      if(!Number.isFinite(val)||val<0)continue;
      if(!sums[key])sums[key]={sum:0,n:0};
      sums[key].sum+=val;sums[key].n++;
    }
  }
  const avg=key=>sums[key]?{value:sums[key].sum/sums[key].n,n:sums[key].n}:null;
  return {team:t,games:history.length,history,gf,ga,pts,avg};
}
function caAllSummaries(){return seasonData.teams.map(caClubSummary);}
function caNumber(v,d=1){return Number.isFinite(v)?v.toFixed(d):'—';}
function caSelectedTeam(summaries,preferred,exclude){
  const other=summaries.filter(s=>s.team.id!==exclude);
  return other.find(s=>s.team.id===preferred)||other.filter(s=>s.games>0)[0]||other[0]||null;
}
function caOptions(summaries,selected){
  return summaries.map(s=>'<option value="'+esc(s.team.id)+'"'+(selected===s.team.id?' selected':'')+'>'+
    esc(s.team.name)+(s.games?' · '+s.games+' match'+(s.games===1?'':'es'):' · not played')+'</option>').join('');
}
function caNotice(count,what){
  return '<p class="ca-footnote">'+esc(count===1?
    'Only one verified match is available for '+what+'. This is a snapshot, not a trend.':
    count===0?'No verified league matches are available for '+what+' yet.':
    'Sample: '+count+' verified league matches. Trends may change as more games are recorded.')+'</p>';
}
function caTrendChart(s,metric){
  const games=s.history.slice(-10);
  const title=caMetricChoices.find(([k])=>k===metric)?.[1]||'Shots taken';
  if(!games.length)return '<div class="ca-empty">No verified league matches for this club yet.</div>';
  let running=0;
  const entries=games.map((m,i)=>{
    const val=caMatchValue(m,s.team.name,metric);
    if(metric==='points')running=caTeamHistory(s.team.name).slice(0,-games.length+i+1)
      .reduce((a,match)=>a+caMatchValue(match,s.team.name,'points'),0);
    return {m,label:caOpp(m,s.team.name),value:metric==='points'?running:val};
  });
  const known=entries.filter(e=>e.value!=null);
  if(!known.length)return '<div class="ca-empty">No sourced '+esc(title.toLowerCase())+' totals yet. Missing values are not zeros.</div>';
  const max=Math.max(2,...known.map(e=>e.value));
  const top=Math.ceil(max*1.20);
  const W=760,H=278,left=47,right=18,topMargin=22,bottom=54,plotW=W-left-right,plotH=H-topMargin-bottom;
  const xpos=i=>left+(entries.length===1?plotW/2:i*plotW/(entries.length-1));
  const ypos=v=>topMargin+plotH-(v/top)*plotH;
  let grid='',marks='';
  for(let i=0;i<=4;i++){
    const val=top*i/4,y=ypos(val);
    grid+='<line x1="'+left+'" x2="'+(W-right)+'" y1="'+y+'" y2="'+y+'" class="ca-gridline"/>'+
      '<text x="'+(left-10)+'" y="'+(y+4)+'" text-anchor="end" class="ca-axis">'+caNumber(val,top<10?1:0)+'</text>';
  }
  let path='',open=false;
  entries.forEach((e,i)=>{
    if(e.value==null){open=false;return;}
    const x=xpos(i),y=ypos(e.value);
    path+=(open?' L ':' M ')+x.toFixed(2)+' '+y.toFixed(2);open=true;
    marks+='<circle cx="'+x+'" cy="'+y+'" r="5" class="ca-trend-dot"><title>'+
      esc(formatDate(e.m.date)+' · '+s.team.name+' vs '+e.label+' · '+title+': '+e.value)+'</title></circle>';
  });
  let axis='';
  entries.forEach((e,i)=>{
    if(entries.length>7&&i!==0&&i!==entries.length-1&&i%2!==0)return;
    axis+='<text x="'+xpos(i)+'" y="'+(H-29)+'" text-anchor="middle" class="ca-axis ca-axis-date">'+
      esc(e.m.date.slice(5))+'</text>';
  });
  const recent=entries.length>=5&&entries.slice(-5).every(e=>e.value!==null)?
    '<strong>Last 5 average: '+caNumber(entries.slice(-5).reduce((a,e)=>a+e.value,0)/5)+'</strong>':'';
  const rows='<div class="ca-trend-rows">'+entries.map(e=>'<div><span>'+esc(formatDate(e.m.date))+
    ' · vs '+esc(e.label)+'</span><strong>'+(e.value==null?'—':esc(e.value))+'</strong></div>').join('')+'</div>';
  return '<div class="ca-trend-key"><strong>'+esc(title)+'</strong>'+
    '<span>Last '+entries.length+' verified match'+(entries.length===1?'':'es')+'</span></div>'+
    '<div class="ca-trend-plot"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+
    esc('Match-by-match '+title+' for '+s.team.name+'. '+known.length+' verified data points')+'">'+
    grid+'<path d="'+path+'" class="ca-trend-path"/>'+marks+axis+'</svg></div>'+
    rows+(recent?'<div class="ca-trend-rolling">'+recent+'</div>':'')+
    (entries.length<2?caNotice(entries.length,s.team.name):'')+
    '<p class="ca-footnote">Missing match statistics break the line rather than appearing as zero. '+
    'Five-match averages are shown only after five consecutive available values.</p>';
}
function caRanking(summaries,key,descending,title,footnote){
  const rows=summaries.map(s=>({s,metric:s.avg(key)})).filter(v=>v.metric!==null)
    .sort((a,b)=>(descending?b.metric.value-a.metric.value:a.metric.value-b.metric.value)||
      a.s.team.name.localeCompare(b.s.team.name));
  const max=Math.max(1,...rows.map(x=>x.metric.value));
  if(!rows.length)return '<section class="ca-panel"><h3>'+esc(title)+'</h3><div class="ca-empty">Awaiting verified shot totals.</div></section>';
  const items=rows.map((r,i)=>
    '<li><span class="ca-rank">'+(i+1)+'</span><span class="ca-ranked-name">'+
    esc(r.s.team.name)+'<small>'+r.metric.n+' recorded match'+(r.metric.n===1?'':'es')+'</small></span>'+
    '<span class="ca-rank-bar"><i style="width:'+(r.metric.value/max*100).toFixed(2)+'%"></i></span>'+
    '<strong>'+caNumber(r.metric.value)+'</strong></li>').join('');
  return '<section class="ca-panel"><div class="ca-panel-head"><h3>'+esc(title)+'</h3>'+
    '<span>Per recorded match</span></div><ol class="ca-ranking">'+items+'</ol>'+
    '<p class="ca-footnote">'+esc(footnote)+' Only clubs with this metric published are ranked; one-match samples are provisional.</p></section>';
}
function caCompareMetric(a,b,label,get,unit,caption){
  const x=get(a),y=get(b),max=Math.max(1,x?.value||0,y?.value||0);
  const render=(v,side)=>'<div class="ca-compare-side ca-compare-'+side+'">'+
    '<strong>'+(v?caNumber(v.value)+(unit||''):'—')+'</strong>'+
    '<div class="ca-compare-meter"><i style="width:'+(v?(v.value/max*100).toFixed(1):0)+'%"></i></div>'+
    (v?'<small>'+v.n+' match'+(v.n===1?'':'es')+'</small>':'<small>Unavailable</small>')+
    '</div>';
  return '<div class="ca-compare-row"><div class="ca-compare-label">'+esc(label)+
    (caption?'<small>'+esc(caption)+'</small>':'')+'</div><div class="ca-compare-values">'+
    render(x,'a')+render(y,'b')+'</div></div>';
}
function caClubComparison(a,b){
  if(!a||!b)return '<div class="ca-empty">Select two different clubs.</div>';
  const fixtureMetric=(key)=>s=>s.games?{value:s[key]/s.games,n:s.games}:null;
  const pointsMetric=s=>s.games?{value:s.pts/s.games,n:s.games}:null;
  const statMetric=key=>s=>s.avg(key);
  const metric=[
    ['Points per match',pointsMetric,'',''],
    ['Goals scored / match',fixtureMetric('gf'),'',''],
    ['Goals conceded / match',fixtureMetric('ga'),'','Lower is generally better'],
    ['Shots / match',statMetric('shots'),'',''],
    ['Shots conceded / match',statMetric('shotsAgainst'),'','Lower is generally better'],
    ['Shots on target / match',statMetric('shotsOnTarget'),'',''],
    ['Possession',statMetric('possession'),'%',''],
    ['Pass accuracy',statMetric('passAccuracy'),'%',''],
    ['Tackles / match',statMetric('tackles'),'',''],
    ['Interceptions / match',statMetric('interceptions'),'','']
  ];
  return '<div class="ca-versus"><div class="ca-versus-club">'+crest(a.team,'small')+
    '<strong>'+esc(a.team.name)+'</strong><small>'+a.games+' matches</small></div>'+
    '<span>VS</span><div class="ca-versus-club">'+crest(b.team,'small')+
    '<strong>'+esc(b.team.name)+'</strong><small>'+b.games+' matches</small></div></div>'+
    metric.map(([label,get,unit,caption])=>caCompareMetric(a,b,label,get,unit,caption)).join('')+
    '<p class="ca-footnote">Values are match averages or published percentages. Each metric uses only games with that statistic available. The longer bar means a larger number, not necessarily better performance.</p>';
}
function caScatter(summaries){
  const points=summaries.map(s=>({s,x:s.avg('possession'),y:s.avg('shots')}))
    .filter(p=>p.x!==null&&p.y!==null);
  if(!points.length)return '<div class="ca-empty">Awaiting clubs with both verified possession and shots statistics.</div>';
  const values=points.map(p=>p.x.value);
  const lo=Math.min(...values),hi=Math.max(...values);
  const range=Math.max(18,hi-lo+15);
  let xMin=Math.max(0,(lo+hi-range)/2),xMax=Math.min(100,xMin+range);
  if(xMax-xMin<range)xMin=Math.max(0,xMax-range);
  const yMax=Math.max(5,Math.ceil(Math.max(...points.map(p=>p.y.value))*1.2));
  const W=760,H=346,L=57,R=33,T=20,B=58,plotW=W-L-R,plotH=H-T-B;
  const X=v=>L+(v-xMin)/(xMax-xMin)*plotW;
  const Y=v=>T+plotH-v/yMax*plotH;
  let grid='';
  for(let i=0;i<=4;i++){
    const x=xMin+(xMax-xMin)*i/4,y=yMax*i/4;
    grid+='<line class="ca-gridline" x1="'+X(x)+'" x2="'+X(x)+'" y1="'+T+'" y2="'+(H-B)+'"/>'+
    '<line class="ca-gridline" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(y)+'" y2="'+Y(y)+'"/>'+
    '<text x="'+X(x)+'" y="'+(H-B+20)+'" text-anchor="middle" class="ca-axis">'+caNumber(x,0)+'%</text>'+
    '<text x="'+(L-11)+'" y="'+(Y(y)+4)+'" text-anchor="end" class="ca-axis">'+caNumber(y,0)+'</text>';
  }
  const dots=points.map((p,i)=>{
    const color=caColors[seasonData.teams.findIndex(t=>t.id===p.s.team.id)%caColors.length];
    const x=X(p.x.value),y=Y(p.y.value);
    const n=Math.min(p.x.n,p.y.n);
    return '<circle cx="'+x+'" cy="'+y+'" r="8" stroke="'+color+'" fill="'+color+
      '" fill-opacity=".72" stroke-width="2.2"><title>'+esc(p.s.team.name+
      ' · '+caNumber(p.x.value)+'% possession · '+caNumber(p.y.value)+' shots/match'+
      ' · '+n+' matched recorded games')+'</title></circle>';
  }).join('');
  const legend='<div class="ca-scatter-legend">'+points.map(p=>{
    const color=caColors[seasonData.teams.findIndex(t=>t.id===p.s.team.id)%caColors.length];
    return '<div><i style="background:'+color+'"></i><span>'+esc(p.s.team.name)+'</span>'+
      '<small>'+caNumber(p.x.value)+'% · '+caNumber(p.y.value)+' shots</small></div>';
  }).join('')+'</div>';
  return '<div class="ca-scatter-plot"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+
    esc('Possession versus shots per match for '+points.length+' clubs')+'">'+grid+dots+
    '<text x="'+(L+plotW/2)+'" y="'+(H-5)+'" text-anchor="middle" class="ca-axis-title">Average possession (%)</text>'+
    '<text transform="translate(17 '+(T+plotH/2)+') rotate(-90)" text-anchor="middle" class="ca-axis-title">Shots per match</text>'+
    '</svg></div>'+legend+'<p class="ca-footnote">Each dot represents a club with both published shot and possession data. Hover over a dot for its values. This chart shows an association, not proof that possession causes shots.</p>';
}
function analyticsPage(){
  const summaries=caAllSummaries();
  const played=summaries.filter(s=>s.games>0);
  const first=caSelectedTeam(summaries,state.analyticsTeam);
  const compA=caSelectedTeam(summaries,state.analyticsCompareA);
  const compB=caSelectedTeam(summaries,state.analyticsCompareB,compA?.team.id);
  const metric=caMetricChoices.some(m=>m[0]===state.analyticsMetric)?state.analyticsMetric:'shots';
  const snapshot=header('Club Analytics.','Explore trends, compare teams and investigate the numbers behind ISL 2026–27.','ISL · DATA EXPLORER')+
    '<div class="ca-summary">'+
    '<div><small>Verified league matches</small><strong>'+caLeagueMatches().length+'</strong></div>'+
    '<div><small>Clubs with results</small><strong>'+played.length+' / '+summaries.length+'</strong></div>'+
    '<div><small>Coverage</small><strong>'+esc(resultsData.updatedAt?formatDate(resultsData.updatedAt):'Awaiting updates')+'</strong></div></div>'+
    '<p class="ca-opening-note">Early-season data can be misleading. Clubs with no completed games are not ranked; missing statistics are never counted as zero. Every chart is calculated from FotWeb’s sourced match reports.</p>';
  const trend='<section class="ca-panel ca-wide"><div class="ca-panel-head"><h3>Team performance trends</h3>'+
    '<span>Match by match</span></div><div class="ca-filters"><label>Club<select id="caTrendClub">'+
    caOptions(summaries,first?.team.id)+'</select></label><label>Metric<select id="caTrendMetric">'+
    caMetricChoices.map(([key,label])=>'<option value="'+key+'"'+(key===metric?' selected':'')+'>'+
    esc(label)+'</option>').join('')+'</select></label></div>'+
    (first?caTrendChart(first,metric):'<div class="ca-empty">No participating clubs.</div>')+'</section>';
  const rankings='<div class="ca-rankings">'+
    caRanking(summaries,'shots',true,'Attacking output · shots','More shots do not necessarily mean better attacking quality.')+
    caRanking(summaries,'shotsAgainst',false,'Defensive output · shots allowed','Fewer shots allowed does not necessarily mean stronger defending.')+'</div>';
  const comparison='<section class="ca-panel ca-wide"><div class="ca-panel-head"><h3>Head-to-head club comparison</h3>'+
    '<span>Available season averages</span></div><div class="ca-filters"><label>Club A<select id="caCompareA">'+
    caOptions(summaries,compA?.team.id)+'</select></label><label>Club B<select id="caCompareB">'+
    caOptions(summaries,compB?.team.id)+'</select></label></div>'+
    caClubComparison(compA,compB)+'</section>';
  const league='<section class="ca-panel ca-wide"><div class="ca-panel-head"><h3>ISL performance explorer</h3>'+
    '<span>Possession versus shots</span></div>'+caScatter(summaries)+'</section>';
  const method='<div class="ca-method">METHOD · Results and match statistics come from FotWeb’s source-linked ISL reports. Averages use games with the relevant recorded metric, not the entire fixture list. Rankings are provisional for small samples. No shot coordinates, tracking, xG estimates or inferred player positions are generated. <a href="#reports" data-page="reports">View source-linked match reports ↗</a></div>';
  return snapshot+trend+'<h2 class="section-title">League-wide attack & defence</h2>'+
    rankings+'<h2 class="section-title">Compare clubs</h2>'+comparison+
    '<h2 class="section-title">Explore relationships</h2>'+league+method;
}
