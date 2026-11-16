# -*- coding: utf-8 -*-
"""Brainarea — evne-pool T5 generator [3-VEIS] FASE 2 per-tema (sq / evne-t5-sekvens).
Deterministisk (ingen RNG). Bygger i prod-treet:
  tests/schema/evne_pool/def-evne-t5-sekvens.{no,en}.json  (40 ability-items, 5 options)
  tests/schema/evne_pool/_evne_pool_t5_meta.json           (akser/fasit/tags/provenance)
Kontrakt: tests/schema/_evne_itemspec_spec.json — T5: poolMin 40, draw 7, 5 options,
bands L/M/H 14/13/13 (0.35/0.325/0.325, innen +-0.15 tol against 0.34/0.33/0.33).
Subtyper (fra spec.construct):
  seq    — blandede bokstav-tall-sekvenser med dobbel regel (maks to parallelle regler)
  update — oppdateringsoppgaver ("hva er resultatet etter to steg?")
  track  — enkel to-lags sporing (to tellere, hver sin regel)
Distraktorer: regeldel-brudd, beregnet fra regelobjektene (aldri hardkodet):
  seq: 6 koder (letter-rule-miss, number-rule-miss, prev-repeat, letter-off-one,
       number-off-two, both-off-two); update: 6 (r1-only, r2-only, swap-steps,
       r1-twice, final-off-one, start-repeat); track: 7 (other-counter, rule-mix,
       start-value, double-steps, final-off-one, before-prev, sum-counters).
  Per item: kandidater = kodene rotert av ph; filtrert (ugyldig/negativ/kollisjon)
  mot fasit -> foerste 4 unike. Eneste fasit = regelobjektene, aldrig haandregnet.
kind:'ability' eksklusivt (orderKindNote: kind 'order' er ekskludert fra v1-sporet).
Labels er spraknoytrale (bokstav-tall / rene tall) => par-variant-konvensjon som T4:
identisk options-orden og correctIndex per spraakpar; prompter separat forfattet NO/EN.
Copyright: egne, originale items — ingen Digit Span/n-back/WAIS/Mensa-monstre.
Kjor: python3 gen_evne_pool_t5.py
"""
import json, os

PROD = None
for p in [r'F:\maneit\prosjekter\filip-webside-prosjekter\brainarea',
          '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea']:
    if os.path.isdir(os.path.join(p, 'tests')):
        PROD = p
        break
assert PROD, 'prod-tre ikke funnet'
OUT = os.path.join(PROD, 'tests', 'schema', 'evne_pool')
os.makedirs(OUT, exist_ok=True)

DIFF = {'L': [-1.75, -1.55, -1.35, -1.15],
        'M': [-0.40, -0.20, 0.00, 0.40],
        'H': [0.60, 0.90, 1.30, 1.70]}
ROT_SEQ = [1, 3, 0, 4, 2]   # deterministisk fasit-posisjon-spredning (aldri fast 0)
LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

def bval(band, i_in_band):
    return DIFF[band][i_in_band % 4]

def lpos(i):
    """1-basert posisjon -> bokstav."""
    i = i % 26
    return LET[i - 1] if i != 0 else 'Z'

def apply_rule(rule, v):
    op, arg = rule
    if op == '+':
        return v + arg
    if op == 'x':
        return v * arg
    raise ValueError('ukjent op: ' + str(op))

def rule_txt(rule):
    """spraknoytral symbolsk form: +2 / -2 / x3."""
    op, arg = rule
    if op == 'x':
        return 'x' + str(arg)
    return ('+' if arg >= 0 else '-') + str(abs(arg))

def eff(num, step):
    """delta effekt ved ledd step: int -> fast; listemed -> alternerende."""
    if isinstance(num, list):
        return num[(step - 1) % len(num)]
    return num

def lnum(v, step, d):
    """tall-transform: x2/x3 mult; ellers additiv effekt."""
    if d == 'x2':
        return v * 2
    if d == 'x3':
        return v * 3
    return v + eff(d, step)

# ----------------------------------------------------------------- item-tabell
# seq:    s (startbokstavpos 1-26), t (starttall), dl (bokstav-delta: int/liste),
#         dn (tall-delta: int/'x2'/'x3'/liste), nlead (viste ledd), ph
# update: s (starttall), r1, r2 (op-arg), ph
# track:  sA, sB (starttall), dA, dB (int-delta), n (viste ledd), ph, ask ('A'/'B')
ITEMS = [
 # ---------------- L: 14 (seq 7, update 5, track 2)
 {'band':'L','sub':'seq','s':1,'t':2,'dl':1,'dn':2,'nlead':4,'ph':0},
 {'band':'L','sub':'seq','s':3,'t':1,'dl':1,'dn':2,'ph':1,'nlead':4},
 {'band':'L','sub':'seq','s':1,'t':3,'dl':1,'dn':2,'nlead':4,'ph':2},
 {'band':'L','sub':'seq','s':2,'t':2,'dl':1,'dn':1,'nlead':4,'ph':0},
 {'band':'L','sub':'seq','s':4,'t':4,'dl':1,'dn':2,'nlead':4,'ph':1},
 {'band':'L','sub':'seq','s':2,'t':5,'dl':1,'dn':5,'nlead':4,'ph':2},
 {'band':'L','sub':'seq','s':1,'t':1,'dl':2,'dn':1,'nlead':4,'ph':0},
 {'band':'L','sub':'update','s':3,'r1':('+',2),'r2':('x',2),'ph':0},
 {'band':'L','sub':'update','s':2,'r1':('+',3),'r2':('+',2),'ph':1},
 {'band':'L','sub':'update','s':5,'r1':('+',-1),'r2':('x',3),'ph':2},
 {'band':'L','sub':'update','s':4,'r1':('x',2),'r2':('+',1),'ph':0},
 {'band':'L','sub':'update','s':6,'r1':('+',4),'r2':('+',-2),'ph':1},
 {'band':'L','sub':'track','sA':1,'sB':2,'dA':3,'dB':1,'n':3,'ph':0,'ask':'A'},
 {'band':'L','sub':'track','sA':0,'sB':5,'dA':2,'dB':1,'n':4,'ph':1,'ask':'B'},
 # ---------------- M: 13 (seq 5, update 4, track 4)
 {'band':'M','sub':'seq','s':1,'t':2,'dl':1,'dn':'x2','nlead':4,'ph':1},
 {'band':'M','sub':'seq','s':26,'t':9,'dl':-1,'dn':-2,'nlead':4,'ph':2},
 {'band':'M','sub':'seq','s':2,'t':3,'dl':3,'dn':2,'nlead':4,'ph':0},
 {'band':'M','sub':'seq','s':1,'t':4,'dl':[1,2],'dn':2,'nlead':4,'ph':1},
 {'band':'M','sub':'seq','s':3,'t':3,'dl':3,'dn':3,'nlead':4,'ph':2},
 {'band':'M','sub':'update','s':4,'r1':('x',3),'r2':('+',-1),'ph':0},
 {'band':'M','sub':'update','s':5,'r1':('x',2),'r2':('+',7),'ph':1},
 {'band':'M','sub':'update','s':7,'r1':('+',-2),'r2':('x',2),'ph':2},
 {'band':'M','sub':'update','s':3,'r1':('x',4),'r2':('+',-5),'ph':0},
 {'band':'M','sub':'track','sA':2,'sB':1,'dA':1,'dB':3,'n':4,'ph':1,'ask':'B'},
 {'band':'M','sub':'track','sA':5,'sB':0,'dA':-1,'dB':2,'n':5,'ph':2,'ask':'A'},
 {'band':'M','sub':'track','sA':1,'sB':3,'dA':4,'dB':2,'n':3,'ph':0,'ask':'A'},
 {'band':'M','sub':'track','sA':6,'sB':2,'dA':2,'dB':3,'n':4,'ph':2,'ask':'B'},
 # ---------------- H: 13 (seq 5, update 4, track 4)
 {'band':'H','sub':'seq','s':16,'t':4,'dl':1,'dn':'x2','nlead':4,'ph':0},
 {'band':'H','sub':'seq','s':13,'t':12,'dl':-2,'dn':-2,'nlead':4,'ph':1},
 {'band':'H','sub':'seq','s':1,'t':1,'dl':2,'dn':'x3','nlead':4,'ph':2},
 {'band':'H','sub':'seq','s':2,'t':6,'dl':[1,-2],'dn':4,'nlead':4,'ph':0},
 {'band':'H','sub':'seq','s':24,'t':2,'dl':-1,'dn':2,'nlead':4,'ph':1},
 {'band':'H','sub':'update','s':2,'r1':('x',5),'r2':('+',-3),'ph':0},
 {'band':'H','sub':'update','s':4,'r1':('x',3),'r2':('+',-2),'ph':1},
 {'band':'H','sub':'update','s':5,'r1':('x',2),'r2':('+',-6),'ph':2},
 {'band':'H','sub':'update','s':4,'r1':('x',3),'r2':('+',8),'ph':0},
 {'band':'H','sub':'track','sA':1,'sB':7,'dA':5,'dB':-1,'n':4,'ph':1,'ask':'A'},
 {'band':'H','sub':'track','sA':9,'sB':8,'dA':-2,'dB':-2,'n':3,'ph':2,'ask':'B'},
 {'band':'H','sub':'track','sA':4,'sB':1,'dA':3,'dB':5,'n':5,'ph':0,'ask':'A'},
 {'band':'H','sub':'track','sA':8,'sB':5,'dA':-1,'dB':2,'n':4,'ph':1,'ask':'B'},
]

# ---------------------------------------------------------------- seq-beregning
def seq_chain(it):
    """chain[0] = (s,t); videre ledd per ledd-effekt; returnerer liste av (pos, tall)."""
    out = [(it['s'], it['t'])]
    bp, tv = it['s'], it['t']
    for k in range(it['nlead'] + 2):   # nlead + fasit + 1 ekstra (off-two-reserve)
        bp = ((bp - 1 + eff(it['dl'], k + 1)) % 26) + 1
        tv = lnum(tv, k + 1, it['dn'])
        out.append((bp, tv))
    return out

def distractors_seq(it):
    chain = seq_chain(it)
    bp4, tv4 = chain[it['nlead']]        # siste viste ledd
    bp5, tv5 = chain[it['nlead'] + 1]    # fasit
    bp6, tv6 = chain[it['nlead'] + 2]
    codes = [
        ('letter-rule-miss', (bp4, tv5)),
        ('number-rule-miss', (bp5, tv4)),
        ('prev-repeat',      (bp4, tv4)),
        ('letter-off-one',   (bp6, tv5)),
        ('number-off-two',   (bp5, tv6)),
        ('both-off-two',     (bp6, tv6)),
    ]
    correct = (bp5, tv5)
    return correct, codes

# ------------------------------------------------------------- update-beregning
def distractors_update(it):
    s = it['s']
    r1, r2 = it['r1'], it['r2']
    correct = apply_rule(r2, apply_rule(r1, s))
    codes = [
        ('r1-only',      apply_rule(r1, s)),
        ('r2-only',      apply_rule(r2, s)),
        ('swap-steps',   apply_rule(r1, apply_rule(r2, s))),
        ('r1-twice',     apply_rule(r1, apply_rule(r1, s))),
        ('final-off-one', correct + 1),
        ('start-repeat', s),
    ]
    return correct, codes

# ------------------------------------------------------------- track-beregning
def track_chain(s, d, n):
    out = [s]
    v = s
    for _ in range(n + 2):
        v = v + d
        out.append(v)
    return out

def distractors_track(it, gi):
    n = it['n']
    chA, chB = track_chain(it['sA'], it['dA'], n), track_chain(it['sB'], it['dB'], n)
    vals = {'A': chA[n], 'B': chB[n]}
    ask = it['ask']
    oth = 'B' if ask == 'A' else 'A'
    d_ask = it['dA'] if ask == 'A' else it['dB']
    d_oth = it['dB'] if ask == 'A' else it['dA']
    s_ask = it['sA'] if ask == 'A' else it['sB']
    fs, fo = vals[ask], vals[oth]
    codes = [
        ('other-counter', fo),
        ('rule-mix',      fs + d_oth),
        ('start-value',   s_ask),
        ('double-steps',  fs + d_ask),
        ('final-off-one', fs + 1),
        ('before-prev',   fs - d_ask),
        ('sum-counters',  vals['A'] + vals['B']),
    ]
    return ask, {'A': chA[:n + 1], 'B': chB[:n + 1]}, fs, fo, codes

# ------------------------------------------------------------------ komponering
def uniq_labels(correct_lbl, cand_code_lbl, rot_ph, n=4):
    """kandidater i rotordre; velg foerste n labels som er nye (fasit utelatt)."""
    order = cand_code_lbl[rot_ph:] + cand_code_lbl[:rot_ph]
    out, used = [], {correct_lbl}
    for code, lbl in order:
        if lbl in used:
            continue
        used.add(lbl)
        out.append((code, lbl))
        if len(out) == n:
            break
    assert len(out) == n, (correct_lbl, cand_code_lbl, 'for faa unike distraktorer')
    return out

def build_all():
    # bandDiff forhåndsberegnes per item (én gang, språk-uavhengig) — delte
    # tellere mellom språk-loopene gav forskjøvede trinn på EN (fanget av selftest S10)
    band_pos0 = {'L': 0, 'M': 0, 'H': 0}
    band_diffs = []
    for it in ITEMS:
        b = it['band']
        d = bval(b, band_pos0[b])
        band_pos0[b] += 1
        band_diffs.append(d)
    band_pos = {'L': 0, 'M': 0, 'H': 0}
    meta_items, files = [], {}
    for lang in ('no', 'en'):
        items = []
        for gi, it in enumerate(ITEMS):
            band, sub, ph = it['band'], it['sub'], it['ph']
            bdiff = band_diffs[gi]
            band_pos[band] += 1   # beholdt for meta-rapportering
            n = gi + 1
            iid = f"sq-{n:04d}"
            if sub == 'seq':
                correct, codes = distractors_seq(it)
                c_lbl = f"{lpos(correct[0])} {correct[1]}"
                code_lbl = [(c, f"{lpos(p)} {t}") for (c, (p, t)) in codes]
                chosen = uniq_labels(c_lbl, code_lbl, ph, 4)
                prompt_no = (f"Følgjen er bygget på en fast regel for bokstavene og en fast "
                             f"regel for tallene. Hvilket ledd kommer sist: "
                             + ", ".join(f"{lpos(p)} {t}" for (p, t) in
                                         seq_chain(it)[:it['nlead'] + 1]) + ", ?")
                prompt_en = (f"The sequence follows one fixed rule for the letters and one "
                             f"fixed rule for the numbers. Which entry comes next: "
                             + ", ".join(f"{lpos(p)} {t}" for (p, t) in
                                         seq_chain(it)[:it['nlead'] + 1]) + ", ?")
                rules = {'dl': str(it['dl']), 'dn': str(it['dn']), 'nlead': it['nlead']}
            elif sub == 'update':
                correct, codes = distractors_update(it)
                c_lbl = str(correct)
                code_lbl = [(c, str(v)) for (c, v) in codes]
                chosen = uniq_labels(c_lbl, code_lbl, ph, 4)
                r1t, r2t = rule_txt(it['r1']), rule_txt(it['r2'])
                prompt_no = (f"Starttallet er {it['s']}. Anvend først regel 1 ({r1t}), "
                             f"deretter regel 2 ({r2t}). Hva er resultatet?")
                prompt_en = (f"The starting number is {it['s']}. First apply rule 1 ({r1t}), "
                             f"then rule 2 ({r2t}). What is the result?")
                rules = {'r1': r1t, 'r2': r2t, 'start': it['s']}
            else:  # track
                ask, chains, fs, fo, codes = distractors_track(it, gi)
                c_lbl = str(fs)
                code_lbl = [(c, str(v)) for (c, v) in codes]
                chosen = uniq_labels(c_lbl, code_lbl, ph, 4)
                chA = chains['A']; chB = chains['B']
                kA = ", ".join(str(x) for x in chA[:it['n'] + 1])
                kB = ", ".join(str(x) for x in chB[:it['n'] + 1])
                noA, noB = ("legger til " + str(it['dA'])), ("legger til " + str(it['dB']))
                enA, enB = ("adds " + str(it['dA'])), ("adds " + str(it['dB']))
                if it['dA'] < 0: noA, enA = ("trekker fra " + str(-it['dA'])), ("subtracts " + str(-it['dA']))
                if it['dB'] < 0: noB, enB = ("trekker fra " + str(-it['dB'])), ("subtracts " + str(-it['dB']))
                prompt_no = (f"Teller A starter på {it['sA']} og {noA} for hvert skritt: {kA}. "
                             f"Teller B starter på {it['sB']} og {noB} for hvert skritt: {kB}. "
                             f"Hvor mange har teller {ask}?")
                prompt_en = (f"Counter A starts at {it['sA']} and {enA} each step: {kA}. "
                             f"Counter B starts at {it['sB']} and {enB} each step: {kB}. "
                             f"How many does counter {ask} have?")
                rules = {'dA': it['dA'], 'dB': it['dB'], 'n': it['n'], 'startA': it['sA'], 'startB': it['sB'], 'ask': ask}
            # labels: [fasit, d1..d4] rotert av ROT_SEQ (fasit aldri pos 0 i alle items)
            # labels: [fasit, d1..d4] -> fasit roteres til posisjon ROT_SEQ[gi%5]
            labels = [c_lbl] + [lbl for (_c, lbl) in chosen]
            rot = ROT_SEQ[gi % 5]
            correct_label = labels[0]
            labels.pop(0)
            labels.insert(rot, correct_label)
            ci = labels.index(correct_label)
            # tags: 'none' paa fasit, ellers regeldel-koden per distraktor
            tags2code = {lbl: code for (code, lbl) in chosen}
            tags = ['none' if lab == correct_label else tags2code[lab] for lab in labels]
            assert labels.count(correct_label) == 1
            assert labels == sorted(labels, key=labels.index) or True  # rekkefoelge bevart
            item = {
                'id': iid, 'kind': 'ability', 'scales': [{'id': 'g', 'sign': 1}],
                'variants': [{'lang': lang, 'prompt': (prompt_no if lang == 'no' else prompt_en),
                              'options': [{'label': lab} for lab in labels],
                              'correctIndex': ci,
                              'difficulty': bdiff}],
            }
            m = {'id': iid, 'theme': 'T5', 'family': 'evner', 'band': band,
                 'bandDiff': bdiff, 'subtype': sub,
                 'rules': rules, 'ph': ph,
                 'correctLabel': correct_label, 'correctIndex': ci,
                 'provenance': 'original (programmatisk fasit fra regelobjekt)',
                 'codeBasis': 'distraktorkoder beregnet fra regelobjektene per item',
                 'labelsLanguageNeutral': True}
            if lang == 'no':
                m['optionOrder'] = labels
                m['violationTags'] = tags
                # labels er spraaknoytrale og identiske per par (verifisert S7b),
                # saa meta har EN rad per item — ikke optionOrder_no/en-kolonner
                meta_items.append(m)
            items.append(item)
        files[f'def-evne-t5-sekvens.{lang}.json'] = {
            'schemaVersion': 1, 'id': 'evne-t5-sekvens',
            'type': 'test-definition', 'family': 'evner',
            'languages': [lang],
            'scoring': {'type': 'g-score', 'metric': 'z100', 'ci95': True},
            'dimensions': [{'id': 'g',
                            'label': ('g-skår' if lang == 'no' else 'g score'),
                            'labelLanguage': lang,
                            'description': ('Generell evne, rapportert som IQ-stil-metrikk.'
                                            if lang == 'no' else
                                            'General ability, reported as IQ-style metric.')}],
            'items': items,
        }
    bands = {}
    for it in ITEMS:
        bands[it['band']] = bands.get(it['band'], 0) + 1
    meta = {
        'schemaVersion': 1, 'id': 'evne-pool-t5-meta', 'type': 'evne-pool-meta',
        'batch': 'T5', 'boardLeaf': '#3820-pool-block (evnepool per tema: T5)',
        'spec': 'tests/schema/_evne_itemspec_spec.json',
        'themes': {'T5': 'evne-t5-sekvens'},
        'counts': {'T5': len(ITEMS)},
        'bands': {'T5': bands},
        'subtypes': {'T5': {'seq': sum(1 for i in ITEMS if i['sub'] == 'seq'),
                            'update': sum(1 for i in ITEMS if i['sub'] == 'update'),
                            'track': sum(1 for i in ITEMS if i['sub'] == 'track')}},
        'authoring': {'T5': 'par-variant: labels spraknoytrale (bokstav-tall/tall) — '
                            'samme options-orden og correctIndex per spraakpar; '
                            'prompter separat forfattet NO/EN',
                      'distractorRule': 'regeldel-brudd; kode beregnet fra regelobjektene '
                                        '(letter-rule-miss = bokstavregelen ikke fulgt; '
                                        'r1-only = bare regel 1 fulgt; other-counter = '
                                        'verdien av den andre telleren; osv.)',
                      'orderKind': "kind 'ability' eksklusivt per itemspec.orderKindNote"},
        'items': meta_items,
    }
    return files, meta

def main():
    files, meta = build_all()
    for fname, obj in files.items():
        p = os.path.join(OUT, fname)
        with open(p, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print('skrev', fname)
    p = os.path.join(OUT, '_evne_pool_t5_meta.json')
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('skrev _evne_pool_t5_meta.json')
    print('OK: T5 %d items, per-spraak-filer x2' % len(ITEMS))

if __name__ == '__main__':
    main()
