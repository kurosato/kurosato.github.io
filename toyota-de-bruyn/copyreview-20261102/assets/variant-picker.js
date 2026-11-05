'use strict';
(()=>{
const heroVariants=window.PAGE_VARIANTS[document.body.dataset.copyPage];
const headingGroup=document.querySelector('.hero-heading-group');
const heroTitle=document.querySelector('#hero-title');
const heroTagline=document.querySelector('.hero-welcome');
const variantSelect=document.querySelector('#variant-select');
const variantBack=document.querySelector('#variant-back');
const variantDescription=document.querySelector('#variant-description');
let selectedVariant='v0',previousVariant=null;
function renderHero(id){
 const v=heroVariants[id];headingGroup.dataset.variant=id;
 heroTitle.textContent=v.headline;heroTagline.textContent=v.tagline;
}
function fitHeroVariants(){
 headingGroup.style.minHeight='0';let height=0;
 for(const id of Object.keys(heroVariants)){renderHero(id);height=Math.max(height,headingGroup.getBoundingClientRect().height);}
 renderHero(selectedVariant);headingGroup.style.minHeight=Math.ceil(height)+'px';
}
function chooseVariant(id){
 if(!heroVariants[id]||id===selectedVariant)return;
 previousVariant=selectedVariant;selectedVariant=id;renderHero(id);
 document.querySelectorAll('[name="hero-variant"]').forEach(r=>r.checked=r.value===id);
 variantSelect.value=id;variantDescription.textContent=heroVariants[id].description;
 variantBack.disabled=false;variantBack.textContent='Terug naar '+previousVariant.toUpperCase();
 variantBack.setAttribute('aria-label','Wissel naar '+heroVariants[previousVariant].label);
 fitHeroVariants();
}
document.querySelectorAll('[name="hero-variant"]').forEach(r=>r.addEventListener('change',()=>chooseVariant(r.value)));
variantSelect.addEventListener('change',()=>chooseVariant(variantSelect.value));
variantBack.addEventListener('click',()=>{if(previousVariant)chooseVariant(previousVariant)});
let variantFrame;
window.addEventListener('resize',()=>{cancelAnimationFrame(variantFrame);variantFrame=requestAnimationFrame(fitHeroVariants)});
fitHeroVariants();
if(document.fonts)document.fonts.ready.then(fitHeroVariants);

})();
