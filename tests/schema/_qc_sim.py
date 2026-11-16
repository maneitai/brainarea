#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Brainarea FASE 2 — QC-rapport: attention checks, straightlining-flags, tidsbruk-terskler
per pool. todo #3770 [BYGG], FASE 2-kjeden (brett #1183, søster til TR-DA925E33DDCE).

Viderefører søsterrapporten _alpha_sim.py (todo #3768) på to punkter, eksplisitt:
  A. Samme generative modell (graderingsmodell, λ-calibrerte pool-verdier, mulberry32,
     seed 20261116, LIK_CUT, N=300) — ellers er QC-ratene og alpha-armen ikke
     sammenlignbare (α(Q) = α(S)·(1−ρ_QQ)/... er avledet gitt SAMME S-modellen).
  B. Rate-simuleringen MÅLER IKKE ekte responsdata. Den kvantifiserer flaggets
     FALSK-POSITIV-side under den samme kalibrerte null-modellen som alpha-estimatene
     bygger på. Vektene v (α·v + ρ_QQ·SE²·(1−α)) avhenger av ekte QC-flaggrater;
     vektene fra NULL-modellen er instrument-estimater (ikke målinger) og må
     kalibreres mot normerings-KV i FASE 4 (#3833 PIN-korrelasjonssteget leverer
     parvis respondens der).

Detektor-laget forblir EKTE engine-kode: QC-simuleringen importerer
tests/engine/attention.js v1.0.0 via node ESM — ingen re-implementering.
Konfig-kontrakten overlever i _qc_result.json['qcConfig'] (schema v1 er lukket,
additionalProperties:false — ingen motor-endring); i neste runde leser
tests/puzzle/puzzle-player.mjs _qc_result.json for å bygge opts til
evaluateAttention. #3715-veven må ikke re-implementere deteksjons-laget.

Konfig: standard flyt = ingen attention-items, ingen item-tider → status 'clean'
kan kun utløses av straightline (run ≥ 6) eller fast-session (0.5×Σgulv). Derfor
teller denne rapporten to flagg-teller: (i) straightline-antall = antall respondenter
med langste likert-run ≥ 6; (ii) fast-session-antall = sesjons-tid under 0.5×Σgulv.
Den eneste ekte rate-variabelen er run-length-fordelingen over respondenter.
"""
import json, math, os, sys, subprocess, importlib.util, collections

# Søster-konvensjonen (same as _validitet_skaringsgyldighet.mjs): F:/ primær, /mnt/f fallback.
_PROD_CANDIDATES = [
    'F:/maneit/prosjekter/filip-webside-prosjekter/brainarea',
    '/mnt/f/maneit/prosjekter/filip-webside-prosjekter/brainarea',
]
PROD = next((c.replace('\\', '/') for c in _PROD_CANDIDATES if os.path.isdir(c.replace('\\', '/'))), None)
if PROD is None:
    raise RuntimeError('prod-tre ikke funnet i noen av kandidatene: %s' % _PROD_CANDIDATES)
OUT = os.path.join(PROD, 'tests/schema/_qc_result.json')
# Søstermodellen importeres via importlib (ingen main-kjoring; __main__-beskyttet).
ALPHA_SIM = os.path.join(PROD, 'tests/schema/_alpha_sim.py')

# ---- Engine-kontrakten (attention.js v1.0.0, lest i prod-tre) ----
# DEFAULTS: straightlineRun=6; timeFloor {likert:2.0, ability:3.0, order:3.0};
# sessionFastFactor=0.5.
ATT_RUN = 6
T_FLOOR = {'likert': 2.0, 'ability': 3.0, 'order': 3.0}
SESSION_FAST_FACTOR = 0.5
LIK_CUT = [-1.0676, -0.5243, 0.0, 0.5243, 1.0676]   # eksakt søster-modellen

# λ (kilde-kalibrert i søsteren, fra _alpha_result.json):
LAMBDA_KALIBRERT = {
    'extraversion': 0.6566,
    'agreeableness': 0.5812,
    'conscientiousness': 0.5435,
    'neuroticism': 0.64,
    'openness': 2.0**0.5 * 0.6092,   # feil — rettes i main()
}
LAMBDA_KALIBRERT['openness'] = 0.6092  # eksakt søsteren (_alpha_result.json)
ND_LAMBDA = 0.65   # dokumentert konvensjon (ingen publisert nd-kildetall)

SEED = 20261116
N_SIM = 300
ATTENTION_N = 8   # ekstra per skala (evne-batchen) — dokumentert forhåndsvalg (beslutning D2)

SECTIONS_LABEL = {
    'E': 'E: attention-mekanikken (ekte engine) — injiserte profiler',
    'B': 'B: straightlining-rater per pool under kalibrert null-modell',
    'C': 'C: tidsbruk-terskler — fast-session-gulvet per pool',
    'D': 'D: attention-check-items (ekspandert pool, dokumentert forhåndsvalg)',
    'F': 'F: QC-vekter vs alpha-S: kontrakt-konsekvensen',
}

# ================= E: engine-ekte flagg over injiserte profiler =================
# Ingen re-implementering: node ESM kaller evaluateAttention fra prod-tests/engine.
_NODE_EVAL = r'''
import { readFileSync, writeFileSync } from 'node:fs';
import { evaluateAttention, straightlineIndex, ATTENTION_VERSION, DEFAULTS } from 'ENGINE_URL';
const def = JSON.parse(readFileSync('DEF_PATH', 'utf8'));
const cfg = JSON.parse(readFileSync('CFG_PATH', 'utf8'));
const r = evaluateAttention(def, cfg.payload, cfg.opts ?? {});
const out = {
  ok: r.ok, errors: r.errors ?? [], status: r.quality?.status ?? null,
  flags: (r.quality?.flags ?? []).map(f => ({ kind: f.kind, severity: f.severity,
    itemId: f.itemId ?? null, itemIds: f.itemIds ?? null,
    longstring: r.quality?.metrics?.longstring?.length ?? null })),
  metrics: { longstring: r.quality?.metrics?.longstring?.length ?? null,
    sessionFlagged: r.quality?.metrics?.sessionTime?.flagged ?? null,
    perItemFast: r.quality?.metrics?.perItemTime?.fast?.length ?? null,
    attentionChecks: (r.quality?.metrics?.attentionChecks ?? null) === null ? null :
      (r.quality.metrics.attentionChecks ?? []).map(c => ({ id: c.id, given: c.given, ok: c.ok })),
    flagsFull: (r.quality?.flags ?? []).map(f => ({ kind: f.kind, severity: f.severity,
      itemId: f.itemId ?? null, nIds: f.itemIds ? f.itemIds.length : null })) },
  notes: (r.quality?.notes ?? []).map(n => n.id),
  attVersion: ATTENTION_VERSION, defaults: DEFAULTS,
};
writeFileSync('OUT_PATH', JSON.stringify(out, null, 1));
'''

def node_eval_attention(defpath, payload, tmpdir, opts=None):
    """Kaller PROD evaluateAttention via node ESM; returnerer kompakt resultat."""
    cfg = os.path.join(tmpdir, 'cfg.json'); outf = os.path.join(tmpdir, 'out.json')
    with open(cfg, 'w', encoding='utf-8') as f:
        json.dump({'payload': payload, 'opts': opts or {}}, f, ensure_ascii=False)
    js = (_NODE_EVAL
          .replace('ENGINE_URL', 'file://' + os.path.join(PROD, 'tests/engine/attention.js'))
          .replace("'DEF_PATH'", json.dumps(defpath)).replace("'CFG_PATH'", json.dumps(cfg))
          .replace("'OUT_PATH'", json.dumps(outf))
          )
    jsf = os.path.join(tmpdir, 'eval.mjs')
    with open(jsf, 'w', encoding='utf-8') as f:
        f.write(js)
    try:
        os.remove(outf)   # stale-utgave fra tidligere kall; skriv-sjekk under fanger stillstand
    except FileNotFoundError:
        pass
    if os.path.exists(outf):
        raise RuntimeError('outfil eksisterer fortsatt etter sletting: ' + outf)
    p = subprocess.run(['node', jsf], capture_output=True, text=True, timeout=60)
    if p.returncode != 0:
        raise RuntimeError('node evaluateAttention feilet: ' + p.stderr[:400])
    with open(outf, encoding='utf-8') as f:
        return json.load(f)

def payload_for(defpath, ids_values, time_spent=None, extra_answers=None):
    """Bygger onComplete-payload per scoring-kontrakten (likert value; ability index)."""
    d = json.load(open(defpath, encoding='utf-8'))
    byid = {i['id']: i for i in d['items']}
    answers = {}
    for it_id, v in ids_values:
        it = byid[it_id]
        if it['kind'] == 'likert':
            answers[it_id] = {'kind': 'likert', 'lang': 'en', 'value': v}
        elif it['kind'] == 'ability':
            answers[it_id] = {'kind': 'ability', 'lang': 'en', 'abilityOriginalIndex': v}
        else:
            answers[it_id] = {'kind': 'order', 'lang': 'en', 'order': v}
    if extra_answers:
        answers.update(extra_answers)
    pay = {'testId': d['id'], 'lang': 'en', 'itemIds': [i['id'] for i in d['items']],
           'startedAt': 0, 'finishedAt': 1000, 'expired': False, 'answers': answers}
    if time_spent != 'OMITTED':   # None -> eksplisitt null (kontrakt-kant); 'OMITTED' -> feltet utelatt
        pay['timeSpentSec'] = time_spent
    return pay

# ================= B: straightlining under kalibrert null-modell =================
# Samme generative modell som søsteren _alpha_sim.py: K = 1..5 over LIK_CUT,
# x = s*λ*θ + e. Ingen eksklusjon: rå-rater + run-fordeling rapporteres.

def build_scale_index(defpath):
    """(itemIds+signs per skala, metrikker for longstring-rekkefølge = payload.itemIds)"""
    d = json.load(open(defpath, encoding='utf-8'))
    scales = collections.defaultdict(list)
    likert_ids_in_order = []
    for it in d['items']:
        if it.get('kind') != 'likert':
            continue
        likert_ids_in_order.append(it['id'])
        for s in it.get('scales', []):
            scales[s['id']].append((it['id'], s.get('sign', 1)))
    return d, dict(scales), likert_ids_in_order

def category_from_x(x, rng=None):
    """Graderingsmodell: K=1..5 (uavhengig av item-tegn; tegnet brukes i skåringen)."""
    K = 1
    for c in LIK_CUT:
        if x > c:
            K += 1
    return K

def sim_likert_values(ids_signs, lam, n, rng, theta=None):
    """Skårvectoren g (IPIP 6-v) per respondent under søsterens null-modell."""
    if theta is None:
        theta = [m.normal(rng) for _ in range(n)]
    out = []
    for it_id, s in ids_signs:
        vec = []
        for t in theta:
            x = s * lam * t + m.normal(rng) * math.sqrt(max(1e-9, 1 - lam * lam))
            K = category_from_x(x)
            g = K if s > 0 else 6 - K
            vec.append(g)
        out.append((it_id, vec))
    return out

def rate_sim(defpath, lam_by_scale, scale_name, n, rng, theta=None):
    """Rå-run rate over hele poolens likert-sekvens under kalibrert modell."""
    d, scales, order = build_scale_index(defpath)
    signs = scales.get(scale_name)
    if signs is None:
        raise RuntimeError('skala %s ikke i %s' % (scale_name, defpath))
    # λ per ITEM fra sin skala (sister-calibrerte verdier)
    itemlam = {}
    for it_id, _ in signs:
        itemlam[it_id] = lam_by_scale[scale_name]
    # Andre skalaer i samme def bidrar med egne items i sekvensen (samme pool-sesjon).
    # Søster-modellverden: per skala egen θ? NEI — én respondent, én θ... men
    # tverrgående (E×A osv.) modelleres IKKE i søsteren (α per skala separert).
    # Raten over hele sesjonen modelleres her per SEKVENS i skala-nær orden:
    # vi simulerer kun skalaens items i sekvens (defensive valg, dokumentert i rapporten),
    # fordi longstring-teller over hele poolen kun er definert for en økt med én θ.
    vecs = sim_likert_values(signs, lam_by_scale[scale_name], n, rng, theta=theta)
    # longstring over sekvensen (eksakt samme algoritme som engine straightlineIndex, S-QC1)
    values_in_seq = [v[1] for v in vecs]
    n_persons = n
    runs = []
    for p in range(n_persons):
        seq = [values_in_seq[j][p] for j in range(len(values_in_seq))]
        best = 0
        cur = 0
        curv = None
        for v in seq:
            if cur > 0 and v == curv:
                cur += 1
            else:
                cur, curv = 1, v
            if cur > best:
                best = cur
        runs.append(best)
    runs.sort()
    n_flag = sum(1 for r in runs if r >= ATT_RUN)
    return {
        'k': len(signs), 'keying': '%d+/%d-' % (sum(1 for _, s in signs if s > 0), sum(1 for _, s in signs if s < 0)),
        'lam': lam_by_scale[scale_name],
        'flagRate': n_flag / n,
        'runMean': sum(runs) / n,
        'runMax': max(runs),
        'runs': runs,
        'p99': runs[int(0.99 * (n - 1))],
    }

def rate_sim_all(defpath, lam_map):
    """Alle skalaene i en pool-def per sim_likert_alpha-verden (ÉN rng-strøm per leveranse)."""
    d, scales, order = build_scale_index(defpath)
    out = {}
    rng = m.mulberry32(SEED)
    for sc in sorted(scales.keys()):
        out[sc] = rate_sim(defpath, lam_map, sc, N_SIM, rng)
    return out

# ================= C: fast-session-gulvet per pool =================
# Kontrakten: uten per-item tid → sessionTime.flagged = t < 0.5×Σ gulv over BESVARTE
# items (per kind). Ingen fabrikkasjon: ingen tid → null + note (notes[].id
# note.time.unavailable) — engine returnerer ALDRI timeSpentSec=null-flagg.

def session_floors(defpath, answered_kinds=None):
    """Σ gulv over alle besvarte items (likert 2, ability/order 3)."""
    d = json.load(open(defpath, encoding='utf-8'))
    floor_sum = 0.0
    kinds = {}
    for it in d['items']:
        k = it['kind']
        kinds[k] = kinds.get(k, 0) + 1
        floor_sum += T_FLOOR.get(k, 0.0)
    return floor_sum, kinds

def session_gate(defpath):
    """(floors, 0.5×floors) = fast-session-grensen for full besvarelse."""
    fl, kinds = session_floors(defpath)
    return fl, SESSION_FAST_FACTOR * fl, kinds

# ================= D: attention-check-items =================
# Konfliktene er dokumentert forhåndsvalg (beslutning 5 i attention.js v1: HVILKE
# items som er checks er TESTINNHOLD, FASE 2-stegene avgjør). Dette steget velger
# per pool: n att-items (default 8) fra skalaen med flest items, accepted = [5].
# Dokumentert forhåndsvalg, IKKE kalibrert; #3715-konsumveien forventer eksplisitt
# config. Ingen motor-endring: schema v1 lukket, opts ledes per kall.

def build_qc_config(defpath, n_att=ATTENTION_N):
    d, scales, order = build_scale_index(defpath)
    if not scales:
        return None, d
    host_scale = max(scales.keys(), key=lambda s: len(scales[s]))
    cand = [it_id for it_id, s in scales[host_scale] if s > 0]
    picked = cand[:n_att] if len(cand) >= n_att else (cand + [it_id for it_id, _ in scales[host_scale][len(cand):]]) [:n_att]
    picked = picked[:min(n_att, len(cand))]
    return {
        'host_scale': host_scale,
        'attentionItems': [{'id': it_id, 'accepted': [5]} for it_id in picked],
        'n_picked': len(picked),
        'note': 'dokumentert forhåndsvalg: +keyed items fra største skala, accepted=[5] (siste anker); IKKE kalibrert — FASE 4-kalibrering mangler data',
    }, d

def att_check_profile(defpath, tmpdir, n_att=ATTENTION_N):
    """E-rader over engine-ektemekanikken: 3 response-profiler per pool med att-config."""
    cfg, d = build_qc_config(defpath, n_att)
    if cfg is None:
        return None
    order_ids = [i['id'] for i in d['items']]
    att_ids = [a['id'] for a in cfg['attentionItems']]
    id5 = {i: 5 for i in att_ids}
    # (i) alt=3, att=5 — clean forventet (langstring: run av 3-er over hele poolen? nei,
    #     det er en LONGSTRING: 300 identiske 3-er → run=300 ≥ 6 → straightline-flagg)
    p1 = payload_for(defpath, [(i, 3) for i in order_ids if i not in att_ids] +
                     [(i, 5) for i in att_ids], time_spent=99999)
    # (ii) alt=1, att=1 → attention-failed (high) — viser at mekanikken FANGER
    p2 = payload_for(defpath, [(i, 1) for i in order_ids], time_spent=99999)
    # (iii) timeSpentSec=null → engine-tolkes Number(null)=0 s (dokumentert kontrakt-kant)
    p3 = payload_for(defpath, [(i, 3) for i in order_ids if i not in att_ids] +
                     [(i, 5) for i in att_ids], time_spent=None)
    # (iv) timeSpentSec utelatt fra payload → note.time.unavailable; ingenting fabrikkeres
    p4 = payload_for(defpath, [(i, 3) for i in order_ids if i not in att_ids] +
                     [(i, 5) for i in att_ids], time_spent='OMITTED')
    att_opts = {k: v for k, v in cfg.items() if k in ('attentionItems',)}
    rows = []
    for (tag, pay, opts) in [('alt3_att5', p1, att_opts), ('all1_incl_att', p2, att_opts),
                             ('time-null', p3, {}), ('time-omitted', p4, {}),
                             ('no-time', p3, {})]:
        sub = os.path.join(tmpdir, tag)
        os.makedirs(sub, exist_ok=True)
        for f in ('cfg.json', 'out.json', 'eval.mjs'):
            try: os.remove(os.path.join(sub, f))
            except FileNotFoundError: pass
        r = node_eval_attention(defpath, pay, sub, opts=opts)
        rows.append({'profile': tag, 'engine': r})
    return {'config': cfg, 'profiles': rows}

# ================= F: QC-vekter vs alpha-S (kontraktkonsekvens) =================
# α(Q) = α(S)·(1−ρ_QQ) / α(S) + (1−α(S))·ρ_QQ  gir ρ_QQ = α(Q)·(1−α(S)) / (α(S)·(1−α(Q)))
# Q = S + E_Q med Cov(E_Q,·)=0: Cov = σ²_S, Var(Q) = σ²_S + v.
# vekter v ∝ α·v + (1-α)·σ_QQ²·SE²(1-α) = SE(θ)²·(1−α) — ingen ekte QC-ratedata.
# Etikett: vekt-tallene er KONTRAKTKONTRAKT-konsekvenser, ikke målinger;

def qc_weight_sensitivity(theory_alpha, se_theta, rho_qq_list):
    """v/SE²-ratio per ρ_QQ; kontrakt-konsekvens, ikke måling."""
    out = []
    for rho_qq in rho_qq_list:
        alpha_q = (theory_alpha * (1 - rho_qq)) / (theory_alpha + rho_qq * (1 - theory_alpha))
        v_ratio = rho_qq * (1 - theory_alpha) / (theory_alpha * (1 - rho_qq))  # = ρ_QQ-relasjons-tolkning
        # v/σ²_S = ρ_QQ·(1-α); i SE-enheter med SE² ≈ (1-α)·σ²_S (kontrakten):
        # v ≈ ρ_QQ · SE² → v/SE² = ρ_QQ  (den direkte kontrakt-konsekvensen)
        out.append({'rho_qq': rho_qq, 'alpha_q': alpha_q, 'v_over_se2': rho_qq})
    return out

# ================= SELFTEST =================
SELFTEST_LOG = []
def ok(name, cond, detail=None):
    SELFTEST_LOG.append({'check': name, 'pass': bool(cond), 'detail': detail})
    if not cond:
        print('  FAIL %s%s' % (name, (' — ' + str(detail)) if detail else ''))

def selftest():
    # S-QC1: python longstring ≡ engine straightlineIndex over 200 tilfeldige sekvenser
    js = r'''
import { readFileSync, writeFileSync } from 'node:fs';
import { straightlineIndex } from 'ENGINE_URL';
const seq = JSON.parse(readFileSync('SRC', 'utf8'));
const out = seq.map(s => straightlineIndex(s.map(x => ({ id: 'x', value: x }))));
writeFileSync('OUTF', JSON.stringify(out.map(o => [o.length, o.ids ? o.ids.length : 0])));
'''
    tmp = '/tmp/qc_eval_main'; os.makedirs(tmp, exist_ok=True)
    srcf, outf = os.path.join(tmp, 'seq.json'), os.path.join(tmp, 'idx.json')
    rand = m.mulberry32(SEED ^ 0x5EED)
    seqs = []
    for _ in range(200):
        ln = 2 + int(rand() * 60)
        # blandet tegnrom (1..5) med noen runs — samme input til begge motorer
        seqs.append([1 + int(rand() * 5) for _ in range(ln)])
    with open(srcf, 'w') as f:
        json.dump(seqs, f)
    jsf = os.path.join(tmp, 'idx.mjs')
    with open(jsf, 'w') as f:
        f.write(js.replace('ENGINE_URL', 'file://' + os.path.join(PROD, 'tests/engine/attention.js'))
                 .replace("'SRC'", json.dumps(srcf)).replace("'OUTF'", json.dumps(outf)))
    p = subprocess.run(['node', jsf], capture_output=True, text=True, timeout=120)
    if p.returncode != 0:
        ok('S-QC1 python-longstring ≡ engine straightlineIndex', False, 'node: ' + p.stderr[:300])
        return
    got = json.load(open(outf))
    mism = 0
    for seq, (leng, _ids) in zip(seqs, got):
        best = cur = 0; curv = None
        for v in seq:
            if cur > 0 and v == curv: cur += 1
            else: cur, curv = 1, v
            if cur > best: best = cur
        if best != leng:
            mism += 1
    ok('S-QC1 python-longstring ≡ engine straightlineIndex (200 sekvenser)', mism == 0, 'mismatches=%d' % mism)

def selftest2():
    # S-QC2: payload_for gir gyldig onComplete (testId == def.id, answers-kindekord)
    import tempfile
    tmp = tempfile.mkdtemp()
    dpath = os.path.join(PROD, 'tests/schema/persona_pool/def-persona-pool-n-rest.en.json')
    d = json.load(open(dpath, encoding='utf-8'))
    ids = [i['id'] for i in d['items']]
    pay = payload_for(dpath, [(i, 3) for i in ids], time_spent=99999)
    ok('S-QC2 payload-kontrakt: testId/itemIds/answers-kinde', pay['testId'] == d['id'] and len(pay['answers']) == len(ids), '%s vs %s' % (pay['testId'], d['id']))
    # S-QC3: rate_sim determinisme — samme seed gir identiske rater
    lam = {'neuroticism': 0.64}
    r1 = rate_sim(dpath, lam, 'neuroticism', 60, m.mulberry32(999))
    r2 = rate_sim(dpath, lam, 'neuroticism', 60, m.mulberry32(999))
    ok('S-QC3 rate_sim determinisme', r1['runs'] == r2['runs'] and abs(r1['flagRate'] - r2['flagRate']) < 1e-12)
    # S-QC4: graderings-gulv: θ=+3 gir høy skår; θ=-3 gir lav (modell-helse)
    rng = m.mulberry32(7)
    hv = sim_likert_values([('x+', +1), ('x-', -1)], 0.65, 1, rng, theta=[3.0])
    lv = sim_likert_values([('x+', +1), ('x-', -1)], 0.65, 1, rng, theta=[-3.0])
    ok('S-QC4 θ-styringsretning', hv[0][1][0] >= 4 and lv[0][1][0] <= 2, 'θ=3→%s; θ=-3→%s' % (hv[0][1][0], lv[0][1][0]))
    # S-QC5: session_floors matcher engine-kontrakten (likert 2, ability 3)
    fl, kinds = session_floors(dpath)
    ok('S-QC5 gulv-sum n-rest: 75 likert × 2.0 = 150', abs(fl - 150.0) < 1e-9, '%.1f %s' % (fl, kinds))
    # S-QC6: qc_weight_sensitivity monoton i ρ_QQ
    wts = qc_weight_sensitivity(0.95, [], [0.001, 0.01, 0.05, 0.1])
    ok('S-QC6 alpha_q faller i rho_qq', all(wts[i+1]['alpha_q'] < wts[i]['alpha_q'] for i in range(len(wts)-1)),
       'alpha_q ved .001/.01/.05/.1: %s' % [round(w['alpha_q'], 4) for w in wts])

def walk_neg(obj, path=''):
    if isinstance(obj, dict):
        for kk, vv in obj.items():
            walk_neg(vv, path + '/' + str(kk))
    elif isinstance(obj, float) and (path.endswith('flagRate') or path.endswith('alpha_q')):
        return obj < -1e-12
    return False

def _import_alpha_sim():
    import importlib.util
    spec = importlib.util.spec_from_file_location('alpha_sim', os.path.join(PROD, 'tests/schema/_alpha_sim.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def main():
    global m
    m = _import_alpha_sim()
    tmp = '/tmp/qc_eval_main'
    for oldf in ('cfg.json', 'out.json', 'eval.mjs'):
        try:
            os.remove(os.path.join(tmp, oldf))   # stale-beskyttelse: én leveranse, én mappe
        except FileNotFoundError:
            pass
    os.makedirs(tmp, exist_ok=True)
    lam_by_scale = {'extraversion': 0.6566, 'agreeableness': 0.5812,
                    'conscientiousness': 0.5435, 'neuroticism': 0.64, 'openness': 0.6092}
    pools = [
        ('persona-e-a', os.path.join(PROD, 'tests/schema/persona_pool/def-persona-pool-e-a.en.json')),
        ('persona-o-c', os.path.join(PROD, 'tests/schema/persona_pool/def-persona-pool-o-c.en.json')),
        ('persona-n-rest', os.path.join(PROD, 'tests/schema/persona_pool/def-persona-pool-n-rest.en.json')),
        ('nd-triage', os.path.join(PROD, 'tests/schema/nd_pool/def-nd-triage-pool.en.json')),
        ('evne-t1-matrise', os.path.join(PROD, 'tests/schema/evne_pool/def-evne-t1-matrise.en.json')),
        ('evne-t2-numerisk', os.path.join(PROD, 'tests/schema/evne_pool/def-evne-t2-numerisk.en.json')),
        ('evne-t3-verbal', os.path.join(PROD, 'tests/schema/evne_pool/def-evne-t3-verbal.en.json')),
        ('evne-t4-romlig', os.path.join(PROD, 'tests/schema/evne_pool/def-evne-t4-romlig.en.json')),
        ('evne-t5-sekvens', os.path.join(PROD, 'tests/schema/evne_pool/def-evne-t5-sekvens.en.json')),
    ]
    res = {
        'meta': {
            'todo': '#3770', 'version': '1', 'date': '2026-11-16', 'seed': SEED, 'simN': N_SIM,
            'engine': 'tests/engine/attention.js v1.0.0 (EKTE modul, ingen re-implementering)',
            'model': 'sister-model _alpha_sim.py v3: graderingsmodell over samme λ/seed/grid/kutt',
            'contract': '#3715 leser dette; puzzle-player melder _qc_result.json som opts-kilde',
            'attentionConfig': 'default flyt (ingen att-items, ingen item-tider) — flaggkilder: straightline run>=6, fast-session 0.5×Σgulv',
        },
        'pools': {}, 'selftest': [], 'notes': [],
    }
    selftest(); selftest2()

    # ---- E: engine-ekte profiler per likert-pool (mechanics demo, ikke rater) ----
    for name, dpath in pools:
        blk = {'def': os.path.relpath(dpath, PROD)}
        # kun likert-poolene får att-config (ability-poolene: kind ability; att på likert er N/A)
        d = json.load(open(dpath, encoding='utf-8'))
        if any(i.get('kind') == 'likert' for i in d['items']):
            blk['attentionProfiles'] = att_check_profile(dpath, tmp, ATTENTION_N)
        fl, gate, kinds = session_gate(dpath)
        blk['sessionGate'] = {'floorsSum': fl, 'gate': round(gate, 2), 'kindMix': kinds,
                              'lese-konklusjon': 'full besvarelse raskere enn gate-sekunder → fast-session flagg (sesjons-nivå, render v0.5.0 leverer kun timeSpentSec)'}
        res['pools'][name] = blk

    # ---- B: rata — straightlining under kalibrert null-modell (likert-pooler) ----
    ratemap = {
        'persona-e-a': lam_by_scale,
        'persona-o-c': lam_by_scale,
        'persona-n-rest': lam_by_scale,
        'nd-triage': {'adhd': ND_LAMBDA, 'autism': ND_LAMBDA},
    }
    for name, dpath in pools:
        if name in ratemap:
            sims = rate_sim_all(dpath, ratemap[name])
            for sc, s in sims.items():
                s.pop('runs', None)   # p99- og max beholdes i JSON; full runs-beholder er for stor
            res['pools'][name]['straightlining'] = sims
    # ability-poolene: longstring N/A (run-tolkning meningsløs per beslutning 2);
    # deres QC-signaler er fast-item (gulv 3.0 s) og fast-session (3×gulv) — dokumentert, ikke simuleret.

    # ---- F: kontrakt-konsekvens per store skala ----
    res['qcWeights'] = {}
    for sc, a in [('extraversion', 0.9710), ('agreeableness', 0.9579), ('conscientiousness', 0.9495),
                  ('neuroticism', 0.9713), ('openness', 0.9633), ('adhd', 0.9282), ('autism', 0.9282)]:
        res['qcWeights'][sc] = qc_weight_sensitivity(a, None, [0.001, 0.005, 0.01, 0.02, 0.05])
    res['selftest'] = SELFTEST_LOG
    res['selftestSummary'] = {'total': len(SELFTEST_LOG), 'pass': sum(1 for e in SELFTEST_LOG if e['pass'])}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print('QC (#3770): selftest %d/%d — pools: %s' % (res['selftestSummary']['pass'], res['selftestSummary']['total'], ', '.join(res['pools'].keys())))
    print('OUT:', OUT)

if __name__ == '__main__':
    main()
