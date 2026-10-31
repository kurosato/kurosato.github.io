'use strict';
(() => {
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const v=window.TEST_VEHICLE,d=window.DEALER,models=window.MODELS,vans=window.VANS,allModels=[...models,...vans];
const money=n=>new Intl.NumberFormat('nl-BE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const params=new URLSearchParams(location.search);
const allowed=(key,values,fallback)=>values.includes(params.get(key))?params.get(key):fallback;
const scenario={inventory:allowed('inventory',['normal','empty','error'],'normal'),send:allowed('send',['received','failed','unknown'],'received'),availability:allowed('availability',['normal','unavailable','changing'],'normal')};
const state={mode:allowed('mode',['new','used','vans'],'new'),model:allowed('model',['all',...allModels.map(m=>m.id)],'all'),budget:allowed('budget',['any','20000','25000','30000'],'any')};
let opener=null, activeForm=null;
const drafts=new Map(); // Only RAM for the lifetime of this document. No cookies or Web Storage.
function contextParams(){const q=new URLSearchParams();for(const [k,val] of Object.entries(scenario))if(!['normal','received'].includes(val))q.set(k,val);return q;}
function queryFor(mode=state.mode,model=state.model,budget=state.budget){const q=contextParams();q.set('mode',mode);q.set('model',model);if(mode==='used')q.set('budget',budget);q.set('search','1');return q;}
function detailHref(){const q=queryFor('used',state.mode==='used'?state.model:'all',state.mode==='used'?state.budget:'any');q.set('from','results');return 'tweedehands.html?'+q;}
function show(dialog,button){opener=button||document.activeElement;dialog.showModal();const h=$('h2',dialog);h.focus();}
$$('dialog').forEach(dialog=>{
 $('.close-dialog',dialog).addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{const b=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom))dialog.close();});
 dialog.addEventListener('close',()=>{if(dialog.id==='request-dialog'&&activeForm)saveDraft(activeForm);if(opener?.isConnected)opener.focus();});
 dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const nodes=$$('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary',dialog).filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('h2',dialog))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
});
const menu=$('.menu-toggle');menu?.addEventListener('click',()=>{const on=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(on));$('#mainnav').classList.toggle('open',on);});
function closeMenu(){menu?.setAttribute('aria-expanded','false');$('#mainnav')?.classList.remove('open');}
$$('#mainnav a,#mainnav button').forEach(n=>n.addEventListener('click',closeMenu));
$$('[data-dealer-contact]').forEach(n=>{n.innerHTML=`<div><address><strong>${esc(d.name)}</strong><br>${esc(d.street)}<br>${esc(d.city)}<br><a href="tel:${d.tel}">${esc(d.phone)}</a><br><a href="mailto:${d.email}">${esc(d.email)}</a></address><div class="actions"><a class="button" href="https://www.google.com/maps/dir/?api=1&destination=Kerklaan%2056%2C%201830%20Machelen%2C%20Belgium" target="_blank" rel="noopener noreferrer">Plan je route (Google Maps)</a><a class="button" href="tel:${d.tel}">Bel De Bruyn</a></div></div><div><h3>Showroom</h3><p>${esc(d.showroom)}</p><h3>Werkplaats</h3><p>${esc(d.workshop)}</p><p class="small">Normale openingsuren. <a href="${d.source}" target="_blank" rel="noopener noreferrer">Controleer de uren op de bestaande site</a>.</p></div>`;});
function modelCard(m){return `<article class="model-card"><div class="image-slot"><strong>Beeldvak: Toyota ${esc(m.name)}</strong><span>Goedgekeurd modelbeeld nog te kiezen</span></div><h3>Toyota ${esc(m.name)}</h3><p>${esc(m.description)}</p><button type="button" data-model="${m.id}">Ontdek de ${esc(m.name)}</button></article>`;}
function usedCard(){return `<article class="vehicle-card"><div class="image-slot"><strong>Beeldvak: Toyota ${esc(v.model)}</strong><span>Fictieve testwagen, geen voertuigfoto</span></div><div class="card-copy"><p class="demo-label">Synthetische testwagen · geen aanbod</p><h3>${esc(v.make+' '+v.model+' '+v.trim)}</h3><p class="price">${money(v.price)}</p><p class="small">Fictieve totaalprijs, geen verkoopprijs</p><p>Eerste inschrijving: ${v.firstRegistration}<br>${new Intl.NumberFormat('nl-BE').format(v.mileage)} km<br>Hybride · Automatisch</p><p class="small">Alle voertuigwaarden zijn testdata.</p><a class="button primary" data-detail-link href="${detailHref()}">Bekijk deze wagen</a></div></article>`;}
function updateFinder(){
 const used=state.mode==='used',isVan=state.mode==='vans';
 $(`input[name=mode][value=${state.mode}]`).checked=true;
 $('#model').innerHTML='<option value="all">Alle modellen</option>'+(used?models.filter(m=>m.id===v.modelId):isVan?vans:models).map(m=>`<option value="${m.id}">Toyota ${esc(m.name)}</option>`).join('');
 if(!$$('#model option').some(o=>o.value===state.model))state.model='all';
 $('#model').value=state.model;$('#budget').value=state.budget;$('#budget-field').hidden=!used;$('#budget').disabled=!used;
 $('#search-button').textContent=used?'Bekijk tweedehandswagens':isVan?'Bekijk bestelwagens':'Bekijk modellen';
 $('#search-help').textContent=used?'Filter op de fictieve totaalprijs van één testwagen. Geen echt aanbod.':isVan?'Bestelwagenmodellen ontdekken, geen actuele voorraad.':'Modellen ontdekken, geen actuele voorraad.';
}
function syncLinks(){ $$('[data-detail-link]').forEach(a=>a.href=detailHref()); }
function renderResults(scroll=true){
 const box=$('#resultaten'),items=$('#result-items'),title=$('#results-title'),desc=$('#result-description');box.hidden=false;
 if(state.mode!=='used'){
  const isVan=state.mode==='vans',list=(isVan?vans:models).filter(m=>state.model==='all'||m.id===state.model);title.textContent=isVan?'Toyota-bestelwagens':'Nieuwe Toyota-modellen';desc.textContent=`${list.length} ${list.length===1?'model':'modellen'} in deze proef. Dit zijn modellen, geen beschikbare voorraadwagens.`;
  items.innerHTML=`<div class="model-grid">${list.map(modelCard).join('')}</div>`;
 }else{
  title.textContent='Tweedehandswagens';const filter=`${state.model==='all'?'Alle modellen':'Toyota '+v.model} · ${state.budget==='any'?'geen maximum':'prijs tot '+money(Number(state.budget))}`;
  desc.textContent='Demonstratie · '+filter;
  if(scenario.inventory==='error'){items.innerHTML='<p>Demo van een storing: we kunnen de tweedehandswagens momenteel niet tonen. Probeer opnieuw of neem contact op met De Bruyn voor het aanbod.</p><div class="actions"><button type="button" data-retry-inventory>Opnieuw proberen</button><button type="button" data-scope="contact">Neem contact op</button></div>';}
  else if(scenario.inventory==='empty'){items.innerHTML='<p>Demo van een lege lijst: er staan momenteel geen tweedehandswagens online. Vertel ons wat je zoekt.</p><button type="button" data-scope="contact">Neem contact op</button>';}
  else if(state.budget!=='any'&&v.price>Number(state.budget)){items.innerHTML=`<p>Geen tweedehandswagens gevonden voor ${esc(filter)} in de testdata. Pas je selectie aan of bekijk alle tweedehandswagens.</p><div class="actions"><button type="button" data-adjust>Filters aanpassen</button><button type="button" data-reset-filters>Filters wissen</button></div>`;}
  else{items.innerHTML=usedCard();desc.textContent+=' · 1 fictieve testwagen';}
 }
 syncLinks();
 if(scroll){title.focus({preventScroll:true});box.scrollIntoView({block:'start'});}
}
function runSearch(scroll=true){state.model=$('#model').value;state.budget=$('#budget').value;try{history.replaceState(null,'','?'+queryFor()+'#resultaten');}catch{}renderResults(scroll);}
if(document.body.dataset.page==='home'){
 $('#model-cards').innerHTML=models.map(modelCard).join('');
 $('#featured-used').innerHTML=scenario.inventory==='normal'?usedCard():'<p class="notice">Demonstratiescenario actief. Open de tweedehandsresultaten om de gekozen toestand te bekijken.</p>';
 updateFinder();
 $('#finder').addEventListener('submit',e=>{e.preventDefault();runSearch();});
 $$('input[name=mode]').forEach(n=>n.addEventListener('change',()=>{state.mode=n.value;state.model='all';updateFinder();if(!$('#resultaten').hidden)runSearch(false);}));
 for(const id of ['model','budget'])$('#'+id).addEventListener('change',()=>{state.model=$('#model').value;state.budget=$('#budget').value;syncLinks();if(!$('#resultaten').hidden)runSearch(false);});
 if(params.get('search')==='1'){renderResults(false);requestAnimationFrame(()=>{$('#results-title').focus({preventScroll:true});$('#resultaten').scrollIntoView();});}
}
const intents={information:'Informatie aanvragen',viewing:'Bezichtiging aanvragen',testdrive:'Proefrit aanvragen',workshop:'Werkplaatsafspraak aanvragen'};
function formHTML(ctx){
 const detail=ctx.kind==='vehicle';const key=ctx.kind==='vehicle'?'vehicle':'modal';
 const intent=detail?`<div class="form-field"><label for="${key}-intent">Wat wil je? *</label><select id="${key}-intent" name="intent"><option value="information">Informatie over deze wagen</option><option value="viewing">Een bezichtiging aanvragen</option><option value="testdrive">Een proefrit aanvragen</option></select></div>`:`<input type="hidden" name="intent" value="${ctx.intent}">`;
 const workshop=ctx.kind==='workshop'?`<div class="form-field"><label for="${key}-service">Waarvoor wil je langskomen?</label><select id="${key}-service" name="service"><option>Onderhoud</option><option>Kleine herstelling</option><option>Banden en opslag</option><option>Nazicht voor vakantie of keuring</option><option>Koetswerk en glas</option><option>Andere vraag</option></select></div>`:'';
 const model=ctx.kind==='model'?`<div class="form-field"><label for="${key}-chosen-model">${ctx.catalog==='vans'?'Bestelwagenmodel':'Model'}</label><select id="${key}-chosen-model" name="chosenModel"><option value="all">${ctx.catalog==='vans'?'Nog geen bestelwagen gekozen':'Nog geen model gekozen'}</option>${(ctx.catalog==='vans'?vans:models).map(m=>`<option value="${m.id}">Toyota ${esc(m.name)}</option>`).join('')}</select></div>`:'';
 return `<form class="request-form" autocomplete="off" novalidate><p class="context" data-form-context>${esc(ctx.label)}</p>${intent}${model}${workshop}<p class="small">Velden met * zijn verplicht.</p><div class="form-errors" role="alert" tabindex="-1"></div><div class="form-field"><label for="${key}-name">Naam *</label><input id="${key}-name" name="name" autocomplete="off" maxlength="100" required aria-describedby="${key}-name-error"><span class="field-error" id="${key}-name-error"></span></div><fieldset><legend>Hoe mogen we je contacteren? *</legend><div class="contact-options"><label><input type="radio" name="channel" value="email" required aria-describedby="${key}-channel-error"> Via e-mail</label><label><input type="radio" name="channel" value="phone" required aria-describedby="${key}-channel-error"> Telefonisch</label></div><span id="${key}-channel-error" class="field-error"></span></fieldset><div class="form-field" data-contact-field hidden><label for="${key}-contact" data-contact-label>E-mailadres *</label><input id="${key}-contact" name="contact" type="email" maxlength="150" disabled autocomplete="off" aria-describedby="${key}-contact-error"><span class="field-error" id="${key}-contact-error"></span></div><div class="form-field"><label for="${key}-question">Je vraag (optioneel)</label><textarea id="${key}-question" name="question" maxlength="2000" placeholder="Bijvoorbeeld over ${ctx.kind==='workshop'?'het onderhoud of wat je opmerkt aan je wagen':'de uitrusting, de historiek of een moment om de wagen te bekijken'}."></textarea></div>${ctx.kind==='workshop'?'':`<label><input type="checkbox" name="tradein"> Ik wil ook mijn huidige wagen inruilen (optioneel)</label>`}<p class="small">Dit is een aanvraag, geen bevestigde afspraak${ctx.kind==='workshop'?'':' of voertuigreservatie'}.</p><button class="primary" type="submit">${intents[ctx.intent]}</button><div class="form-status" role="status" tabindex="-1"></div><p class="small form-meta">Demo: niet verzonden. Contactgegevens blijven alleen tijdelijk in dit geopende document. Niets wordt verstuurd of duurzaam opgeslagen.</p><button type="button" class="inline-reset" data-clear-form>Testgegevens wissen</button><details><summary>Privacy in deze demo</summary><p>Deze lokale proef heeft geen ontvanger, tracking of opslag van contactgegevens. Gebruik geen echte persoonsgegevens. De definitieve privacyverklaring hoort bij de livekoppeling en is hier niet nagebootst.</p></details></form>`;
}
function saveDraft(form){const ctx=form._ctx;const data=Object.fromEntries(new FormData(form));drafts.set(ctx.key,{...data,tradein:!!form.elements.tradein?.checked,contactValues:{...form._contactValues}});}
function contactUpdate(form){const channel=form.elements.channel.value, field=$('[data-contact-field]',form);field.hidden=!channel;form.elements.contact.disabled=!channel;form.elements.contact.required=!!channel;if(channel){$('[data-contact-label]',form).textContent=channel==='email'?'E-mailadres *':'Telefoonnummer *';form.elements.contact.type=channel==='email'?'email':'tel';form.elements.contact.inputMode=channel==='email'?'email':'tel';form.elements.contact.value=form._contactValues[channel]||'';}}
function setupForm(container,ctx){
 container.innerHTML=formHTML(ctx);const form=$('form',container);form._ctx=ctx;form._contactValues={email:'',phone:''};form.elements.intent.value=ctx.intent;
 if(form.elements.chosenModel)form.elements.chosenModel.value=ctx.model||'all';
 if(form.elements.service&&ctx.service)form.elements.service.value=ctx.service;
 const draft=drafts.get(ctx.key);
 if(draft){for(const key of ['name','question'])form.elements[key].value=draft[key]||'';if(draft.channel)form.elements.channel.value=draft.channel;if(form.elements.tradein)form.elements.tradein.checked=draft.tradein;form._contactValues={...draft.contactValues};}
 contactUpdate(form);
 $$('input[name=channel]',form).forEach(n=>n.addEventListener('change',()=>{contactUpdate(form);$('.form-status',form).textContent='';}));
 form.elements.contact.addEventListener('input',()=>{form._contactValues[form.elements.channel.value]=form.elements.contact.value;});
 form.elements.intent.addEventListener('change',()=>{$('button[type=submit]',form).textContent=intents[form.elements.intent.value];$('.form-status',form).textContent='';});
 if(form.elements.chosenModel)form.elements.chosenModel.addEventListener('change',()=>{const m=allModels.find(x=>x.id===form.elements.chosenModel.value);$('[data-form-context]',form).textContent='Proefritaanvraag · '+(m?'Toyota '+m.name:ctx.catalog==='vans'?'Nog geen bestelwagen gekozen':'Nog geen model gekozen');});
 form.addEventListener('input',()=>{saveDraft(form);if($('.form-status',form).dataset.done==='true'){$('.form-status',form).textContent='';$('.form-status',form).dataset.done='false';}});
 $('[data-clear-form]',form).addEventListener('click',()=>{drafts.delete(ctx.key);form.reset();form.elements.intent.value=ctx.intent;if(form.elements.chosenModel){form.elements.chosenModel.value=ctx.model||'all';$('[data-form-context]',form).textContent=ctx.label;}form._contactValues={email:'',phone:''};contactUpdate(form);$$('.field-error,.form-errors,.form-status',form).forEach(n=>n.textContent='');$$('[aria-invalid]',form).forEach(n=>n.removeAttribute('aria-invalid'));$('button[type=submit]',form).textContent=intents[ctx.intent];form.elements.name.focus();});
 form.addEventListener('submit',e=>submitForm(e,form));
 return form;
}
function validate(form){
 const prefix=form._ctx.kind==='vehicle'?'vehicle':'modal';const errors=[];
 $$('.field-error',form).forEach(n=>n.textContent='');$$('[aria-invalid]',form).forEach(n=>n.removeAttribute('aria-invalid'));
 function add(field,msg){$('#'+prefix+'-'+field+'-error',form).textContent=msg;const node=field==='channel'?$('input[name=channel]',form):form.elements[field];node.setAttribute('aria-invalid','true');errors.push({id:node.id||null,node,msg});}
 if(!form.elements.name.value.trim())add('name','Vul je naam in.');
 const ch=form.elements.channel.value,c=form.elements.contact.value.trim();
 if(!ch)add('channel','Kies of we je mogen mailen of bellen.');
 else if(!c)add('contact',ch==='email'?'Vul het e-mailadres in waarop we je mogen contacteren.':'Vul het telefoonnummer in waarop we je mogen contacteren.');
 else if(ch==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c))add('contact','Controleer je e-mailadres, bijvoorbeeld naam@voorbeeld.be.');
 else if(ch==='phone'&&(!/^[+\d\s()./-]+$/.test(c)||c.replace(/\D/g,'').length<6||c.replace(/\D/g,'').length>18))add('contact','Controleer je telefoonnummer, inclusief landcode als dat nodig is.');
 const summary=$('.form-errors',form);summary.textContent='';if(errors.length){const p=document.createElement('p');p.textContent='Controleer je aanvraag:';summary.append(p);errors.forEach(err=>{const b=document.createElement('button');b.type='button';b.className='inline-reset';b.textContent=err.msg;b.addEventListener('click',()=>err.node.focus());summary.append(b);});summary.focus();}
 return errors.length===0;
}
async function submitForm(e,form){
 e.preventDefault();const status=$('.form-status',form);status.textContent='';if(!validate(form))return;
 saveDraft(form);const submit=$('button[type=submit]',form);submit.disabled=true;form.setAttribute('aria-busy','true');submit.textContent='Demo wordt verwerkt…';status.textContent='Demo: niet verzonden. We tonen de gekozen testtoestand.';
 const originalIntent=form.elements.intent.value;
 await new Promise(resolve=>setTimeout(resolve,450));
 submit.disabled=false;form.removeAttribute('aria-busy');submit.textContent=intents[form.elements.intent.value];
 const isVehicle=form._ctx.kind==='vehicle';let message='';
 if(isVehicle&&scenario.availability==='changing'){
  message='Demo: niet verzonden. De testwagen werd tijdens de aanvraag niet beschikbaar. Je invoer blijft behouden; er is niets omgezet in een algemene vraag. Bekijk andere tweedehandswagens of neem rechtstreeks contact op.';
  $('#availability').textContent='Demonstratie: niet meer beschikbaar. Geen reden zoals “verkocht” verondersteld.';
 }else if(isVehicle&&scenario.availability==='unavailable'){
  message='Demo: niet verzonden. Deze testwagen is niet beschikbaar. Je ingevulde gegevens staan er nog. Er is geen aanvraag voor deze wagen aangemaakt.';
 }else if(scenario.send==='failed'){
  message='Demo: niet verzonden. Een verzendfout is nagebootst. Je ingevulde gegevens staan er nog. Je kunt opnieuw proberen; ook dan wordt niets verzonden.';
  submit.textContent='Opnieuw proberen (demo)';
 }else if(scenario.send==='unknown'){
  message='Demo: niet verzonden. Een onzekere ontvangststatus is nagebootst. In een liveflow kan de ontvangst dan nog niet bevestigd worden. Er wordt niet automatisch opnieuw geprobeerd. Neem in dat geval contact op met De Bruyn'+(isVehicle?' en vermeld de wagenreferentie DEMO-001.':'.');
 }else{
  const chosen=form.elements.chosenModel?allModels.find(m=>m.id===form.elements.chosenModel.value)?.name:null;
  const topic=isVehicle?'Toyota Yaris Cross Testuitvoering · DEMO-001':form._ctx.kind==='workshop'?'werkplaats · '+form.elements.service.value:chosen?'Toyota '+chosen:form._ctx.catalog==='vans'?'een nog te kiezen bestelwagen':'een nog te kiezen model';
  message=`Demo: niet verzonden. Zo ziet je aanvraag eruit: ${intents[originalIntent]} voor ${topic}. Naam: ${form.elements.name.value.trim()}. Gekozen contactkanaal: ${form.elements.channel.value==='email'?'e-mail':'telefoon'}. `;
  if(form.elements.tradein?.checked)message+='Inruil is opgenomen in deze demonstratie. ';
  message+='In een liveflow neemt De Bruyn na bevestigde ontvangst contact op. Er is nu geen aanvraag ontvangen, geen afspraak bevestigd en geen wagen gereserveerd.';
 }
 status.textContent=message;status.dataset.done='true';status.focus();
}
function requestModal(kind,button,modelId,service){
 const workshop=kind==='workshop';
 const chosen=modelId||(state.model!=='all'?state.model:'all');
 const m=allModels.find(x=>x.id===chosen),catalog=vans.some(x=>x.id===chosen)||(chosen==='all'&&state.mode==='vans')?'vans':'new';
 const ctx=workshop?{kind:'workshop',key:'workshop',intent:'workshop',service,label:'Werkplaatsaanvraag · Toyota De Bruyn Machelen'}:{kind:'model',key:catalog+'-'+chosen,intent:'testdrive',model:chosen,catalog,label:'Proefritaanvraag · '+(m?'Toyota '+m.name:catalog==='vans'?'Nog geen bestelwagen gekozen':'Nog geen model gekozen')};
 $('#request-title').textContent=workshop?'Werkplaatsafspraak aanvragen':'Proefrit aanvragen';
 $('#request-context').textContent='Demo: niet verzonden. Gebruik testgegevens. We stemmen een afspraak later af; er is nu niets geboekt.';
 activeForm=setupForm($('#modal-form'),ctx);show($('#request-dialog'),button);
}
function scope(kind,button){
 if(kind==='vans'){
  if(document.body.dataset.page==='home'){state.mode='vans';state.model='all';updateFinder();runSearch();}
  else location.href='START.html?mode=vans&search=1#resultaten';
  return;
 }
 const content={
  fr:['Franse versie','<p>Deze ronde bevat alleen Nederlandse wireframes. Een Franse versie is niet uitgewerkt.</p>'],
  business:['Zakelijk rijden','<p>Deze vervolgpagina is nog niet uitgewerkt in deze proef. De homepage-intro blijft het R2-voorstel.</p><p>Voor klantbezoeken, woon-werkverkeer en de ritten daarbuiten: bespreek je keuze met De Bruyn, ook als je meerdere wagens voor je zaak zoekt.</p><a class="button" href="START.html#contact">Contact en route</a>'],
  promotions:['Promoties','<p>In dit prototype is geen actuele actie opgenomen. Dat betekent niet dat er bij De Bruyn geen promoties zijn.</p><p>Een actieblok verschijnt pas met een bevestigde looptijd, prijsbasis en voorwaarden.</p><a class="button" href="START.html#contact">Vraag naar de mogelijkheden bij De Bruyn</a>'],
  privacy:['Privacy in deze demo','<p>Formulieren verzenden niets en gebruiken geen duurzame opslag. Invoer blijft alleen in het geheugen van dit geopende document, zodat je na een fout of bij heropenen verder kunt.</p><p>Gebruik testgegevens. De definitieve privacyverklaring en ontvangstroute zijn niet onderdeel van deze proef.</p>'],
  contact:['Contact met De Bruyn',`<p>${esc(d.name)}<br>${esc(d.street)}, ${esc(d.city)}</p><p>Dit zijn echte contactgegevens. Er wordt niet automatisch gebeld of gemaild.</p><div class="actions"><a class="button" href="tel:${d.tel}">Bel De Bruyn: ${esc(d.phone)}</a><a class="button" href="mailto:${d.email}">Mail De Bruyn</a></div>`],
  'vehicle-call':['Bellen over een wagen',`<p>Deze testwagen bestaat niet als aanbod. Referentie DEMO-001 is alleen voor de demonstratie; bel de garage niet voor deze fictieve wagen.</p><p>Bij een echte wagen geeft deze actie toegang tot het verkoopteam met de referentie zichtbaar.</p><a class="button" href="START.html#contact">Algemene contactgegevens</a>`],
  services:['Je Toyota verdient aandacht. Jij duidelijke uitleg.','<p>Van een onderhoudsbeurt tot iets dat je onderweg opmerkt: vertel ons waarvoor je wilt langskomen. Bij De Bruyn in Machelen kijken we je wagen na en leggen we uit wat er gedaan is. Ook je vragen bij de factuur nemen we met je door.</p><p class="small">Compact dienstpaneel; geen volledig uitgewerkte dienstenpagina.</p><div class="actions"><button type="button" data-service="Onderhoud">Onderhoud aanvragen</button><button type="button" data-service="Banden en opslag">Vraag naar banden en opslag</button><button type="button" data-service="Kleine herstelling">Bespreek je herstelling</button><button type="button" data-service="Nazicht voor vakantie of keuring">Nazicht aanvragen</button><button type="button" data-service="Koetswerk en glas">Koetswerk of glas bespreken</button></div>']
 };
 const c=content[kind]||content.contact;$('#scope-title').textContent=c[0];$('#scope-body').innerHTML=c[1];show($('#scope-dialog'),button);
}
function modelPanel(id,button){const m=allModels.find(x=>x.id===id);if(!m)return;
 const isVan=vans.some(x=>x.id===id),intro=isVan?'Wat moet er mee, en wat moet er in of op de wagen komen? Bespreek de uitvoering, ombouw, bestickering en aflevering met De Bruyn. Wil je weten hoe het model rijdt? Vraag een proefrit aan.':'Bekijk het model en ontdek de uitvoeringen. Met onze Toyota- en hybridekennis helpen we je kiezen. Wil je weten hoe een model rijdt? Vraag een proefrit aan bij De Bruyn.';
 $('#scope-title').textContent='Toyota '+m.name;
 $('#scope-body').innerHTML=`<p class="small">Modeloriëntatie, geen voorraadwagen.</p><div class="image-slot model-gallery"><strong>Beeldvak: exterieur en interieur van de ${esc(m.name)}</strong><span>Goedgekeurd materiaal nog te kiezen</span></div><p>${intro}</p><div class="actions"><button type="button" class="primary" data-model-request="${m.id}">Proefrit aanvragen</button><a class="button" href="${isVan?'https://nl.toyota.be/business/modellen/bedrijfsvoertuigen/diesel-benzine':'https://nl.toyota.be/modellen'}" target="_blank" rel="noopener noreferrer">Bekijk ${isVan?'bestelwagens':'modellen'} bij Toyota België</a></div><p class="small">De externe link opent het ${isVan?'bestelwagenoverzicht':'algemene modeloverzicht'}. Kies daar de ${esc(m.name)}. Een proefrit is een aanvraag, geen bevestigde afspraak.</p>`;
 show($('#scope-dialog'),button);
}
function chooseIntent(intent){const form=$('#inline-form form');form.elements.intent.value=intent;$('button[type=submit]',form).textContent=intents[intent];$('.form-status',form).textContent='';$('#vehicle-request-title').focus({preventScroll:true});$('#aanvraag').scrollIntoView({block:'start'});}
if(document.body.dataset.page==='detail'){
 state.mode='used';
 const back=$('#back-results');back.href='START.html?'+queryFor('used')+'#resultaten';if(params.get('from')==='results')back.textContent='Terug naar je resultaten';
 $('[data-fixture-price]').textContent=money(v.price);
 $('#vehicle-specs').innerHTML=[['Eerste inschrijving',v.firstRegistration],['Kilometerstand',new Intl.NumberFormat('nl-BE').format(v.mileage)+' km'],['Aandrijving',v.powertrain],['Transmissie',v.transmission]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
 setupForm($('#inline-form'),{kind:'vehicle',key:'vehicle',intent:allowed('intent',['information','viewing','testdrive'],'information'),label:'Je aanvraag gaat over: Toyota Yaris Cross Testuitvoering · DEMO-001 (synthetische testwagen)'});
 if(scenario.availability==='unavailable'){
  $('#availability').textContent='Demonstratie: deze testwagen is niet meer beschikbaar. Bekijk de tweedehandsresultaten of stel een algemene vraag.';
  $$('.vehicle-actions [data-intent]').forEach(b=>b.hidden=true);
  $('#inline-form').hidden=true;$('#vehicle-request-title').textContent='Deze testwagen is niet beschikbaar';
  const p=document.createElement('p');p.innerHTML='<a class="button" href="START.html?mode=used&search=1#resultaten">Bekijk tweedehandswagens</a> <button type="button" data-scope="contact">Stel een algemene vraag</button>';$('#aanvraag').append(p);
 }
}
// Directe ingangen vanuit het ontwerp-overzicht. Alleen bekende demoacties.
if(document.body.dataset.page==='home')requestAnimationFrame(()=>{
 const panel=params.get('panel'),request=params.get('request');
 if(['business','vans','promotions','services','fr','privacy'].includes(panel))scope(panel,document.querySelector('[data-scope="'+panel+'"]'));
 else if(['workshop','testdrive'].includes(request))requestModal(request,document.querySelector('.direct [data-request="'+request+'"]'));
});
document.addEventListener('click',e=>{
 const button=e.target.closest('button,a');if(!button)return;
 if(button.dataset.scope){scope(button.dataset.scope,button);}
 else if(button.dataset.model){modelPanel(button.dataset.model,button);}
 else if(button.dataset.request){
  if(button.dataset.request==='testdrive'&&state.mode==='used'&&$('#model')?.value===v.modelId){location.href=detailHref()+'&intent=testdrive#aanvraag';}
  else requestModal(button.dataset.request,button);
 }
 else if(button.dataset.intent){chooseIntent(button.dataset.intent);}
 else if(button.dataset.modelRequest||button.dataset.service){const previous=opener;$('#scope-dialog').close();requestModal(button.dataset.service?'workshop':'testdrive',previous,button.dataset.modelRequest,button.dataset.service);}
 else if(button.dataset.image){$$('[data-image]').forEach(n=>n.setAttribute('aria-pressed',String(n===button)));$('#image-label').textContent='Beeldvak: '+button.dataset.image.toLowerCase();$('#vehicle-image').setAttribute('aria-label','Beeldvak '+button.dataset.image.toLowerCase()+', geen echte voertuigfoto');}
 else if(button.hasAttribute('data-nav-mode')&&document.body.dataset.page==='home'){e.preventDefault();state.mode=button.dataset.navMode;state.model='all';state.budget='any';updateFinder();runSearch();}
 else if(button.hasAttribute('data-reset-filters')){state.model='all';state.budget='any';updateFinder();runSearch();}
 else if(button.hasAttribute('data-adjust')){$('#model').focus();$('#finder').scrollIntoView();}
 else if(button.hasAttribute('data-retry-inventory')){scenario.inventory='normal';runSearch();$('#featured-used').innerHTML=usedCard();}
});
})();
