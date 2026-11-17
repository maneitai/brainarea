# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 2 (todo #3831).
Deterministisk (ingen RNG): skriver def-nd-autisme-dyp-pool-ds2.{no,en}.json + _nd_autisme_dyp_meta_ds2.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
DS2-tema: Repeterende atferd, sensorikk og interesser (idPrefix 'ds', poolMin 35).
Options importert byte-identisk fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Id-forkant: fortsetter autisme-sporets kontinuerlige 100-item-numrering etter DS1 (ds-0001..ds-0040)
med ds-0041..ds-0075; del 3 tar ds-0076..ds-0100.
Alle items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
Copyright-vakter: ingen DSM-5-kriterietekst, ingen ASRS-formulering (ASRS er ADHD-anker, aldri
autisme-anker), ingen kommersielle ND-instrumenter (AQ/RAADS-R/SRS-2/CAT-Q gjengis aldri),
ingen ekstremrisiko/selvskade/medisinerings-items, ingen absolutter,
5-gram-kryss mot triage-poolen OG mot DA1/DA2/DA3 OG DS1-poolene (begge språk).
"""
import json, os, sys, copy, re, argparse

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme id-orden,
# samme tema, ikke direkte oversettelse — Soester-konvensjonen).
# (id, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)
# asrsNear er tom-liste for DS2: autisme-sporet har ingen ASRS-ankerformuleringer
# (ASRS er ADHD-anker per lisens-verdikten) — flagget arves som konvensjon, aldri som flag.
# 5 temaer à 7: t1 rutiner og rekkefølger, t2 endringsmotstand, t3 fokuserende interesser,
# t4 sensorisk toleranse og behov, t5 stimulering og regulering.

ITEMS = [
    # --- ds2-t1: Rutiner og rekkefølger (7)
    ("ds-0041", 1, False, None, None,
     "Mine morgener følger det samme skjemaet dag etter dag.",
     "My mornings follow the same template day after day."),
    ("ds-0042", 1, False, None, None,
     "Jeg setter opp rekkefølgen på gjøremål og holder den fast.",
     "I set up the order of my tasks and keep it fixed."),
    ("ds-0043", 1, False, None, None,
     "Dager som holder formen fra planen gir meg ro.",
     "Days that keep the shape of the plan give me calm."),
    ("ds-0044", 1, False, None, None,
     "Strukturen i uka mi blir gjerne lik fra uke til uke.",
     "The structure of my week turns out alike from week to week."),
    ("ds-0045", 1, False, None, None,
     "Jeg legger mine ærender fast, nye innfall må vente.",
     "I fix my errands in place, sudden urges have to wait."),
    ("ds-0046", 1, False, None, None,
     "Jeg vet nøyaktig hvilke steg hvert gjøremål består av hjemme.",
     "I know exactly which steps each chore at home consists of."),
    ("ds-0047", 1, False, None, None,
     "Samme gang hver uke har mine oppgaver sin faste plass.",
     "At the same point each week my chores have their set place."),
    # --- ds2-t2: Endringsmotstand (7)
    ("ds-0048", 2, False, None, None,
     "En avlysning om morgenen setter hele dagen ut av kurs.",
     "A morning cancellation throws the whole day out of line."),
    ("ds-0049", 2, False, None, None,
     "Når noen endrer avtalen i siste stund trenger jeg en ny plan.",
     "When someone changes the appointment late I need a fresh plan."),
    ("ds-0050", 2, False, None, None,
     "Omrokeringer i kalenderen koster meg mer enn selve gjøremålet.",
     "Rearrangements in the calendar cost me more than the chore itself."),
    ("ds-0051", 2, False, None, None,
     "Jeg følger ruten min videre selv når noen mener den burde slippes.",
     "I push my route onward even when people think it should be dropped."),
    ("ds-0052", 2, False, None, None,
     "Små endringer i planen tar større plass i hodet enn de burde.",
     "Small edits to a plan take a disproportionately large room in my head."),
    ("ds-0053", 2, False, None, None,
     "Hvis en vare jeg regnet med mangler, stopper hele handleturen opp.",
     "If one item I counted on is missing my whole shopping trip stalls."),
    ("ds-0054", 2, False, None, None,
     "Uventa gjestebesøk i ruten min setter meg på vanskelig bein.",
     "Unexpected visitors inside my routine put me on shaky ground."),
    # --- ds2-t3: Fokuserende interesser (7)
    ("ds-0055", 3, False, None, None,
     "Interessene mine fanger meg så helt at timene forsvinner.",
     "My interests pull me in so deeply that the hours vanish."),
    ("ds-0056", 3, False, None, None,
     "Jeg kan lese om det samme temaet i timesvis uten å bli ferdig.",
     "I can read about the same subject for hours without feeling done."),
    ("ds-0057", 3, False, None, None,
     "Samlingen av kunnskap om interessen min vokser i egne hjørner.",
     "The collection of knowledge about my interest grows in its own corner."),
    ("ds-0058", 3, False, None, None,
     "Dybden i interessen min betyr mer enn bredden av mange.",
     "Depth in my interest matters more than breadth of many."),
    ("ds-0059", 3, False, None, None,
     "Interessen min har egne sesonger der alt annet står i bakgrunnen.",
     "My interest has its own seasons where everything else steps back."),
    ("ds-0060", 3, False, None, None,
     "Jeg vender tilbake til det samme temaet i uker etterpå.",
     "I return to the same subject for weeks afterwards."),
    ("ds-0061", 3, False, None, None,
     "Prosjekter i interessen min stabler seg før det forrige er avsluttet.",
     "Projects inside my interest pile up before the previous one is set down."),
    # --- ds2-t4: Sensorisk toleranse og behov (7)
    ("ds-0062", 4, False, None, None,
     "Flimrende lys og blinkende skjermer river blikket mitt av linjen.",
     "Flickering light and blinking screens tear my eyes off the line."),
    ("ds-0063", 4, False, None, None,
     "Lave brummer i rommet trekker all oppmerksomheten min til seg.",
     "Low hums in a room pull all my attention onto themselves."),
    ("ds-0064", 4, False, None, None,
     "Mat som skiller seg ut i konsistens blir stående på tallerkenen.",
     "Food that stands out in texture stays on my plate."),
    ("ds-0065", 4, False, None, None,
     "Sterk lukt i butikker gjør at jeg må dra meg ut tidligere.",
     "Strong smells in shops make me pull myself out earlier."),
    ("ds-0066", 4, False, None, None,
     "Visse plagg må byttes ut før jeg kan konsentrere meg i det hele.",
     "Certain garments have to be swapped before I can concentrate at all."),
    ("ds-0067", 4, False, None, None,
     "Fulle rom med mange lydkilder tapper meg på få minutter.",
     "Full rooms with many sound sources drain me within minutes."),
    ("ds-0068", 4, False, None, None,
     "Jeg finner et ledig stille hjørne selv i rom jeg skal trives i.",
     "I find a quiet unused corner even in rooms I am meant to enjoy."),
    # --- ds2-t5: Stimulering og regulering (7)
    ("ds-0069", 5, False, None, None,
     "Fingrene mine jobber med noe i lomma mens jeg holder tankene samlet.",
     "My fingers work on something in my pocket while my thoughts stay gathered."),
    ("ds-0070", 5, False, None, None,
     "Jeg går opp og ned i rommet når tanker settes i orden.",
     "I pace up and down in the room when thoughts get set in order."),
    ("ds-0071", 5, False, None, None,
     "Jeg vugger og vipper på fotputen når inntrykkene blir for mange.",
     "I rock and tip on the footrest when input builds up too far."),
    ("ds-0072", 5, False, None, None,
     "Gjentagende bevegelser setter meg i gang igjen etter tett fokus.",
     "Repetitive movements set me going again after a tight stretch of focus."),
    ("ds-0073", 5, False, None, None,
     "Jeg snurrer på pennen min i møter uten selv å merke det.",
     "I twirl my pen through meetings without noticing it myself."),
    ("ds-0074", 5, False, None, None,
     "Hendene mine sorterer småting på bordet mens hodet jobber videre.",
     "My hands sort small objects on the table while my head keeps working."),
    ("ds-0075", 5, False, None, None,
     "Jeg trenger bevegelse i kroppen for at konsentrasjonen skal holde hele økten.",
     "I need movement in my body for my concentration to last the whole session."),
]

THEMES = {
    1: {"no": "Rutiner og rekkefølger", "en": "Routines and sequences"},
    2: {"no": "Endringsmotstand", "en": "Resistance to change"},
    3: {"no": "Fokuserende interesser", "en": "Focused interests"},
    4: {"no": "Sensorisk toleranse og behov", "en": "Sensory tolerance and needs"},
    5: {"no": "Stimulering og regulering", "en": "Stimulation and regulation"},
}
DIM_LABEL = {"no": "Repeterende atferd, sensorikk og interesser", "en": "Repetitive behavior, sensory needs and interests"}
DIM_DESC = {
    "no": "Rutiner og endringsmotstand, fokuserende interesser, sensorisk toleranse og behov, stimulering, selvrapportert.",
    "en": "Routines and change resistance, focused interests, sensory tolerance and needs, stimulation, self-reported.",
}

# ---------------------------------------------------------------- forfattersjekker

NO_ABS = re.compile(r"(alltid|aldri|always|never)", re.IGNORECASE)
NO_DIAG = re.compile(r"(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|autism spectrum| asperger |asperger|lidelse| disorder )", re.IGNORECASE)
# #3826-forbudet arvet: ingen ekstrem risiko/selvskade/medisinering (forbrukertest, ikke klinisk skjema)
RISK_TOKENS = [
    "vold", "violens", "våpen", "weapon", "violence", "slåss", "fight",
    "selvskade", "selvmord", "self-harm", "selfharm", "suicide", "suicidal",
    "hurt myself", "skade meg selv",
    "medisin", "medikament", "medication", "medicine", "pille", "pilles", "pill ", "dose", "dosis",
]
def wc(t): return len([w for w in t.split() if w])

def assert_authoring(options_by_lang):
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
            opts = options_by_lang[lang]
            assert text is not None and len(opts) == 5
    # separat forfattet: alle 70 tekster unike
    all_texts = [r[5] for r in ITEMS] + [r[6] for r in ITEMS]
    assert len(set(all_texts)) == 70, "tekster ikke unike"
    # tema-bånd: kontinuitet og rekkefølge (7/7/7/7/7)
    expected_themes = [1]*7 + [2]*7 + [3]*7 + [4]*7 + [5]*7
    assert [r[1] for r in ITEMS] == expected_themes, "tema-bånd brutt"
    # id-forkant: kontinuerlig nummerering videreført fra DS1
    expected_ids = ["ds-" + str(i).zfill(4) for i in range(41, 76)]
    assert [r[0] for r in ITEMS] == expected_ids, "id-rekkefølge brutt (må være ds-0041..ds-0075)"
    # DS1-presedent = triage-presedenten: autisme-aksen flagges aldri — ASRS er ADHD-ankeret,
    # aldri autisme-ankeret (autisme-ankeret er BYGG-originale items per verdikten). Tom-liste
    # låst her og dokumentert i metaens asrsNearPolicy.
    assert all(not r[2] for r in ITEMS), "DS2: asrsNear skal være tom-liste (triage-presedenten)"
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
    """5-gram-kryss mot triage-poolen OG DA1/DA2/DA3 OG DS1-poolene (begge språk) — 0 toleranse."""
    for lang in ("no", "en"):
        g = corpus_fivegrams(os.path.join(here, "def-nd-triage-pool.%s.json" % lang))
        for part in ("da1", "da2", "da3"):
            g |= corpus_fivegrams(os.path.join(here, "def-nd-adhd-dyp-pool-%s.%s.json" % (part, lang)))
        g |= corpus_fivegrams(os.path.join(here, "def-nd-autisme-dyp-pool-ds1.%s.json" % lang))
        for r in ITEMS:
            text = r[5] if lang == "no" else r[6]
            inter = fivegrams(text) & g
            assert not inter, "%s %s deler 5-gram med eksisterende korpus: %s" % (r[0], lang, sorted(inter)[:3])

def assert_id_chain(here):
    """Kontinuitet mot DS1: ds-0001..ds-0040 urokkert, ds-0041..ds-0075 uten hull/overlap."""
    src = os.path.join(here, "def-nd-autisme-dyp-pool-ds1.no.json")
    with open(src, encoding="utf-8") as f:
        ds1 = json.load(f)
    ids1 = [it["id"] for it in ds1["items"]]
    assert ids1[0] == "ds-0001" and ids1[-1] == "ds-0040" and len(ids1) == 40, "DS1-forkanten er rørt"
    mine = [r[0] for r in ITEMS]
    assert not (set(ids1) & set(mine)), "id-overlapp DS1/DS2"
    alle = ids1 + mine
    want = ["ds-" + str(i).zfill(4) for i in range(1, 76)]
    assert alle == want, "kontinuerlig 75-item-forkant med hull: %s" % alle[:5]

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
            "scales": [{"id": "ds2", "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-autisme-dyp-pool-ds2",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "ds2", "weight": 1}],
            "norms": "none",
        },
        "dimensions": [{
            "id": "ds2",
            "label": DIM_LABEL[lang],
            "labelLanguage": lang,
            "description": DIM_DESC[lang],
        }],
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "dimension": "ds2", "theme": "ds2-t" + str(theme_i), "asrsNear": bool(near)}
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["nearNoteEn"] = nn_en
        rows.append(row)
    counts = {}
    for t in range(1, 6):
        counts["ds2-t" + str(t)] = sum(1 for r in ITEMS if r[1] == t)
    return {
        "metaVersion": 1,
        "id": "nd-autisme-dyp-pool-ds2",
        "date": "2026-11-17",
        "items": rows,
        "boardLeaf": "#3831 [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 2: DS2 Repeterende atferd/sensorikk/interesser — 35 originale items (worker TR-24FC46366CBA).",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (ENDLIG VERDIKT, #3732) + spec anchorDecision: autisme-ankeret er BYGG-originale items — ASRS er ADHD-anker aldri autisme-anker, AQ og RAADS-R gjengis aldri (kun navn+cutoff+kilde som referanselinje), DSM-5-kriterietekst aldri gjengitt eller parafrasert — items er forfattet fra DS2-konstruktbeskrivelsen i spec-en. DIVA-5/CAADID/Conners/SRS-2/CAT-Q brukt som mal eller kilde: nei. #3826-ekstra forbud arvet: ingen item omfatter ekstrem risiko/selvskade/medisinering (programmert token-skann i assert_authoring og selftest).",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen diagnostisk språkbruk, ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema per id; tekstene er IKKE direkte oversettelser. Programmatisk 5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene OG DS1-poolen (def-nd-triage-pool.{no,en}.json + def-nd-adhd-dyp-pool-*.{no,en}.json + def-nd-autisme-dyp-pool-ds1.{no,en}.json), 0 sammenfall.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 mot skala ds2 — screening i én retning; NG-4-avviket (ingen reverse-keyed items) er dokumentert i spec-en engineGaps og arvet fra triage-poolens konvensjon.",
        "themeLabels": THEMES,
        "dimensionLabel": DIM_LABEL,
        "dimensionLabelNote": "NO-etikett er byte-låst til deepPoolDecision.autismThemes[1].name i spec-en; EN-etikett er separat forfattet og låst her",
        "themeCounts": counts,
        "asrsNearPolicy": "TOM-liste låst eksplisitt — presedent triage-metaen: alle ts-items står asrsNear False der, og DS1-metaen låste samme tom-liste for autisme-sporet. Grunnlag: ASRS v1.1 6Q er ADHD-ankeret, aldri autisme-ankeret (dokumentert verdikt DOC-C8C02AD272 + spec anchorDecision.autismAnchor = BYGG originale items); da-poolenes flagg markerer nærhet til ADHD-ankerformuleringer og har aldri noen motpart i autisme-sporet. Feltet arves likevel per konvensjon så DS3 holder samme skjema.",
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle 70 tekster forfattet fra spec-en deepPoolDecision.autismThemes[1]-konstruktet — ingen ekstern skala, ingen formell oversettelse, ingen scraping, ingen DSM-parafrase.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (verifisert i itemspec-provenance og re-kjørt i selftest S7/S8)",
                "render.js sessionSizeFor(likert) => alle items shuffles (verifisert i selftest S14)",
            ],
        },
        "holes": {
            "closes": "Autisme-dyp del 2 (s2): 35 items levert. Autisme-dyp samlet står i 75/100 — s3 hverdagen/energi/tilpasning (brettets del 3, ~25) gjenstår; live-def og autisme-forankring følger brettets del 3 per poolDesign.deepPools liveDefPlan.",
            "opens": "Samlet autisme-dyp-pool (def-nd-autisme-dyp-pool.<lang>.json per defFilePlan.naming) materialiseres med DS1+DS2+DS3 samlet; kryssles-øster (kryssles mot lisensbekreftelsen og itemspec) følger brettet; FASE 4-utvelgelse (trekk 8 per tema = 24 items per poolDesign.deepPools liveDefPlan).",
        },
    }

def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="output-katalog (default: denne katalogens nd_pool-sammenheng)")
    args = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    schema_dir = os.path.dirname(here)
    out = args.out or here
    os.makedirs(out, exist_ok=True)
    opts_no, _ = load_options("no", schema_dir)
    opts_en, _ = load_options("en", schema_dir)
    assert_authoring({"no": opts_no, "en": opts_en})
    assert_corpus_cross(here)
    assert_id_chain(here)
    write_json(os.path.join(out, "def-nd-autisme-dyp-pool-ds2.no.json"), build_def("no", opts_no))
    write_json(os.path.join(out, "def-nd-autisme-dyp-pool-ds2.en.json"), build_def("en", opts_en))
    write_json(os.path.join(out, "_nd_autisme_dyp_meta_ds2.json"), build_meta())
    print("gen_nd_autisme_pool_ds2: 35 items x2 spraak + meta skrevet til", out)

if __name__ == "__main__":
    main()
