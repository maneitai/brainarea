/**
 * Brainarea attention/QC-lag v1.0.0 — [BYGG] FASE 1, todo leaf #3714
 * "Attention-check-mekanikk — straightlining-flagg + tidsbruk-terskel."
 *
 * Renset ES-modul (ingen dependencies). Ren funksjon: def + onComplete-payload
 * (samme form som scoring.js leser) + opsjonell QC-inngang (item-tider,
 * attention-check-items). Ingen DOM, ingen rng, ingen klokke — samme input gir
 * bitvis samme output (samme krav som scoring.js v1.0.0).
 *
 * ---- Kontrakt mot andre moduler ----
 * - Inndata: samme (def, payload) som scoring.scoreTest — payload valideres med
 *   samme minimalregler. Ekstra opts (alle valgfrie):
 *   {
 *     straightline: { run: <int >= 2, default 6> },
 *     timeFloor:    { likert: <s>, ability: <s>, order: <s> },   // per-item gulv
 *     sessionFastFactor: <0..1, default 0.5>,
 *     itemTimes:    { <itemId>: <sekunder> },                     // per-item tid
 *     timeline:     [{ itemId, presentedAtMs, submittedAtMs }],   // alternativ kilde
 *     attentionItems: [{ id, accepted: [<option value(s)>] }],    // instruerte items
 *   }
 * - Utdata: { ok, errors, warnings, version, quality }. quality inneholder METRIKK
 *   (longstring, windowProbability, perItemTime, attentionChecks) + FLAGG
 *   (sortert: high før medium, deretter kind, deretter itemId). Flagg indikerer
 *   datakvalitetsproblemer — de DREPEN eller FILTRERER aldri svar.
 *
 * ---- Beslutninger i dette steget (dokumentert, ikke usynlige) ----
 * 1. DETEKSJON ≠ EKSKLUSJON: modulen nekter å forkaste/downvekte svar. Konsum
 *    er QC-rapporten per pool (todo #3770, FASE 2) og forskers beslutning der.
 *    Grunn: automatisk sletting ville vært en usynlig policy-beslutning i motoren.
 * 2. STRAIGHTLINING = longstring på likert: lengste run av identiske verdier i
 *    presentasjonsrekkefølge (payload.itemIds-orden). Ability/order ekskluderes
 *    (order-svar ER rekkefølger, ability-korrekt/1 — run-tolkning meningsløs).
 *    Ubesvarte items bryter IKKE run (mangler behandles som hopp; ved full
 *    besvarelse er semantikken identisk).
 *    TERSKEL (default run=6), begrunnelse:
 *    - Litteraturpraksis for longstring-flagg ligger typisk på 6+ for 5-punkts
 *      skalaer (Meade & Craig 2012-stil longstring-analyser);
 *    - under i.i.d.-uniform besvarelse er sannsynligheten for at EN gitt run på
 *      L like verdier = K^(1-L). For K=5, L=6: 1/625 = 0.16% per vindu — flagget
 *      treffer altså sjelden tilfeldig enkeltvinduer, men fanger typisk
 *      straightlineres faktiske mønster.
 *    - Terskelen er IKKE kalibrert mot Brainarea-data ennå — den er en dokumentert
 *      forhåndsvalgt konservativ grense. Kalibrering skjer mot normerings-/QC-data;
 *      QC-rapport-steg #3715/#3770 skal kontrollere at begrensningene er tatt.
 *      Verdi kan overstyres per kall (opts.straightline.run).
 * 3. TIDSBRUK-TERSKEL = minimumsgulv (fanger raske-klikk/upassende tempo), ALDRI
 *    øvre grense (hurtige korrekte løsere er ikke feil — evneskår er poenget).
 *    Gulv (defaults, begrunnelse):
 *    - likert: 2.0 s. Ett kort, ens-setnings item (schema krever minLength 8 tegn,
 *      realistisk 5–15 ord) kan ikke leses ferdig raskere enn ~2 s ved øvre
 *      lesefart (~4–5 ord/s) pluss registrering av valg (~0.3–0.5 s). Under dette
 *      er svaret registrert FØR itemet kan ha blitt lest.
 *    - ability/order: 3.0 s. Itemene krever encoding av prompt/matrix før svar;
 *      et rent tilfeldig klikk ligger typisk på 0.5–2 s. Gulvet fanger svar
 *      levert før meningsfull utførelse er mulig, og er bevisst lavhengig
 *      (fanger brute-klikk, ikke «løste raskt»).
 *    - Alle gulv kan overstyres per kall (opts.timeFloor). Ingen gulv er
 *      kalibrert mot innsamlede Brainarea-data ennå (samme kalibreringsnotat).
 * 4. TIDS-GRANULARITET: render.js (v0.5.0, produksjon) sender kun sesjonsnivå timeSpentSec.
 *    - Per-item tid ONLY hvis opts.itemTimes eller opts.timeline er gitt
 *      (fremtidig render-utvidelse eller normerings-endpointen #3724 leverer).
 *    - Uten per-item: sesjonsnivå-fallback — timeSpentSec < sessionFastFactor
 *      (default 0.5) × Σ gulv over besvarte items => 'fast-session' flagg.
 *      Faktor 0.5: sesjonstid inneholder lesing av instruksjoner/pauser, så
 *      bare flagg når EDDA snitt-tid per item ligger under halve lesegulvet —
 *      bevisst grovkornet fangst av grove speeders.
 *    - Med per-item tid gitt brukes IKKE også sesjonsregelen (ingen dobbelttell).
 *    - Ingen tid tilgjengelig: metrikken null + note. Fabrikkeres aldri ( samme
 *      ærlighetsprinsipp som scoring.js: ingen normer uten normer ).
 * 5. ATTENTION-CHECK-ITEMS (instruerte svar, «velg Svært enig for å vise at du
 *    leser»): mekanikken tar imot [{ id, accepted:[values] }] og flagger feil/
 *    manglende svar (severity high). HVILKE items som er checks og hva som er
 *    godkjent er TESTINNHOLD — avgjøres i FASE 2 itemspec/pool-stegene, ikke her.
 *    Schema v1 er lukket (additionalProperties:false) med vilje; def-nivå QC-
 *    konfig kommer IKKE fra schema før en eventuell v2 — konfiggiving per kall.
 * 6. FEIL vs ADVARSEL i scoring.js-stil: ok:false ved kontraktsbrudd (payload/
 *    opts uforenlig). warnings = gyldig men redusert (per-item-tid dekker delmengde).
 *
 * ---- Kjente begrensninger (ærlig) ----
 * - Ingen ekskludering, ingen vekting, ingen auto-interpolering av svar.
 * - IRT-sammensetning av QC-signaler (f.eks. vektet indeks) gjøres i FASE 2
 *   QC-rapporten; modulen leverer deterministiske råflagg.
 * - Longstring er sekvensbasert, ikke skala-basert: run over skala-grenser teller
 *   (bevisst — straightlining er respondenthind, ikke skalahind).
 * - windowProbability er en iid-uniform-overslag, ikke en p-verdi, og antar at
 *   itemene i run deler antall distinct option values (største antall brukes).
 */

export const ATTENTION_VERSION = '1.0.0';

/* Deterministiske forhåndsvalg (se beslutninger 2–4 for begrunnlinger). */
export const DEFAULTS = {
  straightlineRun: 6,
  timeFloor: { likert: 2.0, ability: 3.0, order: 3.0 },
  sessionFastFactor: 0.5,
};

/* Flagg-sorteringsorden: severity først (high < medium), deretter kind-navn. */
const KIND_SEVERITY = {
  'attention-failed': 'high',
  'attention-missing': 'high',
  'fast-item': 'medium',
  'fast-session': 'medium',
  'straightline': 'medium',
};
const SEVERITY_ORDER = { high: 0, medium: 1 };

/* ------------------------------------------------------------------ */
/* 1. kjerneberegninger (rene)                                          */
/* ------------------------------------------------------------------ */

/**
 * Longstring over allerede filtrert likert-sekvens: [{ id, value }].
 * Returnerer { length, ids } for lengste run (ingen flage — tolk gjøres av kalleren).
 */
export function straightlineIndex(seq) {
  let longest = 0;
  let runIds = [];
  let curLen = 0;
  let curIds = [];
  let curVal = null;
  for (const r of seq) {
    if (curLen > 0 && Object.is(r.value, curVal)) {
      curLen += 1;
      curIds.push(r.id);
    } else {
      curLen = 1;
      curIds = [r.id];
      curVal = r.value;
    }
    if (curLen > longest) { longest = curLen; runIds = curIds.slice(); }
  }
  return { length: seq.length ? longest : 0, ids: runIds.slice() };
}

function perItemSecondsFromOpts(opts, answeredIds, errors) {
  const out = new Map(); // itemId -> sekunder (positive, endelige)
  if (opts.itemTimes !== undefined && opts.itemTimes !== null) {
    if (typeof opts.itemTimes !== 'object') {
      errors.push('opts.itemTimes må være objekt {itemId: sekunder}');
      return out;
    }
    for (const [id, sec] of Object.entries(opts.itemTimes)) {
      if (!answeredIds.has(id)) continue; // beslutning 7: tid for ubesvart item ignoreres stille — inkulde/ugyldige
      // tidsstempler for ubesvarte items feiler ikke kallet (ubesvart har ingen tid)
      const v = Number(sec);
      if (!Number.isFinite(v) || v < 0) { errors.push(`itemTimes["${id}"]: ikke endelig/positiv (${JSON.stringify(sec)})`); continue; }
      out.set(id, v);
    }
    return out;
  }
  if (opts.timeline !== undefined && opts.timeline !== null) {
    if (!Array.isArray(opts.timeline)) { errors.push('opts.timeline må være liste [{itemId, presentedAtMs, submittedAtMs}]'); return out; }
    for (const e of opts.timeline) {
      if (!e || typeof e !== 'object' || (e.itemId === undefined)) {
        errors.push('timeline-oppføring mangler itemId');
        continue;
      }
      if (!answeredIds.has(e.itemId)) continue;
      const p = Number(e.presentedAtMs);
      const s = Number(e.submittedAtMs);
      if (!Number.isFinite(p) || !Number.isFinite(s) || s < p) {
        errors.push(`timeline["${e.itemId}"]: ikke endelige tidsstempler / submittedAtMs < presentedAtMs`);
        continue;
      }
      out.set(e.itemId, (s - p) / 1000);
    }
    return out;
  }
  return null; // ingen per-item kilde
}

/* ------------------------------------------------------------------ */
/* 2. evaluering                                                        */
/* ------------------------------------------------------------------ */

/**
 * evaluateAttention(def, payload, opts) → { ok, errors, warnings, version, quality }
 * quality:
 * {
 *   status: 'clean' | 'flagged',
 *   summary: { flags: n, high: n, medium: n },
 *   flags: [{ kind, severity, itemId? | itemIds?, detail }],
 *   metrics: {
 *     likertAnswered: n,
 *     longstring: { length, ids, threshold, runWindowProbability: '1/K^(L-1)' } | null,
 *     perItemTime: null | { source: 'itemTimes'|'timeline', coverage: x/y, fast: [{itemId, sec, floor}] },
 *     sessionTime: null | { timeSpentSec, aggregateFloor, factor, flagged },
 *     attentionChecks: null | [{ id, expectedAccepted, given, ok }],
 *   },
 *   notes: [{ id, no, en }],
 * }
 */
export function evaluateAttention(def, payload, opts = {}) {
  const errors = [];
  const warnings = [];
  const flags = [];
  const notes = [];
  const version = ATTENTION_VERSION;

  if (!def || typeof def !== 'object') {
    return { ok: false, errors: ['def mangler eller er ikke objekt'], warnings, version, quality: null };
  }
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload mangler eller er ikke objekt'], warnings, version, quality: null };
  }
  if (!opts || typeof opts !== 'object') {
    return { ok: false, errors: ['opts må være objekt ved tilstedeværelse'], warnings, version, quality: null };
  }

  if (payload.testId !== def.id) {
    errors.push(`payload.testId "${payload.testId}" != def.id "${def.id}"`);
  }
  if (!Array.isArray(payload.itemIds)) errors.push('payload.itemIds mangler eller er ikke liste');
  if (!payload.answers || typeof payload.answers !== 'object') errors.push('payload.answers mangler');

  // opts-validering
  const runThr = opts.straightline && opts.straightline.run !== undefined
    ? opts.straightline.run
    : DEFAULTS.straightlineRun;
  if (!Number.isInteger(runThr) || runThr < 2) errors.push(`opts.straightline.run må være heltall >= 2 (${JSON.stringify(runThr)})`);

  const floors = { ...DEFAULTS.timeFloor };
  if (opts.timeFloor) {
    for (const k of Object.keys(opts.timeFloor)) {
      const v = Number(opts.timeFloor[k]);
      if (!Number.isFinite(v) || v <= 0) errors.push(`opts.timeFloor.${k} må være endelig > 0 (${JSON.stringify(opts.timeFloor[k])})`);
      else if (!(k in DEFAULTS.timeFloor)) errors.push(`opts.timeFloor: ukjent kind "${k}" (kjente: likert/ability/order)`);
      else floors[k] = v;
    }
  }
  const factor = opts.sessionFastFactor !== undefined
    ? Number(opts.sessionFastFactor)
    : DEFAULTS.sessionFastFactor;
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1) errors.push(`opts.sessionFastFactor må være i (0..1] (${JSON.stringify(opts.sessionFastFactor)})`);

  // attentionItems-validering
  let attentionItems = null;
  if (opts.attentionItems !== undefined && opts.attentionItems !== null) {
    if (!Array.isArray(opts.attentionItems)) errors.push('opts.attentionItems må være liste [{id, accepted}]');
    else {
      attentionItems = [];
      const byId = new Map((def.items || []).map((i) => [i.id, i]));
      opts.attentionItems.forEach((a, i) => {
        if (!a || typeof a !== 'object' || !a.id) { errors.push(`attentionItems[${i}]: mangler id`); return; }
        if (!byId.has(a.id)) { errors.push(`attentionItems[${i}]: id "${a.id}" finnes ikke i def`); return; }
        const accepted = a.accepted !== undefined ? a.accepted : a.expected;
        if (!Array.isArray(accepted) || accepted.length === 0) {
          errors.push(`attentionItems "${a.id}": accepted må være ikke-tom liste av option values`);
          return;
        }
        attentionItems.push({ id: a.id, accepted: accepted.slice() });
      });
      if (attentionItems.length === 0 && errors.length === 0) {
        errors.push('opts.attentionItems ga ingen gyldige oppføringer');
      }
    }
  }

  if (errors.length) return { ok: false, errors, warnings, version, quality: null };

  /* ---- sequence + answered-set ---- */
  const byId = new Map((def.items || []).map((i) => [i.id, i]));
  const answered = new Map(); // itemId -> answer
  for (const id of payload.itemIds) {
    if (!byId.has(id)) { errors.push(`payload.itemIds: ukjent item "${id}"`); continue; }
    const a = payload.answers[id];
    if (a !== undefined && a !== null) answered.set(id, a);
  }
  if (errors.length) return { ok: false, errors, warnings, version, quality: null };

  const likertSeq = [];
  const answeredKinds = new Map(); // itemId -> kind (besvarte)
  for (const id of payload.itemIds) {
    const a = answered.get(id);
    if (!a) continue;
    const item = byId.get(id);
    answeredKinds.set(id, item.kind);
    if (item.kind === 'likert' && Number.isInteger(a.value)) likertSeq.push({ id, value: a.value });
  }

  /* ---- 1) straightlining (likert-only) ---- */
  const longstring = straightlineIndex(likertSeq);
  const lsFlagged = longstring.length >= runThr;
  let windowProbability = null;
  if (lsFlagged) {
    // iid-overslag: K = største distinct option count blant run-items; p = K^(1-L)
    let kMax = 0;
    for (const id of longstring.ids) {
      const vals = (byId.get(id).options || []).map((o) => Number(o.value));
      const distinct = new Set(vals).size;
      if (distinct > kMax) kMax = distinct;
    }
    if (kMax > 1 && longstring.length > 1) {
      const p = kMax ** (1 - longstring.length);
      windowProbability = { k: kMax, pPerWindow: `1/${kMax ** (longstring.length - 1)}`, estimate: p };
    }
    flags.push({
      kind: 'straightline',
      severity: KIND_SEVERITY.straightline,
      itemIds: longstring.ids.slice(),
      detail: `longstring ${longstring.length} >= terskel ${runThr} (identiske likert-verdier i rekkefølge)`,
    });
  }

  /* ---- 2) tidsbruk ---- */
  const perItem = perItemSecondsFromOpts(opts, answered, errors);
  if (errors.length) return { ok: false, errors, warnings, version, quality: null };

  let perItemTime = null;
  let sessionTime = null;
  if (perItem && perItem.size > 0) {
    const fast = [];
    for (const id of payload.itemIds) {
      if (!answered.has(id) || !perItem.has(id)) continue;
      const kind = answeredKinds.get(id);
      const sec = perItem.get(id);
      const floor = floors[kind] !== undefined ? floors[kind] : null;
      if (floor === null) { warnings.push(`${id}: ingen tids-gulv for kind "${kind}" — itemet hoppes over i tids-check`); continue; }
      if (sec < floor) {
        fast.push({ itemId: id, sec, floor });
        flags.push({
          kind: 'fast-item',
          severity: KIND_SEVERITY['fast-item'],
          itemId: id,
          detail: `svar registrert etter ${sec.toFixed(2)} s < gulv ${floor} s (kind ${kind}) — for raskt forfullstendig lesing; teller som kvalitetsflagg, ikke som feil svar`,
        });
      }
    }
    const coverage = answered.size > 0 ? perItem.size / answered.size : 0;
    perItemTime = { source: opts.itemTimes !== undefined && opts.itemTimes !== null ? 'itemTimes' : 'timeline', coverage, fast };
    if (perItem.size < answered.size) {
      warnings.push(`per-item tid dekker ${perItem.size} av ${answered.size} besvarte — flagg kun innenfor dekket delmengde`);
    }
    notes.push({
      id: 'note.time.per-item-source',
      no: 'Per-item tidsbruk levert av kalleren (itemTimes/timeline); sesjonsnivå-regel ikke brukt (ingen dobbelttell).',
      en: 'Per-item times supplied by caller (itemTimes/timeline); session-level rule not applied (no double counting).',
    });
  } else {
    const t = Number(payload.timeSpentSec);
    if (Number.isFinite(t) && t >= 0 && answered.size > 0) {
      let aggregateFloor = 0;
      let kindsMissing = 0;
      for (const kind of answeredKinds.values()) {
        if (floors[kind] !== undefined) aggregateFloor += floors[kind];
        else kindsMissing += 1;
      }
      if (kindsMissing > 0) warnings.push(`${kindsMissing} besvarte items med ukjent kind uten tids-gulv — ekskludert fra sesjons-gulv`);
      const sessionFlagged = t < factor * aggregateFloor;
      sessionTime = { timeSpentSec: t, aggregateFloor, factor, flagged: sessionFlagged };
      if (sessionFlagged) {
        flags.push({
          kind: 'fast-session',
          severity: KIND_SEVERITY['fast-session'],
          detail: `session timeSpentSec ${t.toFixed(2)} < ${factor}*Σgulv (${factor}×${aggregateFloor.toFixed(2)}=${(factor * aggregateFloor).toFixed(2)}) — gjennomsnittlig tid per besvart item under ${factor.toFixed(2)}× lesegulv; grovkornet fangst,
 ingen per-item granularitet levert`,
        });
      }
      notes.push({
        id: 'note.time.session-only',
        no: 'Kun sesjonsnivå-tid tilgjengelig (render v0.5.0 sender timeSpentSec) — per-item flagg krever itemTimes/timeline, fabrikkeres aldri.',
        en: 'Only session-level time available (render v0.5.0 sends timeSpentSec) — per-item flags require itemTimes/timeline, never fabricated.',
      });
    } else {
      perItemTime = null;
      sessionTime = null;
      notes.push({
        id: 'note.time.unavailable',
        no: 'Ingen tidsgrunnlag (verken timeSpentSec, ingen itemTimes/timeline) — tidsflagg kan ikke beregnes.',
        en: 'No time basis (neither timeSpentSec nor itemTimes/timeline) — time flags cannot be computed.',
      });
    }
  }

  /* ---- 3) attention-check items ---- */
  let attentionChecks = null;
  if (attentionItems) {
    attentionChecks = [];
    for (const a of attentionItems) {
      const ans = answered.get(a.id);
      const given = ans === undefined ? null : (ans.kind === 'likert' ? ans.value : (ans.abilityOriginalIndex !== undefined ? ans.abilityOriginalIndex : null));
      const idx = payload.itemIds.indexOf(a.id);
      const present = idx >= 0;
      const row = { id: a.id, presented: present, expectedAccepted: a.accepted.slice(), given, ok: undefined };
      if (!present) {
        row.ok = null; // valgt item er ikke med i denne økten (sampling) — ikke et feil svar
        notes.push({
          id: 'note.attention.not-sampled',
          no: `Attention-check "${a.id}" er ikke med i denne økten (sampling) — hoppet over, ikke flagget.`,
          en: `Attention check "${a.id}" is not part of this session (sampling) — skipped, not flagged.`,
        });
      } else if (ans === undefined) {
        row.ok = false;
        flags.push({
          kind: 'attention-missing',
          severity: KIND_SEVERITY['attention-missing'],
          itemId: a.id,
          detail: 'attention-check item presentert men ubesvart',
        });
      } else if (!a.accepted.some((v) => Object.is(v, given))) {
        row.ok = false;
        flags.push({
          kind: 'attention-failed',
          severity: KIND_SEVERITY['attention-failed'],
          itemId: a.id,
          detail: `gitt ${JSON.stringify(given)} ∉ accepted ${JSON.stringify(a.accepted)} — instruert svar fulgt ikke`,
        });
      } else {
        row.ok = true;
      }
      attentionChecks.push(row);
    }
  }

  /* ---- sortering + summary ---- */
  flags.sort((x, y) => (
    (SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity])
    || (x.kind < y.kind ? -1 : x.kind > y.kind ? 1 : 0)
    || ((x.itemId || (x.itemIds && x.itemIds[0]) || '').localeCompare(y.itemId || (y.itemIds && y.itemIds[0]) || ''))
  ));
  const summary = {
    flags: flags.length,
    high: flags.filter((f) => f.severity === 'high').length,
    medium: flags.filter((f) => f.severity === 'medium').length,
  };

  const quality = {
    status: flags.length > 0 ? 'flagged' : 'clean',
    summary,
    flags,
    metrics: {
      likertAnswered: likertSeq.length,
      longstring: {
        length: longstring.length,
        ids: longstring.ids.slice(),
        threshold: runThr,
        runWindowProbability: windowProbability,
      },
      perItemTime,
      sessionTime,
      attentionChecks,
    },
    notes,
  };

  return { ok: true, errors: [], warnings, version, quality };
}
