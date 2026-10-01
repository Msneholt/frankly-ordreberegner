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
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--cream);font-family:"Avenir Next",Avenir,"Trebuchet MS",system-ui,sans-serif;-webkit-font-smoothing:antialiased}button,input,select{font:inherit}.page{width:min(1180px,calc(100% - 32px));margin:auto;padding:26px 0 64px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:22px;border-bottom:1px solid rgba(23,76,54,.16)}.brand-logo{display:block;width:162px;height:38px;object-fit:cover}.back{color:var(--green);font-size:12px;font-weight:850;text-decoration:none}.hero{padding:38px 0 24px}.eyebrow{margin:0 0 10px;color:var(--green);font-size:11px;font-weight:900;letter-spacing:.09em}.hero h1{max-width:780px;margin:0;font-size:clamp(38px,6vw,64px);line-height:.96;letter-spacing:-.055em}.hero p:last-child{max-width:720px;margin:18px 0 0;color:var(--muted);font-size:16px;line-height:1.55}.layout{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(330px,.82fr);gap:18px;align-items:start}.card{border:1px solid rgba(23,76,54,.12);border-radius:22px;background:var(--paper);box-shadow:0 16px 46px rgba(23,76,54,.07)}.input-card{padding:25px}.card-title{margin:0 0 18px;font-size:21px;letter-spacing:-.025em}.cadence{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;padding:15px;border-radius:14px;background:var(--soft)}.field{display:flex;flex-direction:column;gap:6px}.field span,.mix-label{color:var(--muted);font-size:11px;font-weight:850}.field select,.mix-field input{width:100%;min-height:44px;padding:9px 11px;border:1px solid #bdcbc1;border-radius:10px;color:var(--ink);background:#fff;font-weight:750}.mix{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.mix-field{padding:12px;border:1px solid var(--line);border-radius:12px;background:#fbfaf4}.mix-field input{margin-top:8px;font-size:20px}.mix-note{display:block;margin-top:5px;color:#819087;font-size:10px}.result{position:sticky;top:18px;padding:25px;color:#fff;background:var(--dark)}.result-label{margin:0 0 7px;color:#a8c8b5;font-size:10px;font-weight:900;letter-spacing:.08em}.result h2{margin:0;font-size:38px;letter-spacing:-.045em}.range{display:inline-flex;margin-top:10px;padding:7px 10px;border:1px solid rgba(255,255,255,.2);border-radius:999px;color:#dcebe1;background:rgba(255,255,255,.07);font-size:11px;font-weight:850}.credit-box{margin-top:20px;padding:16px;border-radius:13px;color:var(--dark);background:var(--accent)}.credit-box span{display:block;margin-bottom:4px;font-size:10px;font-weight:900;text-transform:uppercase}.credit-box strong{font-size:30px;letter-spacing:-.04em}.next{margin-top:12px;padding:14px;border:1px solid rgba(255,255,255,.15);border-radius:12px;color:#dcebe1;font-size:12px;line-height:1.5}.next strong{display:block;color:#fff;font-size:15px}.tier-list{display:grid;gap:8px;margin-top:18px}.tier-chip{display:flex;justify-content:space-between;gap:18px;padding:11px 12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#b9d1c1;font-size:11px}.tier-chip strong{color:#fff}.tier-chip.active{border-color:var(--accent);background:rgba(183,227,197,.12)}.model{margin-top:20px;padding:26px}.model-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:17px}.model-heading h2{margin:0;font-size:30px;letter-spacing:-.04em}.model-heading p{margin:7px 0 0;color:var(--muted);font-size:12px}.price-section{margin-top:22px}.price-section:first-child{margin-top:0}.price-section h3{margin:0 0 9px;color:var(--green);font-size:15px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:15px}table{width:100%;border-collapse:collapse;min-width:760px}th,td{padding:12px;border-bottom:1px solid var(--line);font-size:12px;text-align:right}th{color:var(--muted);background:#f1f4ef;font-size:9px;text-transform:uppercase}th:first-child,td:first-child{text-align:left}.tier-cell{font-weight:900;white-space:nowrap}.credit-cell{color:var(--muted);white-space:nowrap}.active-row td{background:var(--soft)}.price{font-weight:850;white-space:nowrap}.resale{display:block;margin-top:2px;color:var(--muted);font-size:9px;font-weight:650}.footnote{margin:16px 2px 0;color:var(--muted);font-size:11px;line-height:1.5}
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
      <p class="footnote">Under hver indkøbspris står kundens videresalgspris med 15 % lagt oveni. Prisniveauerne er beregnet, så videresalgsprisen lander omkring Franklys Plus-priser.</p>
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
      var groupLabels={juice250:"250 ml juice ØKO",smoothie250:"250 ml smoothie ØKO",shot60:"60 ml shot ØKO",energy340:"340 ml energi ØKO",juice750:"750 ml juice ØKO",shot340:"340 ml shot ØKO",citrus750:"750 ml citrus ØKO",bib5000:"5 L Bag-in-Box ØKO"};
      var amounts={};creditProducts.forEach(function(product){amounts[product.key]=0;});
      var number=new Intl.NumberFormat("da-DK",{maximumFractionDigits:2});
      var money=new Intl.NumberFormat("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2});
      function range(index){return index===0?"0–124":index===1?"125–449":"450+";}
      function tierIndex(volume){var index=0;tiers.forEach(function(tier,i){if(volume>=tier.min)index=i;});return index;}
      function weeklyCredits(){var cadence=Number(document.getElementById("cadence").value)||1;return creditProducts.reduce(function(sum,product){return sum+(amounts[product.key]||0)*product.weight;},0)/cadence;}
      function shortLabel(product){return product.label.replace(/^250 ml /,"").replace(/^340 ml /,"").replace(/^750 ml /,"").replace(/^60 ml /,"").replace(/^5 L /,"");}
      function renderTables(activeIndex){var keys=[];products.forEach(function(product){if(!keys.includes(product.priceKey))keys.push(product.priceKey);});document.getElementById("priceTables").innerHTML=keys.map(function(key){var groupProducts=products.filter(function(product){return product.priceKey===key;});var head=groupProducts.map(function(product){return '<th>'+shortLabel(product)+'</th>';}).join("");var rows=tiers.map(function(tier,index){var cells=groupProducts.map(function(product){var price=product.tierPrices[tier.name];return '<td class="price">'+money.format(price)+' DKK<span class="resale">+15 %: '+money.format(price*1.15)+' DKK</span></td>';}).join("");return '<tr class="'+(index===activeIndex?'active-row':'')+'"><td class="tier-cell">'+tier.name+'</td><td class="credit-cell">'+range(index)+' cr.</td>'+cells+'</tr>';}).join("");return '<section class="price-section"><h3>'+groupLabels[key]+'</h3><div class="table-wrap"><table><thead><tr><th>Prisgruppe</th><th>Credits / uge</th>'+head+'</tr></thead><tbody>'+rows+'</tbody></table></div></section>';}).join("");}
      function render(){var volume=weeklyCredits();var index=tierIndex(volume);var tier=tiers[index];document.getElementById("tierName").textContent=tier.name;document.getElementById("tierRange").textContent=range(index)+" credits / uge";document.getElementById("creditTotal").textContent=number.format(volume)+" credits";var next=document.getElementById("nextTier");if(index<tiers.length-1){var remaining=tiers[index+1].min-volume;next.innerHTML='<strong>'+number.format(remaining)+' credits mere pr. uge</strong>for at nå '+tiers[index+1].name+'.';}else{next.innerHTML='<strong>Højeste forhandlergruppe</strong>Kunden har opnået den bedste indkøbspris.';}document.getElementById("tierList").innerHTML=tiers.map(function(item,i){return '<div class="tier-chip '+(i===index?'active':'')+'"><strong>'+item.name+'</strong><span>'+range(i)+' credits</span></div>';}).join("");renderTables(index);}
      document.getElementById("mix").innerHTML=creditProducts.map(function(product){return '<label class="mix-field"><span class="mix-label">'+product.label+'</span><input type="number" min="0" step="'+product.step+'" value="0" data-key="'+product.key+'"><span class="mix-note">'+number.format(product.weight)+' credit pr. stk. · pakke á '+product.step+'</span></label>';}).join("");
      document.addEventListener("input",function(event){if(event.target.matches("[data-key]")){var product=creditProducts.find(function(item){return item.key===event.target.dataset.key;});var entered=Math.max(0,Math.floor(Number(event.target.value)||0));var normalized=Math.round(entered/product.step)*product.step;amounts[product.key]=normalized;if(String(normalized)!==event.target.value)event.target.value=normalized;}render();});
      document.addEventListener("change",render);render();
    })();
  </script>
</body>
</html>`;
}
