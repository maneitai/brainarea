# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 3 (todo #3828).
Deterministisk (ingen RNG): skriver def-nd-adhd-dyp-pool-da3.{no,en}.json + _nd_adhd_dyp_meta_da3.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
DA3-tema: Hverdagsfungering og konsekvens (idPrefix 'da', poolMin 25).
Options importert byte-identisk fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Alle items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
Copyright-vakter: ingen DSM-5-kriterietekst, ingen kommersielle ND-instrumenter, ingen ASRS-formulering,
ingen ekstremrisiko/selvskade/medisinerings-items, ingen absolutter,
5-gram-kryss mot triage-poolen OG mot DA1- og DA2-poolene (begge sprak).
"""
import json, os, sys, copy, re, argparse

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme id-orden,
# samme tema, ikke direkte oversettelse — Soester-konvensjonen).
# (id, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)

ITEMS = [
    # --- da3-t1: Jobb og studier (5)
    ("da-0076", 1, True,
     "Anker-familien (uforsiktige feil); vinkel: gjenlesingen fanger glippet før noen andre merker det.",
     "Anchor family (careless mistakes); angle: the re-read catches the slip before anyone else does.",
     "Jeg må lese kollegenes e-post en gang til for å skjønne poenget.",
     "I need one extra read of my co-workers' mail to catch the point."),
    ("da-0077", 1, False, None, None,
     "Fristen gikk meg husforbi mens jeg holdt på med oppgaven.",
     "The deadline passed me by while I was still on the task."),
    ("da-0078", 1, True,
     "Anker-familien (huske-forpliktelser); vinkel: notatet var huskekroken, og kroken ble liggende i jakken.",
     "Anchor family (remembering commitments); angle: the note was the memory hook, and it stayed in the coat.",
     "Møte-notatene fra farten venter i jakken på en oppfølging.",
     "Meeting notes from the hurry wait in my coat for follow-up."),
    ("da-0079", 1, False, None, None,
     "Jeg klarer starten på prosjektene, men slutten trekker ut.",
     "Projects start easily for me, yet the ending drags on."),
    ("da-0080", 1, False, None, None,
     "Jeg har gått glipp av timene der oppmøtet telte mest.",
     "I have missed the sessions where showing up counted most."),
    # --- da3-t2: Hjem og husholdning (5)
    ("da-0081", 2, False, None, None,
     "Kopper og tallerkener venter i vasken til i formiddag.",
     "Cups and plates sit in the sink until almost noon."),
    ("da-0082", 2, False, None, None,
     "En runde med rydding stanser når jeg finner noe å lese.",
     "A round of tidying stops once I find something to read."),
    ("da-0083", 2, False, None, None,
     "Planen for helga finnes på lapper i tre ulike rom.",
     "The weekend plan lives on slips of paper in three rooms."),
    ("da-0084", 2, False, None, None,
     "Middagen ender som brødskive når planen kommer for sent.",
     "Dinner ends up as bread when the plan comes too late."),
    ("da-0085", 2, False, None, None,
     "Søpla nådde ikke fram, og lukten minner meg på det.",
     "The bin missed its pickup, and the smell reminds me daily."),
    # --- da3-t3: Administrasjon og frister (5)
    ("da-0086", 3, True,
     "Anker-familien (å vente); vinkel: fristpressen er det som løser gjøremålet, roen gjør det ikke.",
     "Anchor family (waiting); angle: deadline pressure is what moves the task, calm is not.",
     "Regningen betales på siste frist, én gang til.",
     "The bill gets paid at the very last deadline, again."),
    ("da-0087", 3, False, None, None,
     "Brevet fra etaten forblir uåpnet til fristen har passert.",
     "The letter from the office stays sealed past its deadline."),
    ("da-0088", 3, False, None, None,
     "Tannlegen finner en ny åpning fordi tiden min smatt.",
     "The dentist books a new slot because my time slipped."),
    ("da-0089", 3, False, None, None,
     "Jeg leter etter dokumentet med en gang det skal brukes.",
     "I go hunting for the document right when it is needed."),
    ("da-0090", 3, False, None, None,
     "Skjemaet fyller jeg ut i kveld, med frist i morgen.",
     "I fill in the form tonight, with the deadline tomorrow."),
    # --- da3-t4: Sosiale konsekvenser (5)
    ("da-0091", 4, False, None, None,
     "Festen mistet meg som gjest fordi svarfristen gikk.",
     "The party lost me as guest when my RSVP ran out."),
    ("da-0092", 4, False, None, None,
     "Jeg savnet vennens dag fordi datoen ikke ble notert.",
     "I missed my friend's day because the date stayed unnoted."),
    ("da-0093", 4, True,
     "Anker-familien (å vente); vinkel: rollene snudd — andre står i min kø, ikke jeg i deres.",
     "Anchor family (waiting); angle: roles flipped — others stand in my queue, not me in theirs.",
     "Andre venter på svar fra meg som ikke kommer på ukesvis.",
     "Others wait for replies of mine that stay away for weeks."),
    ("da-0094", 4, False, None, None,
     "Jeg klarer avtalen, men ikke ankomsttiden til den.",
     "I keep the meeting, yet lose the arrival time on it."),
    ("da-0095", 4, False, None, None,
     "Familiens spørsmål om hjelp får vente på meg i lange strekk.",
     "Family requests for help wait long stretches on me."),
    # --- da3-t5: Etterslep over tid (5)
    ("da-0096", 5, True,
     "Anker-familien (avslutning); vinkel: konsekvens-nivå — det uavsluttede bremser neste oppdrag.",
     "Anchor family (finishing things); angle: the unfinished sitting still brakes the next task.",
     "Etterslepet sitter i skapet og bremser hver ny start.",
     "The backlog sits in the cupboard and brakes every fresh start."),
    ("da-0097", 5, False, None, None,
     "Jeg teller forfallne gjøremål og prøver å glemme tellingen.",
     "I count the lapsed tasks and try to forget the count."),
    ("da-0098", 5, False, None, None,
     "Momentumet fra mandagen har stanset når onsdag møter meg.",
     "Momentum from Monday has stalled by the time Wednesday arrives."),
    ("da-0099", 5, False, None, None,
     "Purrebrevet er blitt en stemme i posten jeg gjenkjenner umiddelbart.",
     "The reminder letter has become a voice I know at once."),
    ("da-0100", 5, False, None, None,
     "Jeg starter på nytt oftere enn jeg vil innrømme.",
     "I start over more often than I care to admit."),
]

THEMES = {
    1: {"no": "Jobb og studier", "en": "Work and study"},
    2: {"no": "Hjem og husholdning", "en": "Home and household"},
    3: {"no": "Administrasjon og frister", "en": "Admin and deadlines"},
    4: {"no": "Sosiale konsekvenser", "en": "Social consequences"},
    5: {"no": "Etterslep over tid", "en": "Backlog over time"},
}

DIM_LABEL = {
    "no": "Hverdagsfungering og konsekvens",
    "en": "Everyday functioning and consequences",
}
DIM_DESC = {
    "no": "Konsekvenser i jobb, studier, hjem og administrasjon — funksjons-impact fremfor symtomtelling, selvrapportert.",
    "en": "Consequences across work, study, home and admin — functional impact rather than symptom counting, self-reported.",
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
    # separat forfattet: alle 50 tekster unike
    all_texts = [r[5] for r in ITEMS] + [r[6] for r in ITEMS]
    assert len(set(all_texts)) == 50, "tekster ikke unike"
    # tema-bånd: kontinuitet, rekkefølge og vekt 5/5/5/5/5
    expected_themes = [1]*5 + [2]*5 + [3]*5 + [4]*5 + [5]*5
    assert [r[1] for r in ITEMS] == expected_themes, "tema-bånd brutt"
    # id-orden: da-0076..da-0100 — bakkant i den kontinuerlige 100-item-numreringen
    want_ids = ["da-%04d" % i for i in range(76, 101)]
    assert [r[0] for r in ITEMS] == want_ids, "id-orden brutt"
    asrs_near = [r[0] for r in ITEMS if r[2]]
    assert asrs_near == ["da-0076", "da-0078", "da-0086", "da-0093", "da-0096"], asrs_near
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
    """5-gram-kryss mot triage-poolen OG mot DA1- og DA2-poolene (begge sprak) — 0 toleranse."""
    for lang in ("no", "en"):
        g = corpus_fivegrams(os.path.join(here, "def-nd-triage-pool.%s.json" % lang))
        g |= corpus_fivegrams(os.path.join(here, "def-nd-adhd-dyp-pool-da1.%s.json" % lang))
        g |= corpus_fivegrams(os.path.join(here, "def-nd-adhd-dyp-pool-da2.%s.json" % lang))
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
    return copy.deepcopy(opt)

# ---------------------------------------------------------------- bygging

def build_def(lang, options):
    items = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": t_no if lang == "no" else t_en,
            "options": copy.deepcopy(options),
            "scales": [{"id": "da3", "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-adhd-dyp-pool-da3",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "da3", "weight": 1}],
            "norms": "none",
        },
        "dimensions": [{
            "id": "da3",
            "label": DIM_LABEL[lang],
            "labelLanguage": lang,
            "description": DIM_DESC[lang],
        }],
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "dimension": "da3", "theme": "da3-t" + str(theme_i), "asrsNear": bool(near)}
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["nearNoteEn"] = nn_en
        rows.append(row)
    counts = {}
    for t in range(1, 6):
        counts["da3-t" + str(t)] = sum(1 for r in ITEMS if r[1] == t)
    return {
        "metaVersion": 1,
        "id": "nd-adhd-dyp-pool-da3",
        "date": "2026-11-17",
        "items": rows,
        "boardLeaf": "#3828 [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 3: DA3 Hverdagsfungering/konsekvens — 25 originale items (worker TR-71B2788AAC12).",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (ENDLIG VERDIKT, #3732): ASRS v1.1 6Q er ADHD-anker i live-def (#3760-ark), IKKE i denne poolen; poolen inneholder null ASRS-gjengivelse. AQ/RAADS-R gjengis aldri; DSM-5-kriterietekst aldri gjengitt eller parafrasert — items er forfattet fra DA3-konstruktbeskrivelsen i spec-en. DIVA-5/CAADID/Conners/SRS-2/CAT-Q brukt som mal eller kilde: nei. #3826-forbudet arvet: ingen item omfatter ekstrem risiko/selvskade/medisinering (programmert token-skann i assert_authoring og selftest).",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen diagnostisk språkbruk, ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema per id; tekstene er IKKE direkte oversettelser. Programmatisk 5-gram-kryss mot triage-poolen OG DA1- OG DA2-poolene (def-nd-triage-pool.{no,en}.json, def-nd-adhd-dyp-pool-da1.{no,en}.json, def-nd-adhd-dyp-pool-da2.{no,en}.json), 0 sammenfall.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 mot skala da3 — screening i én retning; NG-4-avviket (ingen reverse-keyed items) er dokumentert i spec-en engineGaps og arvet fra triage-poolens konvensjon.",
        "themeLabels": THEMES,
        "dimensionLabel": DIM_LABEL,
        "dimensionLabelNote": "NO-etikett er byte-låst til deepPoolDecision.adhdThemes[2].name i spec-en; EN-etikett er separat forfattet og låst her",
        "themeCounts": counts,
        "asrsNearPolicy": "Flaggede da3-items er ikke kloninger — de markerer anker-familienær vinkel mot konsekvens-nivået av ankerfamilien (uforsiktige feil husket gjennom gjenlesing, huske-forpliktelser som falt bort i jakkelomma, å vente med rollene snudt, avslutning som bremser neste start) slik at FASE 4-utvelgelsen (trekk 8 av 25 til live-deffen) kan velge med omtanke mot ASRS-blokkens formuleringer; blokken bor per scoringContracts.asrsAnchorShape i live-deffen, aldri i poolen. Familie-nummerering brukes ikke — kun familienavnet, fordi anchorens item-orden transkriberes først ved #3760-bygg.",
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle 50 tekster forfattet fra spec-en deepPoolDecision.adhdThemes[2]-konstruktet — ingen ekstern skala, ingen formell oversettelse, ingen scraping, ingen DSM-parafrase.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (verifisert i itemspec-provenance og re-kjørt i selftest S7/S8)",
                "render.js sessionSizeFor(likert) => alle items shuffles (verifisert i selftest S14)",
            ],
        },
        "holes": {
            "closes": "ADHD-dyp del 3 (d3): 25 items levert. ADHD-dyp samlet står i 100/100 (da1 40 + da2 35 + da3 25 = poolMin fra poolDesign.deepPools oppnådd); live-def og ASRS-forankring følger brettets neste del per poolDesign.deepPools liveDefPlan.",
            "opens": "Samlet ADHD-dyp-pool (def-nd-adhd-dyp-pool.<lang>.json per defFilePlan.naming) materialiseres i sammenslåings-steget — der smeltes da1/da2/da3-poolene sammen og får 3-trait-scoringen (traits da1/da2/da3) per scoringContracts.deepPools; deretter FASE 4-utvelgelse (trekk 8 per tema = 24 items) og ASRS-forankring ved #3760-ark.",
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
    opts_no = load_options("no", schema_dir)
    opts_en = load_options("en", schema_dir)
    assert_authoring()
    assert_corpus_cross(here)
    write_json(os.path.join(out, "def-nd-adhd-dyp-pool-da3.no.json"), build_def("no", opts_no))
    write_json(os.path.join(out, "def-nd-adhd-dyp-pool-da3.en.json"), build_def("en", opts_en))
    write_json(os.path.join(out, "_nd_adhd_dyp_meta_da3.json"), build_meta())
    print("gen_nd_adhd_pool_da3: 25 items x2 spraak + meta skrevet til", out)

if __name__ == "__main__":
    main()
