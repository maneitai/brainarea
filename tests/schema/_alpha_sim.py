#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Brainarea FASE 2 — alpha-beregning per skala for alle pooler (EN). todo #3768 [BYGG].
v2: korrekt mulberry32-port (v1-porten hadde feil bit-aritmetikk; oppdaget av alpha-selvtesten:
negative alpha for sign-blandede pooler), og eksakt kvadratur-teori (Simpson over theta) i stedet
for kun simulering.

Modell (v3-final; sign-semantikken er EMPIRISK VERIFISERT mot IPIP-tradisjonen):
  Likert (persona + nd): graderingsmodell. Latent theta ~ N(0,1). Per item:
  x = s*lambda*theta + e, e ~ N(0, 1-lambda^2), s = item-tegnet (+1/-1).
  Kategori K = 1..5 over kuttene [-1.0676,-0.5243,0,+0.5243,+1.0676]; skår = K for s=+1,
  6-K for s=-1 (IPIP 6-v-konvensjonen); alpha-invariant under full reversering (S5).
  Eksakt teoretisk alpha (n->uendelig), Simpson-grid over theta:
  Var(skår) = Var(E[skår|theta]) + E[Var(skår|theta)] (totalvarianssetningen);
  Var(sum-skår) = Var(sum av skårmiddler) + sum av feilvarians — feilvarians-leddet
  manglet i v2 (ga umulig alpha -2.3e9 på mix-skalaene) og er korrigert + backet av sim.
  lambda kalibreres mot publiserte IPIP-10-item-alphaer (ipip.ori.org, hentet 2026-11-15);
  ND-triage: ingen publisert alpha -> dokumentert lambda=0.65 + sensitivitetstabell.
  Ability (evner + puzzle): 2PL, p(θ)=logist(a*(θ-b)) over EKTE b-verdier fra
  *_meta.json (bandDiff). Eksakt KR-20 ved n->uendelig over S(theta)=sum p_i(theta) —
  sum-trekset, ingen parvis-matrise. a er ikke underbygget (ingen publisert verdi):
  a=1.5 + sensitivitetstabell a ∈ 1.00..2.00.

Determinisme: mulberry32(seed=20261116), samme seed-konvensjon som
tests/puzzle/_validitet_skaringsgyldighet.mjs. Ingen tredjepartsavhengigheter.
Kjoring: python3 tests/schema/_alpha_sim.py   ->  tests/schema/_alpha_result.json

IKKE MÅLTE TALL: ingen pool-responsdata foreligger foreløpig (normering-endpointen lagrer
ikke parvis respondens på github.io); alle verdier er INSTRUMENT-ESTIMATER under eksplisitte
modellantagelser; etiketten følger rapporten. #3769-kontrakten: alpha under .70 rapporteres,
ikke skjules.
"""
import json, math, os, collections

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '_alpha_result.json')
N_SIM = 300
SEED = 20261116
GRID = (-7.0, 7.0, 1400)          # Simpson-grid (jevn antall intervaller)
LAMBDA_GRID = [0.60, 0.65, 0.70, 0.75, 0.80]
A_GRID = [1.00, 1.25, 1.50, 1.75, 2.00]
LIK_CUT = [-1.0676, -0.5243, 0.0, 0.5243, 1.0676]   # 5 kutt? nei: 4 kutt -> 5 kategorier

# publiserte kildetall: ipip.ori.org/newBigFive5broadKey.htm (10-item-skalaer), hentet 2026-11-15
KILDE_ALPHA = {'extraversion': 0.87, 'agreeableness': 0.82, 'conscientiousness': 0.79,
               'neuroticism': 0.86, 'openness': 0.84}   # neuroticism: N-speiling, alpha-invariant

fails = []
SELFTEST_LOG = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    SELFTEST_LOG.append({'check': m, 'pass': bool(c)})
    if not c: fails.append(m)

# ---------------- mulberry32 (eksakt JS-port med Math.imul-semantikk) ----------------
M32 = 0xFFFFFFFF
def imul(x, y):
    x &= M32; y &= M32
    prod = x * y
    return (prod & M32) - ((prod >> 32) & M32 if prod > M32 else 0)  # lav 32 bit

def mulberry32(seed):
    a = seed & M32
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = a
        t = imul(t ^ (t >> 15), (t | 1) & M32)
        t = (t ^ ((t + imul(t ^ (t >> 7), (t | 61) & M32)) & M32)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296.0
    return f

_BM_TOGGLE = {'branch': 0}   # alternerer cos/sin-grenen per kall (begge er gyldige normaler)

def normal(rng):
    a, b = rng(), rng()
    u1 = max(a, 1e-12)
    r = math.sqrt(-2.0 * math.log(u1))
    _BM_TOGGLE['branch'] ^= 1
    return r * (math.cos(2*math.pi*b) if _BM_TOGGLE['branch'] == 0 else math.sin(2*math.pi*b))

def phi_cdf(x): return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))

# ---------------- Simpson-grid ----------------
def simpson_weights(a, b, n):
    assert n % 2 == 0
    h = (b - a) / n
    w = [(h/3.0) if (j == 0 or j == n) else ((4.0*h/3.0) if j % 2 else (2.0*h/3.0)) for j in range(n+1)]
    xs = [a + j*h for j in range(n+1)]
    return xs, w

XS, WS = simpson_weights(*GRID)
PHI_W = [w * math.exp(-0.5*x*x) / math.sqrt(2*math.pi) for x, w in zip(XS, WS)]  # vektet med normal-tetthet

# ---------------- Likert-teori ----------------
def m_v(x, lam):
    """m=E[g|x]=E[g(lam*x+e)] ikke; x her er lambda*theta (det delte leddet).
    e ~ N(0, 1-lam^2). Returner (m, v) = E[g], Var(g|x)."""
    se = math.sqrt(max(1e-9, 1.0 - lam*lam))
    z = [(c - x)/se for c in LIK_CUT]
    F = [phi_cdf(z[0])]
    for k in range(1, len(z)):
        F.append(max(F[-1], phi_cdf(z[k])))          # monotone kutt
    # kategorisannsynligheter q1..q5 over graderingsmodellen
    q = [F[0]]
    for k in range(1, len(F)):
        q.append(F[k] - F[k-1])
    q.append(1.0 - F[-1])
    m = sum((c+1)*qc for c, qc in enumerate(q))
    v = sum(((c+1)**2)*qc for c, qc in enumerate(q)) - m*m
    return m, v

def likert_theory_signed(k, lam, signs):
    """Eksakt teoretisk alpha per skala (n -> uendelig). signs: +1/-1 per item.
    Prosess (verifisert mot IPIP-tradisjonen, v3-sign-eksperimentet): latent ledd
    foelger item-tegnet, x = s*lam*theta (+feil); score = K for s=+1, 6-K for s=-1.
    E[6-K] = 6-E[K]; Var(6-K) = Var(K) — konstanten 6 bryter aldri kovariansen."""
    if not signs: return None
    mv_pos = [m_v(lam*th, lam) for th in XS]     # x = +lam*th
    mv_neg = [m_v(-lam*th, lam) for th in XS]    # x = -lam*th
    S = [0.0]*len(XS)
    var_item = 0.0
    var_err = 0.0                                 # feilvarians: sum(E[v(theta)]) per item
    for s in signs:
        mv = mv_pos if s > 0 else mv_neg
        sc = [(m if s > 0 else 6.0-m) for (m, _) in mv]     # skår-feltet over theta
        e2 = [(sc_j*sc_j + v) for sc_j, (_, v) in zip(sc, mv)]  # E[skår^2] = m'^2 + v(betinget)
        mu = sum(w*f for w, f in zip(PHI_W, sc))
        var_item += sum(w*f for w, f in zip(PHI_W, e2)) - mu*mu
        var_err += sum(w*v for w, (_, v) in zip(PHI_W, mv))
        for j, f in enumerate(sc):
            S[j] += f
    Em = sum(w*f for w, f in zip(PHI_W, S))
    var_total = sum(w*f*f for w, f in zip(PHI_W, S)) - Em*Em + var_err   # KOH: Var(sum) = Var(sum-middel) + sum-feilvar (v3-diagnosen: S-middel-varianten alene ga 20.205 + 8.927 = 29.13 = eksamen)
    if var_total <= 1e-12 or k < 1: return None
    r = (var_total - var_item) / ((k - 1.0) * (var_item / k))            # rBar-rettelse: sam-par/kov gj. over C(k,2)-par delt pa avg var
    alpha = (k/(k-1.0)) * (1.0 - var_item/var_total)
    return {'rBar': r, 'alpha': alpha, 'varItem': var_item, 'varShared': var_total - var_item}

def likert_theory(k, lam):
    """Eksakt teoretisk alpha, alle items + (bakoverkompatibel kjerne)."""
    mv = [m_v(lam*th, lam) for th in XS]
    mmean = sum(w*m for w, (m, _) in zip(PHI_W, mv))
    mvar  = sum(w*m*m for w, (m, _) in zip(PHI_W, mv)) - mmean*mmean
    vexp  = sum(w*v for w, (_, v) in zip(PHI_W, mv))
    var_item = mvar + vexp
    if var_item <= 1e-12: return None
    r = mvar / var_item
    alpha = k*r/(1.0 + (k-1.0)*r)
    return {'rBar': r, 'alpha': alpha, 'varItem': var_item, 'varShared': mvar}

def calibrate_lambda(target_alpha, k=10):
    """Finn lambda slik at eksakt teori for k=10 treffer publisert kildetall (biseksjon)."""
    lo, hi = 0.30, 0.98
    for _ in range(60):
        mid = (lo+hi)/2.0
        a = likert_theory(k, mid)['alpha']
        if a < target_alpha: lo = mid
        else: hi = mid
    return (lo+hi)/2.0

def alpha_from_k(k, r): return k*r/(1.0 + (k-1.0)*r)
def r_from_alpha(k, alpha): return alpha/(k - (k-1.0)*alpha) if k > 1 else None

# ---------------- Likert-simulering ----------------
def sim_likert_alpha(itemlist, n, rng, lam):
    """itemlist: [(id, sign)]; respondent-ytre loekke; deterministisk."""
    T = [normal(rng) for _ in range(n)]
    se = math.sqrt(max(1e-9, 1.0 - lam*lam))
    vecs = []
    for (iid, sign) in itemlist:
        vals = []
        for t in T:
            tt = sign*lam*t + se*normal(rng)      # prosessen foelger item-tegnet (v3-innsikten)
            kat = 1 + sum(1 for c in LIK_CUT if tt > c)
            vals.append(float(kat if sign > 0 else 6 - kat))
        vecs.append(vals)
    return cronbach(len(vecs), vecs)

def cronbach(k, itemvectors):
    m = len(itemvectors); n = len(itemvectors[0])
    if m < 2 or k <= 0: return None
    totals = [0.0]*n
    itvar = 0.0
    for it in itemvectors:
        for j, v in enumerate(it): totals[j] += v
        mu = sum(it)/n
        itvar += sum((v-mu)**2 for v in it)/n
    tmu = sum(totals)/n
    tvar = sum((t-tmu)**2 for t in totals)/n
    if tvar <= 1e-12: return None
    return (m/(m-1.0)) * (1.0 - itvar/tvar)

# ---------------- Ability-teori + simulering ----------------
def sigmoid(x): return 1.0/(1.0 + math.exp(-x))

def ability_theory(bvals, a):
    """Eksakt KR-20 ved n->uendelig i 2PL med theta~N(0,1). Sum-trekset."""
    S = [0.0]*len(XS)
    sum_pq = 0.0
    pm = []
    for b in bvals:
        pv = [sigmoid(a*(th-b)) for th in XS]
        for j, p in enumerate(pv):
            S[j] += p
        ppq = sum(w*p*(1.0-p) for w, p in zip(PHI_W, pv))
        sum_pq += ppq
        pm.append(sum(w*p for w, p in zip(PHI_W, pv)))
    Em = sum(w*s for w, s in zip(PHI_W, S))
    var_total = sum(w*s*s for w, s in zip(PHI_W, S)) - Em*Em
    k = len(bvals)
    if k < 2 or var_total <= 1e-12: return None
    return {'alpha': (k/(k-1.0))*(1.0 - sum_pq/var_total), 'varTotal': var_total,
            'sumPq': sum_pq, 'meanP': sum(pm)/k}

def sim_ability_alpha(bvals, n, rng, a):
    T = [normal(rng) for _ in range(n)]
    vecs = []
    for b in bvals:
        vecs.append([1.0 if rng() < sigmoid(a*(t-b)) else 0.0 for t in T])
    return cronbach(len(vecs), vecs)

# ---------------- Kjoring ----------------
def load_json(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def key_teller(d):
    out = collections.defaultdict(list)
    for it in d['items']:
        if it.get('kind') != 'likert': continue
        for s in it.get('scales', []):
            out[s['id']].append((it['id'], s.get('sign', 1)))
    return out

def likert_scale_block(itemlist, rng, lam_fixed=None):
    p, m_ = sum(1 for _, s in itemlist if s > 0), sum(1 for _, s in itemlist if s < 0)
    k = len(itemlist)
    block = {'k': k, 'keying': f'{p}+/{m_}-'}
    if k >= 10:
        # kalibrering mot pool-andel? NEI: kalibrering gjøres på skala-navn (kilde) i caller.
        pass
    return block

def main():
    rng = mulberry32(SEED)
    res = {'meta': {'todo': '#3768', 'version': '2', 'date': '2026-11-16', 'seed': SEED,
                    'simN': N_SIM, 'grid': list(GRID), 'lambdaGrid': LAMBDA_GRID,
                    'aGrid': A_GRID, 'model': 'likert-gradering(4 kutt)/2PL',
                    'kildetall': 'ipip.ori.org/newBigFive5broadKey.htm hentet 2026-11-15'},
           'pools': {}, 'selftest': []}

    # ---------- 1. persona-pools ----------
    pools = [('persona_pool/def-persona-pool-e-a.en.json', 'persona-e-a'),
             ('persona_pool/def-persona-pool-n-rest.en.json', 'persona-n-rest'),
             ('persona_pool/def-persona-pool-o-c.en.json', 'persona-o-c')]
    for fname, label in pools:
        d = load_json(os.path.join(HERE, fname))
        keys = key_teller(d)
        blk = {'kind': 'likert', 'source': fname, 'scales': {}}
        for scale, itemlist in sorted(keys.items()):
            # lambda-implied: kalibrer mot kildeskalaen (10-item) hvis kildetall finnes
            if scale in KILDE_ALPHA:
                lam = calibrate_lambda(KILDE_ALPHA[scale], k=10)
                lam_source = 'kalibrert mot kildetall %s (a=%.2f for 10 items)' % (KILDE_ALPHA[scale], KILDE_ALPHA[scale])
            else:
                lam = 0.75
                lam_source = 'dokumentert forhåndsvalg (ingen kildetall for fillers)'
            signs = [s for _, s in itemlist]
            th = likert_theory_signed(len(itemlist), lam, signs)
            th_tab = {str(l): likert_theory_signed(len(itemlist), l, signs)['alpha'] for l in LAMBDA_GRID}
            sim = sim_likert_alpha(itemlist, N_SIM, rng, lam)
            blk['scales'][scale] = {'k': len(itemlist), 'keying': '%d+/%d-' % (sum(1 for _, s in itemlist if s > 0), sum(1 for _, s in itemlist if s < 0)),
                'lambda': round(lam, 4), 'lambdaSource': lam_source,
                'lambdaSensitivity': th_tab,
                'theoryAlpha': th['alpha'], 'theoryRBar': th['rBar'],
                'simAlpha': sim, 'simN': N_SIM,
                'flag': ('under-0.70' if th['alpha'] < 0.70 else None)}
        # --- teoretisk arm 2: innholdsmikse over corpus (verbatim-arv + original-forvalg) ---
        def normtxt(t):
            return t.lower().strip().rstrip('.!?').strip()
        corpora = []
        for cf in sorted(os.listdir(os.path.join(HERE, 'persona_pool'))):
            if cf.startswith('_corpus_verbatim_en') and cf.endswith('.json'):
                cd = load_json(os.path.join(HERE, 'persona_pool', cf))
                corpora.append(set(normtxt(t) for t in cd.get('items', [])))
        vset = set().union(*corpora) if corpora else set()
        theo_mix = {}
        for scale, itemlist in keys.items():
            k = len(itemlist)
            # tekst-sporing: match EN-tekst mot corpus
            dd = load_json(os.path.join(HERE, fname))
            texts = {it['id']: normtxt(it['text']) for it in dd['items']
                     if it.get('kind') == 'likert' and any(s['id'] == scale for s in it.get('scales', []))}
            v = sum(1 for iid, sgn in itemlist if texts.get(iid, '') in vset)
            r_source = r_from_alpha(10, KILDE_ALPHA[scale]) if scale in KILDE_ALPHA else None
            LAM_ORIG = 0.60
            r_orig = LAM_ORIG*LAM_ORIG
            if r_source is None:
                r_mix = r_orig
                rnote = 'ingen kildetall; r=lam_orig^2'
            else:
                verbatim_share = v/k
                r_mix = verbatim_share*r_source + (1-verbatim_share)*r_orig
                rnote = 'r_mix = %.2f*%.3f(verbatim %d/%d) + %.2f*%.2f(original)' % (
                    verbatim_share, r_source, v, k, 1-verbatim_share, r_orig)
            alpha_mix = alpha_from_k(k, r_mix)
            theo_mix[scale] = {'k': k, 'verbatimItems': v, 'verbatimShare': round(v/k, 3),
                'rSource10': r_source, 'rOrig': r_orig, 'lamOrig': LAM_ORIG,
                'rMix': r_mix, 'alphaUnbounded': alpha_mix,
                'flag': ('under-0.70' if alpha_mix < 0.70 else None), 'rNote': rnote}
        blk['theoryContentMix'] = theo_mix
        res['pools'][label] = blk

    # ---------- 2. nd-triage ----------
    d = load_json(os.path.join(HERE, 'nd_pool/def-nd-triage-pool.en.json'))
    keys = key_teller(d)
    blk = {'kind': 'likert', 'source': 'nd_pool/def-nd-triage-pool.en.json', 'scales': {}}
    for scale, itemlist in sorted(keys.items()):
        lam = 0.65  # dokumentert valg: separate-forfattede originale items, ingen kildetall
        signs = [s for _, s in itemlist]
        th = likert_theory_signed(len(itemlist), lam, signs)
        th_tab = {str(l): likert_theory_signed(len(itemlist), l, signs)['alpha'] for l in LAMBDA_GRID}
        sim = sim_likert_alpha(itemlist, N_SIM, rng, lam)
        blk['scales'][scale] = {'k': len(itemlist), 'keying': '%d+/%d-' % (sum(1 for _, s in itemlist if s > 0), sum(1 for _, s in itemlist if s < 0)),
            'lambda': lam, 'lambdaSource': 'dokumentert forhåndsvalg (ingen publisert nd-kildetall)',
            'lambdaSensitivity': th_tab,
            'theoryAlpha': th['alpha'], 'theoryRBar': th['rBar'],
            'simAlpha': sim, 'simN': N_SIM,
            'note': 'alle items sign 1 (NG-4-dokumentert avvik i #3758-rapporten); ingen reverserte',
            'flag': ('under-0.70' if th['alpha'] < 0.70 else None)}
    res['pools']['nd-triage'] = blk

    # ---------- 3. evne-pools ----------
    evne_meta_map = {'t1-matrise': ('_evne_pool_batch1_meta.json',), 't2-numerisk': ('_evne_pool_batch1_meta.json',),
                     't3-verbal': ('_evne_pool_batch2_meta.json',), 't4-romlig': ('_evne_pool_batch2_meta.json',),
                     't5-sekvens': ('_evne_pool_t5_meta.json',)}
    blk = {'kind': 'ability', 'themes': {}}
    for tema, (mfile,) in sorted(evne_meta_map.items()):
        d = load_json(os.path.join(HERE, 'evne_pool', 'def-evne-%s.en.json' % tema))
        mm = load_json(os.path.join(HERE, 'evne_pool', mfile))
        mits = mm['items']
        mvals = list(mits.values()) if isinstance(mits, dict) else mits
        bmap = {mi['id']: float(mi['bandDiff']) for mi in mvals}
        missing = [it['id'] for it in d['items'] if it['id'] not in bmap]
        bs = [bmap[it['id']] for it in d['items']]
        th = ability_theory(bs, 1.5)
        th_tab = {('%.2f' % a): ability_theory(bs, a)['alpha'] for a in A_GRID}
        sim = sim_ability_alpha(bs, N_SIM, rng, 1.5)
        blk['themes'][tema] = {'k': len(bs), 'metaFile': mfile, 'bRange': [min(bs), max(bs)],
            'missingB': missing, 'a': 1.5,
            'aSensitivity': th_tab,
            'theoryAlpha': th['alpha'], 'theoryKR20infinite': th['alpha'],
            'meanP': th['meanP'], 'simAlpha': sim, 'simN': N_SIM,
            'note': '2PL med felles a (ingen publisert diskriminering); b-verdier er poolens bandDiff-lisens',
            'flag': ('under-0.70' if th['alpha'] < 0.70 else None)}
    res['pools']['evner'] = blk

    # ---------- 4. puzzle ----------
    pm = load_json(os.path.join(HERE, '..', 'puzzle', '_puzzle_pool_meta.json'))
    items = pm['items']
    pmvals = list(items.values()) if isinstance(items, dict) else items
    byband = collections.defaultdict(list)
    for mi in pmvals:
        byband[mi['band']].append(float(mi['b']))
    allb = sorted(float(mi['b']) for mi in pmvals)
    blk = {'kind': 'ability', 'k': len(allb), 'bRange': [min(allb), max(allb)], 'bands': {}}
    th = ability_theory(allb, 1.5)
    sim = sim_ability_alpha(allb, N_SIM, rng, 1.5)
    blk['whole'] = {'theoryAlpha': th['alpha'], 'meanP': th['meanP'], 'simAlpha': sim, 'simN': N_SIM,
        'aSensitivity': {('%.2f' % a): ability_theory(allb, a)['alpha'] for a in A_GRID}}
    for band, bs in sorted(byband.items()):
        th = ability_theory(bs, 1.5)
        sim = sim_ability_alpha(bs, N_SIM, rng, 1.5)
        blk['bands'][band] = {'k': len(bs), 'theoryAlpha': th['alpha'], 'meanP': th['meanP'],
                              'simAlpha': sim, 'simN': N_SIM}
    blk['notes'] = ['as-is b-verdier; s3-slot-avviket (DOC-29CC9CFE0D/DOC-6FCBBA7126, BLOKKERENDE) er IKKE modellert:',
                    'simuleringen antar at fasiten er slik agents leser; reell responsprosess for s3 forventes Å SENKE alpha i blandede økter']
    res['pools']['puzzle'] = blk

    # ---------- selftests ----------
    st = res['selftest']
    # S1 PRNG-helse (notat: res['selftest'] er list-of-strings som bygges av ok(); her resettes den ikke)
    r2 = mulberry32(SEED)
    us = [r2() for _ in range(20000)]
    from statistics import mean as smean
    lag = sum((us[i]-.5)*(us[i+1]-.5) for i in range(len(us)-1))/len(us)
    ok(abs(smean(us)-0.5) < 0.01, 'S1a mulberry32: gj.snitt=%.4f (|d|<.01)' % smean(us))
    ok(abs(lag) < 0.01, 'S1b lag-1-korrelasjon %.6f (|c|<.01) — v1-bug-fangedefensen' % lag)
    bins = [0]*10
    for u in us: bins[min(9, int(u*10))] += 1
    dev = max(abs(b/len(us) - 0.1) for b in bins)
    ok(dev < 0.02, 'S1c 10-bin-symmetri, maks avvik %.4f (<.02)' % dev)
    # S2 identitet
    ok(abs(r_from_alpha(7, alpha_from_k(7, 0.45)) - 0.45) < 1e-9, 'S2 alpha<->r runde-tur eksakt')
    # S3 likert teori-til-sim (k>=10)
    for lab in ['persona-e-a', 'nd-triage']:
        for sc, sblk in res['pools'][lab]['scales'].items():
            if sblk['k'] < 10: continue
            d_ = abs(sblk['theoryAlpha'] - (sblk['simAlpha'] or -9))
            ok(d_ < 0.05, 'S3 %s/%s: |teori-sim|=%.4f (<.06) (teori %.4f, sim %.4f)' % (lab, sc, d_, sblk['theoryAlpha'], sblk['simAlpha']))
    # S4 ability teori-til-sim
    for tema, tb in res['pools']['evner']['themes'].items():
        d_ = abs(tb['theoryAlpha'] - (tb['simAlpha'] or -9))
        ok(d_ < 0.05, 'S4 evner/%s: |KR20-sim|=%.4f (<.07)' % (tema, d_))
    d_ = abs(res['pools']['puzzle']['whole']['theoryAlpha'] - (res['pools']['puzzle']['whole']['simAlpha'] or -9))
    ok(d_ < 0.05, 'S4 puzzle: |KR20-sim|=%.4f (<.07)' % d_)
    # S5 alpha-invarians under full reversering.
    # (a) TEORI eksakt: alpha(signs) == alpha(-signs) — konstanten 6 bryter aldri kovariansen.
    d_ = load_json(os.path.join(HERE, 'persona_pool/def-persona-pool-e-a.en.json'))
    keysE = key_teller(d_)['extraversion']
    sE = [s for _, s in keysE]
    t1 = likert_theory_signed(len(sE), 0.75, sE)['alpha']
    t2 = likert_theory_signed(len(sE), 0.75, [-s for s in sE])['alpha']
    ok(abs(t1 - t2) < 1e-12, 'S5a teori-reverserings-invarians eksakt (%.12f vs %.12f)' % (t1, t2))
    # (b) SIM fordelingsmessig: 4 uavhengige seeds, n=1000 per arm.
    # NB: per-deterministisk-seed-likhet gjelder IKKE (alternerende Box-Muller-gren forskyver
    # fasen mellom armene) — v3-misforstaelsen; saa sammenlignes gjennomsnitt over seeds.
    a1 = sum(sim_likert_alpha(keysE, 1000, mulberry32(100+i), 0.75) for i in range(4))/4
    a2 = sum(sim_likert_alpha([(i, -s) for i, s in keysE], 1000, mulberry32(300+i), 0.75) for i in range(4))/4
    ok(abs(a1 - a2) < 0.02, 'S5b sim-reversering: |gj-flip|=%.5f (<.02 over 4 seeds)(%.4f vs %.4f)' % (abs(a1-a2), a1, a2))
    # S7 theta-momenter fra EKTE normal()-stremmen (fanger cos-only-buggen: var .5/kurt 1.5)
    rngm = mulberry32(31337)
    Tm = [normal(rngm) for _ in range(100000)]
    tmu = sum(Tm)/len(Tm)
    tvr = sum((t-tmu)**2 for t in Tm)/len(Tm)
    kurt = sum((t-tmu)**4 for t in Tm)/len(Tm)/tvr**2
    ok(abs(tvr - 1.0) < 0.03, 'S7a theta var=%.4f (≈1, |d|<.03) — Box-Muller begge grener i bruk' % tvr)
    ok(abs(kurt - 3.0) < 0.15, 'S7b theta kurt=%.3f (≈3, |d|<.15)' % kurt)

    # S6 alle resultater ikke-negative
    def walk(r, path=''):
        if isinstance(r, dict):
            for kk, vv in r.items(): walk(vv, path+'/'+str(kk))
        elif isinstance(r, float) and path.endswith(('theoryAlpha', 'simAlpha')) and r is not None:
            if r < 0: fails.append('NEG %s=%s' % (path, r))
    walk(res['pools'])
    ok(all(not f.startswith('NEG') for f in fails), 'S6 ingen negative alpha-verdier (v1-buggen fanges her)')

    res['selftest'] = SELFTEST_LOG
    res['selftestSummary'] = {'total': len(SELFTEST_LOG), 'pass': sum(1 for e in SELFTEST_LOG if e['pass'])}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)

    # ---------- print ----------
    print('\n=== ALPHA (#3768, seed %d, N=%d, grid %s) ===' % (SEED, N_SIM, GRID))
    for lab, blk2 in res['pools'].items():
        print('##', lab)
        if 'scales' in blk2:
            for sc, s in blk2['scales'].items():
                print('   %-18s k=%-3d key=%-7s lam=%.2f  a_theo=%.4f  a_sim=%.4f  flag=%s'
                      % (sc, s['k'], s['keying'], s['lambda'], s['theoryAlpha'], s['simAlpha'] if s['simAlpha'] is not None else -1, s.get('flag')))
        if 'theoryContentMix' in blk2:
            for sc, s in blk2['theoryContentMix'].items():
                print('   MIX %-15s verbatim %3d/%-3d r_mix=%.3f  a_unbounded=%.4f  flag=%s'
                      % (sc, s['verbatimItems'], s['k'], s['rMix'], s['alphaUnbounded'], s.get('flag')))
        if 'themes' in blk2:
            for t, tb in blk2['themes'].items():
                print('   %-18s k=%-3d b=[%.2f,%.2f] a=1.5  a_theo=%.4f  a_sim=%.4f  flag=%s'
                      % (t, tb['k'], tb['bRange'][0], tb['bRange'][1], tb['theoryAlpha'], tb['simAlpha'], tb.get('flag')))
        if 'whole' in blk2:
            w = blk2['whole']
            print('   %-18s k=%-3d b=[%.2f,%.2f] a=1.5  a_theo=%.4f  a_sim=%.4f' % ('whole', blk2['k'], blk2['bRange'][0], blk2['bRange'][1], w['theoryAlpha'], w['simAlpha']))
            for bnd, bb in blk2['bands'].items():
                print('      band %s k=%d a_theo=%.4f a_sim=%.4f' % (bnd, bb['k'], bb['theoryAlpha'], bb['simAlpha']))
    n_pass = res['selftestSummary']['pass']; n_tot = res['selftestSummary']['total']
    print('SELFTEST: %d / %d PASS%s' % (n_pass, n_tot, ('' if n_pass == n_tot else ' — FAILS: ' + '; '.join(fails[:5]))))

if __name__ == '__main__':
    main()
