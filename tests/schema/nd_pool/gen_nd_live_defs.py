# -*- coding: utf-8 -*-
"""
Brainarea nd_pool-generator — [BYGG] FASE 2, todo #3843 (ND live-defs).
Deterministisk (ingen RNG): skriver def-nd-triage.{no,en}.json, def-nd-adhd.{no,en}.json,
def-nd-autisme.{no,en}.json + _nd_live_defs_meta.json.

Utvelgelsesregler (dokumentert i _nd_live_defs_meta.json, verifisert i selftest):
- def-nd-triage: 3 adhd-items = asrsNear-flaggede, lavest id per anker-familie (t2-fidget
  -> ta-0010; t3-anker1 -> ta-0016; t3-anker3(utsettelse) -> ta-0015). 3 autisme-items =
  temaspredning t1/t2/t3, lavest id per tema (ts-0001, ts-0008, ts-0015; ingen ts har
  asrsNear i poolen).
- def-nd-adhd / def-nd-autisme: 24 items stratifisert ca 10/8/6 over fasett-poolene
  (da1/da2/da3 og ds1/ds2/ds3) via deterministisk round-robin per temabaand, lavest id
  per baand, runde-rekkefoelge over baand i pool-orden.

Kontrakt: tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED) + DOC-C8C02AD272.
Options er byte-importert fra def-ipip50-big5.<lang>.json (5-punkts NOYAKTIGHET-ankeret).
Alle likert-items er positivt keyede (screenings-retning; NG-4-avviket dokumentert i spec).
Itemtekster er byte-importert fra pool-defene — ingen ny forfattering i dette steget.
ASRS-blokken (ankerblokken) er reservert design-plass men holdes UTENFOR live-settet i v1
(triageSessionDecision.asrsPlaceholder); traits-entry 'asrs-anchor' kommer ved #3760.
"""
import json, os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_DIR = os.path.dirname(HERE)  # tests/schema
LANGS = ("no", "en")

TRIAGE_IDS = ["ta-0010", "ta-0015", "ta-0016", "ts-0001", "ts-0008", "ts-0015"]
DEEP_POOL_FILES = {
    "da1": "def-nd-adhd-dyp-pool-da1", "da2": "def-nd-adhd-dyp-pool-da2", "da3": "def-nd-adhd-dyp-pool-da3",
    "ds1": "def-nd-autisme-dyp-pool-ds1", "ds2": "def-nd-autisme-dyp-pool-ds2", "ds3": "def-nd-autisme-dyp-pool-ds3",
}
DEEP_TARGETS = {"da1": 10, "da2": 8, "da3": 6, "ds1": 10, "ds2": 8, "ds3": 6}


def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load_options(lang):
    ipip = load_json(os.path.join(SCHEMA_DIR, "def-ipip50-big5.%s.json" % lang))
    return ipip["items"][0]["options"]


def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def round_roban_pick(items, n):
    """Round-robin over temabaand (pool-orden av baand), lavest id per baand, ingen repeats."""
    bands = []
    seen = set()
    for it in items:  # items er i pool-orden -> baand-orden = foerste-forekomst-orden
        if it["theme"] not in seen:
            seen.add(it["theme"])
            bands.append(it["theme"])
    picked, rr = [], 0
    while len(picked) < n:
        for b in bands:
            if len(picked) >= n:
                break
            cand = [x for x in items if x["theme"] == b and x["id"] not in [p["id"] for p in picked]]
            if cand:
                picked.append(cand[0])  # lavest id: pool-orden + ingen sorting-avhengighet
        rr += 1
        if rr > 50:
            raise RuntimeError("round-robin gaikk: %d/%d" % (len(picked), n))
    return picked


def main(out_dir=None):
    out_dir = out_dir or HERE
    os.makedirs(out_dir, exist_ok=True)

    # ---- kilder ----
    triage_pool = {lang: load_json(os.path.join(HERE, "def-nd-triage-pool.%s.json" % lang)) for lang in LANGS}
    triage_meta = load_json(os.path.join(HERE, "_nd_triage_pool_meta.json"))
    deep = {}
    for key, base in DEEP_POOL_FILES.items():
        deep[key] = {lang: load_json(os.path.join(HERE, base + ".%s.json" % lang)) for lang in LANGS}
        deep[key + "_meta"] = load_json(os.path.join(HERE, "_nd_" + ("adhd" if key.startswith("da") else "autisme") + "_dyp_meta_" + key + ".json"))

    text_of = {}   # (lang, item_id) -> item (options+text+scales-kandidat)
    dim_of = {}    # (kind, lang, face_id) -> dimensions-rad (byte fra pool)
    for lang in LANGS:
        for it in triage_pool[lang]["items"]:
            text_of[(lang, it["id"])] = it
        for key in DEEP_POOL_FILES:
            for it in deep[key][lang]["items"]:
                text_of[(lang, it["id"])] = it
        for fid, pool in (("nd-adhd", ["da1", "da2", "da3"]), ("nd-autism", ["ds1", "ds2", "ds3"])):
            for key in pool:
                dim_of[("deep", lang, key)] = deep[key][lang]["dimensions"][0]
    for lang in LANGS:
        for d in triage_pool[lang]["dimensions"]:
            dim_of[("triage", lang, d["id"])] = d

    ipip_opts = {lang: load_options(lang) for lang in LANGS}

    meta_items = triage_meta["items"]
    near_ids = [r["id"] for r in meta_items if r.get("asrsNear")]

    # ---- utvelgelsesberegning (selvdokumenterende) ----
    # triage adhd: asrsNear-flaggede, lavest id per ANKER-familie (ikke pool-tema:
    # alle fire t3-flaggede deler tema adhd-t3, men ASRS-ankeren spriker per nearNote:
    # ta-0016/17 = anker-1-familien (ufullførte oppgaver), ta-0010 = sitte-uro-ankeret,
    # ta-0015/20 = anker-3-familien (huske forpliktelser).
    ANCHOR_FAMILY = {
        "ta-0010": "asrs-uro",
        "ta-0016": "asrs-oppgaver",
        "ta-0017": "asrs-oppgaver",
        "ta-0015": "asrs-husk",
        "ta-0020": "asrs-husk",
    }
    near_rows = [r for r in meta_items if r.get("asrsNear")]
    assert all(r["id"] in ANCHOR_FAMILY for r in near_rows), "asrsNear-rows uten anker-familie"
    families, fam_order = {}, []
    for r in near_rows:
        fam = ANCHOR_FAMILY[r["id"]]
        if fam not in families:
            families[fam] = r["id"]
            fam_order.append(fam)
        elif r["id"] < families[fam]:
            families[fam] = r["id"]
    chosen_adhd = sorted(families.values())
    ts_rows = [r for r in meta_items if r["axis"] == "autism"]
    ts_bands = []
    seen = set()
    for r in ts_rows:
        t = r["theme"]
        if t not in seen:
            seen.add(t)
            ts_bands.append(t)
    chosen_autism = [next(r["id"] for r in ts_rows if r["theme"] == b) for b in ts_bands]
    TRIAGE_IDS_IMPLIED = chosen_adhd + chosen_autism

    deep_meta_rows_by_key = {
        key: (deep[key + "_meta"] if (key + "_meta") in deep else deep[key + "_meta"])
        for key in DEEP_POOL_FILES
    }
    deep_pick = {}
    for key in DEEP_POOL_FILES:
        mrows = deep[key + "_meta"]["items"]
        picked_rows = round_roban_pick(mrows, DEEP_TARGETS[key])
        pool_ids = [it["id"] for it in deep[key]["no"]["items"]]
        assert all(r["id"] in pool_ids for r in picked_rows), key + ": meta/def-id-mismatch"
        deep_pick[key] = [r["id"] for r in picked_rows]

    def make_item(lang, iid, scale_id):
        src = text_of[(lang, iid)]
        return {
            "id": iid,
            "kind": "likert",
            "lang": lang,
            "text": src["text"],
            "options": ipip_opts[lang],
            "scales": [{"id": scale_id, "sign": 1}],
        }

    def build(lang):
        defs = {}
        # --- triage ---
        tri_items = [make_item(lang, iid, "adhd" if iid.startswith("ta-") else "autism") for iid in TRIAGE_IDS_IMPLIED]
        defs["nd-triage"] = {
            "schemaVersion": 1, "id": "nd-triage", "type": "test-definition", "family": "pool",
            "languages": [lang],
            "scoring": {"type": "trait", "traits": [{"id": "adhd", "weight": 1}, {"id": "autism", "weight": 1}], "norms": "none"},
            "dimensions": [dict(dim_of[("triage", lang, "adhd")]), dict(dim_of[("triage", lang, "autism")])],
            "items": tri_items,
        }
        # --- dyp: adhd (da1/da2/da3), autisme (ds1/ds2/ds3) ---
        for def_id, keys in (("nd-adhd", ["da1", "da2", "da3"]), ("nd-autism", ["ds1", "ds2", "ds3"])):
            items, dims = [], []
            for key in keys:
                scale_id = key
                picked = deep_pick[key]
                for iid in picked:
                    items.append(make_item(lang, iid, scale_id))
                dims.append(dict(dim_of[("deep", lang, key)]))
            defs[def_id] = {
                "schemaVersion": 1, "id": def_id, "type": "test-definition", "family": "pool",
                "languages": [lang],
                "scoring": {"type": "trait", "traits": [{"id": k, "weight": 1} for k in keys], "norms": "none"},
                "dimensions": dims,
                "items": items,
            }
        return defs

    all_defs = {}
    for lang in LANGS:
        all_defs[lang] = build(lang)

    # ---- meta ----
    def deep_meta_rows():
        rows = {}
        for key in DEEP_POOL_FILES:
            rows[key] = {"target": DEEP_TARGETS[key], "picked": deep_pick[key],
                         "themeCounts": {}}
            bands = {}
            for iid in deep_pick[key]:
                t = next(it["theme"] for it in deep[key + "_meta"]["items"] if it["id"] == iid)
                bands[t] = bands.get(t, 0) + 1
            rows[key]["themeCounts"] = bands
            rows[key]["asrsNearPicked"] = sorted(iid for iid in deep_pick[key] if iid in near_ids)
        return rows

    meta = {
        "metaVersion": 1,
        "id": "nd-live-defs",
        "date": "2026-11-17",
        "boardLeaf": "#3839 [BYGG] FASE 2: Triagedef (vare triage-spørsmål) + dyp-defer (ADHD 24, autisme 24) fra poolene.",
        "spec": "tests/schema/_nd_itemspec_spec.json (nd-itemspec-v1, PROPOSED; GJELDENDE ved #3813)",
        "licenseBasis": (
            "DOC-C8C02AD272 (ENDLIG VERDIKT, todo #3732): ASRS-blokken (verbatim, shaded patient-"
            "versjon) er IKKE med her — kun design-reservert (triageSessionDecision.asrsPlaceholder, "
            "traits-entry 'asrs-anchor' ved #3760 + skriftlig NYU-bekreftelse NG-2). AQ/RAADS-R "
            "gjengis aldri. Alle items er byte-importert fra egne FASE 2-pooler (100% originale)."
        ),
        "selectionRules": {
            "nd-triage": {
                "adhd": "asrsNear-flaggede pool-items, lavest id per ANKER-familie fra nearNote "
                        "(ikke pool-tema — tema adhd-t3 spriker i anker): asrs-uro (ta-0010), "
                        "asrs-oppgaver (ta-0016; ta-0017 samme familie), asrs-husk (ta-0015; "
                        "ta-0020 samme familie). Se ANCHOR_FAMILY i generatoren.",
                "autism": "ingen ts-items har asrsNear -> temaspredning over t1/t2/t3 med lavest id per tema: "
                          "ts-0001, ts-0008, ts-0015.",
                "asrsNearPoolIds": near_ids,
            },
            "nd-adhd/nd-autism": "24 items stratifisert 10/8/6 over fasett-poolene (da1/da2/da3 og ds1/ds2/ds3) "
                                 "via round-robin per temabaand i pool-orden, lavest id per baand — deterministisk.",
        },
        "asrsReserved": (
            "Design-plass for ASRS v1.1 6Q (shaded patient-versjon, verbatim, egen traits-entry "
            "'asrs-anchor'): IKKE live i v1-def-ene (schema additionalProperties:false + NG-2). "
            "Utvidelse 6 -> 12 items uten strukturendring per triageSessionDecision.totalLiveItems."
        ),
        "items": {"nd-triage": {"idOrder": TRIAGE_IDS_IMPLIED, "asrsNearChosen": chosen_adhd, "families": fam_order},
                  "deep": deep_meta_rows()},
        "construktEquiv": "NO/EN: samme id-rekkefolge, samme skalering, samme sign — tekster byte fra pooler.",
        "generator": "gen_nd_live_defs.py (deterministisk, ingen RNG; re-kjoring byte-identisk).",
    }

    for lang in LANGS:
        for def_id, d in all_defs[lang].items():
            fn = {"nd-triage": "def-nd-triage", "nd-adhd": "def-nd-adhd", "nd-autism": "def-nd-autisme"}[def_id]
            write_json(os.path.join(out_dir, "%s.%s.json" % (fn, lang)), d)
    write_json(os.path.join(out_dir, "_nd_live_defs_meta.json"), meta)
    print("OK: 6 def-filer + meta skrevet til", out_dir)
    print("   triage:", TRIAGE_IDS_IMPLIED, "| asrsNear-pool:", near_ids)
    for key in DEEP_POOL_FILES:
        print("   %s: %s" % (key, ",".join(deep_pick[key])))


if __name__ == "__main__":
    out = None
    if len(sys.argv) > 2 and sys.argv[1] == "--out":
        out = sys.argv[2]
    main(out)
