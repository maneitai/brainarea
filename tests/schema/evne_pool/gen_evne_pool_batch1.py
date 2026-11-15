# -*- coding: utf-8 -*-
"""Brainarea — evne-pool batch 1 generator [3-VEIS] FASE 2 (todo #3748).
Deterministisk (ingen RNG). Bygger i prod-treet:
  tests/schema/evne_pool/def-evne-t1-matrise.{no,en}.json   (50 ability-items, 6 options)
  tests/schema/evne_pool/def-evne-t2-numerisk.{no,en}.json  (50 ability-items, 5 options)
  tests/schema/evne_pool/_evne_pool_batch1_meta.json        (fasit/aksjer/provenance)
Kontrakt: tests/schema/_evne_itemspec_spec.json — T1/T2 poolMin 50, bands L/M/H,
andel 0.34/0.33/0.33 ± 0.15, distraktorregler («1-rule-off» T1; off-by-one/
operatornære/ett-ledd-brudd T2), id-mønster <prefix>-NNNN.
Kjor: python3 gen_evne_pool_batch1.py  (alt med py_run paa windows-host)
"""
import json, os, sys

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
BANDSEQ = ['L'] * 17 + ['M'] * 17 + ['H'] * 16   # 34/34/32 % — innen ±0.15 mot 0.34/0.33/0.33

def bval(band, i_in_band):
    return DIFF[band][i_in_band % 4]

CYCLES = {'A': ['<', '^', '>', 'v'], 'B': ['/', '-', '\\', '|']}

# ============================================================ T1 MELKEVEI
# celle(r,c) = glyphIdx = (g0 + RG*c + CG*r) mod 4, count = k0 + RC*c + CC*r
# aktive akser = regelledd: L=1 akse, M=2, H=3. counts holdes i [1,7],
# answer-fasit-alternativ i [1,8] (maks 8 glyffer).

CMUTS = [1, -1, 2, -2, 3, -3, -4, -5, 4, 5]   # telle-mutasjoner (off-by/operatornaere)
GMUTS = [1, -1, 2]                  # glyf-syklusmutasjoner mod 4

# subtype -> (antall, param-bygging): L 9+8, M 6+6+5, H 6+5+5
def t1_params():
    P = []
    # L count-across (CC) 9: (k0, CC)  — counts i rad k0, k0+CC, svar k0+2CC
    L_CROSS = [(2,1),(1,1),(1,2),(2,2),(3,1),(2,1),(3,1),(1,2),(2,2)]
    # L count-down (RC) 9: (k0, RC) — nedad: k0, k0+RC, svar k0+2RC (RC kan vaere negativ)
    L_DOWN  = [(3,-1),(1,1),(2,1),(1,2),(1,1),(2,2),(3,-1),(2,1)]
    # M: (syklus, g0, akseA(RG/CG), k0, CC/RC)
    M_GA = [('A',0,'RG',1,1),('B',0,'RG',1,2),('A',1,'RG',2,1),
            ('B',0,'RG',1,1),('A',0,'RG',1,2),('B',1,'RG',2,1)]
    M_DG = [('A',0,'CG',1,2),('B',0,'CG',1,1),('A',2,'CG',2,1),
            ('B',1,'CG',1,1),('A',1,'CG',1,2),('B',3,'CG',2,1)]
    M_CD = [('A',0,1,1,1),('B',0,2,2,1),('A',0,1,1,2),      # konst glyf, RC+CC gitt
            ('B',0,1,1,1),('A',0,2,1,1)]                     # k0<=2: svar k0+2RC+2CC<=6
    H_RG = [('A',0,1,1,1),('B',0,1,2,1),('A',2,1,1,2),
            ('B',0,1,2,1),('A',1,1,1,1)]
    H_CG = [('A',0,1,1,1),('B',0,1,2,1),('A',1,1,1,2),
            ('B',2,1,2,1),('A',3,1,1,1)]
    H_CD = [('A',0,1,1,1),('B',0,1,2,1),('A',0,1,1,2),
            ('B',0,1,2,1),('A',0,2,1,1),('B',0,2,1,1)]
    for band, subs in [('L', [('count-across', L_CROSS, 9), ('count-down', L_DOWN, 8)]),
                       ('M', [('R+cross', M_GA, 6), ('D+cross', M_DG, 6), ('dual-count', M_CD, 5)]),
                       ('H', [('dual-glyph-RG', H_RG, 5), ('dual-glyph-CG', H_CG, 5), ('full-count', H_CD, 6)])]:
        for sub, params, cnt in subs:
            assert len(params) == cnt, (sub, len(params), cnt)
            for i, p in enumerate(params):
                if band == 'L':
                    P.append(dict(band=band, subtype=sub, cycle='A', g0=0,
                                  RG=0, CG=0, RC=p[1] if sub == 'count-down' else 0,
                                  CC=p[1] if sub == 'count-across' else 0, k0=p[0]))
                elif sub in ('R+cross', 'D+cross'):
                    cyc, g0, ax, k0, cc = p
                    RG, CG = (1, 0) if ax == 'RG' else (0, 1)
                    # R+cross = glyf sykkel bortover (RG) + telle bortover (CC)
                    # D+cross = glyf sykkel nedover (CG) + telle bortover (CC)
                    P.append(dict(band=band, subtype=sub, cycle=cyc, g0=g0,
                                  RG=RG if sub == 'R+cross' else 0,
                                  CG=CG if sub == 'D+cross' else 0,
                                  RC=0, CC=cc, k0=k0))
                else:
                    cyc, g0, k0, a, b = p
                    if sub == 'full-count':
                        P.append(dict(band=band, subtype=sub, cycle=cyc, g0=g0,
                                      RG=0, CG=0, RC=a, CC=b, k0=k0))
                    elif sub == 'dual-glyph-RG':
                        P.append(dict(band=band, subtype=sub, cycle=cyc, g0=g0,
                                      RG=1, CG=0, RC=a, CC=b, k0=k0))
                    else:
                        P.append(dict(band=band, subtype=sub, cycle=cyc, g0=g0,
                                      RG=0, CG=1, RC=a, CC=b, k0=k0))
    assert len(P) == 50, len(P)
    assert sum(1 for x in P if x['band'] == 'L') == 17
    assert sum(1 for x in P if x['band'] == 'M') == 17
    assert sum(1 for x in P if x['band'] == 'H') == 16
    return P

def t1_cell(p, r, c):
    gi = (p['g0'] + p['RG'] * c + p['CG'] * r) % 4
    q = p['k0'] + p['RC'] * c + p['CC'] * r
    return gi, q

def t1_grids(p):
    """Grid med MISSING, og (gi,qq) for svar-cellen. Kaster assert ved ugyldig count."""
    cells = [[t1_cell(p, r, c) for c in range(3)] for r in range(3)]
    gi_a, q_a = (p['g0'] + p['RG'] * 2 + p['CG'] * 2) % 4, p['k0'] + p['RC'] * 2 + p['CC'] * 2
    cells[2][2] = ('MISS', -1)
    # gyldighetsvindu: alle viste counts 1..7, svar 1..8
    for r in range(3):
        for c in range(3):
            gi, q = cells[r][c]
            if gi != 'MISS':
                assert 1 <= q <= 7, ('t1 count out of [1,7]', p, r, c, q)
    assert 1 <= q_a <= 8, ('t1 answer count out of [1,8]', p, q_a)
    return cells, gi_a, q_a

def t1_text(p, lang):
    cells, gi_a, q_a = t1_grids(p)
    cyc = CYCLES[p['cycle']]
    def s(gi, q):
        if gi == 'MISS':
            return '[?]'
        return '[' + cyc[gi] * q + ']'
    w = max(len(s(cells[r][c][0], cells[r][c][1])) for r in range(3) for c in range(3))
    lines = []
    for r in range(3):
        lines.append('   '.join(s(cells[r][c][0], cells[r][c][1]).rjust(w) for c in range(3)))
    mat = '\n'.join(lines)
    if lang == 'no':
        return ('Hvilken celle mangler i rutenettet? Reglene gjelder bortover og nedover.\n' + mat,
                '[' + cyc[gi_a] * q_a + ']')
    return ('Which cell is missing from the grid? The rules run across and down.\n' + mat,
            '[' + cyc[gi_a] * q_a + ']')

def t1_options(p, lang):
    correct, correct_label = None, None
    _, gi_a, q_a = t1_grids(p)
    cyc = CYCLES[p['cycle']]
    correct = '[' + cyc[gi_a] * q_a + ']'
    axes = [('G', 'RG'), ('G', 'CG'), ('C', 'RC'), ('C', 'CC')]
    cands = []   # (label, violated)
    for kind, name in axes:
        active = p[name] != 0
        if not active:
            continue
        if kind == 'G':
            for m in GMUTS:
                cands.append(('[' + cyc[(gi_a + m) % 4] * q_a + ']', name + f'{m:+d}'))
        else:
            for m in CMUTS:
                if 1 <= q_a + m <= 8:
                    cands.append(('[' + cyc[gi_a] * (q_a + m) + ']', name + f'{m:+d}'))
    seen = {correct}
    picks = []
    for lab, vio in cands:
        if lab in seen:
            continue
        picks.append(vio)
        seen.add(lab)
        if len(picks) == 5:
            break
    assert len(picks) == 5, ('t1 distraktorer < 5', p['subtype'], picks)
    labels = [correct] + [c[0] for c in cands if c[0] not in seen or True][:0]
    labels = [correct] + [lab for lab, vio in cands if vio in picks][:5]
    # NB cands kan inneholde dup likater avvist over; bygg eksplisitt:
    labels = [correct]
    used = {correct}
    vio_tags = ['none']
    for lab, vio in cands:
        if len(labels) == 6:
            break
        if lab in used:
            continue
        labels.append(lab); used.add(lab); vio_tags.append(vio)
    assert len(labels) == 6, ('t1 labels', len(labels), p)
    rot = p['n'] % 6
    labels = labels[rot:] + labels[:rot]
    vio_tags = vio_tags[rot:] + vio_tags[:rot]
    ci = labels.index(correct)
    assert len(set(labels)) == 6 and ci < 6
    return labels, ci, vio_tags, correct

def build_t1():
    items, metas, reserved = [], [], []
    band_pos = {'L': 0, 'M': 0, 'H': 0}
    n = 0
    for i, p in enumerate(t1_params()):
        n += 1
        p = dict(p); p['n'] = n - 1
        band_pos[p['band']] += 1
        grid_no, correct_no = t1_text(p, 'no')
        grid_en, correct_en = t1_text(p, 'en')
        assert correct_no == correct_en
        labels, ci, vios, _ = t1_options(p, 'no')
        metas.append(dict(id=f"mx-{n:04d}", theme='T1', band=p['band'],
                          bandDiff=bval(p['band'], band_pos[p['band']] - 1),
                          subtype=p['subtype'],
                          axes={'RG': p['RG'], 'CG': p['CG'], 'RC': p['RC'], 'CC': p['CC']},
                          cycle=p['cycle'], g0=p['g0'], k0=p['k0'],
                          correct=correct_no, correctIndex=ci,
                          violations=vios, optionOrder=labels))
        prompt_no = ('Hvilken celle mangler i rutenettet? Reglene gjelder bortover og nedover.\n'
                     + t1_text(p, 'no')[0].split('\n', 1)[1])
        prompt_en = ('Which cell is missing from the grid? The rules run across and down.\n'
                     + t1_text(p, 'en')[0].split('\n', 1)[1])
        it = {'id': f"mx-{n:04d}", 'kind': 'ability',
              'scales': [{'id': 'g', 'sign': 1}],
              'variants': []}
        # per-spraak-filer: ingen variant for det andre spraaket (variant.lang maa
        # ligge i test.languages); sprakvariantene bygges i make_def under.
        it['_prompt_no'] = prompt_no
        it['_prompt_en'] = prompt_en
        it['_difficulty'] = bval(p['band'], band_pos[p['band']] - 1)
        it['_labels'] = labels
        it['_ci'] = ci
        reserved.append(it)
    assert len(reserved) == 50
    return reserved, metas

# ============================================================ T2 NUMERISK

def t2_params():
    """Returner [(band, subtype, params)] — L 9+8, M 6+6+5, H 6+5+5."""
    arith = [(2,3),(3,4),(4,5),(5,6),(2,4),(3,5),(4,6),(5,3),(2,5)]
    geom  = [(1,2),(1,3),(2,2),(2,3),(3,2),(1,2),(2,2),(3,2)]
    alte  = [(2,3),(3,4),(4,5),(2,4),(3,5),(2,5)]                # (a, d1), d2=d1+1
    chain = [(2,2),(3,3),(4,4),(2,5),(3,2),(4,2)]                # (a, c)
    mulad = [(1,2),(2,3),(1,3),(3,2),(2,1)]                      # (a, c)
    dual  = [(3,2,5,4),(4,3,6,5),(5,2,7,4),(6,4,8,5),(3,5,6,6),(4,2,7,5)]  # (s,p,u,q)
    fib   = [(1,4),(2,5),(3,3),(2,6),(4,4)]                      # startpar
    steps = [(2,),(4,),(6,),(8,),(10,)]                          # a>=2
    P = []
    for band, sub, ps in [('L','arith',arith),('L','geom',geom),
                          ('M','alternate',alte),('M','diffchain',chain),('M','muladd',mulad),
                          ('H','dual',dual),('H','fib-pairsum',fib),('H','quadratic-inc',steps)]:
        for p in ps:
            P.append((band, sub, p))
    assert len(P) == 50
    assert sum(1 for b,_,_ in P if b=='L') == 17
    assert sum(1 for b,_,_ in P if b=='M') == 17
    assert sum(1 for b,_,_ in P if b=='H') == 16
    return P

def t2_series(band, sub, p):
    """-> (seq5, ans, [d1,d2,d3,d4], subtypeDesc)"""
    if sub == 'arith':
        a, d = p
        seq = [a + d*r for r in range(5)]
        ans = a + 5*d
        return seq, ans, [a+4*d, a+6*d, ans-1, ans+1], 'arithmetic-progression'
    if sub == 'geom':
        a, b = p
        seq = [a * b**r for r in range(5)]
        ans = a * b**5
        return seq, ans, [a*b**4, ans+1, ans-1, ans*b], 'geometric-progression'
    if sub == 'alternate':
        a, d1 = p
        d2 = d1 + 1
        seq = [a]; v = a
        for k in range(1, 6):
            v += d1 if k % 2 == 1 else d2
            seq.append(v)
        ans = v + d2          # neste steg k=6 -> d2
        uni = a + 6*d1        # feil: alle steg d1 (regelbryting: dropper d2-leddet)
        ds = [uni, v + d1 + d2, ans - 1, ans + 1]
        ds = [x for x in ds if x not in (ans, v)]
        # fyll deterministisk om nodvendig (ingen dup likater, aldri ans)
        seen = set(ds)
        fill = 1
        while len(ds) < 4:
            cand = ans + d2 + fill
            if cand not in seen and cand != ans:
                ds.append(cand); seen.add(cand)
            fill += 1
        return seq[:5], ans, ds, 'alternating-diff'
    if sub == 'diffchain':
        a, c = p
        seq = [a]; v = a; k = 1
        for _ in range(4):
            v += k*c; seq.append(v); k += 1
        ans = v + 5*c
        return seq, ans, [v + 4*c, v + 2*c, ans-1, ans+1], 'second-difference-chain'
    if sub == 'muladd':
        a, c = p
        seq = [a]; v = a
        for k in range(1, 5):
            v = 2*v if k % 2 == 1 else v + c
            seq.append(v)
        ans = v * 2
        ds = [v + c, ans + 1, ans - 1, v * 2 - c if c > 0 else ans - 2]
        ds = [x for x in ds if x != ans and x > 0]
        seen = set(ds)
        fill = 1
        while len(ds) < 4:
            cand = ans + 2 + fill
            if cand not in seen:
                ds.append(cand); seen.add(cand)
            fill += 1
        # dedup likater til fast lengde 4: behold rekkefolge, erstatt dup likater
        outds = []
        for x in ds:
            if x not in outds:
                outds.append(x)
        seen = set(outds)
        fill = 1
        while len(outds) < 4:
            cand = ans + 10 + fill
            if cand not in seen and cand != ans:
                outds.append(cand); seen.add(cand)
            fill += 1
        ds = outds[:4]
        return seq, ans, ds, 'multiply-add-alternating'
    if sub == 'dual':
        s, pp, u, q = p
        A = [s + pp*r for r in range(3)]
        B = [u + q*r for r in range(3)]
        seq = [A[0], B[0], A[1], B[1], A[2]]
        ans = B[2]
        raw = [s + 3*pp, u + 3*q, ans - 1, ans + 1]
        ds_out = []
        for x in raw:
            if x != ans and x > 0 and x not in ds_out:
                ds_out.append(x)
        fill = 1
        while len(ds_out) < 4:
            cand = ans + 2 + fill
            if cand != ans and cand not in ds_out:
                ds_out.append(cand)
            fill += 1
        return seq, ans, ds_out, 'interleaved-series'
    if sub == 'fib-pairsum':
        t0, t1 = p
        t2 = t0 + t1
        t3 = t1 + t2
        ans = t2 + t3
        raw = [2*t3, t1 + t3, ans - 1, ans + 1]
        ds_out = []
        for x in raw:
            if x != ans and x > 0 and x not in ds_out:
                ds_out.append(x)
        fill = 1
        while len(ds_out) < 4:
            cand = ans + 2 + fill
            if cand != ans and cand not in ds_out:
                ds_out.append(cand)
            fill += 1
        return [t0, t1, t2, t3], ans, ds_out, 'additive-pair-sum'
    if sub == 'quadratic-inc':
        a, = p
        seq = [a]; v = a; k = 1
        for _ in range(4):
            v += k*a; seq.append(v); k += 1
        ans = v + 5*a
        raw = [v + 4*a, v + 6*a, ans - 1, ans + 1]
        ds_out = []
        for x in raw:
            if x != ans and x > 0 and x not in ds_out:
                ds_out.append(x)
        fill = 1
        while len(ds_out) < 4:
            cand = ans + 2 + fill
            if cand != ans and cand not in ds_out:
                ds_out.append(cand)
            fill += 1
        return seq, ans, ds_out, 'quadratic-increment'
    raise ValueError(sub)

def build_t2():
    items, metas = [], []
    band_pos = {'L': 0, 'M': 0, 'H': 0}
    n = 0
    for band, sub, p in t2_params():
        n += 1
        band_pos[band] += 1
        seq, ans, ds, desc = t2_series(band, sub, p)
        assert all(isinstance(x, int) for x in seq + [ans] + ds), ('ikke-heltall', sub, p)
        assert all(sx > 0 for sx in seq + [ans] + ds), ('negativt tall uten konstruktgrunnlag', sub, p, seq + [ans] + ds)
        assert ans not in seq, ('fasit i seq', sub, p)
        assert all(dsx != ans for dsx in ds), ('distraktor lik fasit', sub, p, ds)
        assert len(set(ds)) == 4, ('distraktor-dup likater', sub, p, ds)
        labels = [str(ans)] + [str(x) for x in ds]
        rot = n % 5
        labels = labels[rot:] + labels[:rot]
        ci = labels.index(str(ans))
        assert len(set(labels)) == 5 and ci < 5
        metas.append(dict(id=f"nm-{n:04d}", theme='T2', band=band,
                          bandDiff=bval(band, band_pos[band] - 1),
                          subtype=sub, subtypeDesc=desc,
                          params=list(p), seq=seq, correct=ans, correctIndex=ci,
                          violations=ds, optionOrder=labels,
                          difficulty=bval(band, band_pos[band] - 1)))
        seq_txt = ', '.join(str(x) for x in seq) + ', ?'
        prompt_no = 'Hvilket tall mangler i rekken?\n' + seq_txt
        prompt_en = 'Which number is missing in the sequence?\n' + seq_txt
        items.append({'id': f"nm-{n:04d}", 'theme': 'T2', 'band': band,
                      'prompt_no': prompt_no, 'prompt_en': prompt_en,
                      'labels': labels, 'ci': ci,
                      'difficulty': bval(band, band_pos[band] - 1)})
    assert len(items) == 50
    return items, metas

# ============================================================ def-filer
def make_variant_list(res, lang):
    """Per-spraak-fil: een variant i filens sprak. difficulty ligger paa
    variant-nivaa (schema v1 additionalProperties=false paa item-planet)."""
    if isinstance(res.get('labels'), list):
        return [{'lang': lang, 'prompt': res['prompt_no' if lang == 'no' else 'prompt_en'],
                 'options': [{'label': lab} for lab in res['labels']],
                 'correctIndex': res['ci'], 'difficulty': res['difficulty']}]
    return [{'lang': lang, 'prompt': res['_prompt_no' if lang == 'no' else '_prompt_en'],
             'options': [{'label': lab} for lab in res['_labels']],
             'correctIndex': res['_ci'], 'difficulty': res['_difficulty']}]

def make_items(reserved, lang):
    out = []
    for res in reserved:
        out.append({'id': res['id'], 'kind': 'ability',
                    'scales': [{'id': 'g', 'sign': 1}],
                    'variants': make_variant_list(res, lang)})
    return out
def make_def(pool_id, lang, items):
    return {
        'schemaVersion': 1,
        'id': pool_id,
        'type': 'test-definition',
        'family': 'evner',
        'languages': [lang],
        'scoring': {'type': 'g-score', 'metric': 'z100', 'ci95': True},
        'dimensions': [{'id': 'g',
                        'label': 'g-skår' if lang == 'no' else 'g score',
                        'labelLanguage': lang,
                        'description': ('Generell evne, rapportert som IQ-stil-metrikk.'
                                        if lang == 'no' else
                                        'General ability, reported as IQ-style metric.')}],
        'items': items,
    }

def write_json(path, obj):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')

def main():
    t1_res, t1_meta = build_t1()
    t2_res, t2_meta = build_t2()
    t1_no_items = make_items(t1_res, 'no')
    t1_en_items = make_items(t1_res, 'en')
    t2_no_items = make_items(t2_res, 'no')
    t2_en_items = make_items(t2_res, 'en')
    defs = {
        'no': {'t1': make_def('evne-t1-matrise', 'no', t1_no_items),
               't2': make_def('evne-t2-numerisk', 'no', t2_no_items)},
        'en': {'t1': make_def('evne-t1-matrise', 'en', t1_en_items),
               't2': make_def('evne-t2-numerisk', 'en', t2_en_items)},
    }
    files = {
        'no': {'t1': 'def-evne-t1-matrise.no.json', 't2': 'def-evne-t2-numerisk.no.json'},
        'en': {'t1': 'def-evne-t1-matrise.en.json', 't2': 'def-evne-t2-numerisk.en.json'},
    }
    for lang in ('no', 'en'):
        for key in ('t1', 't2'):
            write_json(os.path.join(OUT, files[lang][key]), defs[lang][key])
    band_share = {}
    for m in t1_meta + t2_meta:
        band_share.setdefault((m['theme'], m['band']), 0)
        band_share[(m['theme'], m['band'])] += 1
    meta = {
        'metaVersion': 1, 'id': 'evne-pool-batch1-meta', 'date': '2026-11-15',
        'boardLeaf': '#3748 [3-VEIS] FASE 2: Evnepool batch 1: tema 1-2',
        'generatedBy': 'gen_evne_pool_batch1.py (deterministisk, ingen RNG)',
        'spec': 'tests/schema/_evne_itemspec_spec.json',
        'files': {lang: {key: files[lang][key] for key in ('t1', 't2')} for lang in ('no', 'en')},
        'counts': {'T1': len(t1_meta), 'T2': len(t2_meta)},
        'bandShares': {f'{t}.{b}': c for (t, b), c in sorted(band_share.items())},
        'scoringNote': 'Scoring uten maxItems: maks 44-tema-samling avgjores i sampler-bygget; per-tema maxItems 8 bryter schema-minimum 10. Funn rapportert.',
        'items': t1_meta + t2_meta,
    }
    write_json(os.path.join(OUT, '_evne_pool_batch1_meta.json'), meta)
    print('PROD =', PROD)
    print('T1 items:', len(t1_res), 'T2 items:', len(t2_res))
    print('bandShares:', meta['bandShares'])
    for lang in ('no', 'en'):
        for key in ('t1', 't2'):
            fp = os.path.join(OUT, files[lang][key])
            print('wrote', fp, os.path.getsize(fp), 'bytes')

if __name__ == '__main__':
    main()
