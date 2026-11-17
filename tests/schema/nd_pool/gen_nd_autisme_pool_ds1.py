# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 1 (todo #3830).
Deterministisk (ingen RNG): skriver def-nd-autisme-dyp-pool-ds1.{no,en}.json + _nd_autisme_dyp_meta_ds1.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
DS1-tema: Sosial kommunikasjon og resiprositet (idPrefix 'ds', poolMin 40).
Options importert byte-identisk fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Alle items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
Copyright-vakter: ingen DSM-5-kriterietekst, ingen ASRS-formulering (ASRS er ADHD-anker, aldri
autisme-anker), ingen kommersielle ND-instrumenter (AQ/RAADS-R/SRS-2/CAT-Q gjengis aldri),
ingen ekstremrisiko/selvskade/medisinerings-items, ingen absolutter,
5-gram-kryss mot triage-poolen OG mot DA1/DA2/DA3-poolene (begge språk).
"""
import json, os, sys, copy, re, argparse

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme id-orden,
# samme tema, ikke direkte oversettelse — Soester-konvensjonen).
# (id, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)
# asrsNear er tom-liste for DS1: autisme-sporet har ingen ASRS-ankerformuleringer
# (ASRS er ADHD-anker per lisens-verdikten) — flagget arves som konvensjon, aldri som flag.

ITEMS = [
    # --- ds1-t1: Samtale-rytme og tur-taking (8)
    ("ds-0001", 1, False, None, None,
     "Flere samtaletråder samtidig mister jeg grepet på raskt.",
     "Several conversation threads at once slip out of my grip fast."),
    ("ds-0002", 1, False, None, None,
     "Samtaler i gruppe forblir vanskelige selv etter mange års praksis.",
     "Conversations in groups stay hard for me even after years of practice."),
    ("ds-0003", 1, False, None, None,
     "Jeg vet ikke hvor lang en pause i samtalen har lov til å vare.",
     "I do not know how long a pause in conversation may last."),
    ("ds-0004", 1, False, None, None,
     "Jeg holder fram med emnet mitt lenge etter at lytterne har vendt seg bort.",
     "I carry on about my topic long after the listeners have turned away."),
    ("ds-0005", 1, False, None, None,
     "Mine turer i en samtale må planlegges frem, stillheten setter dem i gang.",
     "My turns in a conversation must be planned, they do not just arrive."),
    ("ds-0006", 1, False, None, None,
     "Folk må be meg om å vende tilbake til temaet samtalen startet med.",
     "People have to ask me to come back to the topic we started with."),
    ("ds-0007", 1, False, None, None,
     "Jeg hører hvor samtalepartnere tar pauser, men forstår ikke hvorfor.",
     "I hear where conversation partners pause, and I cannot tell why."),
    ("ds-0008", 1, False, None, None,
     "Jeg bygger setningene mine mens jeg snakker, og det høres som opplesing.",
     "I build my sentences while I speak, and it comes out like reading aloud."),
    # --- ds1-t2: Nonverbalt samspill (8)
    ("ds-0009", 2, False, None, None,
     "Jeg trenger bevisst anstrengelse for å holde blikkontakt mens jeg snakker.",
     "I need deliberate effort to hold eye contact while I am talking."),
    ("ds-0010", 2, False, None, None,
     "Andre menneskers ansikter gir meg mindre enn ordene de bruker.",
     "Other people's faces give me less than the words they use."),
    ("ds-0011", 2, False, None, None,
     "Mimikk og blikk må oversettes i tankene mine før jeg reagerer.",
     "Faces and looks need a translation inside me before I can react."),
    ("ds-0012", 2, False, None, None,
     "Jeg fanger tonefallet først når ordene har gjentatt det.",
     "I catch the tone of voice only once the words have repeated it."),
    ("ds-0013", 2, False, None, None,
     "Jeg merker mitt eget ansiktsuttrykk oftest når folk spør om det.",
     "I notice my own facial expression mostly when someone asks about it."),
    ("ds-0014", 2, False, None, None,
     "Riktig avstand til folk er noe jeg velger med hodet, ikke med kroppen.",
     "The right distance to people is chosen with my head, not my body."),
    ("ds-0015", 2, False, None, None,
     "Hender og kropp under samtalen følger ikke planen min.",
     "What my hands and body do during a talk does not follow my plan."),
    ("ds-0016", 2, False, None, None,
     "Jeg vet ikke hva et skuldertrekk fra den andre skulle bety.",
     "I cannot tell what a shrug from the other person is meant as."),
    # --- ds1-t3: Tolking av sosiale signaler (8)
    ("ds-0017", 3, False, None, None,
     "Ordene jeg hører bærer mindre enn det folk faktisk mener.",
     "The words I hear carry less than what the others actually mean."),
    ("ds-0018", 3, False, None, None,
     "Spøk og alvor skiller seg ikke ut i stemmen før det er for sent.",
     "Play and seriousness do not separate in the voice until it is too late."),
    ("ds-0019", 3, False, None, None,
     "En kommentar som virker vennlig i hodet mitt kan gjøre rommet sure.",
     "A remark that reads as friendly in my head can sour the room."),
    ("ds-0020", 3, False, None, None,
     "Jeg oppdager at folk ble skuffet over meg lenge etterpå.",
     "I find out that people felt let down by me long afterwards."),
    ("ds-0021", 3, False, None, None,
     "Hint og forslag oppleves som vanlige setninger til jeg får det forklart.",
     "Hints and suggestions read as plain statements until someone explains them."),
    ("ds-0022", 3, False, None, None,
     "Jeg vet ikke hvilke temaer som regnes som private i samtalens første minutter.",
     "I do not know which topics count as private early in a talk."),
    ("ds-0023", 3, False, None, None,
     "Et smil på leppene gjør det vanskelig å skjønne at personen er irritert.",
     "A smile on the lips hides that the person is cross."),
    ("ds-0024", 3, False, None, None,
     "Reglene for hvem som hilser på hvem først glipper hos meg.",
     "The rules for who greets whom first refuse to stick with me."),
    # --- ds1-t4: Relasjonsbygging og vennskap (8)
    ("ds-0025", 4, False, None, None,
     "Nye vennskap begynner der den andre forklarer hvordan det gjøres.",
     "New friendships begin where the other one explains how it is done."),
    ("ds-0026", 4, False, None, None,
     "Små tilfeldige samtaler blir sjelden til kontakt med folk.",
     "Small random talks rarely turn into contact with people."),
    ("ds-0027", 4, False, None, None,
     "Delt interesse gjør samtaler enklere enn personlige spørsmål.",
     "Shared interests make conversations easier than personal questions."),
    ("ds-0028", 4, False, None, None,
     "Jeg har mistet vennskap på grunn av et svar jeg ikke visste var feil.",
     "I have lost friendships over an answer I did not know was wrong."),
    ("ds-0029", 4, False, None, None,
     "Jeg trenger en plan for hvordan jeg nærmer meg folk jeg vil kjenne.",
     "I need a plan for how I approach people I want to know."),
    ("ds-0030", 4, False, None, None,
     "Jeg vet ikke når et bekjentskap har blitt til et vennskap.",
     "I cannot tell when an acquaintance has become a friend."),
    ("ds-0031", 4, False, None, None,
     "Etter møter med nye folk går jeg gjennom hvert valg jeg tok i samtalen.",
     "After meeting new people I replay every choice I made in the talk."),
    ("ds-0032", 4, False, None, None,
     "Varmen jeg har for folk kommer svakere på plass enn jeg vil.",
     "The warmth I hold for people lands weaker than I want it to."),
    # --- ds1-t5: Sosial energi i samspill (8)
    ("ds-0033", 5, False, None, None,
     "Å delta i samtalen koster mer enn kroppen min viser.",
     "Taking part in conversation costs me more than my body shows."),
    ("ds-0034", 5, False, None, None,
     "Enkle samtaler legger seg tunge på meg utpå kvelden.",
     "Simple conversations sit heavy on me by the evening."),
    ("ds-0035", 5, False, None, None,
     "Jeg må planlegge hviledager etter selskap andre bare koser seg i.",
     "I have to plan rest days after gatherings that others simply enjoy."),
    ("ds-0036", 5, False, None, None,
     "Jeg holder avstand til folk fordi kreftene tar slutt før samtalen gjør.",
     "I keep distance to people because my energy runs out before the talk does."),
    ("ds-0037", 5, False, None, None,
     "Mengden jeg har talt i løpet av dagen svir om natten.",
     "The amount I spoke during the day burns in me at night."),
    ("ds-0038", 5, False, None, None,
     "Sosialt samvær med flere folk gir meg halvparten for hver person som tilkommer.",
     "Gatherings with several people give me half as much for each person who joins."),
    ("ds-0039", 5, False, None, None,
     "Etter en dag av samtaler trenger jeg taushet for å hente meg inn.",
     "After a day of conversation I need silence to come back to myself."),
    ("ds-0040", 5, False, None, None,
     "Jeg går tom for sosiale krefter der andre bare blir i gangen.",
     "I run out of social energy where the others are only getting started."),
]

THEMES = {
    1: {"no": "Samtale-rytme og tur-taking", "en": "Conversation rhythm and turn-taking"},
    2: {"no": "Nonverbalt samspill", "en": "Nonverbal interplay"},
    3: {"no": "Tolking av sosiale signaler", "en": "Reading social signals"},
    4: {"no": "Relasjonsbygging og vennskap", "en": "Building relationships and friendships"},
    5: {"no": "Sosial energi i samspill", "en": "Social energy in interaction"},
}
DIM_LABEL = {"no": "Sosial kommunikasjon og resiprositet", "en": "Social communication and reciprocity"}
DIM_DESC = {
    "no": "Samtale-rytme, nonverbalt samspill, relasjonsbygging og tolking av sosiale signaler, selvrapportert.",
    "en": "Conversation rhythm, nonverbal interplay, relationship-building and reading social signals, self-reported.",
}

# ---------------------------------------------------------------- forfattersjekker

NO_ABS = re.compile(r"(alltid|aldri|always|never)", re.IGNORECASE)
NO_DIAG = re.compile(r"(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|autism spectrum| asperger |lidelse| disorder )", re.IGNORECASE)
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
    # separat forfattet: alle 80 tekster unike
    all_texts = [r[5] for r in ITEMS] + [r[6] for r in ITEMS]
    assert len(set(all_texts)) == 80, "tekster ikke unike"
    # tema-bånd: kontinuitet og rekkefølge (8/8/8/8/8)
    expected_themes = [1]*8 + [2]*8 + [3]*8 + [4]*8 + [5]*8
    assert [r[1] for r in ITEMS] == expected_themes, "tema-bånd brutt"
    # DS1-presedent = triage-presedenten: autisme-aksen flagges aldri — ASRS er ADHD-ankeret,
    # aldri autisme-ankeret (autisme-ankeret er BYGG-originale items per verdikten). Tom-liste
    # låst her og dokumentert i metaens asrsNearPolicy.
    assert all(not r[2] for r in ITEMS), "DS1: asrsNear skal være tom-liste (triage-presedenten)"
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
    """5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene (begge språk) — 0 toleranse."""
    for lang in ("no", "en"):
        g = corpus_fivegrams(os.path.join(here, "def-nd-triage-pool.%s.json" % lang))
        for part in ("da1", "da2", "da3"):
            g |= corpus_fivegrams(os.path.join(here, "def-nd-adhd-dyp-pool-%s.%s.json" % (part, lang)))
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
            "scales": [{"id": "ds1", "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-autisme-dyp-pool-ds1",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "ds1", "weight": 1}],
            "norms": "none",
        },
        "dimensions": [{
            "id": "ds1",
            "label": DIM_LABEL[lang],
            "labelLanguage": lang,
            "description": DIM_DESC[lang],
        }],
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "dimension": "ds1", "theme": "ds1-t" + str(theme_i), "asrsNear": bool(near)}
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["nearNoteEn"] = nn_en
        rows.append(row)
    counts = {}
    for t in range(1, 6):
        counts["ds1-t" + str(t)] = sum(1 for r in ITEMS if r[1] == t)
    return {
        "metaVersion": 1,
        "id": "nd-autisme-dyp-pool-ds1",
        "date": "2026-11-17",
        "items": rows,
        "boardLeaf": "#3830 [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 1: DS1 Sosial kommunikasjon/resiprositet — 40 originale items (worker TR-9233A8B27027).",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (ENDLIG VERDIKT, #3732) + spec anchorDecision: autisme-ankeret er BYGG-originale items — ASRS er ADHD-anker aldri autisme-anker, AQ og RAADS-R gjengis aldri (kun navn+cutoff+kilde som referanselinje), DSM-5-kriterietekst aldri gjengitt eller parafrasert — items er forfattet fra DS1-konstruktbeskrivelsen i spec-en. DIVA-5/CAADID/Conners/SRS-2/CAT-Q brukt som mal eller kilde: nei. #3826-ekstra forbud arvet: ingen item omfatter ekstrem risiko/selvskade/medisinering (programmert token-skann i assert_authoring og selftest).",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen diagnostisk språkbruk, ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema per id; tekstene er IKKE direkte oversettelser. Programmatisk 5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene (def-nd-triage-pool.{no,en}.json + def-nd-adhd-dyp-pool-*.{no,en}.json), 0 sammenfall.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 mot skala ds1 — screening i én retning; NG-4-avviket (ingen reverse-keyed items) er dokumentert i spec-en engineGaps og arvet fra triage-poolens konvensjon.",
        "themeLabels": THEMES,
        "dimensionLabel": DIM_LABEL,
        "dimensionLabelNote": "NO-etikett er byte-låst til deepPoolDecision.autismThemes[0].name i spec-en; EN-etikett er separat forfattet og låst her",
        "themeCounts": counts,
        "asrsNearPolicy": "TOM-liste låst eksplisitt — presedent triage-metaen: alle ts-items står asrsNear False der. Grunnlag: ASRS v1.1 6Q er ADHD-ankeret, aldri autisme-ankeret (dokumentert verdikt DOC-C8C02AD272 + spec anchorDecision.autismAnchor = BYGG originale items); da-poolenes flagg markerer nærhet til ADHD-ankerformuleringer og har aldri noen motpart i autisme-sporet. Feltet arves likevel per konvensjon så DS2/DS3 holder samme skjema.",
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle 80 tekster forfattet fra spec-en deepPoolDecision.autismThemes[0]-konstruktet — ingen ekstern skala, ingen formell oversettelse, ingen scraping, ingen DSM-parafrase.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (verifisert i itemspec-provenance og re-kjørt i selftest S7/S8)",
                "render.js sessionSizeFor(likert) => alle items shuffles (verifisert i selftest S14)",
            ],
        },
        "holes": {
            "closes": "Autisme-dyp del 1 (s1): 40 items levert. Autisme-dyp samlet står i 40/100 — s2 repeterende atferd/sensorikk/interesser (#3831, ~35) og s3 hverdagen/energi/tilpasning (brettets del 3, ~25) gjenstår; live-def og autisme-forankring følger brettets del 3 per poolDesign.deepPools liveDefPlan.",
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
    write_json(os.path.join(out, "def-nd-autisme-dyp-pool-ds1.no.json"), build_def("no", opts_no))
    write_json(os.path.join(out, "def-nd-autisme-dyp-pool-ds1.en.json"), build_def("en", opts_en))
    write_json(os.path.join(out, "_nd_autisme_dyp_meta_ds1.json"), build_meta())
    print("gen_nd_autisme_pool_ds1: 40 items x2 spraak + meta skrevet til", out)

if __name__ == "__main__":
    main()
