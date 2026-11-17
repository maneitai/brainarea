# -*- coding: utf-8 -*-
"""FASE 2 relasjonspool R4 — selvstendighet (iv), 60 originale likert-items per språk.

Kontrakt: tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED) +
Soester-konvensjonen (én fil per språk, alle items inline, id-mønster iv-NNNN,
options byte-importert fra def-ipip50-big5.<lang>.json — 5-punkts NOYAKTIGHET-ankeret).
Søster-konvensjon: gen_rel_pool_r1.py (cl, commit 226b3f1) + gen_rel_pool_r2.py
(op, commit 5660b8f) + gen_rel_pool_r3.py (cf, commit 04fe929) — samme struktur, nytt tema.

Sign-policy: iv-0001..0030 positivt keyede (sign 1), iv-0031..0060 negativt (sign -1).
Relasjonssporet er en bilateral profilskala — poolen er utvalgskilden for live-deffens
+-+- mønster per dimensjon (2 pos + 2 neg velges i FASE 4), i motsetning til
nd-triage-poolen som er screening i én retning (NG-4).

R4-construct (itemspec themes.R4): egen tid, egne venner/interesser, grad av autonomi
i nære relasjoner (såvel samliv som vennskap), balanse mellom fellesskap og 'vi'.
Negativt keyede items peker mot lav selvstendighet: iv-n1 sammen-tid trekkes foran
egen tid (fusjonstrekk), iv-n2 egen rytme og eget rom løser seg opp (oppgitt autonomi),
iv-n3 ubehag med andres autonomi — speilbildene av iv-t1 egen tid og eget rom,
iv-t2 egne venner og interesser, iv-t3 balansen mellom 'vi' og 'jeg'.

R4-ekstra regel (themes.R4.itemStyle): ingen item normaliserer enten ekstrem
(full fusjon eller full uavhengighet) — begge ender er gyldige profiler. Utført ved
(i) at alle items er førstepersons-preferanser/beskrivelser, aldri normative
('burde'/'should'/'sunt'/'healthy'/normalisering/ideal), programmert token-skann
i assert_authoring + selftest S11e; (ii) at formuleringene holder seg ved graderte
preferanser og ikke beskriver endepunktene ('det meste', 'nesten ingen', ikke
'alt'/'aldri' — absolutter er uansett forbudt).

themes.R4 har ingen exampleSeed i spec (kun R1 har) — seedNear-flagget er tomt for
denne poolen; selftest låser tom listen eksplisitt.

Deterministisk: ingen RNG, ingen klokke. Re-kjoring er byte-identisk (selftest S13).
"""
import json, os, sys, copy

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_DIR = os.path.dirname(HERE) if os.path.basename(HERE) != "r4_build" else None
# staging (r4_build flat katalog): corpus + ipip-kilder tas fra --corpus-dir / env BRAINAREA_ROOT
BRAINAREA_ROOT = os.environ.get(
    "BRAINAREA_ROOT",
    "/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea",)
REL_POOL_FALLBACK = os.path.join(BRAINAREA_ROOT, "tests", "schema", "rel_pool")

# ------------------------------------------------------------------ items
# theme: iv-t1 egen tid og eget rom | iv-t2 egne venner og interesser
#        iv-t3 balansen mellom 'vi' og 'jeg' | iv-n1 sammen-tid foran egen tid (fusjonstrekk)
#        iv-n2 egen rytme/rom løser seg opp (oppgitt autonomi) | iv-n3 ubehag med andres autonomi
# Alle tekster egne/original (copyrightControl) — forfattet fra construct'en i
# itemspec-themes.R4, aldri fra eksterne instrumenter. Ingen item normaliserer
# enten ekstrem (R4-regelen): preferanse-språk, ikke norm-språk.
ITEMS_NO_EN = [
    # --- iv-t1: egen tid og eget rom (10 pos) ---
    ("iv-0001","iv-t1",1,"Jeg setter av tid til meg selv som en fast del av uka.","I set aside time for myself as a regular part of the week."),
    ("iv-0002","iv-t1",1,"Jeg trives når noen timer i uka er mine alene.","I enjoy having a few hours of the week that belong to me."),
    ("iv-0003","iv-t1",1,"Jeg skynder meg ikke gjennom de timene jeg har for meg selv.","I do not rush through the hours I keep for myself."),
    ("iv-0004","iv-t1",1,"Jeg har en plass i hverdagen der jeg er for meg selv.","I keep a corner of my week where I am alone."),
    ("iv-0005","iv-t1",1,"Jeg kan sitte stille med egne tanker uten å savne folk.","I can sit quietly by myself without missing anyone."),
    ("iv-0006","iv-t1",1,"Jeg lar telefonen ligge når jeg har satt av tid til meg.","I leave my phone behind when I have made space for myself."),
    ("iv-0007","iv-t1",1,"Jeg holder på vaner som bare handler om meg og dagen min.","I keep routines that are about nobody but me."),
    ("iv-0008","iv-t1",1,"Jeg kommer tilbake i bedre humør når jeg har hatt alenetid.","I come back in a better mood after time on my own."),
    ("iv-0009","iv-t1",1,"Jeg sier fra om når jeg trenger en kveld for meg selv.","I say when I need an evening of my own."),
    ("iv-0010","iv-t1",1,"Jeg legger opp dagen slik at det finnes rom for meg.","I shape my day so there is room in it for me."),
    # --- iv-t2: egne venner og interesser (10 pos) ---
    ("iv-0011","iv-t2",1,"Jeg har venner jeg holder kontakten med på egen hånd.","I have friends I stay in touch with all on my own."),
    ("iv-0012","iv-t2",1,"Jeg holder interesser i live som ingen i min krets deler.","I keep interests alive that nobody close to me shares."),
    ("iv-0013","iv-t2",1,"Jeg leser, går eller trener av grunner som er mine egne.","I read, walk or train for reasons that are entirely mine."),
    ("iv-0014","iv-t2",1,"Jeg ringer gamle venner uten at noen legger opp dagen for det.","I call old friends without needing anyone to arrange my day."),
    ("iv-0015","iv-t2",1,"Jeg har hobbyer som fyller kveldene mine på mine premisser.","I keep hobbies that fill my evenings on my own terms."),
    ("iv-0016","iv-t2",1,"Jeg lærer meg nye ting i mitt eget tempo.","I pick up new things at my own pace."),
    ("iv-0017","iv-t2",1,"Jeg har meninger som gjerne skiller seg fra de rundt meg.","I hold opinions that often drift from the people around me."),
    ("iv-0018","iv-t2",1,"Jeg melder meg på arrangementer der jeg ikke kjenner noen fra før.","I join events where I do not know a single soul."),
    ("iv-0019","iv-t2",1,"Jeg har en interesse jeg driver med på si.","I keep a small project of my own going on the side."),
    ("iv-0020","iv-t2",1,"Jeg kommer hjem med historier folk i kretsen min ikke har hørt.","I come home with stories the people around me have not heard."),
    # --- iv-t3: balansen mellom 'vi' og 'jeg' (10 pos) ---
    ("iv-0021","iv-t3",1,"Jeg bestemmer små ting i hverdagen uten å spørre noen først.","I decide the small things in my day without clearing them first."),
    ("iv-0022","iv-t3",1,"Jeg trives med at de rundt meg har planer jeg ikke er med på.","I am fine when those around me have plans of their own."),
    ("iv-0023","iv-t3",1,"Jeg er komfortabel i rom der folk gjør ulike ting samtidig.","I am at ease in rooms where everyone is doing their own thing."),
    ("iv-0024","iv-t3",1,"Jeg hører etter andres ønsker, men ender med mine egne valg.","I listen to other people's wishes, but the choice stays mine."),
    ("iv-0025","iv-t3",1,"Jeg har en identitet som står fast, uavhengig av hvem jeg er sammen med.","I keep a sense of who I am inside close relationships."),
    ("iv-0026","iv-t3",1,"Jeg velger mitt eget selskap uten dårlig samvittighet.","I choose my own company without a bad conscience."),
    ("iv-0027","iv-t3",1,"Jeg støtter opp om at folk i nærheten har ting på egen hånd.","I back the people around me when they do things on their own."),
    ("iv-0028","iv-t3",1,"Jeg ser ikke at vi er adskilt som et tegn på avstand.","I do not read time apart as a sign of distance."),
    ("iv-0029","iv-t3",1,"Jeg lar den jeg er nærmest ha oppgaver jeg ikke følger med på.","I let my closest people keep projects I do not follow."),
    ("iv-0030","iv-t3",1,"Jeg rår over egne penger og egne valg i hverdagen.","I make my own decisions about money and everyday choices."),
    # --- iv-n1: sammen-tid trekkes foran egen tid (fusjonstrekk) (10 neg) ---
    ("iv-0031","iv-n1",-1,"Jeg foretrekker at det meste av fritiden brukes sammen.","I prefer that most of our free time is spent together."),
    ("iv-0032","iv-n1",-1,"Jeg vil heller dele en opplevelse enn å ha den for meg.","I would rather share an experience than have it on my own."),
    ("iv-0033","iv-n1",-1,"Jeg planlegger uka ut fra det vi gjør sammen, ikke det jeg gjør alene.","I shape my week around what we do together, not what I do alone."),
    ("iv-0034","iv-n1",-1,"Jeg mister litt av min egen rytme når jeg deler hverdag med folk.","I lose some of my own rhythm when I share my days with someone."),
    ("iv-0035","iv-n1",-1,"Jeg lar mine egne prosjekter ligge når jeg har selskap.","I let my own projects slide when others are around me."),
    ("iv-0036","iv-n1",-1,"Jeg savner selskap raskt når jeg er alene.","I start missing company soon after I am on my own."),
    ("iv-0037","iv-n1",-1,"Jeg liker interesser best når vi gjør dem samlet.","I like hobbies best when they become something we do together."),
    ("iv-0038","iv-n1",-1,"Jeg blir litt tom når folk rundt meg gjør sine egne ting.","I feel a bit empty when others around me are busy elsewhere."),
    ("iv-0039","iv-n1",-1,"Jeg ser mine gamle venner sjeldnere enn jeg pleide.","I give my old friends less of myself than I used to."),
    ("iv-0040","iv-n1",-1,"Jeg ønsker at vi gjør det meste som ett lag.","I want us to do most things as a single unit."),
    # --- iv-n2: egen rytme/rom løser seg opp (oppgitt autonomi) (10 neg) ---
    ("iv-0041","iv-n2",-1,"Jeg gir opp mine morgenvaner for at dagen skal flyte sammen.","I give up my own morning habits so the day flows as one."),
    ("iv-0042","iv-n2",-1,"Jeg glemmer avtaler jeg har med meg selv når noen trenger meg.","I forget the appointments I make with myself when others need me."),
    ("iv-0043","iv-n2",-1,"Jeg sier ja til det som foreslås, selv når jeg hadde egne planer.","I say yes to proposals even when I had plans of my own."),
    ("iv-0044","iv-n2",-1,"Jeg opplever nesten ingen kvelder som mine alene.","I have almost no evenings that stay mine alone."),
    ("iv-0045","iv-n2",-1,"Jeg justerer menyene mine etter hva hele huset liker.","I adjust my menus to whatever the whole house prefers."),
    ("iv-0046","iv-n2",-1,"Jeg legger mine egne mål til side i et samliv.","I put my own goals to the side once I pair up."),
    ("iv-0047","iv-n2",-1,"Jeg lar mine egne planer smelte inn i den felles kalenderen.","I let my plans melt into the one shared calendar."),
    ("iv-0048","iv-n2",-1,"Jeg får dårlig samvittighet når jeg holder ting for meg selv.","I get a guilty conscience when I keep things to myself."),
    ("iv-0049","iv-n2",-1,"Jeg mister oversikten over hva som er min egen interesse.","I lose track of which interests were ever mine."),
    ("iv-0050","iv-n2",-1,"Jeg venter på at noen skal bestemme kvelden for meg.","I sit around waiting for someone else to plan the evening."),
    # --- iv-n3: ubehag med andres autonomi (10 neg) ---
    ("iv-0051","iv-n3",-1,"Jeg blir urolig når folk nær meg holder planer skjult for meg.","I get uneasy when those near me keep plans from me."),
    ("iv-0052","iv-n3",-1,"Jeg foretrekker å være med når de nærmeste mine drar ut.","I prefer to tag along when my closest people head out."),
    ("iv-0053","iv-n3",-1,"Jeg stiller noen spørsmål om kvelden folk har hatt uten meg.","I ask a few questions about evenings that happened without me."),
    ("iv-0054","iv-n3",-1,"Jeg forsøker å samordne fridager så vi sjelden er hver for oss.","I try to line up free days so we are rarely apart."),
    ("iv-0055","iv-n3",-1,"Jeg blir stille når folk rundt meg tar egne valg for seg.","I go quiet when the people around me make their own choices."),
    ("iv-0056","iv-n3",-1,"Jeg tar det litt personlig når folk vil ha kvelder for seg.","I take it a little personally when people want evenings alone."),
    ("iv-0057","iv-n3",-1,"Jeg vil vite hvor folk er når vi ikke er sammen.","I want to know where people are when we are not together."),
    ("iv-0058","iv-n3",-1,"Jeg synes planer uten meg blir mindre viktige i det store bildet.","I see plans without me as the smaller ones in the big picture."),
    ("iv-0059","iv-n3",-1,"Jeg melder meg på turen når de nærmeste mine skal ut.","I offer to come along when my closest people go out."),
    ("iv-0060","iv-n3",-1,"Jeg ønsker at de jeg er nær, heller velger tid med meg.","I want those near me to pick time with me instead."),
]

REDUNDANT_PAIRS = [
    ("iv-0001", "iv-0010"),
    ("iv-0009", "iv-0043"),
    ("iv-0012", "iv-0019"),
    ("iv-0022", "iv-0052"),
    ("iv-0028", "iv-0056"),
    ("iv-0036", "iv-0038"),
]
REDUNDANT = {}
for a, b in REDUNDANT_PAIRS:
    REDUNDANT.setdefault(a, []).append(b)
    REDUNDANT.setdefault(b, []).append(a)
# themes.R4 har ingen exampleSeed i itemspec (kun R1 har) -> ingen seedNear-flagg.
SEED_NEAR = set()

# Samme forbudsliste som R1/R2/R3 (copyrightControl + stilregler).
FORBID_SUBSTR = [
    # formuleringssfæren av kjente items fra kommersielle instrumenter
    "your boundaries are important", "i need space", "we welcome disagreement openly",
    "argue with my partner", "soften your approach", "keep to your plans",
    "shutting people out", "stonewall", "contempt", "four horsemen",
]
# Strenge token-forbud: absolutter (stilreglen) + vold/ekstremrisiko-listen
# (samme forbudsliste som R3 — arvet som sikkerhets-vakt selv om R4-constructen
# ikke burde kunne trigge den).
FORBID_TOKENS = ["alltid", "aldri", "always", "never",
                 "vold", "violens", "våpen", "spark", "sparkende", "slåss", "slår", "slaget",
                 "trussel", "truer", "truede", "skade", "skadet", "skadelig", "fysisk",
                 "violence", "violent", "fight", "fights", "fighting", "fought",
                 "hit", "hitting", "hits", "strike", "striking", "struck", "shove",
                 "punch", "punching", "weapon", "threat", "threaten", "threatening",
                 "scream", "screaming", "fists", "fist", "blood", "slap", "slapping"]
# R4-ekstra (themes.R4.itemStyle): normative utsagn er uttrykk for å normalisere en
# pol — forbudt. Alle items skal være førstepersons preferanser/beskrivelser.
NORM_TOKENS = ["burde", "bør", "should", "ought", "sunt", "healthy", "normal", "normalt",
               "normale", "ideale", "ideelt", "ideal", "perfekt", "perfect", "godt", "rittige"]
def wc(t):
    return len(t.split())

def corpus_dir():
    # prod-kjoring: HERE == rel_pool (søster-defene ligger side om side).
    # staging (r4_build eller annen flat mappe): Bruk REL_POOL_DIR/BRAINAREA_ROOT.
    src = os.environ.get("REL_POOL_DIR", "")
    if src and os.path.isdir(src):
        return src
    if os.path.isfile(os.path.join(HERE, "def-rel-cl-60.no.json")):
        return HERE
    return REL_POOL_FALLBACK

def load_corpus_texts():
    """R1 (cl) + R2 (op) + R3 (cf) tekster per språk — korsreferansekorpuset for 5-gram-krysset."""
    out = {}
    base = corpus_dir()
    for lang in ("no", "en"):
        texts = []
        for fam in ("cl", "op", "cf"):
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
            for tok in low.replace(",", " ").replace(".", " ").replace(";", " ").split():
                if tok in FORBID_TOKENS:
                    errs.append("%s %s: forbudt token '%s'" % (lang, iid, tok))
                if tok in NORM_TOKENS:
                    errs.append("%s %s: normativt token '%s' (R4-regelen)" % (lang, iid, tok))
                # R4-regelen: superlativ-normalisering ('alt sammen', 'hele') som
                # beskriver endepunktene er holdt ute ved forfattering; absolutt-
                # tokenene ovenfor vakter den programmerte siden.
            if t in seen[lang]:
                errs.append("%s %s: duplikat tekst" % (lang, iid))
            seen[lang].add(t)
            # kryss mot R1+R2+R3-korpuset: ingen felles 5-gram (formuleringssammenfall;
            # 4-gram er for strengt — naturlige domenefraser deler vokabular tvers dimensjoner)
            for g in grams5(t):
                for r1t in corpus[lang]:
                    if g in r1t.lower().replace(",", " ").replace(".", " ").replace(";", " "):
                        errs.append("%s %s: 5-gram '%s' sammenfaller med R1/R2/R3-korpuset" % (lang, iid, g))
    # tema-bånd + sign-blokk-kontinuitet
    for idx, (iid, theme, sign, _n, _e) in enumerate(ITEMS_NO_EN):
        band = idx // 10
        expected_theme = ["iv-t1", "iv-t2", "iv-t3", "iv-n1", "iv-n2", "iv-n3"][band]
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
    v = spec["dimensionDecision"]["value"]["independence"]
    return v["labelNo"] if lang == "no" else v["labelEn"]

def build_def(lang, opt):
    label = dimension_label(lang)
    desc = ("Egen tid, egne venner og interesser, graden av autonomi i nære relasjoner "
            "og balansen mellom fellesskap og 'vi'."
            if lang == "no" else
            "Own time, own friends and interests, the degree of autonomy in close "
            "relationships, and the balance between togetherness and 'we'.")
    items = []
    for (iid, theme, sign, no, en) in ITEMS_NO_EN:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": no if lang == "no" else en,
            "options": copy.deepcopy(opt),
            "scales": [{"id": "independence", "sign": sign}],
        })
    return {
        "schemaVersion": 1,
        "id": "rel-iv-pool",
        "type": "test-definition",
        "family": "relations",
        "languages": [lang],
        "scoring": {"type": "trait", "traits": [{"id": "independence", "weight": 1}], "norms": "none"},
        "dimensions": [{"id": "independence", "label": label, "labelLanguage": lang, "description": desc}],
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
        row = {"id": iid, "dimension": "independence", "theme": theme, "sign": sign,
               "seedNear": iid in SEED_NEAR, "redundantWith": REDUNDANT.get(iid, [])}
        rows.append(row)
    return {
        "metaVersion": 1,
        "id": "rel-iv-pool",
        "date": "2026-11-17",
        "boardLeaf": "#3825-blokken [3-VEIS] FASE 2 relasjonspool per dimensjon: R4 selvstendighet (iv) — 60 originale items (worker TR-58667D9E69B0).",
        "spec": "tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (lisensverdikten) er kontrastgrunnlag: ingen kommersielt relasjonsinstrument er lisensiert eller gjengitt — alle 60 items per språk er egne/original forfattet fra itemspec-themes.R4-construct'en. Forbud per spec.copyrightControl: gjenkjennbare formuleringer fra Gottman-programmenes instrumenter, 5 Love Languages, ENRICH, Prepare/Enrich; ASRS/AQ/RAADS-R-formuleringer; instrumentnavn i innhold. R4-ekstra regel (themes.R4.itemStyle): ingen item normaliserer enten ekstrem (full fusjon eller full uavhengighet) — begge ender er gyldige profiler — håndhevet via normativ-token-skann (burde/should/sunt/healthy/normal/ideal) og preferanse-basert forfattering i assert_authoring + selftest S11e.",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen instrument-/diagnose-navn, ingen normative utsagn (R4-regelen, programmert token-skann). NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema+sign per id; tekstene er IKKE direkte oversettelser (Soester-konvensjonen). Programmatisk 5-gram-kryss mot hele R1+R2+R3-korpuset (0 sammenfall) + fragment-skann mot kjente instrumentformuleringer.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "signPolicy": "30 positivt keyede (iv-0001..iv-0030, sign 1) + 30 negativt keyede (iv-0031..iv-0060, sign -1). Basis: itemspec.sessionFormDecision låser live +-+- per dimensjon (2 pos + 2 neg velges i FASE 4) — poolen må derfor inneholde begge retninger. Ulik nd-poolen (screening i én retning, NG-4) er dette profilkeying i to retninger, et dokumentert designvalg, ikke NG-4-avvik. R4-constructen deler negativ retning i tre trekk: iv-n1 sammen-tid trekkes foran egen tid (fusjonstrekk), iv-n2 egen rytme og eget rom løser seg opp (oppgitt autonomi), iv-n3 ubehag med andres autonomi — speilbildene av iv-t1 egen tid og eget rom, iv-t2 egne venner og interesser, iv-t3 balansen mellom 'vi' og 'jeg'. Begge ender av skalaen er gyldige profiler (R4-regelen): poolen keyer preferansegrad, aldri normaliserende 'god oppløsning'.",
        "themeCounts": theme_counts,
        "seedPolicy": "themes.R4 i itemspec har ingen exampleSeed (kun R1 har) — ingen seedNear-flagg i denne poolen; tom seed-liste er låst eksplisitt i selftest S10i. Oppstår en seed for R4 i en senere spec-revisjon, flagges items deretter.",
        "redundancyPolicy": "redundantWith markerer formuleringsnære par (symmetrisk, 6 par) slik at FASE 4-utvelgelsen velger maks ett item per par inn i live-deffen.",
        "holes": {
            "closes": "H-2-delen R4 (rel-pool 240/240 etter R1+R2+R3): R4 selvstendighet 60/60 levert — H-2 er dermed LUKKET; alle fire dimensjonspoolene er levert (60×4 = 240 rel-items).",
        },
        "items": rows,
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle items forfattet fra construct-beskrivelsen i _rel_itemspec_spec.json themes.R4 — ingen ekstern skala, ingen formell oversettelse, ingen scraping.",
            "signCounts": {"pos": pos, "neg": neg},
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized = 100*(raw-min)/(max-min) over besvart sett; enkelt-skala-rad for independence; komposit = skalaens normalized (re-verifisert i selftest S7/S8 denne økten)",
                "scoring.js linje 118-120: sign=-1 -> c=-value, minP=-max, maxP=-min (re-verifisert i selftest S8b)",
                "render.js sessionSizeFor(likert) => alle 60 items shuffles (re-verifisert i selftest S14a)",
                "validateTestDef håndhever ikke reverseringskravet — poolens 30/30 keying er forfatter-levert, ikke motor-påtvinget (grep i tests/engine)",
                "symmetrisk +/- pool: all-3 og konstante svar gir normalized 50.0 (konstant-svar-invarians; span 240 ved 30 pos + 30 neg) — provet i selftest S8",
                "_rel_compat_model.mjs DIMENSIONS[3].id == 'independence' (kind tolerance, tol 0.35) — independence er modellens mottaksside; tolerance-formelen provet med |a-b| <= 0.35 -> s = 1 i selftest S14d",
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
        write_json(os.path.join(out_dir, "def-rel-iv-60.{}.json".format(lang)), build_def(lang, opt))
    write_json(os.path.join(out_dir, "_rel_pool_r4_meta.json"), build_meta())
    print("gen_rel_pool_r4: skrev 3 filer til " + out_dir)

if __name__ == "__main__":
    out = None
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    main(out)
