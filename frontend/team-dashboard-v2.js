/* FotWeb Team Dashboard v2 — isolated, rebuilt renderer and interaction layer. */
(function(){
  const sections=[
    ['summary','Overview'],['form','Team form'],['squad','Squad & coach'],
    ['players','Top players'],['fixtures','Fixtures & results'],
    ['points','Home & away points'],['statistics','Team statistics'],['info','Club information']
  ];
  const escText=s=>esc(String(s??''));
  function filterBar(){
    return '<section class="td2-filters" aria-label="Dashboard filters">'+
      '<label>Competition<select disabled><option>Indian Super League</option></select></label>'+
      '<label>Season<select disabled><option>'+escText(String(seasonData.season||'2026-27').replace('-','–'))+'</option></select></label>'+
      '<label>Club<select id="td2Club" aria-label="Select club">'+
      '<option value="all" '+(state.team==='all'?'selected':'')+'>Choose a club</option>'+
      seasonData.teams.map(t=>'<option value="'+escText(t.id)+'" '+(String(state.team)===String(t.id)?'selected':'')+'>'+escText(t.name)+'</option>').join('')+
      '</select></label></section>';
  }
  function sectionNav(){
    return '<nav class="td2-section-nav" aria-label="Dashboard sections">'+sections.map(([id,label])=>
      '<button type="button" data-td2-section="'+id+'" class="'+(state.teamSection===id?'active':'')+'" aria-pressed="'+(state.teamSection===id)+'">'+label+'</button>'
    ).join('')+'</nav>';
  }
  function infoPanel(team,fixtures){
    return '<section class="td2-card"><h2>Club information</h2><div class="td2-club-info">'+crest(team,'large')+
      '<div><h3>'+escText(team.name)+'</h3><p>'+fixtures.length+' published fixtures in the season.</p>'+
      sourceLink(team.profileUrl,'Official club profile')+'</div></div></section>';
  }
  function statsPanel(team,matches){
    const totals=[];
    for(const [key,label] of Object.entries(statLabels)){
      const values=matches.map(m=>m.stats?.[canonical(m.home)===team.name?'home':'away']?.[key]).filter(v=>v!=null&&Number.isFinite(v));
      if(values.length)totals.push([label,key==='possession'?(values.reduce((a,b)=>a+b,0)/values.length).toFixed(1)+'% average':values.reduce((a,b)=>a+b,0),values.length]);
    }
    return '<section class="td2-card"><h2>Published team statistics</h2>'+
      (totals.length?'<div class="td2-stat-list">'+totals.map(([label,value,count])=>'<div><span>'+escText(label)+'</span><strong>'+escText(value)+'</strong><small>'+count+' match records</small></div>').join('')+'</div>':
      '<p class="td2-empty">Statistics will appear here when verified match data is published.</p>')+'</section>';
  }
  function content(team){
    const matches=tdLeagueResults(team.name),fixtures=teamFixtures(team.id);
    const row=tableRows().find(t=>String(t.id)===String(team.id))||{mp:0,w:0,d:0,l:0,pts:0,gf:0,ga:0};
    switch(state.teamSection){
      case 'form':return tdFormPanel(matches,team.name);
      case 'squad':return tdSquadPanel(team);
      case 'players':return tdPlayersPanel(matches,team.name);
      case 'fixtures':return '<section class="td2-card"><h2>Fixtures & results</h2><div class="fixtures-grid">'+fixtures.map(f=>fixtureCard(f)).join('')+'</div></section>';
      case 'points':return tdVenuePanel(matches,team.name);
      case 'statistics':return statsPanel(team,resultsData.matches.filter(m=>canonical(m.home)===team.name||canonical(m.away)===team.name));
      case 'info':return infoPanel(team,fixtures);
      default:return '<section class="td2-summary-grid">'+
        '<article><span>League matches</span><strong>'+row.mp+'</strong></article>'+
        '<article><span>Points</span><strong>'+row.pts+'</strong><small>'+row.w+' W · '+row.d+' D · '+row.l+' L</small></article>'+
        '<article><span>Goals scored</span><strong>'+row.gf+'</strong></article>'+
        '<article><span>Goals conceded</span><strong>'+row.ga+'</strong></article></section>'+
        infoPanel(team,fixtures);
    }
  }
  window.renderTeamDashboardV2=function(){
    const intro=header('Team dashboard.','A club-by-club view of the ISL 2026–27 season.');
    if(state.team==='all'||!club(state.team)){
      state.team='all';
      return intro+filterBar()+'<section class="td2-welcome"><span>CLUB DASHBOARD</span><h2>Start with a club.</h2><p>Select one of the participating clubs above to load its season overview, form, squad, players and match records.</p></section>';
    }
    if(!sections.some(([id])=>id===state.teamSection))state.teamSection='summary';
    const team=club(state.team);
    return header(escText(team.name),'Explore this club’s season data and match records.',escText(team.short)+' · TEAM DASHBOARD')+
      filterBar()+sectionNav()+
      '<div class="td2-toolbar"><span>Showing verified and published information</span><button type="button" class="outline-button" data-td2-analytics="'+escText(team.id)+'">Analyse this club ↗</button></div>'+
      '<div class="td2-content">'+content(team)+'</div>';
  };
  if(!window.__fotwebTeamDashboardV2Bound){
    window.__fotwebTeamDashboardV2Bound=true;
    let selectionRenderToken=0;
    document.addEventListener('change',event=>{
      const select=event.target;
      if(select?.id!=='td2Club'||select!==document.getElementById('td2Club')||!select.isConnected)return;
      const value=String(select.value||'all');
      if(value!=='all'&&!club(value))return;
      if(state.team===value&&state.teamSection==='summary')return;
      state.team=value;
      state.teamSection='summary';
      const token=++selectionRenderToken;
      const main=document.getElementById('main');
      if(main){
        main.setAttribute('aria-busy','true');
        main.innerHTML='<section class="td2-welcome" role="status" aria-live="polite"><span>TEAM DASHBOARD</span><h2>Loading '+escText(club(value)?.name||'club')+'…</h2><p>Preparing the club’s season data.</p></section>';
      }
      requestAnimationFrame(()=>{
        if(token!==selectionRenderToken||state.page!=='team'||state.team!==value)return;
        try{
          render();
          document.getElementById('main')?.removeAttribute('aria-busy');
        }catch(error){
          console.error('FotWeb Team Dashboard render failed:',error);
          const detail=String(error?.message||error||'Unknown rendering error');
          if(main)main.innerHTML='<section class="td2-welcome" role="alert"><span>TEAM DASHBOARD</span><h2>Dashboard could not load.</h2><p>'+escText(detail)+'</p><p>The exact error has been logged for diagnosis.</p></section>';
          main?.removeAttribute('aria-busy');
        }
      });
    });
    document.addEventListener('click',event=>{
      const section=event.target.closest('[data-td2-section]');
      if(section){
        state.teamSection=section.dataset.td2Section;
        render();
        return;
      }
      const analytics=event.target.closest('[data-td2-analytics]');
      if(analytics)navigate('analytics',{analyticsTeam:analytics.dataset.td2Analytics,analyticsCompareA:analytics.dataset.td2Analytics,analyticsCompareB:''});
    });
  }
})();