# -*- coding: utf-8 -*-
"""FASE 2 relasjonspool R1 — nærhet (cl), 60 originale likert-items per språk.

Kontrakt: tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED) +
Soester-konvensjonen (én fil per språk, alle items inline, id-pattern cl-NNNN,
options byte-importert fra def-ipip50-big5.<lang>.json — 5-punkts NOYAKTIGHET-ankeret).

Sign-policy: cl-0001..0030 positivt keyede (sign 1), cl-0031..0060 negativt
(sign -1). Relasjonssporet er en bilatteral profilskala — poolen er utvalgskilden
for live-deffens +-+- mønster per dimensjon (2 pos + 2 neg velges i FASE 4),
i motsetning til nd-triage-poolen som er screening i én retning (NG-4).

Deterministisk: ingen RNG, ingen klokke. Re-kjoring er byte-identisk (selftest S13).
"""
import json, os, sys, copy

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_DIR = os.path.dirname(HERE)
REPO = os.path.dirname(SCHEMA_DIR)

# ------------------------------------------------------------------ items
# theme: cl-t1 nærhetsfølelse og tilknytning | cl-t2 omsorgssignaler
#        cl-t3 tillit og sårbarhet | cl-n1 avstand i samvær
#        cl-n2 omsorg vanskelig å gi og motta | cl-n3 tillit til mottagelse svikter
# Alle tekster egne/original (copyrightControl) — forfattet fra construct'en i
# itemspec-themes.R1, aldri fra eksterne instrumenter.
ITEMS_NO_EN = [
 ("cl-0001","cl-t1",1,"Jeg trives med å være nær folk jeg bryr meg om.","I enjoy being close to the people I care about."),
 ("cl-0002","cl-t1",1,"Jeg får ro av å tilbringe tid med mennesker jeg føler meg knyttet til.","I feel calmed by time spent with people I feel connected to."),
 ("cl-0003","cl-t1",1,"Jeg søker selskap når jeg vil føle meg mindre alene.","I seek company when I want to feel less alone."),
 ("cl-0004","cl-t1",1,"Jeg merker meg hvordan nærhet vokser i et vennskap over tid.","I notice how closeness grows slowly within a friendship."),
 ("cl-0005","cl-t1",1,"Jeg liker at vi kan sitte stille sammen uten at det blir ubehagelig.","I like that we can sit quietly together without discomfort."),
 ("cl-0006","cl-t1",1,"Jeg føler meg hjemme når jeg er sammen med folk jeg stoler på.","I feel at home when I am with people I trust."),
 ("cl-0007","cl-t1",1,"Jeg vil gjerne holde fast på de relasjonene som betyr noe for meg.","I want to hold on to the relationships that matter to me."),
 ("cl-0008","cl-t1",1,"Jeg finner det lett å slappe av i nærvær av en nær venn.","I find it easy to relax in the company of a close friend."),
 ("cl-0009","cl-t1",1,"Jeg setter pris på små øyeblikk av felles nærhet i hverdagen.","I value small everyday moments of shared closeness."),
 ("cl-0010","cl-t1",1,"Jeg opplever varme når noen viser at de bryr seg om meg.","I feel warmth when someone shows me that they care."),
 ("cl-0011","cl-t2",1,"Jeg forteller gjerne en nær venn hvordan dagen min har vært.","I happily tell a close friend how my day has been."),
 ("cl-0012","cl-t2",1,"Jeg viser omsorg i handling når folk i mitt liv har det vanskelig.","I show care through actions when people in my life struggle."),
 ("cl-0013","cl-t2",1,"Jeg sier fra når noen betyr mye for meg.","I say it out loud when someone means a lot to me."),
 ("cl-0014","cl-t2",1,"Jeg lytter med hele meg når en nær person deler noe viktig.","I listen with full attention when a close person shares something important."),
 ("cl-0015","cl-t2",1,"Jeg spør hvordan folk jeg er glad i faktisk har det.","I ask the people I love how they are really doing."),
 ("cl-0016","cl-t2",1,"Jeg gir klemmer eller en berørende gest når det passer seg.","I offer hugs or a gentle touch when it feels right."),
 ("cl-0017","cl-t2",1,"Jeg lar folk komme meg nært inn på livet.","I let people come close to my everyday life."),
 ("cl-0018","cl-t2",1,"Jeg støtter opp om vennene mine når de trenger det.","I stand by my friends when they need support."),
 ("cl-0019","cl-t2",1,"Jeg deler små detaljer fra livet mitt med folk jeg er glad i.","I share small details of my life with people I am fond of."),
 ("cl-0020","cl-t2",1,"Jeg tar initiativ til å treffe folk jeg har nær relasjon til.","I take the initiative to meet people I feel close to."),
 ("cl-0021","cl-t3",1,"Jeg tør å si tydelig fra når jeg savner noen.","I dare to say clearly when I miss someone."),
 ("cl-0022","cl-t3",1,"Jeg tror mine nærmeste tar imot meg slik jeg er.","I believe my closest people accept me as I am."),
 ("cl-0023","cl-t3",1,"Jeg deler bekymringer med en person jeg stoler på.","I share worries with a person I trust."),
 ("cl-0024","cl-t3",1,"Jeg kan vise tårer i nærvær av folk jeg føler meg trygg hos.","I can let tears show around people I feel safe with."),
 ("cl-0025","cl-t3",1,"Jeg går mot folk i stedet for bort når samtalen blir personlig.","I move toward people instead of away when talk becomes personal."),
 ("cl-0026","cl-t3",1,"Jeg forventer at varme jeg deler blir tatt godt imot.","I expect the warmth I give to be received well."),
 ("cl-0027","cl-t3",1,"Jeg tåler at nærhet kan skape sårbarhet i relasjoner.","I accept that closeness brings vulnerability into my relationships."),
 ("cl-0028","cl-t3",1,"Jeg lar nye bekjentskaper bli nærmere når det føles trygt.","I let new acquaintances come nearer when it feels safe."),
 ("cl-0029","cl-t3",1,"Jeg har folk rundt meg som jeg føler meg helt meg selv hos.","I have people around me with whom I am entirely myself."),
 ("cl-0030","cl-t3",1,"Jeg oppsøker bevisst kontakt når jeg trenger følelsesmessig støtte.","I reach out deliberately when I need emotional support."),
 ("cl-0031","cl-n1",-1,"Jeg holder en armlengdes avstand selv til folk jeg er glad i.","I keep at arm's length even the people I am fond of."),
 ("cl-0032","cl-n1",-1,"Jeg føler meg ofte alene selv når jeg er sammen med andre.","I often feel alone even when I am with other people."),
 ("cl-0033","cl-n1",-1,"Jeg trenger pause fra nærhet når samværet har vart lenge.","I need a pause from closeness after long stretches of time together."),
 ("cl-0034","cl-n1",-1,"Jeg trekker meg unna når relasjoner blir mer intime enn jeg liker.","I pull away when relationships become more intimate than I like."),
 ("cl-0035","cl-n1",-1,"Jeg holder folk på litt avstand for at det skal være trygt.","I keep people at some distance because it feels safer."),
 ("cl-0036","cl-n1",-1,"Jeg finner felles samvær anstrengende når det varer for lenge.","I find being together with others draining when it lasts long."),
 ("cl-0037","cl-n1",-1,"Jeg trives best når jeg er alene uten folk rundt meg.","I prefer being by myself with no one around."),
 ("cl-0038","cl-n1",-1,"Jeg sørger for at folk ikke kommer meg altfor nært.","I make sure people do not come too close to me."),
 ("cl-0039","cl-n1",-1,"Jeg planlegger gjerne dager helt uten sosialt samvær.","I gladly plan whole days without any social contact."),
 ("cl-0040","cl-n1",-1,"Jeg tar avstand når noen vil komme meg tett på.","I step back when someone wants to get close to me."),
 ("cl-0041","cl-n2",-1,"Jeg opplever det som vanskelig å ta imot omsorg fra andre.","I find it difficult to accept care from other people."),
 ("cl-0042","cl-n2",-1,"Jeg kjøler ned samtaler når de blir for omsorgsfulle.","I cool conversations down when they become too caring."),
 ("cl-0043","cl-n2",-1,"Jeg unngår å fortelle folk nær meg hvordan jeg egentlig har det.","I avoid telling those close to me how I truly feel."),
 ("cl-0044","cl-n2",-1,"Jeg endrer tema når folk spør hvordan jeg har det på innsiden.","I change the subject when people ask how I am inside."),
 ("cl-0045","cl-n2",-1,"Jeg mottar klemmer stivt uten egentlig å være til stede.","I receive hugs stiffly without really being present in them."),
 ("cl-0046","cl-n2",-1,"Jeg holder en avvisende tone når folk nær meg vil uttrykke varme.","I keep a guarded tone when people near me show warmth."),
 ("cl-0047","cl-n2",-1,"Jeg svarer kort når noen forsøker å komme meg tett på.","I give short answers when someone tries to come close."),
 ("cl-0048","cl-n2",-1,"Jeg opplever omsorgssignaler mer som press enn som varme.","I experience displays of care more as pressure than warmth."),
 ("cl-0049","cl-n2",-1,"Jeg svarer på varme fra venner med kaldere engasjement.","I answer warmth from friends with cooler engagement."),
 ("cl-0050","cl-n2",-1,"Jeg avrunder gjerne samtaler før de blir for personlige.","I round off conversations before they become too personal."),
 ("cl-0051","cl-n3",-1,"Jeg forventer avvisning når jeg viser folk at jeg bryr meg.","I expect rejection when I show people that I care."),
 ("cl-0052","cl-n3",-1,"Jeg angrer etterpå når jeg har delt noe personlig.","I regret it afterwards when I have shared something personal."),
 ("cl-0053","cl-n3",-1,"Jeg klarer ikke la folk se meg når jeg sliter.","I cannot let people see me when I am struggling."),
 ("cl-0054","cl-n3",-1,"Jeg venter på bevis før jeg lar noen se meg sårbar.","I wait for proof before I let anyone see me vulnerable."),
 ("cl-0055","cl-n3",-1,"Jeg beskytter meg selv ved å holde avstand til følelsesnære samtaler.","I defend myself by keeping away from emotionally close conversations."),
 ("cl-0056","cl-n3",-1,"Jeg skjuler det jeg føler for å slippe å forklare meg.","I hide what I feel to avoid having to explain myself."),
 ("cl-0057","cl-n3",-1,"Jeg blir ubehagelig berørt når folk viser meg tydelig omsorg.","I feel uncomfortable when people show me obvious care."),
 ("cl-0058","cl-n3",-1,"Jeg holder tilbake tillit selv med folk jeg har kjent lenge.","I hold back trust even with people I have known long."),
 ("cl-0059","cl-n3",-1,"Jeg avfeier mine egne behov for nærhet som uvesentlige.","I dismiss my own needs for closeness as unimportant."),
 ("cl-0060","cl-n3",-1,"Jeg holder meg til det overflatiske når folk vil bli bedre kjent med meg.","I keep to small talk when people want to know me better."),
]

REDUNDANT = {
    "cl-0011": ["cl-0019"], "cl-0019": ["cl-0011"],
    "cl-0016": ["cl-0045"], "cl-0045": ["cl-0016"],
    "cl-0031": ["cl-0038"], "cl-0038": ["cl-0031"],
    "cl-0042": ["cl-0046"], "cl-0046": ["cl-0042"],
    "cl-0043": ["cl-0056"], "cl-0056": ["cl-0043"],
    "cl-0053": ["cl-0054"], "cl-0054": ["cl-0053"],
}
SEED_NEAR = {"cl-0011", "cl-0043"}

# ------------------------------------------------------------------ forfattersjekker
def wc(t):
    return len(t.split())

def assert_authoring():
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
            for bad in ("alltid", "aldri", "always", "never"):
                if bad in low:
                    errs.append("%s %s: absolutt '%s'" % (lang, iid, bad))
            if t in seen[lang]:
                errs.append("%s %s: duplikat tekst" % (lang, iid))
            seen[lang].add(t)
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
    v = spec["dimensionDecision"]["value"]["closeness"]
    return v["labelNo"] if lang == "no" else v["labelEn"]

def build_def(lang, opt):
    label = dimension_label(lang)
    desc = ("Opplevd nærhet, omsorg og tillit til at nærhet blir mottatt i vennskap og samliv."
            if lang == "no" else
            "Experienced closeness, care and trust that closeness is received, in friendships and partnerships.")
    items = []
    for (iid, theme, sign, no, en) in ITEMS_NO_EN:
        items.append({
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": no if lang == "no" else en,
            "options": copy.deepcopy(opt),
            "scales": [{"id": "closeness", "sign": sign}],
        })
    return {
        "schemaVersion": 1,
        "id": "rel-cl-pool",
        "type": "test-definition",
        "family": "relations",
        "languages": [lang],
        "scoring": {"type": "trait", "traits": [{"id": "closeness", "weight": 1}], "norms": "none"},
        "dimensions": [{"id": "closeness", "label": label, "labelLanguage": lang, "description": desc}],
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
        row = {"id": iid, "dimension": "closeness", "theme": theme, "sign": sign,
               "seedNear": iid in SEED_NEAR, "redundantWith": REDUNDANT.get(iid, [])}
        rows.append(row)
    return {
        "metaVersion": 1,
        "id": "rel-cl-pool",
        "date": "2026-11-17",
        "boardLeaf": "#3825-blokken [3-VEIS] FASE 2 relasjonspool per dimensjon: R1 nærhet (cl) — 60 originale items (worker TR-9D6F8798C5A9).",
        "spec": "tests/schema/_rel_itemspec_spec.json (rel-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": "DOC-C8C02AD272 (lisensverdikten) er kontrastgrunnlag: ingen kommersielt relasjonsinstrument er lisensiert eller gjengitt — alle 60 items per språk er egne/original forfattet fra itemspec-themes.R1-construct'en. Forbud per spec.copyrightControl: gjenkjennbare formuleringer fra Gottman-programmenes instrumenter, 5 Love Languages, ENRICH, Prepare/Enrich; ASRS/AQ/RAADS-R-formuleringer; instrumentnavn i innhold. Copyright-skann (selftest S11): 0 treff.",
        "authoringRule": "Første-person presens, ett utsagn, 8–14 ord, ingen dobbeltspørsmål, ingen absolutter (alltid/aldri/always/never), ingen instrument-/diagnose-navn, ingen ekstremrisiko/vold (R3-regelen som prinsipp). NO og EN separat forfattet med konstrukt-ekvivalens: samme id-rekkefølge, samme tema+sign per id; tekstene er IKKE direkte oversettelser (Soester-konvensjonen).",
        "optionsSource": "def-ipip50-big5.<lang>.json items[*].options — byte-identisk per fil (verifisert i selftest S5).",
        "signPolicy": "%d positivt keyede (cl-0001..cl-0030, sign 1) + %d negativt keyede (cl-0031..cl-0060, sign -1). Basis: itemspec.sessionFormDecision låser live +-+- per dimensjon (2 pos + 2 neg velges i FASE 4) — poolen må derfor inneholde begge retninger. Ulik nd-poolen (screening i én retning, NG-4) er dette profilkeying i to retninger, det er et dokumentert designvalg, ikke NG-4-avvik." % (pos, neg),
        "themeCounts": theme_counts,
        "seedPolicy": "seedNear=true markerer items i formuleringssfæren av itemspec-themes.R1.exampleSeed («fortelle en nær person hvordan jeg har det») — både positive ekko (cl-0011) og formuleringens negasjons-side (cl-0043). FASE 4-utvelgelsen bruker flagget for å unngå rene gjentakelser/mirrored-par i live 16-item-settet. Ikke et lisensflagg (seed-en er egen).",
        "redundancyPolicy": "redundantWith markerer formuleringsnære par (symmetrisk) slik at FASE 4-utvelgelsen velger maks ett item per par inn i live-deffen.",
        "holes": {
            "closes": "H-2-delen R1 (samlet faseverifikasjon 2026-11-17: rel-pool 0/240, brett #3825): R1 nærhet 60/60 levert — H-2 er fortsatt åpen til R2/R3/R4 er levert.",
        },
        "items": rows,
        "provenance": {
            "authoringDate": "2026-11-17",
            "originality": "Alle items forfattet fra construct-beskrivelsen i _rel_itemspec_spec.json themes.R1 — ingen ekstern skala, ingen formell oversettelse, ingen scraping.",
            "signCounts": {"pos": pos, "neg": neg},
            "engineFactsVerified": [
                "scoring.js trait-sti: normalized = 100*(raw-min)/(max-min) over besvart sett; enkelt-skala-rad for closeness; komposit = skalaens normalized (lest i økten)",
                "render.js sessionSizeFor(likert) => alle 60 items shuffles (lest i økten)",
                "validateTestDef håndhever ikke reverseringskravet — poolens 30/30 keying er forfatter-levert, ikke motor-påtvinget (grep i tests/engine)",
                "symmetrisk +/- pool: all-5 og all-1 gir normalized 50.0 (konstant-svar-invarians) — håndregnet og provet i selftest S8",
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
        write_json(os.path.join(out_dir, "def-rel-cl-60.{}.json".format(lang)), build_def(lang, opt))
    write_json(os.path.join(out_dir, "_rel_pool_r1_meta.json"), build_meta())
    print("gen_rel_pool_r1: skrev 3 filer til " + out_dir)

if __name__ == "__main__":
    out = None
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    main(out)
