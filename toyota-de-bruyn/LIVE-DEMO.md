# Toty Fleet Signal — live demo

De publieke GitHub Pages-versie bevat vaste, gecontroleerde voorbeeldkaarten. Voor live research draait dezelfde interface via een kleine lokale Python-backend. De OpenRouter-key blijft uitsluitend in het serverproces en komt nooit in HTML, browseropslag of Git.

## Starten op deze Mac

Vanuit de repository-root:

```bash
python3 toyota-de-bruyn/live-demo-server.py \
  --static-dir toyota-de-bruyn \
  --env-file /pad/naar/lokale.env \
  --open
```

Daarna opent:

```text
http://127.0.0.1:8765/b2b-prospectkaart-demo.html
```

Stoppen: `Ctrl+C` in de terminal.

## Algemene setup

Zet `OPENROUTER_API_KEY` als server-side omgevingsvariabele of verwijs naar een lokaal `.env`-bestand:

```bash
python3 toyota-de-bruyn/live-demo-server.py \
  --static-dir toyota-de-bruyn \
  --env-file /pad/naar/lokale.env
```

Het `.env`-bestand wordt niet geserveerd en hoort nooit in de repository.

## Rapportdiepte

| Keuze in de interface | Researchmodel | Bronbereik | Sales-copy |
|---|---|---|---|
| Minimale kost | GPT-5 Mini | Compacte websearch, sterkste bronnen | GPT-5.2 |
| Normaal rapport | GPT-5.2 | Diepere search, bronconflicten en onbekenden | GPT-5.2 |
| Maximale diepte | Claude Sonnet 4.6 | Brede officiële site, jobs, pers en risicoanalyse | GPT-5.2 |

Alle drie eindigen met een aparte GPT-5.2-pass voor de belopening en zes vragen. Die pass heeft een harde stale-data-guard: geen oude cijfers of jaartallen in de opener, geen adresdump en geen ‘ik zag dat’-researchtoneel.

## Live researchflow

1. Valideert het Belgische ondernemingsnummer met checksum.
2. Haalt juridische identity en recente neerleggingen op via publieke NBB-endpoints.
3. Geeft een gerichte KBO-doorklik voor menselijke verificatie; de backend schraapt Public Search niet systematisch.
4. Zoekt officiële website, officiële jobs, overheidsbronnen en betrouwbare pers via OpenRouter web search.
5. Genereert feiten, hypothesen, risico’s, expliciete onbekenden en Toyota-fit per voertuigmissie.
6. Herschrijft opener en vragen met GPT-5.2.
7. Filtert directories, datamakelaars, fora en sociale bronnen opnieuw in code.

## Gesprekken verwerken

Plak na een call de feitelijke gespreksnotities in **Gesprek verwerken**. GPT-5.2:

- actualiseert Fleetpotentieel, Bronzekerheid, Beste volgende stap en Dataversheid;
- maakt een korte samenvatting;
- onderscheidt bevestigde feiten, open vragen en risico’s;
- adviseert commerciële fase, contactuitkomst en volgende actiedatum;
- wijzigt de workflow pas nadat de verkoper op **Pas workflowadvies toe** klikt;
- respecteert altijd de blokkering **Niet benaderen**.

## Excel-export

**Exporteer alles naar Excel** maakt één Excel-compatibele `.xls`-werkmap met aparte tabbladen voor:

- prospects met alle velden, inclusief geneste JSON;
- bronnen;
- signalen;
- voertuigfits;
- vragen en onbekenden;
- activiteiten en gespreksnotities.

## Fallback

Als `/api/health` niet live is, blijft de applicatie bruikbaar met zes vaste voorbeelden:

- Willemen Groep;
- Canon Belgium — demo in fase Offerte;
- CBRE GWS Belgium;
- Safran Aircraft Engine Services Brussels;
- DHL Aviation / DHL-operatie Steenokkerzeel;
- Van der Valk Hotel Brussels Airport.

Onbekende invoer levert zonder backend bewust geen verzonnen rapport op.
