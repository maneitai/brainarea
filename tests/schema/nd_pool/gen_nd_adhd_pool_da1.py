# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 1 (todo #3826).
Deterministisk (ingen RNG): skriver def-nd-adhd-dyp-pool-da1.{no,en}.json + _nd_adhd_dyp_meta_da1.json.
Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
DA1-tema: Oppmerksomhet og eksekutive funksjoner (idPrefix 'da', poolMin 40).
Options importert byte-identisk fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Alle items er positivt keyede (screenings-retning; NG-4-avviket er dokumentert i spec).
Copyright-vakter: ingen DSM-5-kriterietekst, ingen kommersielle ND-instrumenter, ingen
ekstremrisiko/selvskade/medisinerings-items, ingen absolutter, 5-gram-kryss mot triage-poolen.
"""
import json, os, sys, copy, re, argparse

# ---------------------------------------------------------------- itemtabeller
# NO: separat forfattet. EN: separat forfattet, konstrukt-ekvivalent (samme id-orden,
# samme tema, ikke direkte oversettelse — Soester-konvensjonen).
# (id, theme_i, asrsNear, nearNote_no, nearNote_en, text_no, text_en)
NO_TEXTS, EN_TEXTS = range(2)

def _blank():
    return None, None

ITEMS = [
    # --- da1-t1: Fokushold og gjennomføring av én ting (7)
    ("da-0001", 1, True,
     "Anker-1-familien (avslutning av oppgaver); vinkel: bryte av halvveis i stedet for å la siste detalj gå.",
     "Anchor item 1 family (wrapping up tasks); angle: breaking off midway rather than skipping the final details.",
     "Jeg bytter over til noe annet før oppgaven jeg holdt på med er ferdig.",
     "I switch to something new before the task I held on to is done."),
    ("da-0002", 1, False, None, None,
     "Tankene mine stikker av fra det jeg leser, og jeg må finne linjen igjen.",
     "My thoughts run off the page, and I have to find my line again."),
    ("da-0003", 1, False, None, None,
     "Jeg tapper fokus når en oppgave varer lengre enn første kaffepause.",
     "I lose focus when a task runs longer than one coffee break."),
    ("da-0004", 1, False, None, None,
     "Jeg mister plasseringen i oppgaven hver gang noen avbryter meg.",
     "I lose my place in the task each time someone interrupts me."),
    ("da-0005", 1, False, None, None,
     "Instruksjoner med flere steg forsvinner underveis før jeg er halvveis.",
     "Instructions with several steps fade before I am halfway through them."),
    ("da-0006", 1, False, None, None,
     "Jeg prøver å gjøre to ting samtidig, og blir dårlig ferdig med begge.",
     "I try doing two things at once and finish neither of them well."),
    ("da-0007", 1, False, None, None,
     "Jeg trenger stillhet rundt meg for å holde tanken på én linje.",
     "I need quiet around me to keep my thought on one line."),
    # --- da1-t2: Distraksjons-sårbarhet i hverdagen (7)
    ("da-0008", 2, False, None, None,
     "Lyd fra naboleiligheten trenger inn i hodet mitt når jeg prøver å konsentrere meg.",
     "Noise from the next flat pushes into my head when I try to concentrate."),
    ("da-0009", 2, False, None, None,
     "En åpen fane merker jeg før jeg merker det jeg egentlig skal gjøre.",
     "I notice the open tab before I notice what I was supposed to do."),
    ("da-0010", 2, False, None, None,
     "Telefonen skal bare sjekkes en gang, og en halvtime er borte.",
     "One planned look at the phone, and half an hour is gone."),
    ("da-0011", 2, False, None, None,
     "Mine egne tanker tar over når det er rolig rundt meg.",
     "My own thoughts take over when the room around me is calm."),
    ("da-0012", 2, False, None, None,
     "Bakgrunnsstøy og samtaler ved nabobordet drar oppmerksomheten min ut av teksten.",
     "Background noise and talk at the next table pull me out of the text."),
    ("da-0013", 2, False, None, None,
     "Jeg plukker opp ting som ligger på veien til det jeg egentlig skulle hente.",
     "I pick up things that sit along the path to what I came for."),
    ("da-0014", 2, False, None, None,
     "Små lyder som summing eller drypp trekker tankene mine ut av det jeg gjorde.",
     "Small sounds like humming or dripping tug my mind away from what I did."),
    # --- da1-t3: Hverdagshukommelse (7)
    ("da-0015", 3, False, None, None,
     "Jeg leter etter nøklene mine oftere enn jeg liker å innrømme.",
     "I hunt for my keys more often than I like to admit."),
    ("da-0016", 3, False, None, None,
     "Uten handleliste forsvinner halvparten av det jeg skulle ha kjøpt på veien.",
     "Without a shopping list, half of what I meant to buy slips away."),
    ("da-0017", 3, False, None, None,
     "Jeg merker navnet til en ny person, og det glipper innen neste samtale.",
     "I catch a new person's name, and it slips away before the next conversation."),
    ("da-0018", 3, False, None, None,
     "Maten jeg setter på ovnen blir stående til lukten minner meg på den.",
     "The pan I put on the stove stays there until the smell reminds me."),
    ("da-0019", 3, True,
     "Anker-3-familien (huske forpliktelser); vinkel: ting pakket og lagt fremme i går, men etterlatt hjemme i dag.",
     "Anchor item 3 family (remembering obligations); angle: things set by the door last night, left behind today.",
     "Jeg glemmer å ta med det jeg la fremme foran døren kvelden før.",
     "I forget what I set by the door the night before I leave."),
    ("da-0020", 3, False, None, None,
     "Meldinger jeg planlegger å svare på blir liggende svart i flere dager.",
     "Messages I plan to answer stay unanswered for several days."),
    ("da-0021", 3, False, None, None,
     "Jeg kjenner igjen ansiktet, men må be om navnet igjen.",
     "I recognise the face and give up trying to recall the name."),
    # --- da1-t4: Oppstartsmotstand (7)
    ("da-0022", 4, False, None, None,
     "Forberedelsen tar lengre tid enn det jeg egentlig skulle gjøre.",
     "Getting ready takes more of my time than the task itself."),
    ("da-0023", 4, False, None, None,
     "Store oppgaver venter på rett tid, og rett tid kommer ikke av seg selv.",
     "Big tasks wait for the right moment, and the moment stays away."),
    ("da-0024", 4, False, None, None,
     "Jeg må bygge meg opp med små gjøremål før den store begynner.",
     "I warm up with small errands before I touch the big one."),
    ("da-0025", 4, False, None, None,
     "Uten en avtale med meg selv om starttid kommer jeg ikke i gang.",
     "Without a deal with myself about a start time, I get going late."),
    ("da-0026", 4, False, None, None,
     "Jeg åpner oppgaven og leser den, og lukker den igjen til senere.",
     "I open the task, read it, and close it again until later."),
    ("da-0027", 4, False, None, None,
     "Starten på kjedelige gjøremål drar jeg ut til det meste av dagen er gått.",
     "I stretch the start of dull chores until most of the day has gone."),
    ("da-0028", 4, False, None, None,
     "Jeg trenger en frist fra andre for å sette punktum for oppstartsfasen.",
     "I run on deadlines from others to close the starting phase of my work."),
    # --- da1-t5: Organisering av ting og tid (7)
    ("da-0029", 5, True,
     "Anker-2-familien (organisering av oppgaver); vinkel: filstruktur som kollapser under egne navn.",
     "Anchor item 2 family (organizing tasks); angle: a file structure that folds under its own naming.",
     "Mine prosjekter ligger i mapper med navn jeg ikke finner igjen.",
     "My projects sit in folders whose names I cannot find again."),
    ("da-0030", 5, False, None, None,
     "Notatene mine spres over flere apper, og ingen av dem har hele bildet.",
     "My notes spread across several apps, and none of them holds the whole picture."),
    ("da-0031", 5, False, None, None,
     "Pulten min samler hauger av ting jeg planlegger å sortere senere.",
     "My desk collects piles of things I plan to sort later."),
    ("da-0032", 5, True,
     "Anker-2-familien (organisering av oppgaver); vinkel: ukeplan som holder kort og kollapser midt i uka.",
     "Anchor item 2 family (organizing tasks); angle: a weekly plan that holds briefly and folds midweek.",
     "Planen min holder til tirsdag, deretter leverer uka selv.",
     "My plan holds until Tuesday, after that the week writes itself."),
    ("da-0033", 5, False, None, None,
     "Jeg kjøper oppbevaring i stedet for å gi tingene mine et fast sted.",
     "I buy storage boxes instead of giving my things one fixed place."),
    ("da-0034", 5, False, None, None,
     "Prioritering av tre like viktige oppgaver tar lengre tid enn en av dem.",
     "Choosing between three tasks of equal weight takes longer than one of them."),
    ("da-0035", 5, False, None, None,
     "Først tar jeg de lystbetonte gjøremålene, de viktige venter til det blir alvor.",
     "I take the fun tasks first, and the important ones wait."),
    # --- da1-t6: Oppfølging over tid (5)
    ("da-0036", 6, False, None, None,
     "Underveis i lange prosjekter mister jeg tråd og må finne fremgangsmåten på nytt.",
     "On long projects I lose the thread and rebuild my approach from the start."),
    ("da-0037", 6, True,
     "Anker-1-familien (avsluttede detaljer); vinkel: det som blir liggende lengst er nettopp de siste detaljene.",
     "Anchor item 1 family (finishing details); angle: what lingers longest is exactly the final details.",
     "Siste detaljer i en oppgave er det som blir liggende lengst hos meg.",
     "The last details of a task are the ones that linger with me."),
    ("da-0038", 6, False, None, None,
     "Etter en pause i en oppgave må jeg bygge meg inn i den igjen.",
     "After a pause inside a task, I have to build my way back in."),
    ("da-0039", 6, False, None, None,
     "Tidsbudsjettet mitt for en gjøring stemmer bare når gjøringen er den eneste.",
     "My time budget for a chore holds only while it is the only chore."),
    ("da-0040", 6, True,
     "Anker-3-familien (huske forpliktelser); vinkel: kompensasjon gjennom ytre påminnelser i stedet for egen hukommelse.",
     "Anchor item 3 family (remembering obligations); angle: compensation through external reminders rather than own memory.",
     "Påminnelinger og lapper på døren er det som holder fristene mine i live.",
     "Reminders and notes on the door are what keep my deadlines alive."),
]

THEMES = {
    1: {"no": "Fokushold og gjennomføring av én ting", "en": "Holding focus and completing one thing"},
    2: {"no": "Distraksjons-sårbarhet i hverdagen", "en": "Distractibility in daily situations"},
    3: {"no": "Hverdagshukommelse", "en": "Everyday memory"},
    4: {"no": "Oppstartsmotstand", "en": "Getting-started resistance"},
    5: {"no": "Organisering av ting og tid", "en": "Organising things and time"},
    6: {"no": "Oppfølging over tid", "en": "Follow-through over time"},
}
DIM_LABEL = {"no": "Oppmerksomhet og eksekutive funksjoner", "en": "Attention and executive functions"}
DIM_DESC = {
    "no": "Fokushold, distraksjoner, hukommelse i hverdagen, oppstartsmotstand og organisering, selvrapportert.",
    "en": "Holding focus, distractions, everyday memory, getting started and organisation, self-reported.",
}

# ---------------------------------------------------------------- forfattersjekker

NO_ABS = re.compile(r"(alltid|aldri|always|never)", re.IGNORECASE)
NO_DIAG = re.compile(r"(diagnos| DSM |DIVA|Conners|SRS-2|CAT-Q|RAADS|lidelse| disorder |autism spectrum disorder)", re.IGNORECASE)
# #3826-forbudet: ingen ekstrem risiko/selvskade/medisinering (forbrukertest, ikke klinisk skjema)
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
    # tema-bånd: kontinuitet og rekkefølge
    expected_themes = [1]*7 + [2]*7 + [3]*7 + [4]*7 + [5]*7 + [6]*5
    assert [r[1] for r in ITEMS] == expected_themes, "tema-bånd brutt"
    asrs_near = [r[0] for r in ITEMS if r[2]]
    assert asrs_near == ["da-0001", "da-0019", "da-0029", "da-0032", "da-0037", "da-0040"], asrs_near
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
    """5-gram-kryss mot triage-poolen (begge språk) — 0 toleranse."""
    for lang in ("no", "en"):
        g = corpus_fivegrams(os.path.join(here, "def-nd-triage-pool.%s.json" % lang))
        for r in ITEMS:
            text = r[5] if lang == "no" else r[6]
            inter = fivegrams(text) & g
            assert not inter, "%s %s deler 5-gram med triage-poolen: %s" % (r[0], lang, sorted(inter)[:3])

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
            "scales": [{"id": "da1", "sign": 1}],
        })
    return {
        "schemaVersion": 1,
        "id": "nd-adhd-dyp-pool-da1",
        "type": "test-definition",
        "family": "pool",
        "languages": [lang],
        "scoring": {
            "type": "trait",
            "traits": [{"id": "da1", "weight": 1}],
            "norms": "none",
        },
        "dimensions": [{
            "id": "da1",
            "label": DIM_LABEL[lang],
            "labelLanguage": lang,
            "description": DIM_DESC[lang],
        }],
        "items": items,
    }

def build_meta():
    rows = []
    for (iid, theme_i, near, nn_no, nn_en, t_no, t_en) in ITEMS:
        row = {"id": iid, "dimension": "da1", "theme": "da1-t" + str(theme_i), "asrsNear": bool(near)}
        if nn_no: row["nearNoteNo"] = nn_no
        if nn_en: row["nearNoteEn"] = nn_en
        rows.append(row)
    counts = {}
    for t in range(1, 7):
        counts["da1-t" + str(t)] = sum(1 for r in ITEMS if r[1] == t)
    return {
        "metaVersion": 1,
        "id": "nd-adhd-dyp-pool-da1",
        "date": "2026-11-17",
        "items": rows,
        "boardLeaf": "#3826 [3-VEIS][BYGG] FASE 2 ADHD-dyp pool del 1: DA1 Oppmerksomhet/eksekutivt — 40 originale items (worker TR-50A1A38A4C89).",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (ENDLIG VERDIKT, #3732): ASRS v1.1 6Q er ADHD-anker i live-def (#3760-ark), IKKE i denne poolen; poolen inneholder null ASRS-gjengivelse. AQ/RAADS-R gjengis aldri; DSM-5-kriterietekst aldri gjengitt eller parafrasert — items er forfattet fra DA1-konstruktbeskrivelsen i spec-en. DIVA-5/CAADID/Conners/SRS-2/CAT-Q brukt som mal eller kilde: nei. #3826-ekstra forbud: ingen item omfatter ekstrem risiko/selvskade/medisinering (programmert token-skann i assert_authoring og selftest).",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen diagnostisk språkbruk, ingen ekstremrisiko/selvskade/medisinering. NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema per id; tekstene er IKKE direkte oversettelser. Programmatisk 5-gram-kryss mot triage-poolen (def-nd-triage-pool.{no,en}.json), 0 sammenfall.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "keyingRule": "Alle skala-referanser sign 1 mot skala da1 — screening i én retning; NG-4-avviket (ingen reverse-keyed items) er dokumentert i spec-en engineGaps og arvet fra triage-poolens konvensjon.",
        "themeLabels": THEMES,
        "dimensionLabel": DIM_LABEL,
        "dimensionLabelNote": "NO-etikett er byte-låst til deepPoolDecision.adhdThemes[0].name i spec-en; EN-etikett er separat forfattet og låst her",
        "themeCounts": counts,
        "asrsNearPolicy": "Flaggede da-items er ikke kloninger — de markerer anker-familienær vinkel (f1 avslutning, f2 organisering, f3 huske-forpliktelser) slik at FASE 4-utvelgelsen (trekk 8 av 40 til live-deffen) kan velge med omtanke mot ASRS-blokkens formuleringer; blokken bor per scoringContracts.asrsAnchorShape i live-deffen, aldri i poolen.",
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle 80 tekster forfattet fra spec-en deepPoolDecision.adhdThemes[0]-konstruktet — ingen ekstern skala, ingen formell oversettelse, ingen scraping, ingen DSM-parafrase.",
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized per skala, komposit over skalaer med data (verifisert i itemspec-provenance og re-kjørt i selftest S7/S8)",
                "render.js sessionSizeFor(likert) => alle items shuffles (verifisert i selftest S14)",
            ],
        },
        "holes": {
            "closes": "ADHD-dyp del 1 (d1): 40 items levert. ADHD-dyp samlet står i 40/100 — d2 hyperaktivitet/impulsivitet (#3827, ~35) og d3 hverdagsfungering/konsekvens (#3828, ~25) gjenstår; live-def og ASRS-forankring følger ved brettets del 3 per poolDesign.deepPools liveDefPlan.",
            "opens": "Samlet ADHD-dyp-pool (def-nd-adhd-dyp-pool.<lang>.json per defFilePlan.naming) materialiseres ved #3828; kryssles-øster (kryssles mot lisensbekreftelsen og itemspec) følger brettet.",
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
    assert_authoring({"no": opts_no, "en": opts_en})
    assert_corpus_cross(here)
    write_json(os.path.join(out, "def-nd-adhd-dyp-pool-da1.no.json"), build_def("no", opts_no))
    write_json(os.path.join(out, "def-nd-adhd-dyp-pool-da1.en.json"), build_def("en", opts_en))
    write_json(os.path.join(out, "_nd_adhd_dyp_meta_da1.json"), build_meta())
    print("gen_nd_adhd_pool_da1: 40 items x2 spraak + meta skrevet til", out)

if __name__ == "__main__":
    main()
