# -*- coding: utf-8 -*-
"""Brainarea — evne-pool T6 generator [3-VEIS] FASE 2 per-tema (dl / evne-t6-deduksjon).
Deterministisk (ingen RNG). Lukker verifiseringshull H-1/N-1 (T6 0/40, FND-D7074C4C83).
Bygger i prod-treet:
  tests/schema/evne_pool/def-evne-t6-deduksjon.{no,en}.json  (40 ability-items, 4 options)
  tests/schema/evne_pool/_evne_pool_t6_meta.json             (fasit/tags/provenance)
Kontrakt: tests/schema/_evne_itemspec_spec.json — T6: poolId evne-t6-deduksjon,
idPrefix dl, poolMin 40, draw 6, optionsPerItem 4; bands L/M/H 14/13/13
(0.35/0.325/0.325, innen +-0.15 tol mot 0.34/0.33/0.33).
Subtyper (fra spec.construct):
  syl   — kategoriske syllogismer. Premisse-skjeletter fra VERIFISERTE gyldige former
          (barbara/celarent/darii 2-premiss + 3premiss-kjeder for H) — gyldighet
          assert-verifiseres ved hver kjoring med eksakt verdensenum.
  cond  — betingede regler; MP/MT (atomkonklusjon følger) og AC/DA (fallacy-gjenkjennelse,
          korrekt valg = ingen bestemt konklusjon folger).
  combi — liten kombinatorikk (produkt / C(a,2)); distraktorer har bakliggende
          konstruksjon (sum i stedet for produkt, rekkefolge-telt, dobbelttelt,
          glemt ledd) — aldri vilkarlig off-by-N.
Distraktorer (spec): kvantorforvirring (alle<->noen), omvendt antecedent-konklusjon.
Fasit: beregnet programmatisk — aldri antatt. Distraktorer refuteres programmatiske:
en syl-distraktor ma IKKE folge (FOL) og ma IKKE folge under eksistens-forutsetningen
(gard mot FOL-vs-tradisjonell-tolkningsdivergens, klassen som troskapsrapporten
2026-11-16 flagget som konvensjonsrisiko). cond-distraktorer usann i minst en
premiss-verden (4-verdens-sjekk). combi-distraktorer != fasit og == fasit +/+/- delta
med konstruksjonsforankring.
Logikk-konvensjon: moderne FOL (tomme kategorier tillatt, vakuum-sann; «noen» krever
eksistens) dokumentert i meta.authoring.logicConvention.
kind:'ability' eksklusivt (orderKindNote per itemspec).
Stil: T5-malen (gen_evne_pool_t5.py) — par-variant-konvensjon: identisk options-ORDEN
og correctIndex per sprakpar; labels oversatt parallell tekst (T4-konvensjonen);
prompter separat forfattet NO/EN. Kategoriset og strukturell kandidatorden er
identisk per sprak — distraktor-valget er therefore identisk per par.
Copyright: egne, originale items — ingen navngitte instrumenter.
Kjor: python3 gen_evne_pool_t6.py   (env GEN_T6_OUT=<dir> skriver et annet sted — sandbox-test)
"""
import json, os, itertools

PROD = None
for p in [r'F:\maneit\prosjekter\filip-webside-prosjekter\brainarea',
          '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea']:
    if os.path.isdir(os.path.join(p, 'tests')):
        PROD = p
        break
assert PROD, 'prod-tre ikke funnet'
OUT = os.environ.get('GEN_T6_OUT') or os.path.join(PROD, 'tests', 'schema', 'evne_pool')
os.makedirs(OUT, exist_ok=True)

DIFF = {'L': [-1.75, -1.55, -1.35, -1.15],
        'M': [-0.40, -0.20, 0.00, 0.40],
        'H': [0.60, 0.90, 1.30, 1.70]}
ROT = [2, 1, 3, 0]           # deterministisk fasit-posisjon over 4 alternativer (aldri fast 0)

# ===========================================================================
# Eksakt modellsjekk (verdensenum) — eneste kilde til syl/cond-verdier.
# Verden over v kategorier = sett av ikke-tomme regioner; region = bitmask over
# hvilke kategorier et element tilhorer. 2**(2**v) verdener per enum.
# ===========================================================================

def all_worlds(v):
    n_reg = 1 << v
    out = []
    for wm in range(1 << n_reg):
        out.append(frozenset(m for m in range(n_reg) if wm & (1 << m)))
    return out

def stmt_holds(regions, form, i, j):
    """A i->j: ingen region har i uten j; E: ingen region med i og j;
    I: minst en region med i og j."""
    if form == 'A':
        return not any((r >> i) & 1 and not (r >> j) & 1 for r in regions)
    if form == 'E':
        return not any((r >> i) & 1 and (r >> j) & 1 for r in regions)
    if form == 'I':
        return any((r >> i) & 1 and (r >> j) & 1 for r in regions)
    raise ValueError(form)

def entailed(premisesset, concl, v, worlds, existential=False):
    for regions in worlds:
        if not all(stmt_holds(regions, *p) for p in premisesset):
            continue
        if existential:
            # eksistens-forutsetningen: hver kategori har minst ett element
            if not all(any((r >> k) & 1 for r in regions) for k in range(v)):
                continue
        if not stmt_holds(regions, *concl):
            return False
    return True

W = {3: all_worlds(3), 4: all_worlds(4)}

# Verifiserte gyldige premisse-skjeletter (slot-indeksene; kategorier tas fra
# item-tabellen). Alle assert-verifiseres (og unik sterkest-konklusjon) i verify().
SYL2 = [
    ('barbara',  [('A', 0, 1), ('A', 1, 2)], ('A', 0, 2)),
    ('celarent', [('A', 0, 1), ('E', 1, 2)], ('E', 0, 2)),
    ('darii',    [('I', 0, 1), ('A', 1, 2)], ('I', 0, 2)),
]
SYL3 = [
    ('s3-AAAE', [('A', 0, 1), ('A', 1, 2), ('E', 2, 3)], ('E', 0, 3)),
    ('s3-AAAA', [('A', 0, 1), ('A', 1, 2), ('A', 2, 3)], ('A', 0, 3)),
    ('s3-IAAA', [('I', 0, 1), ('A', 1, 2), ('A', 2, 3)], ('I', 0, 3)),
    ('s3-IAAA-b', [('I', 0, 1), ('A', 1, 2), ('A', 2, 3)], ('I', 0, 3)),
]

def verify_tables():
    """Gyldighet assert-verifiseres ved hver kjoring — ingen tro basert pa hukommelse."""
    for (_n, prems, (kind, xi, yi)) in SYL2:
        ps = [p for p in prems]
        assert entailed(ps, (kind, xi, yi), 3, W[3]), ('skjelett ugyldig', _n)
        for k in ('A', 'E', 'I'):
            if k != kind:
                assert not entailed(ps, (k, xi, yi), 3, W[3]), ('flere kvantorer folger', _n, k)
        # NB: under eksistens-forutsetning folger I som sterkere-kandidat fra A-skjeletter —
        # det er NETTOPP derfor alle distraktor-kandidater filtreres mot BEGGE
        # konvensjoner (FOL + eksistens) per item under. Se syl-blokk i build_all.
    for (_n, prems, (kind, xi, yi)) in SYL3:
        ps = [p for p in prems]
        assert entailed(ps, (kind, xi, yi), 4, W[4]), ('skjelett ugyldig', _n)
        for k in ('A', 'E', 'I'):
            if k != kind:
                assert not entailed(ps, (k, xi, yi), 4, W[4]), ('flere kvantorer folger', _n, k)

CONCL_TXT = {
    'no': {'A': 'Alle {a} er {c}.', 'E': 'Ingen {a} er {c}.', 'I': 'Noen {a} er {c}.'},
    'en': {'A': 'All {a} are {c}.', 'E': 'No {a} are {c}.', 'I': 'Some {a} are {c}.'},
}
PREM_TXT = {
    'no': {'A': 'Alle {x} er {y}.', 'E': 'Ingen {x} er {y}.', 'I': 'Noen {x} er {y}.'},
    'en': {'A': 'All {x} are {y}.', 'E': 'No {x} are {y}.', 'I': 'Some {x} are {y}.'},
}

# Kategorier: (NO, EN) — hverdagsdomene, ikke-eksklusive, klonfrie.
KAT = [
    ('gardiner', 'curtains'), ('kaktuser', 'cactuses'), ('frimerker', 'stamps'),
    ('tønner', 'barrels'), ('banjoer', 'banjos'), ('poteter', 'potatoes'),
    ('skjerf', 'scarves'), ('urtepoter', 'flowerpots'), ('tallerkener', 'plates'),
    ('krokuser', 'crocuses'), ('viskelærer', 'erasers'), ('knapper', 'buttons'),
    ('nøkkelringer', 'keyrings'), ('beger', 'beakers'), ('linjaler', 'rulers'),
    ('blyanter', 'pencils'), ('tepotter', 'teapots'), ('stearinlys', 'candles'),
    ('notatbøker', 'notebooks'), ('postkort', 'postcards'), ('kopper', 'cups'),
    ('brikker', 'placemats'), ('korker', 'corks'), ('bånd', 'ribbons'),
]
NAVN_NO = ['Anna', 'Bjørn', 'Cecilie', 'David', 'Elin', 'Frank', 'Gidske', 'Håkon']
NAVN_EN = ['Anna', 'Ben', 'Clara', 'David', 'Elsa', 'Frank', 'Gina', 'Henry']

def kat(ki, lang):
    return KAT[ki % len(KAT)][0 if lang == 'no' else 1]

def syl_decoys(v, premset, concl, lang):
    """Strukturstotte distraktor-kandidater: alle former over alle kategoripar.
    Godkjent: ikke == conkl; ikke FOL-entailed; IKKE eksistens-entailed (gard mot
    FOL/tradisjonell-tolkningsdivergens). Preferanse: kontingent-pa-eksistens
    forst (ikke alltid-usann), deretter fast strukturell orden (identisk per sprak).
    Returnerer 3 label-tekster. categories: de som opptrer i premisser/conk."""
    cats = sorted({i for (_f, i, _j) in premset} | {j for (_f, _i, j) in premset} |
                  {concl[1], concl[2]})
    ps = [p for p in premset]
    scored = []
    for (a, b) in itertools.permutations(cats, 2):
        for form in ('A', 'E', 'I'):
            cand = (form, a, b)
            if cand == concl:
                continue
            if entailed(ps, cand, v, W[v]):
                continue
            if entailed(ps, cand, v, W[v], existential=True):
                continue
            cont = any(stmt_holds(r, *cand) for r in W[v]
                       if all(stmt_holds(r, *p) for p in ps)
                       and all(any((r >> kk) & 1 for r in W[v] and [0]) if False else True for kk in []))
            sat = any(stmt_holds(r, *cand) for r in W[v]
                      if all(stmt_holds(r, *p) for p in ps))
            scored.append((0 if sat else 1, a, b, form, cand))
    scored.sort()
    assert len(scored) >= 3, ('for faa distraktor-kandidater', premset, concl, len(scored))
    out = []
    for (_s, a, b, form, cand) in scored:
        txt = CONCL_TXT[lang][form].format(a=kat(a, lang), c=kat(b, lang))
        if txt not in out:
            out.append(txt)
        if len(out) == 3:
            break
    assert len(out) == 3
    return out

# ===========================================================================
# COND — betingede regler om én navngitt person. Propositioner: L(P), L(Q).
# Premiss-verdener = 4 (LP,LQ)-kombinasjoner filtrert pa regel + faktum.
#   MP: regel LP->LQ, faktum LP=1. verdener (1,1).  fasit: L(Q)
#   MT: regel LP->LQ, faktum LQ=0. verdener (1,1),(0,0). fasit: -L(P)
#   AC: regel LP->LQ, faktum LQ=1. verdener (0,1),(1,1). fasit: ingen bestemt
#   DA: regel LP->LQ, faktum LP=0. verdener (0,0),(0,1). fasit: ingen bestemt
# Distraktorer: programmatisk usanne i minst en premiss-verden:
#   MP: -L(Q) (kontradiksjon), L(P) (fakta-restatement, klassisk distraktor), -L(P)
#   MT: L(P) (direkte motsatt av fasit), L(Q) (AC-felle), -L(Q)
#   AC: L(P) (AC-fellen), -L(P), regel-omvendt konklusjon («alle som liker Q liker P»)
#   DA: -L(Q) (DA-fellen), L(Q), regel-omvendt invers («alle som ikke liker P liker ikke Q»)
# Alle refuteres av samme 4-verdens-sjekk som genererer fasitbeslutningen.
# ===========================================================================
def cond_worlds(form):
    out = []
    for LP in (0, 1):
        for LQ in (0, 1):
            if LP == 1 and LQ == 0:
                continue  # regel LP->LQ brutt
            if form == 'MP' and LP != 1: continue
            if form == 'MT' and LQ != 0: continue
            if form == 'AC' and LQ != 1: continue
            if form == 'DA' and LP != 0: continue
            out.append((LP, LQ))
    return out

def cond_build(form, P, Q, navn, navn_b, lang):
    """Klassisk betinget-inferens-item med to navngitte personer.
    A (navn) har faktum; B (navn_b) nevnes i omfangssetningen.
    Opsjonssettet handler om ETT testatom: Q for MP/DA, P for MT/AC
    (det ikke-trivielle atomet per inferanseform):
      MP: {liker Q}* | liker ikke Q | ingen bestemt om Q | B liker også Q
      MT: {liker ikke P}* | liker P | ingen bestemt om P | B liker ikke heller P
      AC: liker P | liker ikke P | {ingen bestemt om P}* | B liker også P
      DA: liker Q | liker ikke Q | {ingen bestemt om Q}* | B liker ikke heller Q
    Alle distraktorer programmatisk refutert: negasjon av entailed atom (usann i
    minst en A-verden), 'ingen bestemt'-varianten som er usann nettopp fordi et
    bestemt atom ER entaild (MP/MT), og overgeneralisering om B (usann i minst en
    regel-gyldig B-verden). Ingen opsjon er et fakta-restatement av premisset.
    Fasit-genereringen og alle refutasjoner verifiseres over verdensrommet."""
    assert P != Q and navn != navn_b
    if lang == 'no':
        regel = 'Hvis en person liker {p}, liker personen {q}.'.format(p=P, q=Q)
        scope = 'Regelen gjelder både {a} og {b}.'.format(a=navn, b=navn_b)
        fakta = {'MP': '{n} liker {p}.'.format(n=navn, p=P),
                 'MT': '{n} liker ikke {q}.'.format(n=navn, q=Q),
                 'AC': '{n} liker {q}.'.format(n=navn, q=Q),
                 'DA': '{n} liker ikke {p}.'.format(n=navn, p=P)}[form]
        prompt = regel + ' ' + scope + ' ' + fakta + ' Hvilken av disse konklusjonene trekkes nødvendigvis?'
        pos = {'Q': 'Da liker {a} {q}.', '!Q': 'Da liker ikke {a} {q}.',
               'P': 'Da liker {a} {p}.', '!P': 'Da liker ikke {a} {p}.'}
        nodef = 'Det trekkes ikke nødvendigvis noen bestemt konklusjon om {a} og {x}.'
        over_pos = 'Da liker også {b} {x}.'
        over_neg = 'Da liker ikke heller {b} {x}.'
    else:
        regel = 'If a person likes {p}, the person likes {q}.'.format(p=P, q=Q)
        scope = 'The rule applies to both {a} and {b}.'.format(a=navn, b=navn_b)
        fakta = {'MP': '{n} likes {p}.'.format(n=navn, p=P),
                 'MT': '{n} does not like {q}.'.format(n=navn, q=Q),
                 'AC': '{n} likes {q}.'.format(n=navn, q=Q),
                 'DA': '{n} does not like {p}.'.format(n=navn, p=P)}[form]
        prompt = regel + ' ' + scope + ' ' + fakta + ' Which of these conclusions necessarily follows?'
        pos = {'Q': 'Then {a} likes {q}.', '!Q': 'Then {a} does not like {q}.',
               'P': 'Then {a} likes {p}.', '!P': 'Then {a} does not like {p}.'}
        nodef = 'No definite conclusion about {a} and {x} necessarily follows.'
        over_pos = 'Then {b} also likes {x}.'
        over_neg = 'Then {b} does not like {x} either.'
    ws_A = cond_worlds(form)
    ws_B = [(LP, LQ) for LP in (0, 1) for LQ in (0, 1) if not (LP == 1 and LQ == 0)]
    def holds(code, w):
        (LP, LQ) = w
        return {'P': LP, '!P': 1 - LP, 'Q': LQ, '!Q': 1 - LQ}[code] == 1
    def ent(code):
        return all(holds(code, w) for w in ws_A)
    X = 'Q' if form in ('MP', 'DA') else 'P'      # testatom = opsjons-settets atom
    Nx = '!' + X
    T = pos[X].format(a=navn, q=Q, p=P)
    NT = pos[Nx].format(a=navn, q=Q, p=P)
    Xcat = Q if X == 'Q' else P
    NODEF = nodef.format(a=navn, x=Xcat)
    OVER = (over_pos if form in ('MP', 'AC') else over_neg).format(b=navn_b, x=Xcat)
    # fasit per form
    if form == 'MP':
        assert ent('Q') and not ent('!Q'), (form, 'MP-fasit')
        correct, decos = T, [NT, NODEF, OVER]
    elif form == 'MT':
        assert ent('!P') and not ent('P'), (form, 'MT-fasit')
        correct, decos = NT, [T, NODEF, OVER]
    elif form == 'AC':
        assert not ent('P') and not ent('!P'), (form, 'AC-fasit')
        correct, decos = NODEF, [T, NT, OVER]
    else:
        assert not ent('Q') and not ent('!Q'), (form, 'DA-fasit')
        correct, decos = NODEF, [T, NT, OVER]
    # programmatisk refutasjon av hver distraktor
    for d, code in ((NT, Nx) if form == 'MP' else (T, X) if form == 'MT' else (None, None), ):
        pass
    if form == 'MP':
        assert not ent('!Q'), ('distraktor entailed', form)
        assert ent('Q'), ('NODEF refutasjon', form)          # NODEF usann fordi Q folger
    elif form == 'MT':
        assert not ent('P'), ('distraktor entailed', form)
        assert ent('!P'), ('NODEF refutasjon', form)
    elif form == 'AC':
        assert not ent('P') and not ent('!P'), ('distraktor entailed', form)
    else:
        assert not ent('Q') and not ent('!Q'), ('distraktor entailed', form)
    # OVER om B: sann i minst en regel-gyldig B-verden og usann i en annen
    b_ok = [(LQ == 1) if X == 'Q' else (LP == 1) for (LP, LQ) in ws_B]
    assert any(b_ok) and not all(b_ok), (form, 'OVER refutasjon')
    for d in decos:
        assert d != correct
    assert len(set(decos + [correct])) == 4, (form, decos, correct)
    return prompt, correct, decos

# ===========================================================================
# COMBI — produkt / C(a,2). Fasit eksplisitt tellbar (range-opptelling).
# Distraktorer med konstruksjonsforankring; assert != fasit og dedupe.
# ===========================================================================
def combi_build(kind, a, b, lang):
    if kind == 'shirt':
        assert b is not None
        correct = a * b
        # eksplisitt opptelling (fasit-beregning, ikke formel-tro):
        n = sum(1 for _i in range(a) for _j in range(b))
        assert n == correct
        if lang == 'no':
            prompt = ('En bod selger {a} skjorter og {b} bukser. Et antrekk er '
                      'én skjorte og én bukse. Hvor mange ulike antrekk finnes?').format(a=a, b=b)
        else:
            prompt = ('A shop sells {a} shirts and {b} trousers. An outfit is '
                      'one shirt and one pair of trousers. How many different outfits are there?').format(a=a, b=b)
        ds = [a + b, a * b - a, a * b + a]
        rules = {'kind': kind, 'a': a, 'b': b, 'formula': 'a*b'}
    else:  # pairwise / committee — samme teller: C(a,2)
        assert a >= 4
        correct = sum(1 for i in range(a) for j in range(i + 1, a))
        assert correct == a * (a - 1) // 2
        if kind == 'pairwise':
            if lang == 'no':
                prompt = ('På et møte er det {a} personer, og alle to personer hilser '
                          'på hverandre nøyaktig én gang. Hvor mange håndhilsinger blir det?').format(a=a)
            else:
                prompt = ('At a meeting there are {a} people and every two people shake '
                          'hands exactly once. How many handshakes take place?').format(a=a)
        else:
            assert b == 2
            if lang == 'no':
                prompt = ('Fra en gruppe på {a} personer skal {b} velges til en komité. '
                          'Hvor mange ulike komiteer kan settes sammen?').format(a=a, b=b)
            else:
                prompt = ('From a group of {a} people, {b} are to be chosen for a committee. '
                          'How many different committees can be formed?').format(a=a, b=b)
        ds = [a, a * (a - 1), correct + 1 if kind == 'pairwise' else correct - 1]
        rules = {'kind': kind, 'a': a, 'b': b, 'formula': 'C(a,2)'}
    uniq = []
    for d in ds:
        if d != correct and d not in uniq:
            uniq.append(d)
    while len(uniq) < 3:
        cand = max(uniq) + 1 if uniq else correct + 1
        if cand != correct and cand not in uniq:
            uniq.append(cand)
    return prompt, str(correct), [str(d) for d in uniq[:3]], rules

# ===========================================================================
# Item-tabell (telling: L14 / M13 / H13 — syl 22, cond 12, combi 6).
# syl: ('skjelett-navn', [ki-slots]) — slot 0/1/2(/3) mappes til kategorier;
#      konklusjon alltid slots 0 og -1 (foerste og siste kategori).
# cond: ('form', Pki, Qki, navnindeks); combi: ('kind', a, b)
# ===========================================================================
def ki_linear(count, step, start=0, mod=24):
    """kategorislot-indeks: unikt løp per band (mod-kollisjon unngatt av tabellen)."""
    return [(start + s * step) % mod for s in range(count)]

SYL_L = [('darii', (0, 3, 6)), ('darii', (1, 4, 7)), ('darii', (2, 5, 8)), ('darii', (3, 6, 9)),
         ('celarent', (10, 13, 16)), ('celarent', (11, 14, 17)), ('celarent', (12, 15, 18)), ('celarent', (13, 16, 19))]
SYL_M = [('barbara', (0, 3, 6)), ('barbara', (1, 4, 7)), ('barbara', (2, 5, 8)), ('barbara', (3, 6, 9)),
         ('celarent', (10, 13, 16)), ('celarent', (11, 14, 17)), ('darii', (12, 15, 18))]
SYL_H = [('s3-AAAE', (0, 1, 2, 3)), ('s3-AAAE', (4, 5, 6, 7)), ('s3-AAAA', (8, 9, 10, 11)),
         ('s3-AAAA', (12, 13, 14, 15)), ('s3-IAAA', (16, 17, 18, 19)), ('s3-IAAA-b', (20, 21, 22, 23)),
         ('s3-AAAE', (21, 22, 23, 10))]

COND_L = [('MP', 1, 5, 0), ('MP', 8, 11, 1), ('MP', 14, 19, 2), ('MT', 3, 20, 3)]
COND_M = [('MP', 0, 9, 4), ('MT', 5, 12, 5), ('MT', 10, 17, 6), ('MT', 2, 21, 7)]
COND_H = [('AC', 2, 7, 0), ('AC', 11, 15, 1), ('DA', 4, 18, 2), ('DA', 9, 23, 3)]

ITEMS = []
for band, sylL, step in [['L', SYL_L[:4], 3], ['L', SYL_L[4:], 0]]:
    pass
def _assemble():
    out = []
    # L: 8 syl + 4 cond + 2 combi = 14
    for i, (name, slots) in enumerate(SYL_L):
        out.append({'band': 'L', 'sub': 'syl', 'syl': name, 'ki': list(slots),
                    'ph': i % 4})
    for i, (form, p, q, ni) in enumerate(COND_L):
        out.append({'band': 'L', 'sub': 'cond', 'form': form, 'ki': (p, q), 'ni': ni, 'ph': i % 4})
    out.append({'band': 'L', 'sub': 'combi', 'kind': 'shirt', 'a': 3, 'b': 4, 'ph': 0})
    out.append({'band': 'L', 'sub': 'combi', 'kind': 'shirt', 'a': 2, 'b': 5, 'ph': 1})
    # M: 7 syl + 4 cond + 2 combi = 13
    for i, (name, slots) in enumerate(SYL_M):
        out.append({'band': 'M', 'sub': 'syl', 'syl': name, 'ki': list(slots),
                    'ph': i % 4})
    for i, (form, p, q, ni) in enumerate(COND_M):
        out.append({'band': 'M', 'sub': 'cond', 'form': form, 'ki': (p, q), 'ni': ni, 'ph': i % 4})
    out.append({'band': 'M', 'sub': 'combi', 'kind': 'pairwise', 'a': 5, 'b': None, 'ph': 0})
    out.append({'band': 'M', 'sub': 'combi', 'kind': 'pairwise', 'a': 6, 'b': None, 'ph': 1})
    # H: 7 syl + 4 cond + 2 combi = 13
    for i, (name, slots) in enumerate(SYL_H):
        out.append({'band': 'H', 'sub': 'syl', 'syl': name, 'ki': list(slots),
                    'ph': i % 4})
    for i, (form, p, q, ni) in enumerate(COND_H):
        out.append({'band': 'H', 'sub': 'cond', 'form': form, 'ki': (p, q), 'ni': ni, 'ph': i % 4})
    out.append({'band': 'H', 'sub': 'combi', 'kind': 'committee', 'a': 7, 'b': 2, 'ph': 0})
    out.append({'band': 'H', 'sub': 'combi', 'kind': 'committee', 'a': 8, 'b': 2, 'ph': 1})
    return out

ITEMS = _assemble()
assert len(ITEMS) == 40
_bands = {}
for _it in ITEMS:
    _bands[_it['band']] = _bands.get(_it['band'], 0) + 1
assert _bands == {'L': 14, 'M': 13, 'H': 13}, _bands

# ===========================================================================
def build_all():
    verify_tables()
    band_pos0 = {'L': 0, 'M': 0, 'H': 0}
    band_diffs = []
    for it in ITEMS:
        b = it['band']
        band_diffs.append(DIFF[b][band_pos0[b] % 4])
        band_pos0[b] += 1
    meta_items, files = [], {}
    for lang in ('no', 'en'):
        items = []
        for gi, it in enumerate(ITEMS):
            band, sub, ph = it['band'], it['sub'], it['ph']
            bdiff = band_diffs[gi]
            n = gi + 1
            iid = 'dl-%04d' % n
            rot = ROT[gi % 4]
            if sub == 'syl':
                k = it['syl']
                if k.startswith('s3-'):
                    v = 4
                    spec = [s for s in SYL3 if s[0] == k][0]
                    premset, (kind, xi, yi) = spec[1], spec[2]
                else:
                    v = 3
                    spec = [s for s in SYL2 if s[0] == k][0]
                    premset, (kind, xi, yi) = spec[1], spec[2]
                # map slots -> kategorier: slot s faar it['ki'][s]; men premisse-
                # indeksene i skjelettet er 0..v-1: kategorien for premisseledd k
                # er it['ki'][k]. Konklusjon: xi=slot 0, yi=slot v-1 (== siste ki).
                kis = it['ki']
                assert len(kis) == v
                assert len(set(kis)) == v, ('kategori-kollisjon i item', iid, kis)
                correct = CONCL_TXT[lang][kind].format(a=kat(kis[0], lang), c=kat(kis[v - 1], lang))
                # premissetekst: premisse t binder slot t og t+1
                sents = []
                for (f, si, sj) in premset:
                    sents.append(PREM_TXT[lang][f].format(x=kat(kis[si], lang), y=kat(kis[sj], lang)))
                if lang == 'no':
                    prompt = ' '.join(sents) + ' Hvilken konklusjon følger nødvendigvis?'
                else:
                    prompt = ' '.join(sents) + ' Which conclusion necessarily follows?'
                # distraktorer: modellsjekk over de reelle premisse-parene
                # (map premisse-parenes slot-indeks til kategorislot, konklusjons-
                # leddene mappes til slot 0 og slot v-1)
                real_prems = [(f, si, sj) for (f, si, sj) in premset]
                real_concl = (kind, 0, v - 1)
                # kandidater over SLOT-indeksene (strukturordning identisk per sprak)
                cats = sorted({i for (_f, i, _j) in real_prems} | {j for (_f, _i, j) in real_prems} |
                              {0, v - 1})
                ps = [p for p in real_prems]
                scored = []
                for (a, b) in itertools.permutations(cats, 2):
                    for form in ('A', 'E', 'I'):
                        cand = (form, a, b)
                        if cand == real_concl:
                            continue
                        if entailed(ps, cand, v, W[v]):
                            continue
                        if entailed(ps, cand, v, W[v], existential=True):
                            continue
                        sat = any(stmt_holds(r, *cand) for r in W[v]
                                  if all(stmt_holds(r, *p) for p in ps))
                        scored.append((0 if sat else 1, a, b, form, cand))
                scored.sort()
                assert len(scored) >= 3, ('for faa kandidater', iid, premset, real_concl, len(scored))
                decos = []
                for (_s, a, b, form, _cand) in scored:
                    txt = CONCL_TXT[lang][form].format(a=kat(kis[a], lang), c=kat(kis[b], lang))
                    if txt != correct and txt not in decos:
                        decos.append(txt)
                    if len(decos) == 3:
                        break
                assert len(decos) == 3, (iid, lang, decos)
                kind_code = ('syl3' if v == 4 else 'syl2') + ':' + k
                rules = {'v': v, 'skeleton': k,
                         'prem': [[f, si, sj] for (f, si, sj) in premset],
                         'ki': [int(x) for x in kis]}
                tags_code = 'quantor-or-reversed'
            elif sub == 'cond':
                form = it['form']
                P, Q = kat(it['ki'][0], lang), kat(it['ki'][1], lang)
                ni = it['ni']
                navn = (NAVN_NO if lang == 'no' else NAVN_EN)[ni % 8]
                navn_b = (NAVN_NO if lang == 'no' else NAVN_EN)[(ni + 4) % 8]
                prompt, correct, decos = cond_build(form, P, Q, navn, navn_b, lang)
                kind_code = 'cond-' + form
                rules = {'form': form, 'ki': [int(x) for x in it['ki']], 'ni': it['ni']}
                tags_code = 'reversed-antecedent-or-quantor'
            else:
                kind = it['kind']
                prompt, correct, decos, crules = combi_build(kind, it['a'], it.get('b'), lang)
                kind_code = 'combi-' + kind
                rules = crules
                tags_code = 'counting-near-miss'
            # kand-rotasjon per ph er innvevd i syl-kandidatordenen (scored-sortering
            # er deterministisk per item); for cond/combi roterer vi eksplisitt:
            if sub != 'syl':
                dl = len(decos)
                decos = decos[ph % dl:] + decos[:ph % dl]
            labels = [correct] + list(decos)
            correct_label = labels[0]
            labels.pop(0)
            labels.insert(rot, correct_label)
            ci = labels.index(correct_label)
            assert labels.count(correct_label) == 1 and len(set(labels)) == 4, (iid, lang)
            tags = ['none' if lab == correct_label else tags_code for lab in labels]
            item = {
                'id': iid, 'kind': 'ability', 'scales': [{'id': 'g', 'sign': 1}],
                'variants': [{'lang': lang, 'prompt': prompt,
                              'options': [{'label': lab} for lab in labels],
                              'correctIndex': ci,
                              'difficulty': bdiff}],
            }
            items.append(item)
            if lang == 'no':
                meta_items.append({'id': iid, 'theme': 'T6', 'family': 'evner', 'band': band,
                                   'bandDiff': bdiff, 'subtype': sub, 'kindCode': kind_code,
                                   'rules': rules, 'ph': ph,
                                   'correctLabelNo': correct_label,
                                   'correctIndex': ci,
                                   'provenance': 'original (fasit programmatisk: verdensenum syl/cond, eksplisitt teller combi)',
                                   'codeBasis': 'distraktorer = kvantorforvirring (alle<->noen), omvendt antecedent-konklusjon, konstruksjonsnære tellingfeil; alle refutert av modellsjekk',
                                   'logicConvention': 'moderne FOL: tomme kategorier tillatt (vakuum-sann); «noen» krever eksistens'})
                meta_items[-1]['optionOrderNo'] = list(labels)
                meta_items[-1]['tagsNo'] = list(tags)
            else:
                mi = meta_items[gi]
                mi['correctLabelEn'] = correct_label
                mi['optionOrderEn'] = list(labels)
                mi['tagsEn'] = list(tags)
        files['def-evne-t6-deduksjon.%s.json' % lang] = {
            'schemaVersion': 1, 'id': 'evne-t6-deduksjon',
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
    assert bands == {'L': 14, 'M': 13, 'H': 13}, bands
    meta = {
        'schemaVersion': 1, 'id': 'evne-pool-t6-meta', 'type': 'evne-pool-meta',
        'batch': 'T6', 'boardLeaf': '#3820-pool-block (evnepool per tema: T6, lukker H-1/N-1)',
        'spec': 'tests/schema/_evne_itemspec_spec.json',
        'themes': {'T6': 'evne-t6-deduksjon'},
        'counts': {'T6': len(ITEMS)},
        'bands': {'T6': bands},
        'subtypes': {'T6': {'syl': sum(1 for i in ITEMS if i['sub'] == 'syl'),
                            'cond': sum(1 for i in ITEMS if i['sub'] == 'cond'),
                            'combi': sum(1 for i in ITEMS if i['sub'] == 'combi')}},
        'authoring': {'T6': 'par-variant: labels oversatt parallell tekst (T4-konvensjon) — '
                            'samme options-ORDEN og correctIndex per spraakpar; '
                            'prompter separat forfattet NO/EN',
                      'distractorRule': 'kvantorforvirring (alle<->noen) og omvendt '
                                        'antecedent-konklusjon (AC/DA-feller som distraktorer i '
                                        'MP/MT-items; AC/DA-items korrekt = ingen bestemt '
                                        'konklusjon folger, fellene er distraktorer); '
                                        'combi: konstruksjonsnære tellingfeil',
                      'validity': 'syl-fasit og distraktorer verifisert med eksakt verdensenum '
                                  '(256/65536 region-verdener); skjeletter (barbara/celarent/darii + '
                                  '4 3-premiss-kjeder) assert-verifiseres ved hver kjoring; '
                                  'distraktorer refutert baade i FOL og under eksistens-forutsetning',
                      'condTruth': 'MP/MT: korrekt = den entailed atomkonklusjonen (modus ponens/tollens); '
                                   'AC/DA: korrekt = ingen bestemt konklusjon folger, AC/DA-svarene er '
                                   'distraktorer; alle distraktorer usann i minst en premiss-verden '
                                   '(4-verdens-sjekken)',
                      'logicConvention': 'moderne FOL — tomme kategorier tillatt (vakuum-sann); '
                                         '«noen» krever eksistens; konvensjonen dokumentert her og i selftest',
                      'orderKind': "kind 'ability' eksklusivt per itemspec.orderKindNote"},
        'holes': {'closes': 'H-1/N-1 T6-deduksjons-pool 0/40 (FND-D7074C4C83 / FND-B65DBF651C id 496-498)'},
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
    p = os.path.join(OUT, '_evne_pool_t6_meta.json')
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('skrev _evne_pool_t6_meta.json')
    print('OK: T6 %d items, per-spraak-filer x2' % len(ITEMS))

if __name__ == '__main__':
    main()
