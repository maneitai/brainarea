# -*- coding: utf-8 -*-
"""FASE 2 relasjonspool R2 — åpenhet (op), 60 originale likert-items per språk.

Kontrakt: tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED) +
Soester-konvensjonen (én fil per språk, alle items inline, id-pattern op-NNNN,
options byte-importert fra def-ipip50-big5.<lang>.json — 5-punkts NOYAKTIGHET-ankeret).
Søster-konvensjon: gen_rel_pool_r1.py (cl, commit 226b3f1) — samme struktur, nytt tema.

Sign-policy: op-0001..0030 positivt keyede (sign 1), op-0031..0060 negativt
(sign -1). Relasjonssporet er en bilatteral profilskala — poolen er utvalgskilden
for live-deffens +-+- mønster per dimensjon (2 pos + 2 neg velges i FASE 4),
i motsetning til nd-triage-poolen som er screening i én retning (NG-4).

R2-construct (itemspec themes.R2): ytring av egne behov og grenser, invitasjon
til motpartens perspektiv, diskusjonsvillighet, åpenhet for tilbakemelding.
Negativt keyede items peker motsatt vei: tildekking av egne behov/grenser,
unngåelse av uenighet, avvisning av tilbakemelding og motperspektiv.
themes.R2 har ingen exampleSeed i spec (kun R1 har) — seedNear-flagget er dermed
tomt for denne poolen; selftest låser tom listen eksplisitt.

Deterministisk: ingen RNG, ingen klokke. Re-kjoring er byte-identisk (selftest S13).
"""
import json, os, sys, copy

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_DIR = os.path.dirname(HERE)
REPO = os.path.dirname(SCHEMA_DIR)

# ------------------------------------------------------------------ items
# theme: op-t1 ytring av egne behov og grenser | op-t2 invitasjon til motpartens perspektiv
#        op-t3 tilbakemelding og diskusjonsvillighet | op-n1 tildekking av egne behov og grenser
#        op-n2 unngåelse av uenighet | op-n3 avvisning av tilbakemelding og motperspektiv
# Alle tekster egne/original (copyrightControl) — forfattet fra construct'en i
# itemspec-themes.R2, aldri fra eksterne instrumenter.
ITEMS_NO_EN = [
    # --- op-t1: ytring av egne behov og grenser (10 pos) ---
    ("op-0001","op-t1",1,"Jeg sier tydelig fra når jeg mangler noe fra folk nær meg.","I say plainly when I need something from the people I love."),
    ("op-0002","op-t1",1,"Jeg forteller folk som står meg nær hvilke grenser jeg har.","I tell people who stand close to me what my boundaries are."),
    ("op-0003","op-t1",1,"Jeg tar opp mine egne behov før de vokser seg store.","I bring up my own needs before they grow large."),
    ("op-0004","op-t1",1,"Jeg lar folk se hva som faktisk betyr noe for meg.","I let people see what really matters to me."),
    ("op-0005","op-t1",1,"Jeg gir beskjed når noe i samværet vårt plager meg.","I speak up when something in our time together wears on me."),
    ("op-0006","op-t1",1,"Jeg finner ord for følelser jeg ellers ville holdt inne.","I find words for feelings I would otherwise keep inside."),
    ("op-0007","op-t1",1,"Jeg minner folk i livet mitt om hva jeg faktisk trenger av dem.","I remind the people in my life what I actually need from them."),
    ("op-0008","op-t1",1,"Jeg forteller når jeg foretrekker å tenke alene før jeg svarer.","I say when I prefer to think alone before I answer."),
    ("op-0009","op-t1",1,"Jeg gir folk beskjed når jeg trenger et rolig rom for meg selv.","I let people know when I need a quiet room to myself."),
    ("op-0010","op-t1",1,"Jeg ber om hjelp når jeg trenger den, selv om det er ubehagelig.","I ask for help when I need it, even when it feels awkward."),
    # --- op-t2: invitasjon til motpartens perspektiv (10 pos) ---
    ("op-0011","op-t2",1,"Jeg inviterer folk som står meg nær til å si hva de mener.","I invite the people close to me to say what they think."),
    ("op-0012","op-t2",1,"Jeg hører på andres syn før jeg bestemmer meg for noe viktig.","I hear other views out before I settle on something important."),
    ("op-0013","op-t2",1,"Jeg spør folk i livet mitt hvordan det ser ut fra deres side.","I ask people in my life how things look from their side."),
    ("op-0014","op-t2",1,"Jeg møter andres motforestillinger med ro i stedet for motstand.","I meet the reservations of others with calm instead of pushback."),
    ("op-0015","op-t2",1,"Jeg gir rom for at folk rundt meg har delvis rett.","I allow that the people around me are partly right."),
    ("op-0016","op-t2",1,"Jeg stiller oppfølgingsspørsmål når jeg vil forstå noen bedre.","I ask follow-up questions when I want to understand someone better."),
    ("op-0017","op-t2",1,"Jeg prøver motpartens vinkel på saken i hodet mitt etterpå.","I try the other viewpoint in my head afterwards."),
    ("op-0018","op-t2",1,"Jeg takker for motstridende synspunkter i stedet for å avfeie dem.","I thank people for opposing views instead of waving them off."),
    ("op-0019","op-t2",1,"Jeg ber åpent om andres innspill før jeg avslutter en plan.","I openly ask for input from others before I finish a plan."),
    ("op-0020","op-t2",1,"Jeg tar som utgangspunkt at folk mener det godt, selv når vi er uenige.","I assume people mean well, even when we differ."),
    # --- op-t3: tilbakemelding og diskusjonsvillighet (10 pos) ---
    ("op-0021","op-t3",1,"Jeg ber folk si hvordan jeg kommer ut av en diskusjon.","I ask people how I come across during a hard conversation."),
    ("op-0022","op-t3",1,"Jeg diskuterer løsninger åpent når vi befinner oss midt i et problem.","I argue for solutions openly when we sit in the middle of a problem."),
    ("op-0023","op-t3",1,"Jeg tar tilbakemeldinger i bruk mens de fortsatt er ferske.","I put feedback to use while it is still fresh."),
    ("op-0024","op-t3",1,"Jeg tåler å få rett når tilbakemeldingen viser mine feil.","I accept being corrected when the feedback shows my mistakes."),
    ("op-0025","op-t3",1,"Jeg svarer rolig når noen utfordrer måten jeg har tenkt på.","I stay composed when someone challenges the way I think."),
    ("op-0026","op-t3",1,"Jeg spør flere etter synspunkter før vi lander en viktig avgjørelse.","I seek several perspectives before we settle an important decision."),
    ("op-0027","op-t3",1,"Jeg vil heller ta en vanskelig samtale nå enn senere.","I would rather have a difficult conversation now than later."),
    ("op-0028","op-t3",1,"Jeg sier hva jeg tenker om ting selv når det kan skape motstand.","I voice what I think even when it may meet resistance."),
    ("op-0029","op-t3",1,"Jeg går opp i hvordan samtaler med folk nær meg utspiller seg.","I care about how conversations with people close to me unfold."),
    ("op-0030","op-t3",1,"Jeg ser tilbakemelding som en vei til folk jeg elsker, ikke som angrep.","I read feedback from people I love as connection, not as an attack."),
    # --- op-n1: tildekking av egne behov og grenser (10 neg) ---
    ("op-0031","op-n1",-1,"Jeg holder mine egne behov bak lås og slå i nær-relasjoner.","I keep my own needs under cover inside close relationships."),
    ("op-0032","op-n1",-1,"Jeg lar folk tro at alt er fint selv når jeg bøyer meg unna.","I let people think all is fine even when I bend under it."),
    ("op-0033","op-n1",-1,"Jeg holder meg strengt til planer fordi det føles tryggere.","I stick to rigid plans since moving from them feels risky."),
    ("op-0034","op-n1",-1,"Jeg lar folk gjette seg frem til hva jeg ønsker meg.","I let people guess at what I actually want."),
    ("op-0035","op-n1",-1,"Jeg snakker om praktiske ting i stedet for mine egne behov.","I talk about practical matters instead of my own needs."),
    ("op-0036","op-n1",-1,"Jeg smetter unna samtaler som ber om noe fra meg.","I slip away from conversations that ask something of me."),
    ("op-0037","op-n1",-1,"Jeg lar behovene mine bli stående usagt til de har vokst seg tunge.","I leave my needs unspoken until they have grown heavy."),
    ("op-0038","op-n1",-1,"Jeg sier at alt passer, selv når hverken tid eller form passer.","I say it all works, even when neither time nor setting works."),
    ("op-0039","op-n1",-1,"Jeg tar ubehaget i stedet for å be om noe annet.","I swallow the discomfort instead of asking for something else."),
    ("op-0040","op-n1",-1,"Jeg skjuler mine ønsker bak voksende praktiske grunner.","I hide my wishes behind a growing list of practical reasons."),
    # --- op-n2: unngåelse av uenighet (10 neg) ---
    ("op-0041","op-n2",-1,"Jeg holder min uenighet for meg selv for å redde stemningen.","I keep my different views to myself to save the mood."),
    ("op-0042","op-n2",-1,"Jeg nikker i møte med kritikk selv når jeg er uenig.","I nod along with criticism even when it seems off to me."),
    ("op-0043","op-n2",-1,"Jeg endrer holdning på sparket når motparten tar plass.","I change my stance on the spot when someone takes theirs."),
    ("op-0044","op-n2",-1,"Jeg bytter tema før uenigheten rekker å vokse.","I switch topics before a difference can grow."),
    ("op-0045","op-n2",-1,"Jeg sier ja raskere enn jeg egentlig vil når stemningen er spent.","I say yes faster than I really want when the room is pleasant."),
    ("op-0046","op-n2",-1,"Jeg lar andres siste ord stå når debatten spisser seg.","I let others have the last word when a debate heats up."),
    ("op-0047","op-n2",-1,"Jeg unngår å nevne ting jeg vet vi kommer til å stride om.","I avoid raising things I know we will only clash over."),
    ("op-0048","op-n2",-1,"Jeg later som jeg er enig for å få snakket ferdig.","I pretend to agree just to get the talk over with."),
    ("op-0049","op-n2",-1,"Jeg toner ned mine egne synspunkter når stemningen allerede er spent.","I quiet my own views when the room already feels strained."),
    ("op-0050","op-n2",-1,"Jeg sier ingenting, og min uenighet forsvinner i stillheten.","I say nothing, and my objection vanishes into the silence."),
    # --- op-n3: avvisning av tilbakemelding og motperspektiv (10 neg) ---
    ("op-0051","op-n3",-1,"Jeg gjør tilbakemeldinger om meg til ting om dem.","I turn feedback about me into points about them."),
    ("op-0052","op-n3",-1,"Jeg hører bare halve forklaringen før jeg slutter meg til en konklusjon.","I hear only half the explanation before I settle on a conclusion."),
    ("op-0053","op-n3",-1,"Jeg avviser forslag fra folk nær meg før jeg har veid dem.","I brush aside proposals from people close to me before weighing them."),
    ("op-0054","op-n3",-1,"Jeg finner feil i tilbakemeldingen før jeg tester om den stemmer.","I find faults in the feedback before testing whether it holds."),
    ("op-0055","op-n3",-1,"Jeg sier at folk misforstår meg når beskrivelsen gjør vondt.","I say people misunderstand me when the description hurts."),
    ("op-0056","op-n3",-1,"Jeg svarer på innspill om meg med motkritikk.","I answer input about me with criticism in return."),
    ("op-0057","op-n3",-1,"Jeg holder fast på mitt selv når alle rundt meg ser det annerledes.","I hold to my version even when those around me see another picture."),
    ("op-0058","op-n3",-1,"Jeg hører tilbakemeldinger som klandring av hvem jeg er.","I hear feedback as an accusation of who I am."),
    ("op-0059","op-n3",-1,"Jeg avfeier gode råd fra de nærmeste som innblanding.","I write off good advice from people closest to me as meddling."),
    ("op-0060","op-n3",-1,"Jeg lukker samtaler jeg burde tatt videre med folk som bryr seg.","I shut down conversations I should keep going with people who care."),
]

REDUNDANT = {
    "op-0001": ["op-0007"], "op-0007": ["op-0001"],
    "op-0013": ["op-0016"], "op-0016": ["op-0013"],
    "op-0031": ["op-0037"], "op-0037": ["op-0031"],
    "op-0035": ["op-0040"], "op-0040": ["op-0035"],
    "op-0041": ["op-0048"], "op-0048": ["op-0041"],
    "op-0042": ["op-0043"], "op-0043": ["op-0042"],
    "op-0046": ["op-0050"], "op-0050": ["op-0046"],
    "op-0053": ["op-0054"], "op-0054": ["op-0053"],
}
# themes.R2 har ingen exampleSeed i itemspec (kun R1 har) -> ingen seedNear-flagg.
SEED_NEAR = set()

# ------------------------------------------------------------------ forfattersjekker
FORBID_SUBSTR = [
    # formuleringssfaeren av kjente items fra kommersielle instrumenter
    "your boundaries are important", "i need space", "we welcome disagreement openly",
    "argue with my partner", "soften your approach", "keep to your plans",
    "shutting people out",
]
FORBID_TOKENS = ["harp", "harpiks", "harpest", "høne", "hone", "roserose",
                 "alltid", "aldri", "always", "never"]
def wc(t):
    return len(t.split())

def load_r1_texts():
    out = {}
    for lang in ("no", "en"):
        src = os.path.join(HERE, "def-rel-cl-60.{}.json".format(lang))
        with open(src, encoding="utf-8") as f:
            d = json.load(f)
        out[lang] = [it["text"].lower() for it in d["items"]]
    return out

def grams5(t):
    ws = [w for w in t.lower().replace(",", " ").replace(".", " ").replace(";", " ").split() if w]
    return [" ".join(ws[i:i+5]) for i in range(len(ws) - 4)]

def assert_authoring(r1):
    errs = []
    seen = {"no": set(), "en": set()}
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
            # kryss mot R1-korpuset: ingen felles 5-gram (formuleringssammenfall;
            # 4-gram er for strengt — naturlige domenefraser deler vokabular tvers dimensjoner)
            for g in grams5(t):
                for r1t in r1[lang]:
                    if g in r1t.lower().replace(",", " ").replace(".", " ").replace(";", " "):
                        errs.append("%s %s: 4-gram '%s' sammenfaller med R1-korpuset" % (lang, iid, g))
    if errs:
        raise RuntimeError("forfattersjekk feilet:\n" + "\n".join(errs))

# ------------------------------------------------------------------ options fra ipip50
def load_options(lang):
    src = os.path.join(SCHEMA_DIR, "def-ipip50-big5.{}.json".format(lang))
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
    with open(os.path.join(SCHEMA_DIR, "_rel_itemspec_spec.json"), encoding="utf-8") as f:
        spec = json.load(f)
    v = spec["dimensionDecision"]["value"]["openness"]
    return v["labelNo"] if lang == "no" else v["labelEn"]

def build_def(lang, opt):
    label = dimension_label(lang)
    desc = ("Ytring av egne behov og grenser, invitasjon til motpartens perspektiv, "
            "diskusjonsvillighet og åpenhet for tilbakemelding."
            if lang == "no" else
            "Expressing own needs and boundaries, inviting the other's perspective, "
            "willingness to discuss, openness to feedback.")
    items = []
    for (iid, theme, sign, no, en) in ITEMS_NO_EN:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": no if lang == "no" else en,
            "options": copy.deepcopy(opt),
            "scales": [{"id": "openness", "sign": sign}],
        })
    return {
        "schemaVersion": 1,
        "id": "rel-op-pool",
        "type": "test-definition",
        "family": "relations",
        "languages": [lang],
        "scoring": {"type": "trait", "traits": [{"id": "openness", "weight": 1}], "norms": "none"},
        "dimensions": [{"id": "openness", "label": label, "labelLanguage": lang, "description": desc}],
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
        row = {"id": iid, "dimension": "openness", "theme": theme, "sign": sign,
               "seedNear": iid in SEED_NEAR, "redundantWith": REDUNDANT.get(iid, [])}
        rows.append(row)
    return {
        "metaVersion": 1,
        "id": "rel-op-pool",
        "date": "2026-11-17",
        "boardLeaf": "#3825-blokken [3-VEIS] FASE 2 relasjonspool per dimensjon: R2 åpenhet (op) — 60 originale items (worker TR-17BAA4C6A5A0).",
        "spec": "tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (lisensverdikten) er kontrastgrunnlag: ingen kommersielt relasjonsinstrument er lisensiert eller gjengitt — alle 60 items per språk er egne/original forfattet fra itemspec-themes.R2-construct'en. Forbud per spec.copyrightControl: gjenkjennbare formuleringer fra Gottman-programmenes instrumenter, 5 Love Languages, ENRICH, Prepare/Enrich; ASRS/AQ/RAADS-R-formuleringer; instrumentnavn i innhold. Copyright-skann (selftest S11): 0 treff.",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen instrument-/diagnose-navn, ingen ekstremrisiko/vold (R3-regelen som prinsipp). NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema+sign per id; tekstene er IKKE direkte oversettelser (Soester-konvensjonen). Ekstra vakthund ut over R1-konvensjonen: programmert 4-gram-kryss mot hele R1-korpuset (0 sammenfall) + fragment-skann mot kjente instrumentformuleringer.",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "signPolicy": "30 positivt keyede (op-0001..op-0030, sign 1) + 30 negativt keyede (op-0031..op-0060, sign -1). Basis: itemspec.sessionFormDecision låser live +-+- per dimensjon (2 pos + 2 neg velges i FASE 4) — poolen må derfor inneholde begge retninger. Ulik nd-poolen (screening i én retning, NG-4) er dette profilkeying i to retninger, det er et dokumentert designvalg, ikke NG-4-avvik. R2-constructen speiler R1-båndene med negativ retning: op-n1 tildekking av behov/grenser, op-n2 unngåelse av uenighet, op-n3 avvisning av tilbakemelding/motperspektiv.",
        "themeCounts": theme_counts,
        "seedPolicy": "themes.R2 i itemspec har ingen exampleSeed (kun R1 har) — ingen seedNear-flagg i denne poolen; tom seed-liste er låst eksplisitt i selftest S10i. Oppstår en seed for R2 i en senere spec-revisjon, flagges items deretter.",
        "redundancyPolicy": "redundantWith markerer formuleringsnære par (symmetrisk, 8 par) slik at FASE 4-utvelgelsen velger maks ett item per par inn i live-deffen.",
        "holes": {
            "closes": "H-2-delen R2 (samlet faseverifikasjon 2026-11-17: rel-pool 0/240, brett #3825): R2 åpenhet 60/60 levert — H-2 er fortsatt åpen til R3/R4 er levert (R1 levert samme dag).",
        },
        "items": rows,
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle items forfattet fra construct-beskrivelsen i _rel_itemspec_spec.json themes.R2 — ingen ekstern skala, ingen formell oversettelse, ingen scraping.",
            "signCounts": {"pos": pos, "neg": neg},
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized = 100*(raw-min)/(max-min) over besvart sett; enkelt-skala-rad for openness; komposit = skalaens normalized (re-verifisert i selftest S7/S8 denne økten)",
                "scoring.js linje 118-120: sign=-1 -> c=-value, minP=-max, maxP=-min (re-verifisert i selftest S8b)",
                "render.js sessionSizeFor(likert) => alle 60 items shuffles (re-verifisert i selftest S14a)",
                "validateTestDef håndhever ikke reverseringskravet — poolens 30/30 keying er forfatter-levert, ikke motor-påtvinget (grep i tests/engine)",
                "symmetrisk +/- pool: all-3 og konstante svar gir normalized 50.0 (konstant-svar-invarians; span 240 ved 30 pos + 30 neg) — provet i selftest S8",
                "_rel_compat_model.mjs DIMENSIONS[1].id == 'openness' — openness er modellens mottaksside (selftest S14d/e)",
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
    r1 = load_r1_texts()
    assert_authoring(r1)
    for lang in ("no", "en"):
        opt, _src = load_options(lang)
        write_json(os.path.join(out_dir, "def-rel-op-60.{}.json".format(lang)), build_def(lang, opt))
    write_json(os.path.join(out_dir, "_rel_pool_r2_meta.json"), build_meta())
    print("gen_rel_pool_r2: skrev 3 filer til " + out_dir)

if __name__ == "__main__":
    out = None
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    main(out)
