# Toyota De Bruyn Machelen · functionele wireframes R2

## Openen op je Mac

1. Pak de volledige ZIP uit.
2. Dubbelklik op **START.html**. Gebruik een recente browser met JavaScript.
3. Laat de map **assets** naast de drie HTML-bestanden staan.

Geen installatie, server, account of internet nodig voor de demoflows. Alleen bewust aangeklikte externe links (Toyota, bestaande dealersite, Google Maps) hebben internet nodig. Bellen en mailen openen je eigen app.

## Online overzicht

- https://kurosato.github.io/toyota-de-bruyn/wireframes/
- https://kurosato.github.io/toyota-de-bruyn/wireframes/menu-voor-tim.html

## Inhoud

- **index.html**: centrale review-ingang en ZIP-download.
- **menu-voor-tim.html**: sitemap, status, doel/CTA en open ontwerpwerk per route.
- **START.html**: homepage, herozoeker, resultaten, modelpanelen en directe proefrit-/werkplaatsaanvragen.
- **tweedehands.html**: één uitgewerkt tweedehandsdetail met afzonderlijke aanvraagintenties.
- **overdracht.html**: compacte overdracht voor Tim, redactionele afwijkingen, bronnen en klikbare tests voor lege/fout/onzekere toestanden.
- **assets/dealer.js**: contactgegevens en beperkte lijst echte modelnamen.
- **assets/fixture.js**: één afzonderlijke synthetische testwagen; nooit als echte voorraad gebruiken.
- **assets/app.js** en **assets/style.css**: alle benodigde werking en sobere wireframestijl.

## Wat je kunt testen

Nieuwe modellen bekijken zonder contactgegevens; tweedehands filteren op model/totaalprijs; detail openen en terugkeren met dezelfde selectie; informatie, bezichtiging of proefrit aanvragen; één contactkanaal kiezen; validatie en invoerbehoud na fouten; werkplaatsaanvraag zonder modelkeuze. De testscenario’s staan op de overdrachtspagina.

## Uitgevoerde controle

Het pakket is lokaal in een echte Google Chrome-browser via Playwright gecontroleerd op 1440, 390 en 320 CSS-pixels. Dezelfde volledige controleronde is ook op de uitgepakte ZIP uitgevoerd met HTTP(S)-verzoeken geblokkeerd.

- 235 geslaagde functionele/technische controles per volledige ronde, waaronder 54 overloopmetingen.
- Zoeken, filters, reset, selectiebehoud, model-/wagencontext, alle drie aanvraagintenties, werkplaatsdienst, validatie, fout- en ontvangstsimulaties gecontroleerd.
- Toetsenbord: Tab, Shift+Tab, radiokeuze met pijltjestoets, Escape, focusbehoud/-terugkeer; sluitknop en klikken buiten een venster.
- Geen horizontale overloop, JavaScript-/consolefouten of HTTP(S)-netwerkverzoeken tijdens de tests.
- Lokale links en ankers gecontroleerd. Desktop- en mobiele screenshots daadwerkelijk bekeken.
- Browser-terugknop, wissen bij verversen, veilige weergave van ingevoerde tekst en ongewijzigd licht thema bij donkere OS-voorkeur aanvullend gecontroleerd.

Dit is browseremulatie op de bouwmachine, geen fysieke M5-, iPhone- of Safari-test, volledige toegankelijkheidsaudit of gemeten conversie-effect.

## Inhoudelijke beoordeling en open punten

Wagenoriëntatie, lokale De Bruyn-identiteit en passende vervolgstappen zijn herkenbaar. Modellen en voorraad zijn expliciet verschillend. De keuze voor onderhoud vereist geen aankooproute. Op 320 px vraagt de laatste directe heroactie enig scrollen; er is geen afgekapt of horizontaal weggedrukt element.

De aantrekkingskracht van echte wagens kan met neutrale beeldvakken en beperkte modelinhoud nog niet worden beoordeeld. Echte fotografie, modelverhaal, voertuighistoriek en voorwaarden blijven invulwerk met goedgekeurde bronnen. De technische controles zijn geen inhoudelijke acceptatie door bezoekers of opdrachtgever.

Tim behoudt compositie, beelden, typografie, kleuren, componenten en definitieve responsive vormgeving. R2 is een werkvoorstel, geen goedgekeurde slogan of publicatiecopy. De zes hoofdroutes blijven zichtbaar; niet uitgewerkte vervolgroutes krijgen een scopepaneel.

## Demonstratiegrens

**Geen echte voorraad, leads, afspraak of voertuigreservatie.** Elke formulieruitkomst vermeldt **Demo: niet verzonden**. Formulieren versturen niets en bewaren contactgegevens niet duurzaam. Alleen tijdelijk documentgeheugen ondersteunt foutcorrectie en heropenen van hetzelfde venster. Gebruik testgegevens. De privacytekst beschrijft alleen deze demo, niet een verzonnen productiebeleid.

Op verzoek staat deze reviewversie op GitHub Pages. Dit is niet de live dealersite. Er is niets aan Tim verstuurd. Oude V1–V3 zijn niet meer de actieve reviewversie.
