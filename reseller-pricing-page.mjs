export function renderResellerPricingPage({ logoMarkup, products, tiers }) {
  const productsJson = JSON.stringify(products).replaceAll("<", "\\u003c");
  const tiersJson = JSON.stringify(tiers).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="da">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="theme-color" content="#174c36">
  <title>Frankly · Forhandlerprisgrupper</title>
  <style>
    :root{--ink:#10241a;--muted:#607067;--green:#174c36;--dark:#113b2a;--soft:#e9f2ec;--cream:#f6f3e9;--paper:#fffdf7;--line:#dce4dd;--accent:#b7e3c5}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--cream);font-family:"Avenir Next",Avenir,"Trebuchet MS",system-ui,sans-serif;-webkit-font-smoothing:antialiased}button,input,select{font:inherit}.page{width:min(1420px,calc(100% - 32px));margin:auto;padding:26px 0 64px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:22px;border-bottom:1px solid rgba(23,76,54,.16)}.brand-logo{display:block;width:162px;height:38px;object-fit:cover}.back{color:var(--green);font-size:12px;font-weight:850;text-decoration:none}.hero{padding:38px 0 24px}.eyebrow{margin:0 0 10px;color:var(--green);font-size:11px;font-weight:900;letter-spacing:.09em}.hero h1{max-width:780px;margin:0;font-size:clamp(38px,6vw,64px);line-height:.96;letter-spacing:-.055em}.hero p:last-child{max-width:720px;margin:18px 0 0;color:var(--muted);font-size:16px;line-height:1.55}.layout{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(330px,.82fr);gap:18px;align-items:start}.card{border:1px solid rgba(23,76,54,.12);border-radius:22px;background:var(--paper);box-shadow:0 16px 46px rgba(23,76,54,.07)}.input-card{padding:25px}.card-title{margin:0 0 18px;font-size:21px;letter-spacing:-.025em}.cadence{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;padding:15px;border-radius:14px;background:var(--soft)}.field{display:flex;flex-direction:column;gap:6px}.field span,.mix-label{color:var(--muted);font-size:11px;font-weight:850}.field select,.mix-field input{width:100%;min-height:44px;padding:9px 11px;border:1px solid #bdcbc1;border-radius:10px;color:var(--ink);background:#fff;font-weight:750}.mix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mix-field{padding:12px;border:1px solid var(--line);border-radius:12px;background:#fbfaf4}.mix-field input{margin-top:8px;font-size:20px}.mix-note{display:block;margin-top:5px;color:#819087;font-size:10px}.result{position:sticky;top:18px;padding:25px;color:#fff;background:var(--dark)}.result-label{margin:0 0 7px;color:#a8c8b5;font-size:10px;font-weight:900;letter-spacing:.08em}.result h2{margin:0;font-size:38px;letter-spacing:-.045em}.range{display:inline-flex;margin-top:10px;padding:7px 10px;border:1px solid rgba(255,255,255,.2);border-radius:999px;color:#dcebe1;background:rgba(255,255,255,.07);font-size:11px;font-weight:850}.credit-box{margin-top:20px;padding:16px;border-radius:13px;color:var(--dark);background:var(--accent)}.credit-box span{display:block;margin-bottom:4px;font-size:10px;font-weight:900;text-transform:uppercase}.credit-box strong{font-size:30px;letter-spacing:-.04em}.next{margin-top:12px;padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:12px;color:#dcebe1;font-size:12px;line-height:1.5}.next strong{display:block;color:#fff;font-size:15px}.tier-list{display:grid;gap:8px;margin-top:18px}.tier-chip{display:flex;justify-content:space-between;gap:18px;padding:11px 12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#b9d1c1;font-size:11px}.tier-chip strong{color:#fff}.tier-chip.active{border-color:var(--accent);background:rgba(183,227,197,.12)}.model{margin-top:20px;padding:26px}.model-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:17px}.model-heading h2{margin:0;font-size:30px;letter-spacing:-.04em}.model-heading p{margin:7px 0 0;color:var(--muted);font-size:12px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:15px}.series-table{width:100%;min-width:1260px;border-collapse:collapse}.series-table th,.series-table td{padding:15px 13px;border-bottom:1px solid var(--line);font-size:12px;text-align:right}.series-table th{color:var(--muted);background:#f1f4ef;font-size:9px;line-height:1.35;text-transform:uppercase}.series-table th:first-child,.series-table td:first-child{text-align:left}.series-table th:nth-child(-n+2),.series-table td:nth-child(-n+2){position:sticky;z-index:1;background:#f1f4ef}.series-table th:first-child,.series-table td:first-child{left:0}.series-table th:nth-child(2),.series-table td:nth-child(2){left:148px}.series-table td:nth-child(-n+2){background:var(--paper)}.series-table .active-row td{background:var(--soft)}.tier-cell{width:148px;font-weight:900;white-space:nowrap}.credit-cell{width:102px;color:var(--muted);white-space:nowrap}.price{font-weight:850;white-space:nowrap}.resale{display:block;margin-top:3px;color:var(--muted);font-size:9px;font-weight:650}.footnote{margin:16px 2px 0;color:var(--muted);font-size:11px;line-height:1.5}
    @media(max-width:820px){.layout{grid-template-columns:1fr}.result{position:static}.mix{grid-template-columns:1fr}.model{padding:18px}.model-heading{align-items:start;flex-direction:column}.topbar{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
  <main class="page">
    <header class="topbar">${logoMarkup}<a class="back" href="../">Tilbage til B2B-prisværktøjet</a></header>
    <section class="hero">
      <p class="eyebrow">INTERN MODEL · KØKKEN, KANTINE OG VIDERESALG</p>
      <h1>Tre tydelige forhandlerprisgrupper.</h1>
      <p>Indtast kundens produktmix pr. levering. Værktøjet omregner til ugentlige credits og anbefaler Forhandler Start, Partner eller Volume.</p>
    </section>

    <section class="layout">
      <div class="card input-card">
        <h2 class="card-title">Produktmix pr. levering</h2>
        <div class="cadence">
          <label class="field"><span>Leveringsfrekvens</span><select id="cadence"><option value="1">Hver uge</option><option value="2">Hver 2. uge</option><option value="3">Hver 3. uge</option><option value="4">Hver 4. uge</option></select></label>
          <label class="field"><span>Antal medarbejdere</span><select id="employees"><option>25</option><option selected>50</option><option>100</option><option>250</option><option>500</option></select></label>
        </div>
        <div id="mix" class="mix"></div>
      </div>

      <aside class="card result" aria-live="polite">
        <p class="result-label">ANBEFALET PRISGRUPPE</p>
        <h2 id="tierName">Forhandler Start</h2>
        <span id="tierRange" class="range">0–124 credits / uge</span>
        <div class="credit-box"><span>Beregnet ugevolumen</span><strong id="creditTotal">0 credits</strong></div>
        <div id="nextTier" class="next"></div>
        <div id="tierList" class="tier-list"></div>
      </aside>
    </section>

    <section class="card model">
      <div class="model-heading"><div><p class="eyebrow">SAMLET MODEL</p><h2>Grænser og priser</h2><p>Tre prisgrupper som i Franklys almindelige B2B-model. Alle priser er ekskl. moms og pr. produkt.</p></div></div>
      <div id="priceTables"></div>
      <p class="footnote">Under hver indkøbspris står kundens videresalgspris med 15 % lagt oveni. Prisintervallet afspejler variantforskelle inden for produktserien. Priserne følger den fastlagte forhandlerstige.</p>
    </section>
  </main>
  <script>
    (function(){
      var products=${productsJson};
      var tiers=${tiersJson};
      var creditProducts=[
        {key:"juice250",label:"250 ml juice",weight:1,step:6},
        {key:"smoothie250",label:"250 ml smoothie",weight:1,step:6},
        {key:"shot60",label:"60 ml shot",weight:.5,step:12},
        {key:"energy340",label:"340 ml energi",weight:1,step:6},
        {key:"juice750",label:"750 ml juice",weight:2,step:6},
        {key:"shot340",label:"340 ml shot",weight:1,step:6},
        {key:"citrus750",label:"750 ml citrus",weight:2,step:6},
        {key:"bib5000",label:"5 L Bag-in-Box",weight:10,step:1}
      ];
      var series=[
        {key:"bib5000",label:"5.000 ml juice"},
        {key:"citrus750",label:"750 ml citrus"},
        {key:"energy340",label:"340 ml energi"},
        {key:"shot340",label:"340 ml shot"},
        {key:"juice750",label:"750 ml juice"},
        {key:"juice250",label:"250 ml juice"},
        {key:"shot60",label:"60 ml shot"},
        {key:"smoothie250",label:"250 ml smoothie"}
      ];
      var amounts={};creditProducts.forEach(function(product){amounts[product.key]=0;});
      var number=new Intl.NumberFormat("da-DK",{maximumFractionDigits:2});
      var money=new Intl.NumberFormat("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2});
      function range(index){return index===0?"0–124":index===1?"125–449":"450+";}
      function tierIndex(volume){var index=0;tiers.forEach(function(tier,i){if(volume>=tier.min)index=i;});return index;}
      function weeklyCredits(){var cadence=Number(document.getElementById("cadence").value)||1;return creditProducts.reduce(function(sum,product){return sum+(amounts[product.key]||0)*product.weight;},0)/cadence;}
      function seriesPrice(key,tier){var values=products.filter(function(product){return product.priceKey===key;}).map(function(product){return Number(product.tierPrices[tier.name]);}).filter(Number.isFinite).sort(function(a,b){return a-b;});if(!values.length)return {purchase:"–",resale:"–"};var min=values[0],max=values[values.length-1];return {purchase:Math.abs(max-min)<.005?money.format(min):money.format(min)+"–"+money.format(max),resale:Math.abs(max-min)<.005?money.format(min*1.15):money.format(min*1.15)+"–"+money.format(max*1.15)};}
      function renderTables(activeIndex){var head=series.map(function(item){return '<th data-series="'+item.key+'">'+item.label+'</th>';}).join("");var rows=tiers.map(function(tier,index){var cells=series.map(function(item){var value=seriesPrice(item.key,tier);return '<td class="price">'+value.purchase+' DKK<span class="resale">+15 %: '+value.resale+' DKK</span></td>';}).join("");return '<tr class="'+(index===activeIndex?'active-row':'')+'"><td class="tier-cell">'+tier.name+'</td><td class="credit-cell">'+range(index)+' cr.</td>'+cells+'</tr>';}).join("");document.getElementById("priceTables").innerHTML='<div class="table-wrap"><table class="series-table"><thead><tr><th>Prisgruppe</th><th>Credits / uge</th>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div>';}
      function render(){var volume=weeklyCredits();var index=tierIndex(volume);var tier=tiers[index];document.getElementById("tierName").textContent=tier.name;document.getElementById("tierRange").textContent=range(index)+" credits / uge";document.getElementById("creditTotal").textContent=number.format(volume)+" credits";var next=document.getElementById("nextTier");if(index<tiers.length-1){var remaining=tiers[index+1].min-volume;next.innerHTML='<strong>'+number.format(remaining)+' credits mere pr. uge</strong>for at nå '+tiers[index+1].name+'.';}else{next.innerHTML='<strong>Højeste forhandlergruppe</strong>Kunden har opnået den bedste indkøbspris.';}document.getElementById("tierList").innerHTML=tiers.map(function(item,i){return '<div class="tier-chip '+(i===index?'active':'')+'"><strong>'+item.name+'</strong><span>'+range(i)+' credits</span></div>';}).join("");renderTables(index);}
      document.getElementById("mix").innerHTML=creditProducts.map(function(product){return '<label class="mix-field"><span class="mix-label">'+product.label+'</span><input type="number" min="0" step="'+product.step+'" value="0" data-key="'+product.key+'"><span class="mix-note">'+number.format(product.weight)+' credit pr. stk. · pakke á '+product.step+'</span></label>';}).join("");
      document.addEventListener("input",function(event){if(event.target.matches("[data-key]")){var product=creditProducts.find(function(item){return item.key===event.target.dataset.key;});var entered=Math.max(0,Math.floor(Number(event.target.value)||0));var normalized=Math.round(entered/product.step)*product.step;amounts[product.key]=normalized;if(String(normalized)!==event.target.value)event.target.value=normalized;}render();});
      document.addEventListener("change",render);render();
    })();
  </script>
</body>
</html>`;
}
