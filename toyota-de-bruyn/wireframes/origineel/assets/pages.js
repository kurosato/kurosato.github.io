'use strict';
(()=>{
 const $=s=>document.querySelector(s);
 const notes={kosten:'Neem bestaande offertes of contracten mee, met looptijd, kilometers en inbegrepen diensten. Zo kun je op dezelfde basis vergelijken.',groei:'Beschrijf de functie, de ritten en wat je nieuwe collega moet meenemen. Noteer ook wanneer de wagen nodig is.',vervangen:'Noteer einddata, kilometerafspraken en wat je wilt behouden of veranderen. Bespreek timing voordat je een nieuwe wagen vastlegt.',planning:'Breng onderhoudsmomenten en de momenten waarop je wagens niet kunt missen samen. Bespreek eventuele mobiliteitsoplossingen vooraf.',elektrisch:'Breng je gebruikelijke ritten en mogelijke laadlocaties in kaart. Neem ook werkdagen met uitzonderlijk veel kilometers mee.'};
 function update(){const size=$('#fleet-size'),use=$('#fleet-use'),priority=$('#fleet-priority');if(!size)return;$('#fleet-summary').textContent=(size.value||'Aantal wagens nog te bepalen')+' · '+use.value+' · '+priority.selectedOptions[0].textContent+'.';$('#fleet-preparation').textContent=notes[priority.value];}
 for(const id of ['fleet-size','fleet-use','fleet-priority'])$('#'+id)?.addEventListener('change',update);update();
 document.addEventListener('click',e=>{const b=e.target.closest('[data-model-view]');if(!b)return;document.querySelectorAll('[data-model-view]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));$('#model-view-label').textContent='Beeldvak: Toyota '+document.body.dataset.modelName+', '+b.dataset.modelView;});
})();
