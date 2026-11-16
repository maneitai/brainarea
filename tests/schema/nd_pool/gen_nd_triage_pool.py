# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2, todo #3758 (triage-pool).
Deterministisk (ingen RNG): skriver def-nd-triage-pool.{no,en}.json + _nd_triage_pool_meta.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
Options er byte-importert fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Alle likert-items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
"""
import json, os, sys, copy

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_DIR = os.path.dirname(HERE)  # tests/schema

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme akse+tema).
# (id, axis, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)
ITEMS = [
    # --- ADHD akse — tema 1: Daglig oppmerksomhet og distraksjonssårbarhet (7)
    ("ta-0001", "adhd", 1, False, None, None,
     "Jeg mister tråden i samtaler når noe annet skjer rundt meg.",
     "I lose my thread in conversations when something else happens around me."),
    ("ta-0002", "adhd", 1, False, None, None,
     "Jeg må lese samme avsnitt flere ganger før det fester seg.",
     "I have to read the same paragraph a few times before it sticks."),
    ("ta-0003", "adhd", 1, False, None, None,
     "Mine tanker vandrer av gårde midt i det jeg holder på med.",
     "My thoughts wander off in the middle of what I am doing."),
    ("ta-0004", "adhd", 1, False, None, None,
     "Jeg blir dratt inn i meldinger og notiser mens jeg jobber med noe annet.",
     "Notifications pull me away while I am working on something else."),
    ("ta-0005", "adhd", 1, False, None, None,
     "Jeg glemmer hvorfor jeg gikk inn på et rom.",
     "I forget what I came into a room to get."),
    ("ta-0006", "adhd", 1, False, None, None,
     "Jeg hører bare halvparten når det snakkes fra flere hold samtidig.",
     "I catch only half of what is said when several people talk at once."),
    ("ta-0007", "adhd", 1, False, None, None,
     "Jeg må spørre igjen fordi jeg ikke fikk med meg spørsmålet.",
     "I miss a question and have to ask for it again."),
    # --- ADHD akse — tema 2: Impuls og uro i hverdagen (7)
    ("ta-0008", "adhd", 2, False, None, None,
     "Jeg svarer før spørsmålet jeg svarer på er ferdig stilt.",
     "I answer before the person asking has finished their question."),
    ("ta-0009", "adhd", 2, False, None, None,
     "Jeg snakker om noe annet midt i en setning uten å merke det.",
     "I wander into another topic mid-sentence without noticing it."),
    ("ta-0010", "adhd", 2, True,
     "ASRS-6Q-anker-betegner sitte-uro (fidget); observabelen her er å forlate bordet — samme familie, ulikt vinkel.",
     "The ASRS 6Q anchor covers seated fidgeting; this item observes leaving the table — same family, different angle.",
     "Jeg reiser meg fra bordet før de andre er ferdige.",
     "I leave the table before the others are done eating."),
    ("ta-0011", "adhd", 2, False, None, None,
     "Jeg kjøper ting jeg ikke hadde planlagt å kjøpe.",
     "I buy things I had no plan to buy."),
    ("ta-0012", "adhd", 2, False, None, None,
     "Jeg bytter tema i samtalen så snart en ny idè dukker opp.",
     "I switch topics the moment a new idea shows up."),
    ("ta-0013", "adhd", 2, False, None, None,
     "Jeg går rett på ting uten å lese bruksanvisningen ferdig.",
     "I start using things without reading the manual through."),
    ("ta-0014", "adhd", 2, False,
     None,
     "NOTE-EN (ikke-nær men notert): ASRS langform har en kø-vinkel; ikke blant 6Q-ankrets seks — beholdt som impuls-vinkel.",
     "Jeg finner det vanskelig å vente til det er min tur.",
     "I find it hard to wait until it is my turn."),
    # --- ADHD akse — tema 3: Funksjonskonsekvens i daglige gjøremål (6)
    ("ta-0015", "adhd", 3, True,
     "Anker-3 dekker huske-avtaler; item er utsettelse av avtaler og regninger — nær familie, ulikt vinkel.",
     "Anchor item 3 covers remembering appointments; this item is postponing bills and appointments — near family, different angle.",
     "Jeg skyver avtaler og regninger til en annen dag.",
     "I push bills and appointments to another day."),
    ("ta-0016", "adhd", 3, True,
     "Anker-1 dekker avslutning av oppgaver; item er halvferdig husarbeid — samme familie.",
     "Anchor item 1 covers wrapping up tasks; this item is half-finished laundry — same family.",
     "Jeg lar klesvasken ligge halvferdig frem til jeg må begynne på nytt.",
     "I leave laundry half-finished until I have to start over."),
    ("ta-0017", "adhd", 3, True,
     "Anker-1-familien (ufullførte oppgaver), vinkel: gjenoppdagede halvferdige starter.",
     "Anchor item 1 family (unfinished tasks), angle: rediscovered half-started tasks.",
     "Jeg finner oppgaver jeg startet på for uker siden, halvveis.",
     "I find tasks I started weeks ago, still halfway done."),
    ("ta-0018", "adhd", 3, False, None, None,
     "Jeg mister kvitteringer og papirer jeg trenger i ukene etterpå.",
     "I lose receipts and papers I will need in the coming weeks."),
    ("ta-0019", "adhd", 3, False, None, None,
     "Jeg tar med meg feil veske eller feil nøkler når jeg skynder meg.",
     "I grab the wrong bag or the wrong keys when I rush out."),
    ("ta-0020", "adhd", 3, True,
     "Anker-3-familien (huske forpliktelser; termenen glipper).",
     "Anchor item 3 family (remembering obligations; the deadline slips the mind).",
     "Jeg betaler for sent fordi fristen glipper av tanken min.",
     "I pay late because the deadline slips my mind."),
    # --- Autisme akse — tema 1: Sosialt samspill og resiprositet kortform (7)
    ("ts-0001", "autism", 1, False, None, None,
     "Jeg blir usikker på hvordan jeg skal holde samtalen i gang.",
     "I feel unsure how to keep a conversation going."),
    ("ts-0002", "autism", 1, False, None, None,
     "Jeg må tenke ut ansiktsuttrykk i stedet for at de kommer av seg selv.",
     "I work out my facial expressions instead of them coming on their own."),
    ("ts-0003", "autism", 1, False, None, None,
     "Jeg misser vitsen selv om alle rundt meg ler.",
     "I miss the point of a joke while everyone around me laughs."),
    ("ts-0004", "autism", 1, False, None, None,
     "Jeg tenker på hvor jeg skal se hen mens jeg snakker med folk.",
     "I think about where to look while I am talking with people."),
    ("ts-0005", "autism", 1, False, None, None,
     "Jeg vet ikke når det er min tur til å si noe i gruppe.",
     "I do not know when it is my turn to speak in a group."),
    ("ts-0006", "autism", 1, False, None, None,
     "Jeg holder på mine egne temaer lenger enn samtalen ber om.",
     "I stay on my own topics longer than the conversation calls for."),
    ("ts-0007", "autism", 1, False, None, None,
     "Jeg blir tatt på sengen av at folk mener noe annet enn de sier.",
     "I miss what people mean when their words say something else."),
    # --- Autisme akse — tema 2: Rutine og sensorisk kortform (7)
    ("ts-0008", "autism", 2, False, None, None,
     "Jeg legger omgangen min i samme rekkefølge hver dag.",
     "I keep to the same order of steps every morning."),
    ("ts-0009", "autism", 2, False, None, None,
     "Jeg mister matlysten hvis maten ser annerledes ut enn vanlig.",
     "I lose my appetite when food looks different from usual."),
    ("ts-0010", "autism", 2, False, None, None,
     "Jeg trekker meg unna når det står mye støy rundt meg.",
     "I move away when there is a lot of noise around me."),
    ("ts-0011", "autism", 2, False, None, None,
     "Jeg merker klesmerker og sømmer lenge etter at jeg har kledd meg.",
     "I feel tags and seams in my clothes long after getting dressed."),
    ("ts-0012", "autism", 2, False, None, None,
     "Jeg blir urolig når planer jeg hadde regnet med endres brått.",
     "I get unsettled when plans I counted on change suddenly."),
    ("ts-0013", "autism", 2, False, None, None,
     "Jeg kjøper de samme matvarene og bruker dem på samme måte.",
     "I buy the same groceries and use them the same way."),
    ("ts-0014", "autism", 2, False, None, None,
     "Jeg trenger pausen min på et fast tidspunkt for å hente meg.",
     "I need my quiet hour at a fixed time to recover."),
    # --- Autisme akse — tema 3: Energi og tilpasning kortform (6)
    ("ts-0015", "autism", 3, False, None, None,
     "Jeg er tom for ord etter en hel dag med folk rundt meg.",
     "I am out of words after a whole day around people."),
    ("ts-0016", "autism", 3, False, None, None,
     "Jeg trenger en rolig stund alene etter hver dag på jobb eller skole.",
     "I need quiet time alone after every day at work or school."),
    ("ts-0017", "autism", 3, False, None, None,
     "Jeg øver på samtaler i hodet mitt før jeg går inn i dem.",
     "I rehearse conversations in my head before I step into them."),
    ("ts-0018", "autism", 3, False, None, None,
     "Jeg trekker meg fra selskap før de andre synes det er på tide.",
     "I leave gatherings before the others think it is time."),
    ("ts-0019", "autism", 3, False, None, None,
     "Dagen etter et selskap bruker jeg på å legge ting tilbake på plass.",
     "The day after a gathering I spend putting everything back in place."),
    ("ts-0020", "autism", 3, False, None, None,
     "Jeg lar heller telefonen ringe ut enn å svare uten forberedelse.",
     "I let the phone ring out rather than answer unprepared."),
]

THEMES = {
    "adhd": {
        1: {"no": "Daglig oppmerksomhet og distraksjonssårbarhet", "en": "Everyday attention and distractibility"},
        2: {"no": "Impuls og uro i hverdagen", "en": "Impulse and restlessness in daily life"},
        3: {"no": "Funksjonskonsekvens i daglige gjøremål", "en": "Impact on everyday tasks"},
    },
    "autism": {
        1: {"no": "Sosialt samspill og resiprositet kortform", "en": "Social reciprocity, short form"},
        2: {"no": "Rutine og sensorisk kortform", "en": "Routines and sensory, short form"},
        3: {"no": "Energi og tilpasning kortform", "en": "Energy and adaptation, short form"},
    },
}
# NB: spec-ens "distraksjones-sårbarhet"/"Funksjons-konsegvens"/"resiprositet kortform"
# normaliseres grammatisk her (distraksjonssårbarhet / funksjonskonsekvens / - kortform);
# normaliseringen dokumenteres i rapporten — temainnholdet er uendret.

# ---------------------------------------------------------------- options fra ipip50

def load_options(lang):
    src = os.path.join(SCHEMA_DIR, "def-ipip50-big5.{}.json".format(lang))
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

def dimensions_block(lang):
    if lang == "no":
        return [
            {"id": "adhd", "label": "ADHD", "labelLanguage": "no",
             "description": "Daglig oppmerksomhet, uro og oppfølging i hverdagslige gjøremål."},
            {"id": "autism", "label": "Autisme", "labelLanguage": "no",
             "description": "Sosialt samspill, vaner og sensorisk toleranse i hverdagen."},
        ]
    return [
        {"id": "adhd", "label": "ADHD", "labelLanguage": "en",
         "description": "Everyday attention, restlessness and follow-through on daily tasks."},
        {"id": "autism", "label": "Autism", "labelLanguage": "en",
         "description": "Social reciprocity, routines and sensory tolerance in daily life."},
    ]

def build_def(lang, options):
    items = []
    for (iid, axis, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": t_no if lang == "no" else t_en,
            "options": copy.deepcopy(options),
            "scales": [{"id": axis, "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-triage-pool",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "adhd", "weight": 1}, {"id": "autism", "weight": 1}],
            "norms": "none",
        },
        "dimensions": dimensions_block(lang),
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, axis, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "axis": axis, "theme": axis + "-t" + str(theme_i)}
        row["asrsNear"] = bool(near)
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["noteEn"] = nn_en if near else nn_en
        rows.append(row)
    counts = {"adhd": {}, "autism": {}}
    for axis in ("adhd", "autism"):
        for t in (1, 2, 3):
            counts[axis]["t" + str(t)] = sum(1 for r in [(i[0], i[1], i[2]) for i in ITEMS] if r[1] == axis and r[2] == t)
    return {
        "metaVersion": 1,
        "id": "nd-triage-pool",
        "date": "2026-11-15",
        "boardLeaf": "#3758 [3-VEIS] FASE 2: Triage-pool (~40 items) — startes når lisenssjekken (#3732) er bekreftet.",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": (
            "DOC-C8C02AD272 (ENDLIG VERDIKT, todo #3732): ASRS v1.1 6Q er ADHD-anker i live-def (#3760), "
            "IKKE i denne poolen; AQ/RAADS-R gjengis aldri (kun navn+cutoff+kilde som referanselinje); "
            "DSM-5-kriterietekst aldri parafrasert eller gjengitt som items; alle 40 supplement-items er "
            "100% originale konstrukt-forfattede, ingen kloning."
        ),
        "authoringRule": (
            "Første-person, presens, 8–14 ord, én setning, ingen dobbeltspørsmål, ingen absolutter "
            "(alltid/aldri/always/never), ingen diagnostisk språkbruk (DSM/diagnose/symptom-ordforråd), "
            "ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: "
            "samme id-rekkefølge, samme akse+tema per id, samme asrsNear per id."
        ),
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 — screening i én retning; NG-4-avvik (ingen reverserte items) er dokumentert i spec-en engineGaps.",
        "themeCounts": counts,
        "items": rows,
        "provenance": {
            "authoringDate": "2026-11-15",
            "originality": "Alle items forfattet fra spec-en poolDesign.themesTriage* — ingen ekstern skala, ingen formell oversettelse, ingen scraping.",
            "asrsNearPolicy": "Flaggede ta-items er ikke kloninger — de markerer symptomfamilie-nære vinkler slik at FASE 4-utvelgelsen (live-def 3 per akse) kan velge bort dem mot ASRS-ankerets seks formuleringer.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (lest i økten)",
                "render.js sessionSizeFor(likert) => alle items shuffles (lest i økten)",
                "validateTestDef håndhever IKKE reverseringskravet — NG-4 bekreftet mot koden (grep 'reverse' i tests/engine)",
            ],
        },
    }

def write_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")

def main(out_dir=None):
    out_dir = out_dir or HERE
    os.makedirs(out_dir, exist_ok=True)
    for lang in ("no", "en"):
        opt, src = load_options(lang)
        write_json(os.path.join(out_dir, "def-nd-triage-pool.{}.json".format(lang)), build_def(lang, opt))
    write_json(os.path.join(out_dir, "_nd_triage_pool_meta.json"), build_meta())
    print("OK: 2 def-filer + meta skrevet til", out_dir)

if __name__ == "__main__":
    out = None
    if len(sys.argv) > 2 and sys.argv[1] == "--out":
        out = sys.argv[2]
    main(out)
