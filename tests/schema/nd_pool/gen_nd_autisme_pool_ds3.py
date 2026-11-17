# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 3 (todo #3832).
Deterministisk (ingen RNG): skriver def-nd-autisme-dyp-pool-ds3.{no,en}.json + _nd_autisme_dyp_meta_ds3.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
DS3-tema: Hverdagen, energi og tilpasning (idPrefix 'ds', poolMin 25) — autisme-sporets halerekke.
Options importert byte-identisk fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Id-forkant: fullfører autisme-sporets kontinuerlige 100-item-numrering — DS1 (ds-0001..ds-0040),
DS2 (ds-0041..ds-0075), denne delen tar ds-0076..ds-0100.
Alle items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
Copyright-vakter: ingen DSM-5-kriterietekst, ingen ASRS-formulering (ASRS er ADHD-anker, aldri
autisme-anker), ingen kommersielle ND-instrumenter (AQ/RAADS-R/SRS-2/CAT-Q gjengis aldri),
ingen ekstremrisiko/selvskade/medisinerings-items, ingen absolutter,
5-gram-kryss mot triage-poolen OG DA1/DA2/DA3 OG DS1 OG DS2-poolene (begge språk).
"""
import json, os, sys, copy, re, argparse

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme id-orden,
# samme tema, ikke direkte oversettelse — Soester-konvensjonen).
# (id, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)
# asrsNear er tom-liste for DS3: autisme-sporet har ingen ASRS-ankerformuleringer
# (ASRS er ADHD-anker per lisens-verdikten) — flagget arves som konvensjon, aldri som flag.
# 5 temaer à 5: t1 energiforbruk i sosiale settinger, t2 masking-lignende tilpasning,
# t3 restitusjon, t4 omgivelses-tilpasninger, t5 etterslep over tid.

ITEMS = [
    # --- ds3-t1: Energiforbruk i sosiale settinger (5)
    ("ds-0076", 1, False, None, None,
     "Samvær med mange mennesker tar på kroppen min som en lang dag.",
     "Socialising with many people weighs on my body like a long day."),
    ("ds-0077", 1, False, None, None,
     "Etter en time blant folk er batteriet mitt brukt opp.",
     "After an hour among people my battery is spent."),
    ("ds-0078", 1, False, None, None,
     "Jeg trenger hvile etter selskap for at hodet skal tømmes.",
     "I need rest after company for my head to empty."),
    ("ds-0079", 1, False, None, None,
     "Kalas og festival-former koster meg dager å legge meg igjen.",
     "Parties and festival weekends cost me days to come round."),
    ("ds-0080", 1, False, None, None,
     "Lette og kjente samværsformer tar mye mindre krefter enn store.",
     "Familiar and easy meetups cost much less energy than big ones."),
    # --- ds3-t2: Masking-lignende tilpasning (5)
    ("ds-0081", 2, False, None, None,
     "Blant fremmede imiterer ansiktet mitt de uttrykkene rommet forventer.",
     "Among strangers my face imitates the expressions the room expects."),
    ("ds-0082", 2, False, None, None,
     "Jeg bygger mine svar på hva jeg tror at andre vil høre.",
     "I build my replies out of what people want to hear."),
    ("ds-0083", 2, False, None, None,
     "Jeg holder en ytre stemme som ikke er min egen.",
     "I keep an outward voice that is not my own."),
    ("ds-0084", 2, False, None, None,
     "Samtalen på overflaten løper fordi jeg driver hele maskineriet.",
     "The surface talk flows because I run the machinery behind it."),
    ("ds-0085", 2, False, None, None,
     "En full dag med tilpasning til andre etterlater meg blank.",
     "A full day of fitting in with people leaves me blank."),
    # --- ds3-t3: Restitusjon (5)
    ("ds-0086", 3, False, None, None,
     "Tiden i et tomt rom er den som fyller meg igjen.",
     "Time in an empty room is what fills me up again."),
    ("ds-0087", 3, False, None, None,
     "En stille kveld foran meg gir hele uka balanse.",
     "A quiet evening ahead of me rebalances the whole week."),
    ("ds-0088", 3, False, None, None,
     "Jeg setter av timer uten folk for å hente krefter.",
     "I set aside hours without people to gather my strength."),
    ("ds-0089", 3, False, None, None,
     "Mine interesser i fred lader meg opp mer enn søvn av og til.",
     "Recharging through my interests works better for me than sleep does."),
    ("ds-0090", 3, False, None, None,
     "Trøttheten etter folk henger i meg lenge etterpå.",
     "The tiredness after social time lingers inside me for long."),
    # --- ds3-t4: Omgivelses-tilpasninger (5)
    ("ds-0091", 4, False, None, None,
     "Et stille rom uten bakgrunnslyd gjør samværet mulig for meg.",
     "A quiet room without background noise makes company possible for me."),
    ("ds-0092", 4, False, None, None,
     "Jeg gjør ærendene mine når folk er hjemme i mine egne timer.",
     "I run my errands while people are away in my own hours."),
    ("ds-0093", 4, False, None, None,
     "En fast arbeidsplass med mine egne ting gjør arbeidsdagen min holdbar.",
     "A fixed workplace with my own things makes the workday bearable."),
    ("ds-0094", 4, False, None, None,
     "Kalenderen min trenger hvite felt mellom møtene for at hodet henger med.",
     "My calendar needs white gaps between meetings for my head to follow."),
    ("ds-0095", 4, False, None, None,
     "Et nytt sted krever at jeg ser etasjene først.",
     "A new place requires that I walk its floors first."),
    # --- ds3-t5: Etterslep over tid (5)
    ("ds-0096", 5, False, None, None,
     "En dag jeg hadde satt av til hvile fylles av andres gjøremål.",
     "A day I set aside for rest fills up with other tasks."),
    ("ds-0097", 5, False, None, None,
     "Meldinger og dokumenter jeg skulle svart på venter i ukesvis.",
     "Messages and papers I mean to answer wait for weeks."),
    ("ds-0098", 5, False, None, None,
     "Papirmunkene vokser videre i sene ukene uten at de tømmes.",
     "The piles of everyday tasks grow taller over the weeks."),
    ("ds-0099", 5, False, None, None,
     "Gjemte gjøremål gjør mine kvelder trangere enn de burde være.",
     "Deferred chores make my evenings narrower than they need to be."),
    ("ds-0100", 5, False, None, None,
     "En uke med folk legger igjen en uke med tømte krefter.",
     "A week with people leaves behind a week of drained energy."),
]

THEMES = {
    1: {"no": "Energiforbruk i sosiale settinger", "en": "Energy cost in social settings"},
    2: {"no": "Masking-lignende tilpasning", "en": "Masking-like adaptation"},
    3: {"no": "Restitusjon", "en": "Recovery"},
    4: {"no": "Omgivelses-tilpasninger", "en": "Environmental accommodations"},
    5: {"no": "Etterslep over tid", "en": "Backlog over time"},
}
DIM_LABEL = {"no": "Hverdagen, energi og tilpasning", "en": "Daily life, energy and adaptation"}
DIM_DESC = {
    "no": "Energiforbruk i sosiale settinger, masking-lignende tilpasning, restitusjon, omgivelses-tilpasninger, selvrapportert.",
    "en": "Energy cost in social settings, masking-like adaptation, recovery, environmental accommodations, self-reported.",
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
    # separat forfattet: alle 50 tekster unike
    all_texts = [r[5] for r in ITEMS] + [r[6] for r in ITEMS]
    assert len(set(all_texts)) == 50, "tekster ikke unike"
    # tema-bånd: kontinuitet og rekkefølge (5/5/5/5/5)
    expected_themes = [1]*5 + [2]*5 + [3]*5 + [4]*5 + [5]*5
    assert [r[1] for r in ITEMS] == expected_themes, "tema-bånd brutt"
    # id-forkant: kontinuerlig nummerering fullføres fra DS1+DS2
    expected_ids = ["ds-" + str(i).zfill(4) for i in range(76, 101)]
    assert [r[0] for r in ITEMS] == expected_ids, "id-rekkefølge brutt (må være ds-0076..ds-0100)"
    # DS1/DS2-presedent = triage-presedenten: autisme-aksen flagges aldri — ASRS er ADHD-ankeret,
    # aldri autisme-ankeret (autisme-ankeret er BYGG-originale items per verdikten). Tom-liste
    # låst her og dokumentert i metaens asrsNearPolicy.
    assert all(not r[2] for r in ITEMS), "DS3: asrsNear skal være tom-liste (triage-presedenten)"
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
    """5-gram-kryss mot triage-poolen OG DA1/DA2/DA3 OG DS1 OG DS2-poolene (begge språk) — 0 toleranse."""
    for lang in ("no", "en"):
        g = corpus_fivegrams(os.path.join(here, "def-nd-triage-pool.%s.json" % lang))
        for part in ("da1", "da2", "da3"):
            g |= corpus_fivegrams(os.path.join(here, "def-nd-adhd-dyp-pool-%s.%s.json" % (part, lang)))
        g |= corpus_fivegrams(os.path.join(here, "def-nd-autisme-dyp-pool-ds1.%s.json" % lang))
        g |= corpus_fivegrams(os.path.join(here, "def-nd-autisme-dyp-pool-ds2.%s.json" % lang))
        for r in ITEMS:
            text = r[5] if lang == "no" else r[6]
            inter = fivegrams(text) & g
            assert not inter, "%s %s deler 5-gram med eksisterende korpus: %s" % (r[0], lang, sorted(inter)[:3])

def assert_id_chain(here):
    """Kontinuitet mot DS1+DS2: forkantene urokkert, ds-0076..ds-0100 fullfører ds-0001..ds-0100 uten hull/overlap."""
    src1 = os.path.join(here, "def-nd-autisme-dyp-pool-ds1.no.json")
    with open(src1, encoding="utf-8") as f:
        ds1 = json.load(f)
    ids1 = [it["id"] for it in ds1["items"]]
    assert ids1[0] == "ds-0001" and ids1[-1] == "ds-0040" and len(ids1) == 40, "DS1-forkanten er rørt"
    src2 = os.path.join(here, "def-nd-autisme-dyp-pool-ds2.no.json")
    with open(src2, encoding="utf-8") as f:
        ds2 = json.load(f)
    ids2 = [it["id"] for it in ds2["items"]]
    assert ids2[0] == "ds-0041" and ids2[-1] == "ds-0075" and len(ids2) == 35, "DS2-forkanten er rørt"
    mine = [r[0] for r in ITEMS]
    assert not (set(ids1) & set(mine)) and not (set(ids2) & set(mine)), "id-overlapp DS1/DS2/DS3"
    alle = ids1 + ids2 + mine
    want = ["ds-" + str(i).zfill(4) for i in range(1, 101)]
    assert alle == want, "autisme-sporet fullføres ikke kontinuerlig ds-0001..ds-0100: %s" % alle[:5]

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
            "scales": [{"id": "ds3", "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-autisme-dyp-pool-ds3",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "ds3", "weight": 1}],
            "norms": "none",
        },
        "dimensions": [{
            "id": "ds3",
            "label": DIM_LABEL[lang],
            "labelLanguage": lang,
            "description": DIM_DESC[lang],
        }],
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "dimension": "ds3", "theme": "ds3-t" + str(theme_i), "asrsNear": bool(near)}
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["nearNoteEn"] = nn_en
        rows.append(row)
    counts = {}
    for t in range(1, 6):
        counts["ds3-t" + str(t)] = sum(1 for r in ITEMS if r[1] == t)
    return {
        "metaVersion": 1,
        "id": "nd-autisme-dyp-pool-ds3",
        "date": "2026-11-17",
        "items": rows,
        "boardLeaf": "#3832 [3-VEIS][BYGG] FASE 2 Autisme-dyp pool del 3: DS3 Hverdag/energi/masking-tilpasning — 25 originale items (worker TR-882A360F4AAA).",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (ENDLIG VERDIKT, #3732) + spec anchorDecision: autisme-ankeret er BYGG-originale items — ASRS er ADHD-anker aldri autisme-anker, AQ og RAADS-R gjengis aldri (kun navn+cutoff+kilde som referanselinje), DSM-5-kriterietekst aldri gjengitt eller parafrasert — items er forfattet fra DS3-konstruktbeskrivelsen i spec-en. DIVA-5/CAADID/Conners/SRS-2/CAT-Q brukt som mal eller kilde: nei. #3826-ekstra forbud arvet: ingen item omfatter ekstrem risiko/selvskade/medisinering (programmert token-skann i assert_authoring og selftest).",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen diagnostisk språkbruk, ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema per id; tekstene er IKKE direkte oversettelser. Programmatisk 5-gram-kryss mot triage-poolen OG DA1/DA2/DA3-poolene OG DS1-poolen OG DS2-poolen (def-nd-triage-pool.{no,en}.json + def-nd-adhd-dyp-pool-*.{no,en}.json + def-nd-autisme-dyp-pool-ds1.{no,en}.json + def-nd-autisme-dyp-pool-ds2.{no,en}.json), 0 sammenfall.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 mot skala ds3 — screening i én retning; NG-4-avviket (ingen reverse-keyed items) er dokumentert i spec-en engineGaps og arvet fra triage-poolens konvensjon.",
        "themeLabels": THEMES,
        "dimensionLabel": DIM_LABEL,
        "dimensionLabelNote": "NO-etikett er byte-låst til deepPoolDecision.autismThemes[2].name i spec-en; EN-etikett er separat forfattet og låst her",
        "themeCounts": counts,
        "asrsNearPolicy": "TOM-liste låst eksplisitt — presedent triage-metaen: alle ts-items står asrsNear False der, og DS1-metaen og DS2-metaen låste samme tom-liste for autisme-sporet. Grunnlag: ASRS v1.1 6Q er ADHD-ankeret, aldri autisme-ankeret (dokumentert verdikt DOC-C8C02AD272 + spec anchorDecision.autismAnchor = BYGG originale items); da-poolenes flagg markerer nærhet til ADHD-ankerformuleringer og har aldri noen motpart i autisme-sporet. Feltet arves likevel per konvensjon så sporets skjema holder seg identisk.",
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle 50 tekster forfattet fra spec-en deepPoolDecision.autismThemes[2]-konstruktet — ingen ekstern skala, ingen formell oversettelse, ingen scraping, ingen DSM-parafrase.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (verifisert i itemspec-provenance og re-kjørt i selftest S7/S8)",
                "render.js sessionSizeFor(likert) => alle items shuffles (verifisert i selftest S14)",
            ],
        },
        "holes": {
            "closes": "Autisme-dyp del 3 (s3): 25 items levert. Autisme-dyp samlet er full: 100/100 — ds-0001..ds-0100 kontinuerlig (40+35+25) med null hull og null overlap.",
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
    write_json(os.path.join(out, "def-nd-autisme-dyp-pool-ds3.no.json"), build_def("no", opts_no))
    write_json(os.path.join(out, "def-nd-autisme-dyp-pool-ds3.en.json"), build_def("en", opts_en))
    write_json(os.path.join(out, "_nd_autisme_dyp_meta_ds3.json"), build_meta())
    print("gen_nd_autisme_pool_ds3: 25 items x2 spraak + meta skrevet til", out)

if __name__ == "__main__":
    main()
