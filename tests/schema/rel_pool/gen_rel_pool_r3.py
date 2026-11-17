# -*- coding: utf-8 -*-
"""FASE 2 relasjonspool R3 — konflikthåndtering (cf), 60 originale likert-items per språk.

Kontrakt: tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED) +
Soester-konvensjonen (én fil per språk, alle items inline, id-mønster cf-NNNN,
options byte-importert fra def-ipip50-big5.<lang>.json — 5-punkts NOYAKTIGHET-ankeret).
Søster-konvensjon: gen_rel_pool_r1.py (cl, commit 226b3f1) + gen_rel_pool_r2.py
(op, commit 5660b8f) — samme struktur, nytt tema.

Sign-policy: cf-0001..0030 positivt keyede (sign 1), cf-0031..0060 negativt (sign -1).
Relasjonssporet er en bilateral profilskala — poolen er utvalgskilden for live-deffens
+-+- mønster per dimensjon (2 pos + 2 neg velges i FASE 4), i motsetning til
nd-triage-poolen som er screening i én retning (NG-4).

R3-construct (itemspec themes.R3): møte med uenighet — gjenopptaking i stedet for
eskalering, direkte adressering, reparasjonsatferd etter konflikt, regulering av egne
reaksjoner. Negativt keyede items peker motsatt vei: cf-n1 eskalering av konflikt,
cf-n2 unngåelse av konflikt, cf-n3 manglende reparasjon og oppfølging.
R3-ekstra regel (themes.R3.itemStyle): utsagn om konflikt MÅ være formulertbart både
positivt og negativt; ingen item refererer ekstrem risiko eller vold (poolen er
forbrukertest, ikke sikkerhets-screening). Utført som programmert token-skann
(vold/ekstremrisiko-forbud) i assert_authoring + selftest S11d.

themes.R3 har ingen exampleSeed i spec (kun R1 har) — seedNear-flagget er tomt for
denne poolen; selftest låser tom listen eksplisitt.

Deterministisk: ingen RNG, ingen klokke. Re-kjoring er byte-identisk (selftest S13).
"""
import json, os, sys, copy

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_DIR = os.path.dirname(HERE) if os.path.basename(HERE) != "r3_build" else None
# staging (r3_build flat katalog): corpus + ipip-kilder tas fra --corpus-dir / env BRAINAREA_ROOT
BRAINAREA_ROOT = os.environ.get(
    "BRAINAREA_ROOT",
    "/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea",)
REL_POOL_FALLBACK = os.path.join(BRAINAREA_ROOT, "tests", "schema", "rel_pool")

# ------------------------------------------------------------------ items
# theme: cf-t1 taktfull direkte adressering av uenighet | cf-t2 regulering av egne reaksjoner
#        cf-t3 reparasjon og oppfølging etter konflikt | cf-n1 eskalering av konflikt
#        cf-n2 unngåelse av konflikt | cf-n3 manglende reparasjon og oppfølging
# Alle tekster egne/original (copyrightControl) — forfattet fra construct'en i
# itemspec-themes.R3, aldri fra eksterne instrumenter.
ITEMS_NO_EN = [
    # --- cf-t1: taktfull direkte adressering (10 pos) ---
    ("cf-0001","cf-t1",1,"Jeg tar opp uenigheter med folk nær meg mens de fortsatt er små.","I raise a disagreement early, before it has room to grow."),
    ("cf-0002","cf-t1",1,"Jeg sier fra når jeg er uenig, også når det er ubehagelig.","I speak up when I disagree, even when the moment feels awkward."),
    ("cf-0003","cf-t1",1,"Jeg spør folk hva de egentlig mener, før jeg legger ut min vinkel.","I ask what people actually mean before I answer their point."),
    ("cf-0004","cf-t1",1,"Jeg holder tonen rolig når samtalen om viktige ting blir vanskelig.","I keep my tone level when a talk about important things turns hard."),
    ("cf-0005","cf-t1",1,"Jeg beskriver hva jeg reagerer på i stedet for å anklage.","I describe what I react to instead of pointing blame."),
    ("cf-0006","cf-t1",1,"Jeg velger ordene mine med omhu når jeg er uenig med folk.","I choose my words with care when I disagree with people."),
    ("cf-0007","cf-t1",1,"Jeg tar opp det som plager meg én sak om gangen.","I raise the one thing that bothers me, and stay on it."),
    ("cf-0008","cf-t1",1,"Jeg forklarer hva jeg ønsker annerledes før irritasjonen får vokse.","I say what I want done differently before irritation grows on me."),
    ("cf-0009","cf-t1",1,"Jeg legger saken frem kort, selv når jeg vet folk reagerer.","I lay out the case briefly, even when I expect a reaction."),
    ("cf-0010","cf-t1",1,"Jeg inviterer folk til å fortelle når jeg gjør noe de ikke liker.","I invite people to tell me when something I do does not sit well."),
    # --- cf-t2: regulering av egne reaksjoner (10 pos) ---
    ("cf-0011","cf-t2",1,"Jeg gir meg selv noen sekunder før jeg svarer når det brenner.","I give myself a few seconds before I answer when things heat up."),
    ("cf-0012","cf-t2",1,"Jeg legger merke til sinnet mitt før det styrer ordene mine.","I notice my anger building before it steers the words I say."),
    ("cf-0013","cf-t2",1,"Jeg holder stemmen jevn når diskusjonen med folk nær meg tiltar.","I hold my voice level when a tense exchange starts to build."),
    ("cf-0014","cf-t2",1,"Jeg lurer på hva som trigget meg før jeg reagerer videre.","I wonder what set me off before I react any further."),
    ("cf-0015","cf-t2",1,"Jeg sier at jeg trenger et øyeblikk når følelsene tar overhånd.","I ask for a moment when my feelings start running the room."),
    ("cf-0016","cf-t2",1,"Jeg lytter ferdig før jeg kommer med mine egne innvendinger.","I listen all the way through before I come back with my own objections."),
    ("cf-0017","cf-t2",1,"Jeg prøver å forstå hva uenigheten egentlig handler om.","I try to understand what the disagreement is actually about."),
    ("cf-0018","cf-t2",1,"Jeg unngår å ta sarkasmen i bruk når diskusjonen spisser seg.","I stay away from sarcasm when the discussion grows pointed."),
    ("cf-0019","cf-t2",1,"Jeg lar folk fullføre tanken sin, også når den gjør meg irritert.","I let people finish their thought, also when it stings me a little."),
    ("cf-0020","cf-t2",1,"Jeg tar pausen jeg trenger, og kommer tilbake til saken.","I step out for the pause I need, and return to the matter."),
    # --- cf-t3: reparasjon og oppfølging (10 pos) ---
    ("cf-0021","cf-t3",1,"Jeg tar kontakt igjen kort tid etter at vi har kranglet.","I reach out again not long after we have quarreled."),
    ("cf-0022","cf-t3",1,"Jeg setter ord på en unnskyldning når jeg innser at jeg var hard.","I find words for an apology when my part came out too hard."),
    ("cf-0023","cf-t3",1,"Jeg tar opp igjen saken vi la, når stemningen er bedre.","I reopen the matter we set aside once the mood sits better."),
    ("cf-0024","cf-t3",1,"Jeg spør folk hvordan de har det etter en uenighet.","I ask people how they are doing after a disagreement."),
    ("cf-0025","cf-t3",1,"Jeg innrømmer mine egne feilsteg når uenigheten har lagt seg.","I admit my own missteps once the disagreement has settled down."),
    ("cf-0026","cf-t3",1,"Jeg foreslår en vei videre når diskusjonen har gått i stå.","I suggest a way forward when the discussion has ground to a halt."),
    ("cf-0027","cf-t3",1,"Jeg foreslår noe hyggelig sammen når det har vært tungt mellom oss.","I suggest something pleasant together after things have felt heavy between us."),
    ("cf-0028","cf-t3",1,"Jeg gir folk rom til å le seg ut av en tett situasjon.","I leave room for a laugh that softens a tight exchange."),
    ("cf-0029","cf-t3",1,"Jeg spør folk om de trenger mer tid før vi går videre.","I ask people if they need more time before we move on."),
    ("cf-0030","cf-t3",1,"Jeg peker på det vi er enige om, midt i uenigheten.","I name what we agree on, right in the middle of the conflict."),
    # --- cf-n1: eskalering av konflikt (10 neg) ---
    ("cf-0031","cf-n1",-1,"Jeg høyner tonen mer enn saken krever, midt i en diskusjon.","I raise my voice more than the matter calls for, mid-argument."),
    ("cf-0032","cf-n1",-1,"Jeg tar i bruk folks svakepunkter når jeg vil vinne diskusjonen.","I use the sore spots people shared when I want to win the argument."),
    ("cf-0033","cf-n1",-1,"Jeg presser på når folk tviholder, i stedet for å slippe saken.","I push on when people dig in, instead of giving the matter air."),
    ("cf-0034","cf-n1",-1,"Jeg gjentar mitt poeng høyere for hver runde folk ikke gir seg.","I repeat my point louder each round people fail to give way."),
    ("cf-0035","cf-n1",-1,"Jeg oppgraderer uenigheter når vi diskuterer noe helt annet.","I drag up matters from far back when we argue about something new."),
    ("cf-0036","cf-n1",-1,"Jeg kaster inn en frekk kommentar når diskusjonen henger i luften.","I toss in a sharp remark while the argument hangs unresolved."),
    ("cf-0037","cf-n1",-1,"Jeg gjengjelder med samme mynt når folk går hardt ut mot meg.","I give back what I take in, meeting fire with my own fire."),
    ("cf-0038","cf-n1",-1,"Jeg lar irritasjonen styre ordene mine når saken blir personlig.","I let irritation steer my words once the matter turns personal."),
    ("cf-0039","cf-n1",-1,"Jeg stiller spørsmål som stikker dypere enn saken krever.","I ask questions that cut deeper than the matter requires."),
    ("cf-0040","cf-n1",-1,"Jeg lar små uenigheter vokse til store ved å holde dem i gang.","I keep small disagreements growing by refusing to let them settle."),
    # --- cf-n2: unngåelse av konflikt (10 neg) ---
    ("cf-0041","cf-n2",-1,"Jeg smetter rundt til neste emne så snart samtalen blir anspent.","I steer to the next topic the moment the conversation tightens."),
    ("cf-0042","cf-n2",-1,"Jeg sier ja når jeg mener nei, bare for å unngå konflikt.","I say yes while meaning no, simply to keep the peace."),
    ("cf-0043","cf-n2",-1,"Jeg later som vi er enige når jeg tviler innerst inne.","I act as though we agree, while doubting it deep down."),
    ("cf-0044","cf-n2",-1,"Jeg trekker meg unna samtaler som har litt spenning i seg.","I draw away from conversations that carry a current of tension."),
    ("cf-0045","cf-n2",-1,"Jeg venter med å si noe til anspenningen har lagt seg helt.","I hold off on saying anything until the tension settles fully."),
    ("cf-0046","cf-n2",-1,"Jeg holder uenigheter for meg selv til de er blitt store.","I keep disagreements to myself until they have grown large."),
    ("cf-0047","cf-n2",-1,"Jeg lar folk vinne saken fordi jeg ikke gidder å stri.","I let people win the matter because I cannot be bothered to quarrel."),
    ("cf-0048","cf-n2",-1,"Jeg tar saken videre i hjernen min i stedet for i samtalen.","I take the matter into my own head instead of into conversation."),
    ("cf-0049","cf-n2",-1,"Jeg svarer kort og venter på at samtalen skal dø ut.","I answer in short form and wait for the talk to fade out."),
    ("cf-0050","cf-n2",-1,"Jeg unngår folk vi har hatt en vanskelig diskusjon med.","I avoid people I have shared a difficult exchange with."),
    # --- cf-n3: manglende reparasjon og oppfølging (10 neg) ---
    ("cf-0051","cf-n3",-1,"Jeg lar uenigheter henge mellom oss i flere dager.","I let disagreements hang between us for days on end."),
    ("cf-0052","cf-n3",-1,"Jeg holder på mitt syn lenge etter at striden har lagt seg.","I hold on to my stance long after the friction has died down."),
    ("cf-0053","cf-n3",-1,"Jeg etterlater saken uavklart når folk er lei seg.","I leave the matter unsettled when people are hurt or down."),
    ("cf-0054","cf-n3",-1,"Jeg venter på at den andre skal ta første steg mot forsoning.","I wait for the other one to make the first move toward repair."),
    ("cf-0055","cf-n3",-1,"Jeg later som saken er over og lar spenningen bli igjen mellom oss.","I treat the matter as closed and let the strain sit between us."),
    ("cf-0056","cf-n3",-1,"Jeg vil ikke ta imot unnskyldninger kort tid etter en diskusjon.","I do not accept apologies shortly after a hard exchange."),
    ("cf-0057","cf-n3",-1,"Jeg peker på hva folk gjorde galt, i stedet for min egen del.","I name what people did wrong, and skip my own share."),
    ("cf-0058","cf-n3",-1,"Jeg lar folk gjette hvordan de har såret meg.","I keep to myself how badly their words landed on me."),
    ("cf-0059","cf-n3",-1,"Jeg lar samtalen ende uten at vi har sagt det siste vi trengte.","I let the exchange end without our saying what we still needed to say."),
    ("cf-0060","cf-n3",-1,"Jeg kjenner meg kald når folk prøver å reparere stemningen.","I feel remote when people reach out to smooth things over."),
]

REDUNDANT_PAIRS = [
    ("cf-0002", "cf-0009"),
    ("cf-0011", "cf-0015"),
    ("cf-0023", "cf-0055"),
    ("cf-0045", "cf-0046"),
    ("cf-0048", "cf-0049"),
    ("cf-0051", "cf-0052"),
]
REDUNDANT = {}
for a, b in REDUNDANT_PAIRS:
    REDUNDANT.setdefault(a, []).append(b)
    REDUNDANT.setdefault(b, []).append(a)
# themes.R3 har ingen exampleSeed i itemspec (kun R1 har) -> ingen seedNear-flagg.
SEED_NEAR = set()

# ------------------------------------------------------------------ forfattersjekker
FORBID_SUBSTR = [
    # formuleringssfæren av kjente items fra kommersielle instrumenter
    "your boundaries are important", "i need space", "we welcome disagreement openly",
    "argue with my partner", "soften your approach", "keep to your plans",
    "shutting people out", "stonewall", "contempt", "four horsemen",
]
# R3-ekstra: vold/ekstremrisiko-forbud (themes.R3: forbrukertest, ikke sikkerhets-screening)
FORBID_TOKENS = ["alltid", "aldri", "always", "never",
                 "vold", "violens", "våpen", "spark", "sparkende", "slåss", "slår", "slaget",
                 "trussel", "truer", "truede", "skade", "skadet", "skadelig", "fysisk",
                 "violence", "violent", "fight", "fights", "fighting", "fought",
                 "hit", "hitting", "hits", "strike", "striking", "struck", "shove",
                 "punch", "punching", "weapon", "threat", "threaten", "threatening",
                 "scream", "screaming", "fists", "fist", "blood", "slap", "slapping"]
def wc(t):
    return len(t.split())

def corpus_dir():
    # prod-kjoring: HERE == rel_pool (søster-defene ligger side om side).
    # staging (r3_build eller annen flat mappe):Bruk REL_POOL_DIR/BRAINAREA_ROOT.
    src = os.environ.get("REL_POOL_DIR", "")
    if src and os.path.isdir(src):
        return src
    if os.path.isfile(os.path.join(HERE, "def-rel-cl-60.no.json")):
        return HERE
    return REL_POOL_FALLBACK

def load_corpus_texts():
    """R1 (cl) + R2 (op) tekster per språk — korsreferansekorpuset for 5-gram-krysset."""
    out = {}
    base = corpus_dir()
    for lang in ("no", "en"):
        texts = []
        for fam in ("cl", "op"):
            src = os.path.join(base, "def-rel-%s-60.%s.json" % (fam, lang))
            if not os.path.isfile(src):
                src = os.path.join(REL_POOL_FALLBACK, "def-rel-%s-60.%s.json" % (fam, lang))
            with open(src, encoding="utf-8") as f:
                d = json.load(f)
            texts.extend(it["text"].lower() for it in d["items"])
        out[lang] = texts
    return out

def grams5(t):
    ws = [w for w in t.lower().replace(",", " ").replace(".", " ").replace(";", " ").split() if w]
    return [" ".join(ws[i:i+5]) for i in range(len(ws) - 4)]

def assert_authoring():
    errs = []
    seen = {"no": set(), "en": set()}
    corpus = load_corpus_texts()
    for (iid, theme, sign, no, en) in ITEMS_NO_EN:
        for lang, t in (("no", no), ("en", en)):
            if not (8 <= wc(t) <= 14):
                errs.append("%s %s: %d ord :: %s" % (lang, iid, wc(t), t))
            if not t.endswith("."):
                errs.append("%s %s: mangler punktum" % (lang, iid))
            if t.count(".") != 1 or ";" in t or "?" in t:
                errs.append("%s %s: ikke ett utsagn" % (lang, iid))
            if not (t.startswith("Jeg ") or t.startswith("I ")):
                errs.append("%s %s: ikke førsteperson" % (lang, iid))
            low = t.lower()
            for frag in FORBID_SUBSTR:
                if frag in low:
                    errs.append("%s %s: forbudt fragment '%s'" % (lang, iid, frag))
            for tok in low.replace(",", " ").replace(".", " ").replace(";", " ").replace(",", " ").split():
                if tok in FORBID_TOKENS:
                    errs.append("%s %s: forbudt token '%s'" % (lang, iid, tok))
            if t in seen[lang]:
                errs.append("%s %s: duplikat tekst" % (lang, iid))
            seen[lang].add(t)
            # kryss mot R1+R2-korpuset: ingen felles 5-gram (formuleringssammenfall;
            # 4-gram er for strengt — naturlige domenefraser deler vokabular tvers dimensjoner)
            for g in grams5(t):
                for r1t in corpus[lang]:
                    if g in r1t.lower().replace(",", " ").replace(".", " ").replace(";", " "):
                        errs.append("%s %s: 5-gram '%s' sammenfaller med R1/R2-korpuset" % (lang, iid, g))
    # tema-bånd + sign-blokk-kontinuitet
    for idx, (iid, theme, sign, _n, _e) in enumerate(ITEMS_NO_EN):
        band = idx // 10
        expected_theme = ["cf-t1", "cf-t2", "cf-t3", "cf-n1", "cf-n2", "cf-n3"][band]
        expected_sign = 1 if band < 3 else -1
        if theme != expected_theme or sign != expected_sign:
            errs.append("%s: tema/sign-brudd (fikk %s/%d, ventet %s/%d)" % (iid, theme, sign, expected_theme, expected_sign))
    if errs:
        raise RuntimeError("forfattersjekk feilet:\n" + "\n".join(errs))

# ------------------------------------------------------------------ options fra ipip50
def load_options(lang):
    src = None
    cand = [os.path.join(corpus_dir(), os.pardir, "def-ipip50-big5.%s.json" % lang),
            os.path.join(BRAINAREA_ROOT, "tests", "schema", "def-ipip50-big5.%s.json" % lang)]
    for c in cand:
        if os.path.isfile(c):
            src = c
            break
    if src is None:
        raise RuntimeError("fant ikke def-ipip50-big5.%s.json" % lang)
    with open(src, encoding="utf-8") as f:
        d = json.load(f)
    opt = None
    for it in d["items"]:
        c = json.dumps(it["options"], sort_keys=True, ensure_ascii=False)
        if opt is None:
            opt = c
        elif c != opt:
            raise RuntimeError("ipip50 options varierer på item " + it["id"])
    if not opt or len(json.loads(opt)) != 5:
        raise RuntimeError("ipip50 options har ikke 5 verdier")
    return json.loads(opt), src

def dimension_label(lang):
    with open(os.path.join(BRAINAREA_ROOT, "tests", "schema", "_rel_itemspec_spec.json"), encoding="utf-8") as f:
        spec = json.load(f)
    v = spec["dimensionDecision"]["value"]["conflict"]
    return v["labelNo"] if lang == "no" else v["labelEn"]

def build_def(lang, opt):
    label = dimension_label(lang)
    desc = ("Møte med uenighet: gjenopptaking i stedet for eskalering, direkte adressering, "
            "reparasjon etter konflikt og regulering av egne reaksjoner."
            if lang == "no" else
            "Meeting disagreement: following up instead of escalating, direct addressing, "
            "repair after conflict, and regulation of one's own reactions.")
    items = []
    for (iid, theme, sign, no, en) in ITEMS_NO_EN:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": no if lang == "no" else en,
            "options": copy.deepcopy(opt),
            "scales": [{"id": "conflict", "sign": sign}],
        })
    return {
        "schemaVersion": 1,
        "id": "rel-cf-pool",
        "type": "test-definition",
        "family": "relations",
        "languages": [lang],
        "scoring": {"type": "trait", "traits": [{"id": "conflict", "weight": 1}], "norms": "none"},
        "dimensions": [{"id": "conflict", "label": label, "labelLanguage": lang, "description": desc}],
        "items": items,
    }

def build_meta():
    theme_counts = {}
    for (_i, theme, _s, _n, _e) in ITEMS_NO_EN:
        theme_counts[theme] = theme_counts.get(theme, 0) + 1
    pos = sum(1 for r in ITEMS_NO_EN if r[2] == 1)
    neg = sum(1 for r in ITEMS_NO_EN if r[2] == -1)
    rows = []
    for (iid, theme, sign, _n, _e) in ITEMS_NO_EN:
        row = {"id": iid, "dimension": "conflict", "theme": theme, "sign": sign,
               "seedNear": iid in SEED_NEAR, "redundantWith": REDUNDANT.get(iid, [])}
        rows.append(row)
    return {
        "metaVersion": 1,
        "id": "rel-cf-pool",
        "date": "2026-11-17",
        "boardLeaf": "#3825-blokken [3-VEIS] FASE 2 relasjonspool per dimensjon: R3 konflikthåndtering (cf) — 60 originale items (worker TR-7D65F7941837).",
        "spec": "tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (lisensverdikten) er kontrastgrunnlag: ingen kommersielt relasjonsinstrument er lisensiert eller gjengitt — alle 60 items per språk er egne/original forfattet fra itemspec-themes.R3-construct'en. Forbud per spec.copyrightControl: gjenkjennbare formuleringer fra Gottman-programmenes instrumenter, 5 Love Languages, ENRICH, Prepare/Enrich; ASRS/AQ/RAADS-R-formuleringer; instrumentnavn i innhold. R3-ekstra forbud (themes.R3.itemStyle): ingen item refererer ekstrem risiko eller vold (poolen er forbrukertest, ikke sikkerhets-screening) — håndhevet som programmert token-skann i assert_authoring og selftest S11d.",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen instrument-/diagnose-navn, ingen ekstremrisiko/vold (R3-regelen, programmert token-skann). NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema+sign per id; tekstene er IKKE direkte oversettelser (Soester-konvensjonen). Programmatisk 5-gram-kryss mot hele R1+R2-korpuset (0 sammenfall) + fragment-skann mot kjente instrumentformuleringer.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "signPolicy": "30 positivt keyede (cf-0001..cf-0030, sign 1) + 30 negativt keyede (cf-0031..cf-0060, sign -1). Basis: itemspec.sessionFormDecision låser live +-+- per dimensjon (2 pos + 2 neg velges i FASE 4) — poolen må derfor inneholde begge retninger. Ulik nd-poolen (screening i én retning, NG-4) er dette profilkeying i to retninger, et dokumentert designvalg, ikke NG-4-avvik. R3-constructen speiler R1/R2-trekket med negativ retning: cf-n1 eskalering av konflikt, cf-n2 unngåelse av konflikt, cf-n3 manglende reparasjon og oppfølging — speilbildene av cf-t1 taktfull adressering, cf-t2 regulering av egne reaksjoner, cf-t3 reparasjon og oppfølging.",
        "themeCounts": theme_counts,
        "seedPolicy": "themes.R3 i itemspec har ingen exampleSeed (kun R1 har) — ingen seedNear-flagg i denne poolen; tom seed-liste er låst eksplisitt i selftest S10i. Oppstår en seed for R3 i en senere spec-revisjon, flagges items deretter.",
        "redundancyPolicy": "redundantWith markerer formuleringsnære par (symmetrisk, 6 par) slik at FASE 4-utvelgelsen velger maks ett item per par inn i live-deffen.",
        "holes": {
            "closes": "H-2-delen R3 (samlet faseverifikasjon 2026-11-17: rel-pool 180/240 etter R1+R2 levert samme dag): R3 konflikthåndtering 60/60 levert — H-2 er fortsatt åpen til R4 er levert.",
        },
        "items": rows,
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle items forfattet fra construct-beskrivelsen i _rel_itemspec_spec.json themes.R3 — ingen ekstern skala, ingen formell oversettelse, ingen scraping.",
            "signCounts": {"pos": pos, "neg": neg},
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized = 100*(raw-min)/(max-min) over besvart sett; enkelt-skala-rad for conflict; komposit = skalaens normalized (re-verifisert i selftest S7/S8 denne økten)",
                "scoring.js linje 118-120: sign=-1 -> c=-value, minP=-max, maxP=-min (re-verifisert i selftest S8b)",
                "render.js sessionSizeFor(likert) => alle 60 items shuffles (re-verifisert i selftest S14a)",
                "validateTestDef håndhever ikke reverseringskravet — poolens 30/30 keying er forfatter-levert, ikke motor-påtvinget (grep i tests/engine)",
                "symmetrisk +/- pool: all-3 og konstante svar gir normalized 50.0 (konstant-svar-invarians; span 240 ved 30 pos + 30 neg) — provet i selftest S8",
                "_rel_compat_model.mjs DIMENSIONS[2].id == 'conflict' (kind tolerance, tol 0.25) — conflict er modellens mottaksside; tolerance-formelen provet med |a-b| <= 0.25 -> s = 1 i selftest S14d",
            ],
        },
    }

def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")

def main(out_dir=None):
    out_dir = out_dir or HERE
    os.makedirs(out_dir, exist_ok=True)
    assert_authoring()
    for lang in ("no", "en"):
        opt, _src = load_options(lang)
        write_json(os.path.join(out_dir, "def-rel-cf-60.{}.json".format(lang)), build_def(lang, opt))
    write_json(os.path.join(out_dir, "_rel_pool_r3_meta.json"), build_meta())
    print("gen_rel_pool_r3: skrev 3 filer til " + out_dir)

if __name__ == "__main__":
    out = None
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    main(out)
