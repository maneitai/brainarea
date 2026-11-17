# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 2 (todo #3827).
Deterministisk (ingen RNG): skriver def-nd-adhd-dyp-pool-da2.{no,en}.json + _nd_adhd_dyp_meta_da2.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
DA2-tema: Hyperaktivitet og impulsivitet (idPrefix 'da', poolMin 35).
Options importert byte-identisk fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Alle items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
Copyright-vakter: ingen DSM-5-kriterietekst, ingen kommersielle ND-instrumenter, ingen ASRS-formulering,
ingen ekstremrisiko/selvskade/medisinerings-items, ingen absolutter,
5-gram-kryss mot triage-poolen OG mot DA1-poolen (begge språk).
"""
import json, os, sys, copy, re, argparse

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme id-orden,
# samme tema, ikke direkte oversettelse — Soester-konvensjonen).
# (id, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)

ITEMS = [
    # --- da2-t1: Indre uro (7)
    ("da-0041", 1, False, None, None,
     "Kroppen er stille, men inni meg går det i gang på én gang.",
     "My body sits still, while inside me the pace picks up right away."),
    ("da-0042", 1, True,
     "Anker-familien (uro i stillhet); vinkel: uroen kommer når stillheten er ferdig, ikke underveis.",
     "Anchor family (restlessness in stillness); angle: the restlessness arrives after the stillness is over.",
     "Etter en lang dag med rolig fokus finner jeg ikke roen igjen.",
     "After a long day of holding focus, the calm inside me stays gone."),
    ("da-0043", 1, False, None, None,
     "Jeg prøver å nyte roen, og uroen finner ofte noe å ta.",
     "I try to enjoy the quiet, and the pull to move takes over."),
    ("da-0044", 1, False, None, None,
     "Tankene mine holder samme tempo når alt rundt meg har stanset.",
     "My thoughts keep their speed even when everything around me stops."),
    ("da-0045", 1, False, None, None,
     "Jeg søker etter noe å holde på med for å dempe uroen.",
     "I go looking for something to fuss with to quiet the restlessness."),
    ("da-0046", 1, False, None, None,
     "Jeg tar en ekstra runde i leiligheten før jeg slår meg ned.",
     "I take one extra lap through the flat before I settle down."),
    ("da-0047", 1, True,
     "Anker-familien (ro i stillhet); vinkel: stillheten oppleves som aktiv motstand i kroppen, uten å forlate stedet.",
     "Anchor family (keeping still); angle: the stillness itself becomes a body-level resistance, without leaving the spot.",
     "Å sitte helt stille i en halvtime føles som en motstand.",
     "Sitting completely still for a half hour goes against my grain."),
    # --- da2-t2: Motorisk rastløshet (7)
    ("da-0048", 2, True,
     "Anker-familien (flikke); vinkel: hendene går automatisk, oppdaget først i etterkant.",
     "Anchor family (fidgeting); angle: the hands run on their own, noticed only afterwards.",
     "Knokene trommer bordet før jeg selv merker at det skjer.",
     "My knuckles drum the table before I notice I am doing it."),
    ("da-0049", 2, False, None, None,
     "Jeg reiser meg halvveis i alt jeg har satt meg ned til.",
     "I get up halfway through whatever I sat down to do."),
    ("da-0050", 2, False, None, None,
     "Jeg tar små runder i rommet før en prat er over.",
     "I pace small loops around the room before a chat is over."),
    ("da-0051", 2, False, None, None,
     "Jeg roter i lomma bare for å ha noe å gjøre.",
     "I dig into my pockets just to have something to do."),
    ("da-0052", 2, False, None, None,
     "Pennen min får jobbe selv når den ikke har noe å skrive.",
     "My pen keeps working even when there is nothing to write."),
    ("da-0053", 2, False, None, None,
     "Jeg vipper på stolen til noen ber meg om å slutte.",
     "I rock my chair until someone asks me to stop."),
    ("da-0054", 2, False, None, None,
     "Kaffen rekker å bli kald fordi jeg er ute av stolen.",
     "The coffee has time to go cold because I am out of the chair."),
    # --- da2-t3: Vending-impuls i samtale (7)
    ("da-0055", 3, False, None, None,
     "Jeg svarer før spørsmålet er spurt ferdig, og merker det etterpå.",
     "My answer is out before the question has finished being asked."),
    ("da-0056", 3, False, None, None,
     "Jeg tar over setninger fra folk jeg kjenner godt.",
     "I take over unfinished sentences from people I know well."),
    ("da-0057", 3, False, None, None,
     "Jeg hopper inn i samtalen før det er min tur.",
     "I jump into the conversation before it is my turn."),
    ("da-0058", 3, True,
     "Anker-familien (bryte inn); vinkel: innspillene står i kø i hodet og bryter ut sammen.",
     "Anchor family (cutting in); angle: the remarks queue up inside and break out together.",
     "Tankene mine bryter inn i samtalen før de får ro.",
     "My thoughts break into the conversation before they settle down."),
    ("da-0059", 3, False, None, None,
     "Historier jeg hører gjør meg rask med min egen versjon.",
     "Stories I hear make me quick with my own version."),
    ("da-0060", 3, False, None, None,
     "En tøys-kommentar slipper ut midt i alvorlige stunder.",
     "A silly remark slips out in the middle of serious moments."),
    ("da-0061", 3, False, None, None,
     "Jeg prater på til samtalen går tom, og starter den opp igjen.",
     "I talk until the conversation runs dry, then restart it myself."),
    # --- da2-t4: Beslutnings-impuls (7)
    ("da-0062", 4, False, None, None,
     "Kjøpet er fullført før jeg har lest prisen ferdig.",
     "The purchase is through before I finish reading the price."),
    ("da-0063", 4, False, None, None,
     "Jeg sier ja til ting før jeg har regnet på tiden de krever.",
     "I say yes to things before I have counted the hours they cost."),
    ("da-0064", 4, False, None, None,
     "Den første planen er i gang før motforslagene har landet.",
     "The first plan is running before the counter-proposals land."),
    ("da-0065", 4, True,
     "Anker-familien (bryte inn); vinkel: samme impuls i handling — handlingen bryter inn før andre er ferdige med sin del.",
     "Anchor family (cutting in); angle: the same impulse in action — the move breaks in before others finish their part.",
     "Jeg handler før alle i rommet har rukket å uttrykke seg.",
     "I act before everyone in the room has had their say."),
    ("da-0066", 4, False, None, None,
     "Jeg ombestemmer meg like etter at valget var mitt.",
     "I change my mind right after the choice was mine to make."),
    ("da-0067", 4, False, None, None,
     "Meldingene mine sender seg selv før siste gjennomlesning er ferdig.",
     "My messages send themselves before the final read-through is done."),
    ("da-0068", 4, False, None, None,
     "Mine raske valg går ofte bra, men kostnaden kommer senere.",
     "My quick decisions often go fine, with the bill arriving later."),
    # --- da2-t5: Ventetoleranse (7)
    ("da-0069", 5, False, None, None,
     "Køer gjør meg til en som ser etter raskere ruter.",
     "Queues turn me into someone scouting a faster route."),
    ("da-0070", 5, True,
     "Anker-familien (å vente); vinkel: ventingen håndteres med egne bevegelser i stedet for å stå i køen.",
     "Anchor family (waiting); angle: the wait is managed with own movements instead of holding the line.",
     "Jeg forlater venteplassen bare for å kjenne at noe skjer.",
     "I leave the waiting spot just to feel that something moves."),
    ("da-0071", 5, False, None, None,
     "Lastebarer som teller ned tar lengre tid enn tålmodigheten min.",
     "Loading bars count down slower than my patience holds."),
    ("da-0072", 5, False, None, None,
     "Jeg har telefonen fremme før ventingen har rukket å starte.",
     "My phone is out before the waiting has even started."),
    ("da-0073", 5, False, None, None,
     "En forsinket avtale gir uroen min god tid til å vokse.",
     "A delayed appointment gives my restlessness good time to grow."),
    ("da-0074", 5, False, None, None,
     "Jeg begynner å gjøre andres del når prosessen trekker seg.",
     "I start doing other people's part when the process drags."),
    ("da-0075", 5, False, None, None,
     "Jeg hopper over avsluttende steg bare for å komme videre.",
     "I skip closing steps just to get things moving onward."),
]

THEMES = {
    1: {"no": "Indre uro", "en": "Inner restlessness"},
    2: {"no": "Motorisk rastl\u00f8shet", "en": "Motoric restlessness"},
    3: {"no": "Vending-impuls i samtale", "en": "Conversational turn impulses"},
    4: {"no": "Beslutnings-impuls", "en": "Decision impulsiveness"},
    5: {"no": "Ventetoleranse", "en": "Tolerance for waiting"},
}
DIM_LABEL = {"no": "Hyperaktivitet og impulsivitet", "en": "Hyperactivity and impulsiveness"}
DIM_DESC = {
    "no": "Indre uro, motorisk rastl\u00f8shet, vending- og beslutnings-impuls og ventetoleranse, selvrapportert.",
    "en": "Inner restlessness, motoric restlessness, turn and decision impulses and waiting tolerance, self-reported.",
}

# ---------------------------------------------------------------- forfattersjekker

NO_ABS = re.compile(r"(alltid|aldri|always|never)", re.IGNORECASE)
NO_DIAG = re.compile(r"(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|lidelse| disorder |autism spectrum disorder)", re.IGNORECASE)
# #3826-forbudet arvet: ingen ekstrem risiko/selvskade/medisinering (forbrukertest, ikke klinisk skjema)
RISK_TOKENS = [
    "vold", "violens", "våpen", "weapon", "violence", "slåss", "fight",
    "selvskade", "selvmord", "self-harm", "selfharm", "suicide", "suicidal",
    "hurt myself", "skade meg selv",
    "medisin", "medikament", "medication", "medicine", "pille", "pilles", "pill ", "dose", "dosis",
]
# ASRS v1.1 6Q verbatim-stamme — null reformulering/ellipse/parafrase av ankeret i poolen
ASRS_FRAGS = [
    "how often do you", "careless mistakes", "leave your seat", "fidget with",
    "difficulty waiting", "unwinding", "annoyed by", "interrupt others",
]
def wc(t): return len([w for w in t.split() if w])

def assert_authoring():
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        for lang, text in (("no", t_no), ("en", t_en)):
            n = wc(text)
            assert 8 <= n <= 14, "%s (%s) har %d ord (8-14)" % (iid, lang, n)
            assert text.endswith("."), "%s (%s) ender ikke med punktum" % (iid, lang)
            assert text[0].isupper(), "%s (%s) starter ikke med stor bokstav" % (iid, lang)
            assert ";" not in text and text.count("?") <= 1, "%s (%s) dobbeltdannelse" % (iid, lang)
            low = text.lower()
            m = NO_ABS.search(low)
            assert not m, "%s (%s) absolutt-token: %s" % (iid, lang, m.group(0))
            m = NO_DIAG.search(text)
            assert not m, "%s (%s) diagnose/instrument-token: %s" % (iid, lang, m.group(0))
            for tok in RISK_TOKENS:
                assert tok.lower() not in low, "%s (%s) risiko/medisinering-token: %s" % (iid, lang, tok)
            for frag in ASRS_FRAGS:
                assert frag not in low, "%s (%s) ASRS-fragment-stamme: %r" % (iid, lang, frag)
    # separat forfattet: alle 70 tekster unike
    all_texts = [r[5] for r in ITEMS] + [r[6] for r in ITEMS]
    assert len(set(all_texts)) == 70, "tekster ikke unike"
    # tema-bånd: kontinuitet, rekkefølge og vekt 7/7/7/7/7
    expected_themes = [1]*7 + [2]*7 + [3]*7 + [4]*7 + [5]*7
    assert [r[1] for r in ITEMS] == expected_themes, "tema-bånd brutt"
    # id-orden: da-0041..da-0075 — forten i den kontinuerlige 100-item-numreringen
    want_ids = ["da-%04d" % i for i in range(41, 76)]
    assert [r[0] for r in ITEMS] == want_ids, "id-orden brutt"
    asrs_near = [r[0] for r in ITEMS if r[2]]
    assert asrs_near == ["da-0042", "da-0047", "da-0048", "da-0058", "da-0065", "da-0070"], asrs_near
    for r in ITEMS:
        assert (r[3] and r[4]) if r[2] else (not r[3] and not r[4]), "%s nearNote-konsistens" % r[0]

def fivegrams(text):
    norm = re.sub(r"[^a-zæøå0-9]+", " ", text.lower()).strip()
    toks = norm.split()
    if len(toks) < 5:
        return set()
    return {" ".join(toks[i:i+5]) for i in range(len(toks)-4)}

def corpus_fivegrams(path):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    grams = set()
    for it in d["items"]:
        grams |= fivegrams(it["text"])
    return grams

def assert_corpus_cross(here):
    """5-gram-kryss mot triage-poolen OG mot DA1-poolen (begge språk) — 0 toleranse."""
    for lang in ("no", "en"):
        g = corpus_fivegrams(os.path.join(here, "def-nd-triage-pool.%s.json" % lang))
        g |= corpus_fivegrams(os.path.join(here, "def-nd-adhd-dyp-pool-da1.%s.json" % lang))
        for r in ITEMS:
            text = r[5] if lang == "no" else r[6]
            inter = fivegrams(text) & g
            assert not inter, "%s %s deler 5-gram med eksisterende korpus: %s" % (r[0], lang, sorted(inter)[:3])

# ---------------------------------------------------------------- options fra ipip50

def load_options(lang, schema_dir):
    src = os.path.join(schema_dir, "def-ipip50-big5.{}.json".format(lang))
    with open(src, encoding="utf-8") as f:
        d = json.load(f)
    opt = None
    for it in d["items"]:
        blob = json.dumps(it["options"], ensure_ascii=False, sort_keys=True)
        if opt is None:
            opt = it["options"]
        elif blob != json.dumps(opt, ensure_ascii=False, sort_keys=True):
            raise RuntimeError("ipip50 options varierer på item " + it["id"])
    if not opt or len(opt) != 5:
        raise RuntimeError("ipip50 options har ikke 5 verdier")
    assert lang == "no" or json.dumps(opt, sort_keys=True) != json.dumps(load_options("no", schema_dir)[0], sort_keys=True), "EN-options identiske med NO"
    return copy.deepcopy(opt), src

def build_def(lang, options):
    items = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": t_no if lang == "no" else t_en,
            "options": copy.deepcopy(options),
            "scales": [{"id": "da2", "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-adhd-dyp-pool-da2",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "da2", "weight": 1}],
            "norms": "none",
        },
        "dimensions": [{
            "id": "da2",
            "label": DIM_LABEL[lang],
            "labelLanguage": lang,
            "description": DIM_DESC[lang],
        }],
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "dimension": "da2", "theme": "da2-t" + str(theme_i), "asrsNear": bool(near)}
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["nearNoteEn"] = nn_en
        rows.append(row)
    counts = {}
    for t in range(1, 6):
        counts["da2-t" + str(t)] = sum(1 for r in ITEMS if r[1] == t)
    return {
        "metaVersion": 1,
        "id": "nd-adhd-dyp-pool-da2",
        "date": "2026-11-17",
        "items": rows,
        "boardLeaf": "#3827 [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 2: DA2 Hyperaktivitet/impulsivitet — 35 originale items (worker TR-044804AEA811).",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (ENDLIG VERDIKT, #3732): ASRS v1.1 6Q er ADHD-anker i live-def (#3760-ark), IKKE i denne poolen; poolen inneholder null ASRS-gjengivelse. AQ/RAADS-R gjengis aldri; DSM-5-kriterietekst aldri gjengitt eller parafrasert — items er forfattet fra DA2-konstruktbeskrivelsen i spec-en. DIVA-5/CAADID/Conners/SRS-2/CAT-Q brukt som mal eller kilde: nei. #3826-forbudet arvet: ingen item omfatter ekstrem risiko/selvskade/medisinering (programmert token-skann i assert_authoring og selftest).",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen diagnostisk språkbruk, ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema per id; tekstene er IKKE direkte oversettelser. Programmatisk 5-gram-kryss mot triage-poolen OG DA1-poolen (def-nd-triage-pool.{no,en}.json, def-nd-adhd-dyp-pool-da1.{no,en}.json), 0 sammenfall.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 mot skala da2 — screening i én retning; NG-4-avviket (ingen reverse-keyed items) er dokumentert i spec-en engineGaps og arvet fra triage-poolens konvensjon.",
        "themeLabels": THEMES,
        "dimensionLabel": DIM_LABEL,
        "dimensionLabelNote": "NO-etikett er byte-låst til deepPoolDecision.adhdThemes[1].name i spec-en; EN-etikett er separat forfattet og låst her",
        "themeCounts": counts,
        "asrsNearPolicy": "Flaggede da-items er ikke kloninger — de markerer anker-familienær vinkel mot hyperaktivitets-/impulsivitets-familiene i ankeret (fysisk uro i stillhet, vanskelighet med å vente, å bryte inn) slik at FASE 4-utvelgelsen (trekk 8 av 35 til live-deffen) kan velge med omtanke mot ASRS-blokkens formuleringer; blokken bor per scoringContracts.asrsAnchorShape i live-deffen, aldri i poolen. Familie-nummerering brukes ikke — kun familienavnet, fordi anchorens item-orden transkriberes først ved #3760-bygg.",
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle 70 tekster forfattet fra spec-en deepPoolDecision.adhdThemes[1]-konstruktet — ingen ekstern skala, ingen formell oversettelse, ingen scraping, ingen DSM-parafrase.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (verifisert i itemspec-provenance og re-kjørt i selftest S7/S8)",
                "render.js sessionSizeFor(likert) => alle items shuffles (verifisert i selftest S14)",
            ],
        },
        "holes": {
            "closes": "ADHD-dyp del 2 (d2): 35 items levert. ADHD-dyp samlet står i 75/100 — d3 hverdagsfungering/konsekvens (#3828, 25) gjenstår; live-def og ASRS-forankring følger ved brettets del 3 per poolDesign.deepPools liveDefPlan.",
            "opens": "Samlet ADHD-dyp-pool (def-nd-adhd-dyp-pool.<lang>.json per defFilePlan.naming) materialiseres ved #3828 — der smeltes da1/da2/da3-poolene sammen og får 3-trait-scoringen per scoringContracts.deepPools; kryssles-øster følger brettet.",
        },
    }

def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="output-katalog (default: denne katalogens overordnede nd_pool-sammenheng)")
    args = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    schema_dir = os.path.dirname(here)
    out = args.out or here
    os.makedirs(out, exist_ok=True)
    opts_no, _ = load_options("no", schema_dir)
    opts_en, _ = load_options("en", schema_dir)
    assert_authoring()
    assert_corpus_cross(here)
    write_json(os.path.join(out, "def-nd-adhd-dyp-pool-da2.no.json"), build_def("no", opts_no))
    write_json(os.path.join(out, "def-nd-adhd-dyp-pool-da2.en.json"), build_def("en", opts_en))
    write_json(os.path.join(out, "_nd_adhd_dyp_meta_da2.json"), build_meta())
    print("gen_nd_adhd_pool_da2: 35 items x2 spraak + meta skrevet til", out)

if __name__ == "__main__":
    main()
