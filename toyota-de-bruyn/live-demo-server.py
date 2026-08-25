#!/usr/bin/env python3
"""Local live-demo server for Toty Fleet Signal.

Serves app/index.html and keeps OPENROUTER_API_KEY server-side.
No third-party Python packages required.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STATIC = ROOT / "app"
MAX_BODY = 131_072

DEPTHS = {
    "lean": {
        "label": "Minimale kost",
        "model": "openai/gpt-5-mini",
        "plugin": {"id": "web", "engine": "parallel", "mode": "turbo", "max_results": 4},
        "max_tokens": 4500,
        "brief": "Compact: maximaal 4 sterke bronnen, 3 signalen en korte toelichting.",
    },
    "recommended": {
        "label": "Normaal rapport",
        "model": "openai/gpt-5.2",
        "plugin": {"id": "web", "engine": "exa", "mode": "deep-lite", "max_results": 8},
        "max_tokens": 7500,
        "brief": "Aanbevolen: 5-8 bronnen, maximaal 4 beslissingssignalen, bronconflicten en expliciete onbekenden.",
    },
    "deep": {
        "label": "Maximale diepte",
        "model": "anthropic/claude-sonnet-4.6",
        "plugin": {"id": "web", "engine": "exa", "mode": "deep", "max_results": 10},
        "max_tokens": 11000,
        "brief": "Diep: bredere officiële site, vacatures, betrouwbare pers, juridische/financiële context en alternatieve verklaringen.",
    },
}

EXCLUDED = [
    "reddit.com", "facebook.com", "instagram.com", "companyweb.be", "bizzy.ai",
    "bsearch.be", "trendstop.knack.be", "indeed.com", "indeed.be",
]


def allowed_source_url(url: str) -> bool:
    try:
        host = urllib.parse.urlparse(url).hostname or ""
    except Exception:
        return False
    host = host.lower().removeprefix("www.")
    return bool(host) and not any(host == d or host.endswith("." + d) for d in EXCLUDED)


SYSTEM = """Je bent een kritische Belgische B2B-fleetresearcher voor een gevestigde Toyota-garage.
Maak een beslissingskaart, geen generiek bedrijfsprofiel.

Harde regels:
- Gebruik officiële bedrijfswebsites, KBO/FOD-links, NBB, overheidsbronnen, officiële vacaturepagina's en betrouwbare pers/vakmedia.
- Directories, datamakelaars, fora, Reddit en sociale posts zijn nooit dragende bron.
- De server levert NBB-identiteit mee. Respecteer die; corrigeer een mismatch expliciet.
- Een kantooradres, NACE of vacature bewijst geen wagenpark. Fleetomvang, merkenmix en contracteindes blijven onbekend zonder primaire bron.
- Oudere cijfers mogen intern richting geven, maar nooit prominent in reden, opener of vragen. Noem geen oud jaartal of oude telling als actuele waarheid.
- Scheid bevestigd feit, hypothese, timingvraag en risico.
- Elke signaal-body: exact twee zinnen. Zin één geeft het feit of de hypothese; zin twee zegt waarom dit commercieel relevant is.
- Geen meta-instructies in signaaltekst: geen coaching voor de bouwer, geen 'gebruik intern', geen procesuitleg en geen instructie om iets later te valideren.
- Signaaltitels zijn concrete stellingen, geen generieke categorieën.
- Toyota-modellen zijn alleen te toetsen fits op een concrete voertuigmissie.
- Belscript: 2-3 natuurlijke zinnen. Geen adres, postcode, 'ik zag dat', 'officieel gevestigd', cijferdump, creepy researchtoon of productcatalogus.
- Exact zes vragen: actuele voertuigmissie, vervangmoment, frictie, TCO/besliscriteria, beslisroute, bewijs/praktijktest.
- Als bronnen onvoldoende zijn: zeg dat en genereer geen valse zekerheid.
- Antwoord uitsluitend als geldig JSON-object zonder markdown.
"""

CARD_FORMAT = """{
  "company":"handelsnaam",
  "legalName":"juridische naam",
  "vat":"BE 0xxx.xxx.xxx",
  "vatDigits":"10 cijfers",
  "postal":"postcode",
  "city":"gemeente/deelgemeente",
  "confidence":"Hoog|Middel|Laag",
  "potential":"Sterk|Te toetsen|Beperkt",
  "freshness":"kort label",
  "freshnessNote":"bewijsgrens",
  "website":"officiële website",
  "contactUrl":"officiële contactpagina of website",
  "phone":"alleen officieel bevestigd, anders leeg",
  "email":"alleen officieel bevestigd, anders leeg",
  "reason":"waarom nu, zonder oude cijfers",
  "opener":"natuurlijke belopening",
  "signals":[{"tag":"Bevestigd|Hypothese|Timing toetsen|Risico","kind":"fact|hot|question","title":"concrete stelling","text":"exact twee zinnen: feit/hypothese + commerciële betekenis","sourceUrl":"...","sourceTitle":"...","sourceDate":"YYYY-MM-DD of onbekend"}],
  "fleet":[{"pool":"voertuiggroep","use":"missie","fit":"te toetsen Toyota-fit","certainty":"Bevestigd|Hypothese|Onbekend|Geen fit"}],
  "questions":["exact zes vragen"],
  "unknowns":["minstens vier"],
  "sources":[{"type":"Officieel|Eigen site|Overheid|Pers","title":"...","url":"...","meta":"datum en bewijsgrens"}]
}"""


def load_env(path: str | None) -> None:
    if not path:
        return
    p = Path(path).expanduser()
    if not p.is_file():
        raise SystemExit(f"Env file not found: {p}")
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() == "OPENROUTER_API_KEY" and not os.getenv("OPENROUTER_API_KEY"):
            os.environ["OPENROUTER_API_KEY"] = value.strip().strip('"').strip("'")


def api_key() -> str:
    value = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not value:
        raise RuntimeError("OPENROUTER_API_KEY is not configured server-side")
    return value


def vat_digits(value: str) -> str:
    return re.sub(r"\D", "", value)[-10:]


def valid_belgian_vat(value: str) -> bool:
    digits = vat_digits(value)
    return len(digits) == 10 and 97 - (int(digits[:8]) % 97) == int(digits[8:])


def fetch_json(url: str) -> dict | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Toty Fleet Signal/1.0"})
        with urllib.request.urlopen(req, timeout=25) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None


def nbb_context(digits: str) -> dict:
    company = fetch_json(f"https://consult.cbso.nbb.be/api/rs-consult/companies/{digits}/NL")
    filings = fetch_json(
        "https://consult.cbso.nbb.be/api/rs-consult/published-deposits?"
        + urllib.parse.urlencode({"page": 0, "size": 3, "enterpriseNumber": digits, "sort": "depositDate,desc"})
    )
    compact_filings = []
    for item in (filings or {}).get("content", [])[:3]:
        compact_filings.append({k: item.get(k) for k in ("periodEndDateYear", "depositDate", "modelName", "status", "enterpriseName")})
    return {"company": company, "latest_filings": compact_filings}


def parse_json_content(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.S)
        if not match:
            raise
        return json.loads(match.group(0))


def openrouter(payload: dict) -> tuple[dict, dict]:
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key()}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://kurosato.github.io/toyota-de-bruyn/",
            "X-Title": "Toty Fleet Signal Live Demo",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=420) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"OpenRouter HTTP {exc.code}: {body[:800]}") from exc
    content = raw["choices"][0]["message"]["content"]
    return parse_json_content(content), raw


def polish_sales_copy(card: dict) -> tuple[dict, dict]:
    compact = {k: card.get(k) for k in ("company", "reason", "signals", "fleet", "unknowns")}
    prompt = {
        "model": "openai/gpt-5.2",
        "messages": [
            {
                "role": "system",
                "content": """Je bent een uitzonderlijk goede Belgische Toyota-fleetverkoper. Herschrijf alleen opener en zes vragen.
Geen adres, postcode, 'ik zag dat', 'officieel gevestigd', oude cijfers, jaartallen, researchtoneel of modelcatalogus.
Opener: 2-3 zinnen met operationele hypothese, expliciete onzekerheid en één open vraag.
Vragen exact in volgorde: missie, vervangmoment, frictie, TCO/criteria, beslisroute, bewijs/praktijktest.
Antwoord alleen JSON: {\"opener\":\"...\",\"questions\":[exact zes]}.""",
            },
            {"role": "user", "content": json.dumps(compact, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 2200,
    }
    polished, raw = openrouter(prompt)
    if len(polished.get("questions", [])) != 6:
        raise RuntimeError("Sales-copy pass did not return six questions")
    card["opener"] = polished["opener"].strip()
    card["questions"] = [q.strip() for q in polished["questions"]]
    return card, raw


def app_card(raw_card: dict, digits: str, depth: str, research_raw: dict, polish_raw: dict) -> dict:
    sources, by_url = [], {}
    for source in raw_card.get("sources", []):
        url = source.get("url", "").strip()
        if not url or url in by_url or not allowed_source_url(url):
            continue
        by_url[url] = len(sources) + 1
        sources.append({"n": len(sources) + 1, **source})
    kbo_url = f"https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer={digits}&actionLu=Zoek"
    if kbo_url not in by_url:
        by_url[kbo_url] = len(sources) + 1
        sources.append({"n": len(sources) + 1, "type": "Overheid", "title": "KBO Public Search — gerichte controle", "url": kbo_url, "meta": "Doorklik voor menselijke verificatie; niet systematisch hergebruiken"})
    nbb_company_url = f"https://consult.cbso.nbb.be/api/rs-consult/companies/{digits}/NL"
    nbb_filings_url = f"https://consult.cbso.nbb.be/api/rs-consult/published-deposits?page=0&size=3&enterpriseNumber={digits}&sort=depositDate,desc"
    for title, url, meta in (
        ("NBB Consult — ondernemingsidentiteit", nbb_company_url, "Publieke ondernemingscontext gebruikt voor identity matching"),
        ("NBB Consult — recente neerleggingen", nbb_filings_url, "Historische financiële context; geen bewijs van koopintentie"),
    ):
        if url not in by_url:
            by_url[url] = len(sources) + 1
            sources.append({"n": len(sources) + 1, "type": "Overheid", "title": title, "url": url, "meta": meta})
    signals = []
    for signal in raw_card.get("signals", []):
        url = signal.pop("sourceUrl", "").strip()
        signal.pop("sourceTitle", None)
        signal.pop("sourceDate", None)
        if url and not allowed_source_url(url):
            signal["tag"] = "Hypothese"
            signal["kind"] = "question"
            signal["text"] = signal.get("text", "") + " Primaire bron ontbreekt; live valideren."
        signal["src"] = by_url.get(url, by_url.get(nbb_company_url, 1))
        signals.append(signal)
    usage1, usage2 = research_raw.get("usage", {}), polish_raw.get("usage", {})
    return {
        "id": re.sub(r"[^a-z0-9]+", "-", raw_card.get("company", "prospect").lower()).strip("-") + "-" + digits,
        "company": raw_card.get("company", "Onbekende prospect"),
        "legalName": raw_card.get("legalName", "Te verifiëren"),
        "vat": raw_card.get("vat", "BE " + digits),
        "vatDigits": digits,
        "postal": raw_card.get("postal", ""),
        "city": raw_card.get("city", ""),
        "stage": "new", "contactOutcome": "none", "attempts": 0, "doNotContact": False, "nextAction": "",
        "researchedAt": date.today().isoformat(), "confidence": raw_card.get("confidence", "Middel"), "confidenceNote": "Live bronnen + NBB/KBO-controle", "potential": raw_card.get("potential", "Te toetsen"), "potentialNote": "Hypothese op missie en gebruik", "nextStep": "15 min. kwalificatie", "nextStepNote": "Valideer missie, timing en beslisroute",
        "freshness": raw_card.get("freshness", "Live gecontroleerd"), "freshnessNote": raw_card.get("freshnessNote", "Bronnen tijdens live research opgehaald"),
        "reportType": "full", "website": raw_card.get("website", ""), "contactUrl": raw_card.get("contactUrl") or raw_card.get("website", ""),
        "phone": raw_card.get("phone", ""), "email": raw_card.get("email", ""), "reason": raw_card.get("reason", ""), "opener": raw_card.get("opener", ""),
        "signals": signals, "fleet": raw_card.get("fleet", []), "questions": raw_card.get("questions", []), "unknowns": raw_card.get("unknowns", []), "sources": sources,
        "timeline": [{"date": date.today().strftime("%d %b"), "text": f"Live OpenRouter-onderzoek afgerond — {DEPTHS[depth]['label']}."}], "notes": [],
        "apiMeta": {"depth": depth, "researchModel": research_raw.get("model"), "salesModel": polish_raw.get("model"), "cost": round((usage1.get("cost") or 0) + (usage2.get("cost") or 0), 6)},
    }


def research(company: str, vat: str, postal: str, depth: str) -> dict:
    digits = vat_digits(vat)
    nbb = nbb_context(digits)
    config = DEPTHS[depth]
    user = f"""Onderzoek deze Belgische B2B-fleetprospect live.
Bedrijfsnaam uit invoer: {company}
Ondernemingsnummer: BE {digits}
Postcode uit invoer: {postal}
NBB-context: {json.dumps(nbb, ensure_ascii=False)}
KBO-doorklik: https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer={digits}&actionLu=Zoek
Diepte: {config['brief']}

Geef exact dit kaartformaat:
{CARD_FORMAT}"""
    plugin = {**config["plugin"], "exclude_domains": EXCLUDED}
    payload = {
        "model": config["model"],
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
        "plugins": [plugin], "response_format": {"type": "json_object"}, "temperature": 0.2, "max_tokens": config["max_tokens"],
    }
    card, raw1 = openrouter(payload)
    card, raw2 = polish_sales_copy(card)
    return {"card": app_card(card, digits, depth, raw1, raw2), "live": True}


def analyze_conversation(card: dict, notes: str) -> dict:
    context = {
        "today": date.today().isoformat(),
        "card": {k: card.get(k) for k in (
            "company", "legalName", "vat", "stage", "contactOutcome", "doNotContact",
            "potential", "potentialNote", "confidence", "confidenceNote", "nextStep",
            "nextStepNote", "freshness", "freshnessNote", "reason", "unknowns",
        )},
        "conversation_notes": notes,
    }
    system = """Je analyseert gespreksnotities van een Belgische Toyota-fleetverkoper en actualiseert één prospectkaart.

Regels:
- Gespreksnotities zijn de meest recente bron, maar alleen expliciete uitspraken zijn bevestigd. Verzin geen aantallen, timing, beslissers of voertuigbehoefte.
- Een afwezig detail blijft onbekend. Verlaag desnoods bronzekerheid.
- Update de vier managementkaarten kort en operationeel.
- Adviseer fase/contactuitkomst/volgende actie, maar de UI laat de gebruiker dit advies expliciet toepassen.
- 'qualified' vereist bevestigde behoefte, timing en beslisroute. 'quote' vereist een concrete oplossings-/offertevraag. 'decision' vereist dat een voorstel besproken wordt.
- Respecteer doNotContact; adviseer nooit outreach als dat actief is.
- Dataversheid mag stijgen wanneer het gesprek oude publieke informatie actualiseert.
- Antwoord alleen als geldig JSON-object, zonder markdown.

Schema:
{
 "summary":"max 3 zinnen",
 "metrics":{
  "fleetPotential":{"value":"Sterk|Te toetsen|Beperkt","note":"max 80 tekens"},
  "sourceConfidence":{"value":"Hoog|Middel|Laag","note":"max 80 tekens"},
  "nextStep":{"value":"max 35 tekens","note":"max 80 tekens"},
  "freshness":{"value":"max 30 tekens","note":"max 80 tekens"}
 },
 "stageAdvice":{"suggested":"new|outreach|contact|qualified|visit|quote|decision|nurture|won|lost","rationale":"..."},
 "contactOutcomeAdvice":{"suggested":"none|no_answer|reached|callback","rationale":"..."},
 "nextActionAdvice":{"type":"bellen|e-mail|bezoek|onderzoek|proefrit|TCO/offerte|intern overleg","date":"YYYY-MM-DD of leeg","note":"..."},
 "confirmedFacts":["..."],
 "openQuestions":["..."],
 "risks":["..."]
}"""
    payload = {
        "model": "openai/gpt-5.2",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 3500,
    }
    analysis, raw = openrouter(payload)
    return {"analysis": analysis, "meta": {"model": raw.get("model"), "cost": (raw.get("usage") or {}).get("cost")}}


class Handler(SimpleHTTPRequestHandler):
    server_version = "TotyFleetSignal/1.0"

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def json_response(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            try:
                api_key()
                self.json_response(200, {"live": True, "depths": {k: v["label"] for k, v in DEPTHS.items()}})
            except Exception as exc:
                self.json_response(503, {"live": False, "error": str(exc)})
            return
        if self.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        if self.path not in ("/api/research", "/api/conversation"):
            self.json_response(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ValueError("Invalid request size")
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            if self.path == "/api/conversation":
                card = data.get("card")
                notes = str(data.get("notes", "")).strip()[:12_000]
                if not isinstance(card, dict) or len(notes) < 10:
                    raise ValueError("Voeg een geldige kaart en concrete gespreksnotities toe")
                self.json_response(200, analyze_conversation(card, notes))
                return
            company = str(data.get("company", "")).strip()[:160]
            vat = str(data.get("vat", "")).strip()[:32]
            postal = str(data.get("postal", "")).strip()[:10]
            depth = str(data.get("depth", "recommended"))
            if not company or not re.fullmatch(r"\d{4}", postal) or not valid_belgian_vat(vat):
                raise ValueError("Controleer bedrijfsnaam, postcode en Belgisch ondernemingsnummer")
            if depth not in DEPTHS:
                raise ValueError("Onbekende rapportdiepte")
            result = research(company, vat, postal, depth)
            self.json_response(200, result)
        except ValueError as exc:
            self.json_response(400, {"error": str(exc)})
        except Exception as exc:
            self.json_response(502, {"error": str(exc)[:1000]})

    def log_message(self, fmt: str, *args) -> None:
        # Never log request bodies or authorization data.
        super().log_message(fmt, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Toty Fleet Signal with server-side OpenRouter research")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--static-dir", default=str(DEFAULT_STATIC))
    parser.add_argument("--env-file", default=os.getenv("OPENROUTER_ENV_FILE"))
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    load_env(args.env_file)
    api_key()  # fail before opening a port
    static_dir = Path(args.static_dir).resolve()
    if not (static_dir / "index.html").is_file():
        raise SystemExit(f"index.html not found in {static_dir}")
    handler = lambda *a, **kw: Handler(*a, directory=str(static_dir), **kw)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    url = f"http://{args.host}:{args.port}/"
    print(f"Toty Fleet Signal live on {url} — key loaded server-side")
    if args.open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
