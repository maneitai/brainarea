/**
 * Brainarea scoring-lag v1.0.0 — [BYGG] FASE 1, todo leaf #3712
 * "Scoring-engine — vekter → dimensjonsskår → total."
 *
 * Renset ES-modul (ingen dependencies). Ren funksjon: def + onComplete-payload
 * fra render.js v0.5.0 → skårer. Ingen DOM, ingen rng, ingen klokke — samme
 * input gir bitvis samme output (krav for håndverifikasjon av andre modeller).
 *
 * ---- Kontrakt mot andre moduler ----
 * - Inndata: test-definisjon validert av tests/schema/test-definition.schema.json (v1),
 *   payload = onComplete-objekt fra render.js:
 *   { testId, lang, itemIds, startedAt, finishedAt, timeSpentSec, expired, answers }
 *   der answers[itemId] = { kind:'likert', lang, value } |
 *                         { kind:'ability', lang, abilityOriginalIndex } |
 *                         { kind:'order', order: [elementstrenger i brukerens rekkefølge] }.
 * - Utdata: { ok, errors, warnings, result } — result.total er typen-spesifikk total;
 *   result.scales er dimensjonsskårene i DEF-order (deterministisk).
 *
 * ---- Beslutninger i dette steget (dokumentert, ikke usynlige) ----
 * 1. VEKTER: scoring.traits[].weight (default 1) brukes i komposittoverview (trait).
 *    Item-nivå vekter finnes ikke i schema v1 — reversering gjøres via scales[].sign
 *    (likert c = sign*value; order c = treff mot kanonisk rekkefølge; ability c = 1/0).
 * 2. DIMENSJONSSKÅR: normaliseres 0–100 mot det faktisk BESVARTE itemsettet:
 *    normalized = 100*(raw - minPossible)/(maxPossible - minPossible). Ubesvarte
 *    items teller ikke — dekkes av coverage i resultatet (ingen falsk presisjon).
 * 3. NORMERINGS-ÆRLIGHET (substrat-krav: NV-markering, ingen prosentiler uten normer):
 *    norms: 'published' krever normsdata ved kall for å gi prosentiler — scoringmodulen
 *    fabrikkerer aldri normer. g-score rapporteres som råtrekk + theta (1PL MLE over
 *    item.difficulty, som schema selv beskriver som placeholder før kalibrering),
 *    aldri som IQ-skårtall (M=100/SD=15) før normdata føres inn fra normeringssteg #3724.
 *    Note-id-er ligger i result.notes med NO/EN-tekst for i18n-steget.
 * 4. BAND: høyeste band med minScore <= score velges (bands trenger ikke sorteres).
 *    disclaimer id passeres uendret (renderes verbatim, engine nekter ikke å skåre —
 *    men ikke vises her; det er resultatvisningens jobb).
 * 5. FEIL vs ADVARSEL: errors = payload/def uforenlig med scoringkontrakten (ok:false,
 *    ingen result). warnings = gyldig men redusert (partiell coverage, sign ignorert,
 *    degenerert skala, norms erklært uten data). Ordning alltid deterministisk.
 * 6. TID: scoreTest leser aldri Date.now() — tidsbruk kopieres fra payload.
 *
 * ---- Kjente begrensninger (ærlig) ----
 * - order-skår = antall korrekte posisjoner (Spearman-frekvens holdes til rapportsteget).
 * - sign=-1 på ability-items ignoreres (warning) — evneskår er alltid korrekt/1.
 * - g-score CI er på THETA-metrikken (Wald 1.96*SE, 1PL MLE); IQ-skala-CI kan først
 *   regnes når normerings-endpointen leverer populasjonsmean/sd.
 */

export const SCORING_VERSION = '1.0.0';

/* ------------------------------------------------------------------ */
/* 1. payload-validering                                               */
/* ------------------------------------------------------------------ */

export function validatePayload(def, payload) {
  const errors = [];
  const warnings = [];
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload mangler eller er ikke objekt'], warnings };
  }
  if (payload.testId !== def.id) errors.push(`payload.testId "${payload.testId}" != def.id "${def.id}"`);
  if (!Array.isArray(payload.itemIds)) errors.push('payload.itemIds mangler eller er ikke liste');
  if (!payload.answers || typeof payload.answers !== 'object') errors.push('payload.answers mangler');

  const byId = new Map((def.items || []).map((i) => [i.id, i]));
  const itemIds = Array.isArray(payload.itemIds) ? payload.itemIds : [];
  for (const id of itemIds) {
    if (!byId.has(id)) { errors.push(`payload.itemIds: ukjent item "${id}"`); continue; }
    const item = byId.get(id);
    const a = payload.answers[id];
    if (a === undefined || a === null) continue; // ubesvart => warning senere (coverage)
    if (a.kind !== item.kind) {
      errors.push(`${id}: svar-kind "${a.kind}" != item-kind "${item.kind}"`);
      continue;
    }
    if (a.kind === 'likert') {
      const values = (item.options || []).map((o) => o.value);
      if (!Number.isInteger(a.value) || !values.includes(a.value)) {
        errors.push(`${id}: likert verdi ${JSON.stringify(a.value)} er ikke et av option values [${values.join(', ')}]`);
      }
    } else if (a.kind === 'ability') {
      const lang = a.lang || payload.lang;
      const variant = (item.variants || []).find((v) => v.lang === lang) || (item.variants || [])[0];
      if (!variant) { errors.push(`${id}: ingen variant tilgjengelig`); continue; }
      const n = (variant.options || []).length;
      if (!Number.isInteger(a.abilityOriginalIndex) || a.abilityOriginalIndex < 0 || a.abilityOriginalIndex >= n) {
        errors.push(`${id}: abilityOriginalIndex ${JSON.stringify(a.abilityOriginalIndex)} utenfor 0..${n - 1}`);
      }
    } else if (a.kind === 'order') {
      const elems = item.elements || [];
      if (!Array.isArray(a.order)) { errors.push(`${id}: order-svar er ikke liste`); continue; }
      if (a.order.length !== elems.length) errors.push(`${id}: order-svar har ${a.order.length} elementer, item har ${elems.length}`);
      if (new Set(a.order).size !== a.order.length) errors.push(`${id}: order-svar har duplikat-elementer`);
      for (const e of a.order) {
        if (!elems.includes(e)) errors.push(`${id}: order-svar-element "${e}" finnes ikke i item.elements`);
      }
    }
  }
  const answered = itemIds.filter((id) => payload.answers[id] !== undefined && payload.answers[id] !== null).length;
  const unfinished = payload.finishedAt === undefined && payload.finishedAt === null;
  if (unfinished) warnings.push('payload har ikke finishedAt — scorer bare hvis allowPartial');
  if (answered < itemIds.length) warnings.push(`ubesvarte items: ${itemIds.length - answered} av ${itemIds.length} (coverage ${(itemIds.length ? answered / itemIds.length : 0).toFixed(3)})`);
  return { ok: errors.length === 0, errors, warnings };
}

/* ------------------------------------------------------------------ */
/* 2. bidrag per item-kind                                             */
/* ------------------------------------------------------------------ */

/**
 * Likert-bidrag: sign * verdi. MinMax: sign=1 -> [minVal, maxVal];
 * sign=-1 -> [-maxVal, -minVal]. Returnerer null ved ubesvart.
 */
function likertContribution(sign, value, options) {
  const vals = options.map((o) => Number(o.value)).filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max === min) return { c: null, minP: null, maxP: null, degenerate: true };
  const c = sign === -1 ? -value : value;
  const minP = sign === -1 ? -max : min;
  const maxP = sign === -1 ? -min : max;
  return { c, minP, maxP, degenerate: false };
}

/* ------------------------------------------------------------------ */
/* 3. theta-estimator (1PL MLE) — g-score                              */
/* ------------------------------------------------------------------ */

/**
 * Rene fôringsledd: items = [{difficulty, correct:boolean}].
 * P(correct) = 1/(1+exp(-(theta - difficulty))). Newton–Raphson, 50 iters,
 * dämpning unødvendig (konkav). Alle-riktig/alle-feil -> MLE +/-inf => null.
 * Returnerer { theta, se, ci95, method, n } der null-felter er "kan ikke estimeres".
 */
export function estimateTheta1PL(items) {
  const n = items.length;
  if (n === 0) return { theta: null, se: null, ci95: null, method: '1pl-mle', n };
  const b = items.map((i) => Number(i.difficulty));
  const y = items.map((i) => (i.correct ? 1 : 0));
  const sumY = y.reduce((s, v) => s + v, 0);
  if (sumY === 0 || sumY === n) {
    return { theta: null, se: null, ci95: null, method: '1pl-mle', n, reason: sumY === 0 ? 'alle-feil' : 'alle-riktig' };
  }
  let t = 0;
  for (let it = 0; it < 50; it++) {
    let d = 0;
    let info = 0;
    for (let i = 0; i < n; i++) {
      const p = 1 / (1 + Math.exp(-(t - b[i])));
      d += y[i] - p;
      info += p * (1 - p);
    }
    if (info < 1e-12) break;
    const step = d / info;
    t += step;
    if (!Number.isFinite(t)) return { theta: null, se: null, ci95: null, method: '1pl-mle', n, reason: 'uendelig' };
    if (Math.abs(step) < 1e-12) break;
  }
  // observed information på nytt ved endelig punkt:
  let info = 0;
  for (let i = 0; i < n; i++) {
    const p = 1 / (1 + Math.exp(-(t - b[i])));
    info += p * (1 - p);
  }
  if (!Number.isFinite(info) || info < 1e-12) {
    return { theta: null, se: null, ci95: null, method: '1pl-mle', n, reason: 'informasjon 0' };
  }
  const se = 1 / Math.sqrt(info);
  return { theta: t, se, ci95: [t - 1.959964 * se, t + 1.959964 * se], method: '1pl-mle', n };
}

/**
 * Konverter theta til IQ-skala (M=100, SD=15) GITT normdata
 * { mean, sd } = populasjonsmean/sd på theta-metrikken.
 * sd <= 0 eller manglende => null (ingen fabrikkerte normer).
 * Ikke koblet til UI enda — normerings-endpointen (#3724) leverer {mean, sd}.
 */
export function thetaToIq(theta, norms) {
  if (theta === null || theta === undefined || !Number.isFinite(theta)) return null;
  if (!norms || !Number.isFinite(norms.mean) || !Number.isFinite(norms.sd) || norms.sd <= 0) return null;
  return 100 + 15 * ((theta - norms.mean) / norms.sd);
}

/* ------------------------------------------------------------------ */
/* 4. hovedfunksjon                                                    */
/* ------------------------------------------------------------------ */

export function scoreTest(def, payload, opts = {}) {
  const allowPartial = Boolean(opts.allowPartial);
  const v = validatePayload(def, payload);
  const errors = [...v.errors];
  const warnings = [...v.warnings];
  if (errors.length) return { ok: false, errors, warnings, result: null };

  // unfinished payload (ingen finishedAt) scores bare med allowPartial
  if (payload.finishedAt === undefined || payload.finishedAt === null) {
    if (!allowPartial) {
      return { ok: false, errors: [...errors, 'payload ikke fullført (mangler finishedAt) — kall med allowPartial for eksplisitt delskår'], warnings, result: null };
    }
    warnings.push('delskår på ufullført økt (allowPartial) — dekkes av coverage');
  }

  const itemIds = payload.itemIds.slice();
  const answeredMap = new Map(); // itemId -> answer
  for (const id of itemIds) {
    const a = payload.answers[id];
    if (a !== undefined && a !== null) answeredMap.set(id, a);
  }
  const byId = new Map(def.items.map((i) => [i.id, i]));
  const answeredCount = answeredMap.size;
  const totalItems = itemIds.length;
  const coverage = totalItems > 0 ? answeredCount / totalItems : 0;

  /* ---- bygg per-skala aggregrater over BESVARTE items ---- */
  const scaleIds = [];
  const scaleOrder = new Set();
  if (def.scoring.type === 'trait') {
    for (const t of def.scoring.traits || []) {
      if (!scaleOrder.has(t.id)) { scaleOrder.add(t.id); scaleIds.push(t.id); }
    }
  }
  for (const d of def.dimensions || []) {
    if (!scaleOrder.has(d.id)) { scaleOrder.add(d.id); scaleIds.push(d.id); }
  }
  const agg = new Map(); // scaleId -> { raw, minP, maxP, n, reversed, itemIds, correct, degenSigns, hitsMax }
  for (const sid of scaleIds) {
    agg.set(sid, { raw: 0, minP: 0, maxP: 0, n: 0, reversed: 0, itemIds: [], correct: 0, hitsMax: 0, degenerate: false });
  }
  const nonScaleContrib = [];
  const abilitySignWarned = new Set();

  for (const id of itemIds) {
    const a = answeredMap.get(id);
    if (!a) continue;
    const item = byId.get(id);
    for (const s of item.scales || []) {
      if (!agg.has(s.id)) {
        // item refererer skala som ikke er deklarert — validateTestDef fanger dette;
        // scoring nekter heller enn å gjette:
        errors.push(`${id}: skala "${s.id}" er ikke deklarert i dimensions/scoring.traits`);
        continue;
      }
      const g = agg.get(s.id);
      if (item.kind === 'likert') {
        const contrib = likertContribution(s.sign, a.value, item.options || []);
        if (contrib.degenerate) { g.degenerate = true; continue; }
        g.raw += contrib.c;
        g.minP += contrib.minP;
        g.maxP += contrib.maxP;
        if (s.sign === -1) g.reversed += 1;
      } else if (item.kind === 'ability') {
        if (s.sign === -1 && !abilitySignWarned.has(s.id)) {
          abilitySignWarned.add(s.id);
          warnings.push(`sign ignorert for ability-item på skala "${s.id}" (evneskår er alltid korrekt=1)`);
        }
        const lang = a.lang || payload.lang;
        const variant = (item.variants || []).find((x) => x.lang === lang) || (item.variants || [])[0];
        const correct = a.abilityOriginalIndex === variant.correctIndex;
        g.raw += correct ? 1 : 0;
        g.maxP += 1;
        if (correct) g.correct += 1;
      } else if (item.kind === 'order') {
        const elems = item.elements || [];
        let hits = 0;
        for (let i = 0; i < Math.min(a.order.length, elems.length); i++) {
          if (a.order[i] === elems[i]) hits += 1;
        }
        g.raw += hits;
        g.maxP += elems.length;
        g.hitsMax += hits;
      }
      g.n += 1;
      g.itemIds.push(id);
    }
    if (!item.scales || item.scales.length === 0) nonScaleContrib.push(id);
  }
  if (nonScaleContrib.length) {
    warnings.push(`${nonScaleContrib.length} besvarte items uten scales bidrar ikke til skår (${nonScaleContrib.join(', ')})`);
  }
  // trait: skalaer i scoring.traits som ingen items refererer
  if (def.scoring.type === 'trait') {
    for (const t of def.scoring.traits || []) {
      const g = agg.get(t.id);
      if (g && g.n === 0) warnings.push(`trait "${t.id}" har ingen besvarte items`);
    }
  }

  /* ---- dimensjonsskår per skala ---- */
  const weightOf = (sid) => {
    const t = (def.scoring.traits || []).find((x) => x.id === sid);
    return t && Number.isFinite(t.weight) ? t.weight : 1;
  };
  const scales = [];
  for (const sid of scaleIds) {
    const g = agg.get(sid);
    const span = g.maxP - g.minP;
    const normalized = g.n > 0 && !g.degenerate && span > 0
      ? (100 * (g.raw - g.minP)) / span
      : null;
    if (normalized === null && g.n > 0 && !g.degenerate && span === 0) {
      warnings.push(`skala "${sid}" degenerert i denne økten (kun items med fast verdi) — normalisert skår null`);
    }
    if (g.degenerate) warnings.push(`skala "${sid}": options uten spredning avvist fra normalisering`);
    const row = {
      id: sid,
      weight: def.scoring.type === 'trait' ? weightOf(sid) : undefined,
      itemsAnswered: g.n,
      coveragePct: coverage,
      raw: g.raw,
      minPossible: g.minP,
      maxPossible: g.maxP,
      normalized,
      reversedCount: g.reversed,
      itemIds: g.itemIds.slice(),
    };
    if (def.scoring.type === 'g-score') row.correctCount = g.correct;
    scales.push(row);
  }

  /* ---- total per scoring-type ---- */
  let total = null;
  const notes = [];
  const pushNote = (id, no, en) => notes.push({ id, no, en });

  if (def.scoring.type === 'trait') {
    // kompositt: vektet gjennomsnitt over normaliserte skalaer med data
    let wsum = 0;
    let nsum = 0;
    for (const s of scales) {
      if (s.normalized === null) continue;
      const w = Number.isFinite(s.weight) ? s.weight : 1;
      wsum += w * s.normalized;
      nsum += w;
    }
    const composite = nsum > 0 ? wsum / nsum : null;
    if (composite === null && scales.length > 0) warnings.push('kompositt null: ingen skalaer med data');
    const norms = def.scoring.norms || 'none';
    if (norms === 'published') {
      warnings.push('norms=erklært published men ingen normsdata levert til scoring — prosentiler kan ikke beregnes (fabrikkeres aldri)');
    }
    total = { type: 'trait', composite, norms, normsFile: def.scoring.normsFile || null };
    if (norms !== 'published') {
      pushNote('note.trait.not-normed',
        'Skår er prosent av skala-omfang, ikke persentiler — ingen normer er brukt.',
        'Score is percent of scale range, not percentiles — no norms are applied.');
    }
  } else if (def.scoring.type === 'threshold') {
    // total = råskår over alle besvarte items (alle skalaer), band = høyeste minScore <= skår
    let score = 0;
    let anyData = false;
    for (const sid of scaleIds) {
      const g = agg.get(sid);
      if (g.n === 0) continue;
      score += g.raw;
      anyData = true;
    }
    if (!anyData) warnings.push('threshold: ingen besvarte items — score 0 rapportert tomhånt');
    const bands = def.scoring.bands || [];
    let band = null;
    for (const b of bands) {
      if (Number.isFinite(b.minScore) && score >= b.minScore) {
        if (!band || b.minScore > band.minScore) band = b;
      }
    }
    if (!band) warnings.push('threshold: score under alle band-grenser — band null');
    total = {
      type: 'threshold',
      score,
      bandId: band ? band.id : null,
      bandLabel: band ? band.label : null,
      guidance: band && band.guidance ? band.guidance : null,
      disclaimer: def.scoring.disclaimer,
    };
    pushNote('note.threshold.screening',
      'Screening, ikke diagnose — disclaimer-id gjengis på resultatsiden.',
      'Screening, not diagnosis — disclaimer id is rendered on the result page.');
  } else {
    // g-score
    const rows = [];
    let correct = 0;
    let answeredN = 0;
    const thetaItems = [];
    for (const id of itemIds) {
      const a = answeredMap.get(id);
      if (!a || a.kind !== 'ability') continue;
      const item = byId.get(id);
      const lang = a.lang || payload.lang;
      const variant = (item.variants || []).find((x) => x.lang === lang) || (item.variants || [])[0];
      const okAns = a.abilityOriginalIndex === variant.correctIndex;
      rows.push({ id, correct: okAns, difficulty: variant.difficulty });
      if (okAns) correct += 1;
      answeredN += 1;
      thetaItems.push({ difficulty: variant.difficulty, correct: okAns });
    }
    const proportion = answeredN > 0 ? correct / answeredN : null;
    const th = estimateTheta1PL(thetaItems);
    let ci = null;
    if (th.theta !== null) {
      ci = th.ci95;
    } else if (th.reason) {
      warnings.push(`g-score theta kan ikke estimeres: ${th.reason} (rapporter råskår)`);
    }
    total = {
      type: 'g-score',
      metric: def.scoring.metric || 'z100',
      correctCount: correct,
      answeredCount: answeredN,
      proportion,
      theta: th.theta,
      thetaSe: th.theta === null ? null : th.se,
      ci95: ci,
      iqScale: null,
      notNormed: true,
    };
    pushNote('note.gscore.not-normed',
      'Resultatet oppgis som råtrekk og estimert evnenivå (theta) med usikkerhetsintervall. Det er ikke et normert IQ-tall: IQ-skala (M=100, SD=15) krever normdata fra normerings-endpointen. Usikkerhetsintervallet er Wald-intervall (±1,96·SE) på theta-metrikken.',
      'The result is given as a raw count and an estimated ability level (theta) with an uncertainty interval. It is not a normed IQ number: an IQ scale (M=100, SD=15) requires norm data from the norming endpoint. The uncertainty interval is a Wald interval (±1.96·SE) on the theta metric.');
  }

  const result = {
    schemaVersion: 1,
    testId: def.id,
    family: def.family,
    lang: payload.lang,
    scoringType: def.scoring.type,
    engine: { scoring: SCORING_VERSION },
    completed: !(payload.expired === true),
    expired: payload.expired === true,
    timeSpentSec: Number.isFinite(payload.timeSpentSec) ? payload.timeSpentSec : null,
    answeredCount,
    totalItems,
    coverage,
    scales,
    total,
    notes,
  };
  return { ok: true, errors, warnings, result };
}
