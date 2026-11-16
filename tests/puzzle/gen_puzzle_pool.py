#!/usr/bin/env python3
# gen_puzzle_pool.py — deterministisk generator for puzzle-v1-poolen (90 items).
# [BYGG] FASE 2, #3765 (+ #3832-overlapp per designkontrakt v1.1 §5).
# Ingen RNG: alle parameterne er fastlagte tabeller. To kjøringer gir bitvist like filer.
# Kjøring: python3 tests/puzzle/gen_puzzle_pool.py [outdir]
# Utdata: def-puzzle-v1.no.json, def-puzzle-v1.en.json, _puzzle_pool_meta.json
import json, os, sys

SHAPES = ['○', '□', '△', '◇']
BANDS = ['L', 'M', 'H']
SLOTS = list(range(10))  # 10 items per (type, band)
B_BASE = {'L': -1.925, 'M': -0.425, 'H': 0.575}   # 0.075 inn fra vinduskant
B_STEP = {'L': 1.2 / 9, 'M': 0.7 / 9, 'H': 1.2 / 9}  # (spenn - 2*margin) / 9 -> alle b midt i vinduene

PROMPTS = {
    's1': {
        'no': 'Sekvensen følger en fast regel for tallet og en fast regel for formen. Hvilken tile kommer neste: {tiles}',
        'en': 'The sequence follows a fixed rule for the digit and a fixed rule for the shape. Which tile comes next: {tiles}',
    },
    's2': {
        'no': 'Hver neste tile følger en fast endringsregel for både tall og form. Hvilken tile kommer neste: {tiles}',
        'en': 'Each next tile follows a fixed change rule for both digit and shape. Which tile comes next: {tiles}',
    },
    's3': {
        'no': 'To regler gjelder annenhvert ledd i sekvensen. Hvilken tile kommer neste: {tiles}',
        'en': 'Two rules alternate between positions in the sequence. Which tile comes next: {tiles}',
    },
}

DIM_LABEL = {'no': 'g-skår', 'en': 'g-score'}
DIM_DESC = {
    'no': 'Generell evne, rapportert som theta med bredt usikkerhetsbånd (ikke normalisert).',
    'en': 'General ability, reported as theta with a wide uncertainty band (not normed).',
}


def glyph(digit, shape_idx):
    return '%d%s' % (digit % 10, SHAPES[shape_idx % 4])


def uniq(glyphs):
    """Deterministisk unikhets-sikring: konflikt -> øk sifferet til ledig (ingen RNG)."""
    out, seen = [], set()
    for g in glyphs:
        d = int(g[0])
        s = g[1]
        while ('%d%s' % (d, s)) in seen:
            d = (d + 1) % 10
        g2 = '%d%s' % (d, s)
        seen.add(g2)
        out.append(g2)
    return out


def make_s1(band, i):
    """Sekvensfortsettelse: tallregel + syklende form. L aritmetisk, M vekslende, H konstant andre-differens."""
    if band == 'L':
        c = 1 + (i % 3)
        a0 = (i * 2 + c) % 7
        off = i % 4
        shown = [(a0 + c * k) % 10 for k in range(6)]
        nxt = (a0 + c * 6) % 10
        d1 = glyph(nxt + 1, off + 6)
        d2 = glyph(nxt, off + 5)
        d3 = glyph((a0 + (c + 1) * 6) % 10, off + 6)
        rule = {'kind': 'arith', 'a0': a0, 'c': c, 'off': off}
    elif band == 'M':
        c1 = 1 + (i % 3)
        c2 = 1 + ((i + 1) % 3)
        if c1 == c2:
            c2 = (c2 % 3) + 1
        a0 = (i * 3 + c1) % 8
        off = (i + 1) % 4
        ds = [a0]
        for t in range(5):
            ds.append((ds[-1] + (c1 if t % 2 == 0 else -c2)) % 10)
        nxt = (ds[5] - c2) % 10
        d1 = glyph((ds[5] + c1) % 10, off + 6)
        d2 = glyph(nxt, off + 7)
        d3 = glyph(ds[5], off + 6)
        rule = {'kind': 'alt', 'a0': a0, 'c1': c1, 'c2': c2, 'off': off}
        tiles = [glyph(d, off + k) for k, d in enumerate(ds[:6])]
        return rule, tiles, glyph(nxt, off + 6), [d1, d2, d3]
    else:
        c0 = i % 3
        c = 1 + (i % 2)
        a0 = (i * 2) % 5
        off = (i + 2) % 4
        ds = [a0]
        for t in range(6):
            ds.append((ds[-1] + (c0 + c * t)) % 10)
        nxt = ds[6] % 10
        d1 = glyph(nxt + 1, off + 6)
        d2 = glyph(nxt, off + 7)
        d3 = glyph((ds[5] + (c0 + c * 5) * 2) % 10, off + 6)
        rule = {'kind': 'quad', 'a0': a0, 'c0': c0, 'c': c, 'off': off}
        tiles = [glyph(d, off + k) for k, d in enumerate(ds[:6])]
        return rule, tiles, glyph(nxt, off + 6), [d1, d2, d3]
    tiles = [glyph(d, off + k) for k, d in enumerate(shown)]
    return rule, tiles, glyph(nxt, off + 6), [d1, d2, d3]


def make_s2(band, i):
    """Oppdateringsregel: siffer +k mod 10 OG form +s per steg."""
    k = {'L': 1 + (i % 2), 'M': 3 + (i % 2), 'H': 5 + (i % 3)}[band]
    s = {'L': 1, 'M': 2, 'H': 3}[band]
    a0 = (i * 4 + k) % 10
    off = i % 4
    shown = [(a0 + k * t) % 10 for t in range(6)]
    nxt = (a0 + k * 6) % 10
    d1 = glyph(nxt + 1, off + 6 * s)
    d2 = glyph(nxt, off + 6 * s + 1)
    d3 = glyph(nxt + 2, off + 6 * s + 1)
    tiles = [glyph(d, off + t * s) for t, d in enumerate(shown)]
    return {'kind': 'update', 'a0': a0, 'k': k, 's': s, 'off': off}, tiles, glyph(nxt, off + 6 * s), [d1, d2, d3]


def make_s3(band, i):
    """Sporingsregel: to parallelle regler, annenhvert ledd (partall-posisjon=X, oddetall=Y)."""
    if band == 'L':
        a, b, sa, sb = 1, 2, 1, 0
    elif band == 'M':
        a, b, sa, sb = 2, 1, 1, 1
    else:
        a = 2 + (i % 2)
        b = 4 + (i % 2)
        sa, sb = 1, 2
    x0 = (i * 3 + a) % 10
    y0 = (i * 5 + b) % 10
    xoff = i % 4
    yoff = (i + 2) % 4
    tiles = []
    for pos in range(7):
        p = pos // 2
        if pos % 2 == 0:
            tiles.append(glyph((x0 + a * p) % 10, xoff + sa * p))
        else:
            tiles.append(glyph((y0 + b * p) % 10, yoff + sb * p))
    xn = ((x0 + a * 4) % 10, xoff + sa * 4)  # neste = pos 8 -> X, p = 4
    yn = ((y0 + b * 3) % 10, yoff + sb * 3)  # distraktor: sub-Y-forvirring
    correct = glyph(xn[0], xn[1])
    dis = [glyph(xn[0] + 1, xn[1]), glyph(xn[0], xn[1] + 1), glyph(yn[0], yn[1])]
    return {'kind': 'track', 'x0': x0, 'y0': y0, 'a': a, 'b': b, 'sa': sa, 'sb': sb,
            'xoff': xoff, 'yoff': yoff}, tiles, correct, dis


MAKE = {'s1': make_s1, 's2': make_s2, 's3': make_s3}


def main():
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    items_no, items_en, meta_items = [], [], {}
    for s in ('s1', 's2', 's3'):
        for band in BANDS:
            for i in SLOTS:
                rule, tiles, correct, dis = MAKE[s](band, i)
                opts = uniq([correct] + dis)
                correct = opts[0]
                dis = opts[1:]
                item_id = 'pz-%s%s%02d' % (s, band.lower(), i + 1)
                b_value = round(B_BASE[band] + B_STEP[band] * i, 3)
                j = i % 4
                order = list(range(4))
                if j != 0:
                    order[0], order[j] = order[j], order[0]
                permuted = [opts[order[k]] for k in range(4)]
                correct_index = order.index(0)
                tile_row = ' '.join(tiles) + ' ?'
                variants = []
                for lang in ('no', 'en'):
                    prompt = PROMPTS[s][lang].format(tiles=tile_row)
                    variants.append({'lang': lang, 'prompt': prompt,
                                     'options': [{'label': g} for g in permuted],
                                     'correctIndex': correct_index,
                                     'difficulty': b_value})
                item_no = {'id': item_id, 'kind': 'ability',
                           'scales': [{'id': 'g', 'sign': 1}], 'variants': [variants[0]]}
                item_en = {'id': item_id, 'kind': 'ability',
                           'scales': [{'id': 'g', 'sign': 1}], 'variants': [variants[1]]}
                items_no.append(item_no)
                items_en.append(item_en)
                meta_items[item_id] = {
                    'subtype': s, 'band': band, 'b': b_value, 'rule': rule,
                    'tilesShown': tiles, 'correctGlyph': correct,
                    'distractorGlyphs': dis, 'correctIndex': correct_index,
                }
    items_no.sort(key=lambda x: x['id'])
    items_en.sort(key=lambda x: x['id'])

    def make_def(lang, items):
        return {
            'schemaVersion': 1, 'id': 'puzzle-v1', 'type': 'test-definition',
            'family': 'pool', 'languages': [lang],
            'scoring': {'type': 'g-score', 'metric': 'z100', 'ci95': True},
            'dimensions': [{'id': 'g', 'label': DIM_LABEL[lang],
                            'labelLanguage': lang, 'description': DIM_DESC[lang]}],
            'items': items,
        }

    def_no = make_def('no', items_no)
    def_en = make_def('en', items_en)
    meta = {
        'poolVersion': 'puzzle-pool-v1', 'generator': 'gen_puzzle_pool.py',
        'date': '2026-11-16', 'testId': 'puzzle-v1',
        'deterministic': True, 'noRng': True,
        'counts': {'total': 90, 'perType': {s: 30 for s in MAKE},
                   'perBand': {b: 30 for b in BANDS}, 'perBandPerType': 10},
        'bands': {'L': [-2.0, -0.5], 'M': [-0.5, 0.5], 'H': [0.5, 2.0]},
        'bSlots': 'b = base + step*i: L base -1.925 step 0.1333; M base -0.425 step 0.0778; H base 0.575 step 0.1333 (i=0..9) — alle b midt i IRT-vinduene',
        'optionsPerItem': 4,
        'distractorPolicy': '1-rule-off: hver distraktor bryter eksakt ett regelledd',
        'items': meta_items,
    }
    for name, data in (('def-puzzle-v1.no.json', def_no),
                       ('def-puzzle-v1.en.json', def_en),
                       ('_puzzle_pool_meta.json', meta)):
        path = os.path.join(outdir, name)
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print('skrev', path)

    # intern rask-sjekk (ingen RNG): korrekt glyph faktisk i options, korrektIndex stemmer
    for lang, items in (('no', items_no), ('en', items_en)):
        for it in items:
            for v in it['variants']:
                labels = [o['label'] for o in v['options']]
                assert labels[v['correctIndex']] == meta_items[it['id']]['correctGlyph'], it['id']
                assert len(set(labels)) == 4, it['id']
    print('intern rask-sjekk: 90x2 ok')


if __name__ == '__main__':
    outdir = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    if not os.path.isdir(outdir):
        os.makedirs(outdir, exist_ok=True)
    main()
