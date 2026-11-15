/**
 * Brainarea report renderer v1.0.0 — [BYGG] FASE 1, todo #3728.
 *"3 rammer (standard/personlig/arbeidsgiver) som JSON-config, én renderer."
 *
 * Ren ES-modul, ingen dependencies. Konsumerer:
 *   - result  = scoring.js scoreTest()-utdata ({ok:true, result:{...}}) eller dets
 *     `result`-felt: { schemaVersion, testId, family, lang, scoringType, scales[],
 *     total, notes[], coverage, timeSpentSec, ... } (kontrakt verifisert mot tests/engine/scoring.js v1.0.0).
 *   - config  = report/report-config.schema.json-konform ramme-config ([FASE] #3728:
 *     configs/standard.json | personal.json | employer.json).
 *   - opts    = { lang: 'no'|'en', profileId?: string, includeSvg?: boolean=true }
 * Utdata (deterministisk — samme input gir bytes identisk output):
 *   { lang, frame, html, svg, strings, meta }
 * der `html` er rapportseksjonene, `svg` dimensjonsgrafen (kan settes inn i html),
 * `strings` ALLE synlige renderede strenger (deterministisk orden, for ban-scan og QA)
 * og meta { sections, bannedScans }.
 *
 * ---- KVALITETSKONTRAKT (#3730-kriteriene, bakt inn her) ----
 * 1. MIDTPUNKT != PROSENT AV MAKSIMUM: grafen tegner alltid midtpunktstreken ved 50
 *    når dimensions.midpointMarker er satt, med text fra dimensions.graphicLabels.
 *    midpointsLegend ("midtpunkt, ikke gjennomsnitt") og percentOfRange ("prosent av
 *    skalaens omfang") er to SEPARATE strenger — renderer blander dem aldri.
 * 2. INGEN FALSK NORM/DIAGNOSE/SERTIFIKAT: hvert total-blokk krever normNote
 *    (hard-feil hvis mangler — ingen skårblokk renderes uframet). iqScale-feltet fra
 *    scoring-resultatet leses ALDRI av denne koden (kode-nivå forbud, kontrakt: null
 *    i FASE 1). Skala-50-markering er "skalaens midtpunkt", aldri "gjennomsnitt",
 *    "normal" eller "typisk".
 * 3. MOODEFFEKT: standard-rammen KREVER config.moodEffect.text — mangler den er det
 *    en config-feil (hard-feil). Personlig/arbeidsgiver: renderes når tilstede.
 * 4. TREDJEPARTSLESBAR: standard-rammen krever thirdParty.title+body (no/en) og en
 *    kontekst-linje med testId+språk — en leser uten testkjennskap forstår resultatet.
 * 5. FORBUDS-VOKTOR: employer-frame kjører negasjonsbevisst substring-scan over ALLE
 *    renderede strenger mot config.employer.prohibitions; threshold-blokken scanner
 *    sine egne strenger mot total.threshold.forbidWord. Negasjonsregel: et forbudt
 *    uttrykk bryter KUN hvis setningschunk-et det står i mangler negasjonsmarkør
 *    (ikke/aldri/not/never/kan ikke/skal ikke/må ikke). Heuristisk vokter — slutt-
 *    kontrollen er menneskelig (#3729 leser hele konfigen mot beslutning 7/8).
 * 6. EMPLOYER +POSITIVE assert: minst én heading må inneholde
 *    "grunnlag for samtale" / "groundwork for a conversation" (dok-avgjørelse).
 * 7. ENGINE-NOTATER i employer-frame: aldri siteres rått — noteParaphrases[<note.id>]
 *    kreves per note-id som motoren emitterer (ukjent id = hard-feil, ingen stille
 *    utelatelse). Standard/personlig: notatets no/en-tekst fra result.notes verbatim.
 */

export const RENDERER_VERSION = '1.0.0';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- streng-sanker (alle synlige ord går gjennom config eller result) ---------- */

class Strings {
  constructor() { this.list = []; }
  push(s) {
    if (typeof s !== 'string' || s.length === 0) throw new Error('renderer: tom streng i utdata — config må gi full tekst');
    this.list.push(s);
    return s;
  }
}

/* bilingual-oppslag: streng — aldri stille EN-fallback (configs krever no+en fullt) */
function L(obj, lang, where) {
  if (!obj || typeof obj !== 'object') throw new Error(`renderer: ${where} mangler i config`);
  const v = obj[lang];
  if (typeof v !== 'string' || v.trim().length === 0) throw new Error(`renderer: ${where}.${lang} mangler/tom i config`);
  return v;
}

/* ---------- negasjonsbevisst verbusscanner ---------- */

const NEG_CUE = /(^|[^A-Za-z\u00e6\u00f8\u00e5\u00c6\u00d8\u00c5])(ikke|aldri|no|not|never|kan\s+ikke|skal\s+ikke|m\u00e5\s+ikke|kan\s+aldri)\b/i;
const CHUNK_SPLIT = /(?<=[.!?;])\s+|\s+[-\u2014]\s+/;

/**
 * Scan renderede strenger mot forbuds-liste (substring, case-insensitiv).
 * Et treff TELLER kun som brudd hvis chunk-en det opptrer i mangler negasjonsmarkør.
 * Returnerer brudd-liste [{ term, chunk }] (tom = ok).
 */
export function scanBanned(strings, terms) {
  const violations = [];
  const lowerTerms = terms.map((t) => String(t).toLowerCase());
  for (const s0 of strings) {
    const s = String(s0);
    const chunks = s.split(CHUNK_SPLIT);
    for (const chunk of chunks) {
      const low = chunk.toLowerCase();
      const hasNeg = NEG_CUE.test(chunk);
      for (const t of lowerTerms) {
        if (t.length === 0) continue;
        if (low.includes(t) && !hasNeg) violations.push({ term: t, chunk: chunk.trim().slice(0, 120) });
      }
    }
  }
  return violations;
}

/* ---------- SVG: dimensjonsgraf (bar 0–100 + midtpunktmarkør) ---------- */

export function renderDimensionsSvg(result, config, lang, strings, opts) {
  const dimsCfg = (config && config.dimensions) || {};
  if (dimsCfg.graphic === 'none' || !Array.isArray(result.scales)) return '';
  const gl = dimsCfg.graphicLabels || {};
  const axisStart = L(gl.axisStart || { no: '0', en: '0' }, lang, 'dimensions.graphicLabels.axisStart');
  const axisEnd = L(gl.axisEnd || { no: '100', en: '100' }, lang, 'dimensions.graphicLabels.axisEnd');
  const pctLabel = L(gl.percentOfRange, lang, 'dimensions.graphicLabels.percentOfRange');
  const midpointLegend = dimsCfg.midpointMarker
    ? L(gl.midpointLegend, lang, 'dimensions.graphicLabels.midpointLegend') : null;
  const notComputable = L(gl.notComputable, lang, 'dimensions.graphicLabels.notComputable');

  const rows = result.scales.slice();
  if (dimsCfg.sort === 'desc') rows.sort((a, b) => (b.normalized ?? -1) - (a.normalized ?? -1));
  else if (dimsCfg.sort === 'asc') rows.sort((a, b) => (a.normalized ?? 101) - (b.normalized ?? 101));
  /* def-orden: som levert (deterministisk) */

  const BAR_W = 560, LEFT = 30, ROW_H = 56, TOP = 34, BAR_H = 22;
  const barRows = rows.filter((r) => r.normalized !== null && r.normalized !== undefined);
  const ncRows = rows.filter((r) => r.normalized === null || r.normalized === undefined);
  const H = TOP + barRows.length * ROW_H + ncRows.length * 26 + 30;

  const labelOf = (id) => {
    const explicit = dimsCfg.labels && dimsCfg.labels[id];
    return explicit ? L(explicit, lang, `dimensions.labels.${id}`) : strings.push(String(id)); /* fallback: id verbatim — aldri oppfunnet navn */
  };

  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LEFT * 2 + BAR_W} ${H}" role="img" aria-label="${esc(pctLabel)}">`);
  parts.push(`<title>${esc(pctLabel)}</title>`);
  /* akse */
  parts.push(`<line x1="${LEFT}" y1="${TOP - 14}" x2="${LEFT + BAR_W}" y2="${TOP - 14}" stroke="#d4d4d8" stroke-width="1"/>`);
  parts.push(`<text x="${LEFT}" y="${TOP - 20}" font-size="11" fill="#6b7280" text-anchor="start">${esc(axisStart)}</text>`);
  parts.push(`<text x="${LEFT + BAR_W}" y="${TOP - 20}" font-size="11" fill="#6b7280" text-anchor="end">${esc(axisEnd)}</text>`);
  for (let v = 0; v <= 100; v += 10) {
    const x = LEFT + (BAR_W * v) / 100;
    parts.push(`<line x1="${x}" y1="${TOP - 14}" x2="${x}" y2="${TOP - 10}" stroke="#d4d4d8" stroke-width="1"/>`);
  }
  /* midtpunktmarkør ved 50 — visuelt og verbal adskilt fra prosent-lesingen */
  if (midpointLegend) {
    const xm = LEFT + BAR_W / 2;
    parts.push(`<line x1="${xm}" y1="${TOP - 16}" x2="${xm}" y2="${TOP + barRows.length * ROW_H - 8}" stroke="#111827" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  }
  let y = TOP;
  for (const r of barRows) {
    const norm = Math.max(0, Math.min(100, Number(r.normalized)));
    const label = labelOf(r.id);
    parts.push(`<text x="${LEFT}" y="${y + 4}" font-size="12.5" font-weight="600" fill="#111827">${esc(label)}</text>`);
    parts.push(`<rect x="${LEFT}" y="${y + 10}" width="${BAR_W}" height="${BAR_H}" rx="6" fill="#f1f5f9"/>`);
    parts.push(`<rect x="${LEFT}" y="${y + 10}" width="${(BAR_W * norm) / 100}" height="${BAR_H}" rx="6" fill="#1e40af"/>`);
    const valTxt = `${Math.round(norm)} %`;
    parts.push(`<text x="${LEFT + BAR_W + 6}" y="${y + 27}" font-size="12.5" font-weight="600" fill="#111827">${esc(valTxt)}</text>`);
    strings.push(valTxt);
    y += ROW_H;
  }
  /* midtpunktfortegnelsen — egen linje UNDER grafen, aldri kombinert med prosenttekst */
  if (midpointLegend) {
    parts.push(`<text x="${LEFT}" y="${y + 2}" font-size="11.5" fill="#374151">${esc(midpointLegend)}</text>`);
    y += 22;
  }
  for (const r of ncRows) {
    const label = labelOf(r.id);
    parts.push(`<text x="${LEFT}" y="${y + 12}" font-size="12" fill="#6b7280">${esc(label)} — ${esc(notComputable)}</text>`);
    y += 26;
  }
  parts.push('</svg>');
  return parts.join('\n');
}

/* ---------- total-blokk per scoring-type ---------- */

function renderTotalTrait(result, frameCfg, lang, strings) {
  const c = frameCfg.total.trait;
  const h = L(c.heading, lang, 'total.trait.heading');
  const note = L(c.normNote, lang, 'total.trait.normNote'); /* hard-krav: ingen skårblokk uten ærlig notering */
  const lines = [`<h2 class="ba-rep-total-heading">${esc(h)}</h2>`, ` <p class="ba-rep-normnote">${esc(note)}</p>`];
  const t = result.total;
  if (t && typeof t.composite !== 'undefined') {
    if (t.composite === null) {
      const nc = L((frameCfg.dimensions && frameCfg.dimensions.graphicLabels && frameCfg.dimensions.graphicLabels.notComputable) || { no: 'Ikke beregnelig i denne økten', en: 'Not computable in this session' }, lang, 'graphicLabels.notComputable');
      lines.push(`  <p class="ba-rep-composite">${esc(nc)}</p>`);
      strings.push(nc);
    } else {
      const txt = `${Math.round(Number(t.composite))} %`;
      lines.push(`  <p class="ba-rep-composite">${esc(txt)}</p>`);
      strings.push(txt);
    }
  }
  lines.forEach((s) => strings.push(s.replace(/<[^>]+>/g, '').trim()).valueOf());
  return lines.join('\n');
}

function renderTotalThreshold(result, configs, lang, strings, scanLog) {
  const c = configs.total.threshold;
  const h = L(c.heading, lang, 'total.threshold.heading');
  const note = L(c.normNote, lang, 'total.threshold.normNote');
  const t = result.total;
  const lines = [`<h2 class="ba-rep-total-heading">${esc(h)}</h2>`, `  <p class="ba-rep-normnote">${esc(note)}</p>`];
  if (t) {
    const scoreTxt = `${t.score}`;
    const bandTxt = t.bandLabel ? String(t.bandLabel) : (t.bandId ? String(t.bandId) : '');
    lines.push(`  <p class="ba-rep-threshold">${esc(scoreTxt)} — ${esc(bandTxt)}</p>`);
    strings.push(scoreTxt, bandTxt);
  }
  lines.forEach((s) => strings.push(s.replace(/<[^>]+>/g, '').trim()).valueOf());
  /* forbuds-scan begrenset til dennne blokkens egne strenger */
  if (Array.isArray(c.forbidWord) && c.forbidWord.length) {
    const block = [h, note];
    const v = scanBanned(block, c.forbidWord);
    if (v.length) throw new Error('renderer: threshold-blokk bryter forbidWord: ' + JSON.stringify(v[0]));
    scanLog.push({ scope: 'total.threshold', violations: 0 });
  }
  return lines.join('\n');
}

function renderTotalGscore(result, frameCfg, lang, strings) {
  const c = frameCfg.total['g-score'];
  const h = L(c.heading, lang, 'g-score.heading');
  const note = L(c.normNote, lang, 'g-score.normNote');
  const t = result.total;
  const lines = [`<h2 class="ba-rep-total-heading">${esc(h)}</h2>`, `  <p class="ba-rep-normnote">${esc(note)}</p>`];
  if (t) {
    const p = Number.isFinite(t.proportion) ? `${Math.round(t.proportion * 100)} %` : null;
    const th = Number.isFinite(t.theta) ? t.theta.toFixed(2) : null;
    const ci = Array.isArray(t.ci95) && t.ci95.length === 2 && t.ci95.every(Number.isFinite) ? t.ci95.map((x) => Number(x).toFixed(2)).join(' – ') : null;
    const body = p ? `${t.correctCount}/${t.answeredCount} (${p}), θ ≈ ${th}` : `${t.correctCount}/${t.answeredCount}`;
    lines.push(`  <p class="ba-rep-gscore">${esc(body)}</p>`);
    strings.push(body);
    if (ci) {
      const ciTxt = `CI95: ${ci}`;
      lines.push(`  <p class="ba-rep-gscore-ci">${esc(ciTxt)}</p>`);
      strings.push(ciTxt);
    }
    /* KODE-NIVÅ FORBUD: result.total.iqScale leses aldri — med vilje (FASE 1: null).
       theta-metrikken er ikke IQ-tall. */
  }
  lines.forEach((s) => strings.push(s.replace(/<[^>]+>/g, '').trim()).valueOf());
  return lines.join('\n');
}

/* ---------- hovedfunksjon ---------- */

export function renderReport(result, config, opts = {}) {
  const lang = opts.lang || 'no';
  if (lang !== 'no' && lang !== 'en') throw new Error('renderer: lang må være "no"|"en"');
  if (!result || result.schemaVersion !== 1 || !Array.isArray(result.scales) || !result.total) {
    throw new Error('renderer: resultat mangler eller følger ikke scoringkontrakten v1');
  }
  if (!config || config.schemaVersion !== 1) throw new Error('renderer: config mangler eller schemaVersion != 1');
  const frame = config.frame;
  if (frame !== 'standard' && frame !== 'personal' && frame !== 'employer') throw new Error('renderer: ukjent frame');

  const strings = new Strings();
  const scanLog = [];
  const sections = [];

  /* kvalitetskontrakt #3730-tilsvarende krav */
  if (frame === 'standard') {
    if (!config.moodEffect || !config.moodEffect.text) throw new Error('renderer: standard-rammen krever moodEffect.text (mood-effekt nevnes)');
    if (!config.thirdParty || !config.thirdParty.title || !config.thirdParty.body) throw new Error('renderer: standard-rammen krever thirdParty (tredjepartslesbar)');
  }

  /* 1. total-blokk per scoringType */
  const st = result.scoringType;
  let totalHtml = '';
  if (st === 'trait') {
    if (!config.total || !config.total.trait) throw new Error(`renderer: frame ${frame} mangler total.trait`);
    totalHtml = renderTotalTrait(result, config, lang, strings);
  } else if (st === 'threshold') {
    if (!config.total || !config.total.threshold) throw new Error(`renderer: frame ${frame} mangler total.threshold`);
    totalHtml = renderTotalThreshold(result, config, lang, strings, scanLog);
  } else if (st === 'g-score') {
    if (!config.total || !config.total['g-score']) throw new Error(`renderer: frame ${frame} mangler g-score`);
    totalHtml = renderTotalGscore(result, config, lang, strings);
  } else {
    throw new Error('renderer: ukjent scoringType ' + st);
  }
  sections.push(totalHtml);

  /* 2. dimensjonsgraf */
  const svg = renderDimensionsSvg(result, config, lang, strings);
  if (svg) {
    sections.push(`<figure class="ba-rep-dimensions">\n${svg}\n  <figcaption class="ba-rep-normnote">${esc(L(config.dimensions.graphicLabels.percentOfRange, lang, 'percentOfRange'))}</figcaption>\n</figure>`);
  }

  /* 3. engine-notater (result.notes) */
  const notes = Array.isArray(result.notes) ? result.notes : [];
  for (const n of notes) {
    if (!n || typeof n.id !== 'string' || !n.id) throw new Error('renderer: engine-note uten id');
    if (frame === 'employer') {
      const para = config.employer && config.employer.noteParaphrases && config.employer.noteParaphrases[n.id];
      if (!para) throw new Error(`renderer: employer-frame mangler noteParaphrases[${n.id}] — notat kan ikke siteres rått i arbeidsgiver-rammen`);
      const txt = L(para, lang, `employer.noteParaphrases.${n.id}`);
      strings.push(txt);
      sections.push(`  <p class="ba-rep-note"><span class="ba-rep-note-id">${esc(n.id)}</span> ${esc(txt)}</p>`);
    } else {
      const txt = typeof n[lang] === 'string' && n[lang].trim() ? n[lang] : (typeof n.en === 'string' ? n.en : null);
      if (!txt) throw new Error(`renderer: note ${n.id} har ingen ${lang}-tekst i resultatet`);
      strings.push(txt);
      sections.push(`  <p class="ba-rep-note"><span class="ba-rep-note-id">${esc(n.id)}</span> ${esc(txt)}</p>`);
    }
  }

  /* 4. disclosures */
  for (const d of config.disclosures || []) {
    const no = L({ no: d.no, en: d.en }, lang, `disclosures.${d.id}.no`);
    strings.push(no);
    sections.push(`  <li class="ba-rep-disclosure">${esc(no)}</li>`);
  }

  /* 5. profiltekst (FASE 3-fyll) */
  if (opts.profileId) {
    const pt = config.profileText && config.profileText[opts.profileId];
    if (!pt) throw new Error(`renderer: profileId "${opts.profileId}" finnes ikke i config.profileText (aldri oppfinne tekst)`);
    const ptxt = L(pt, lang, `profileText.${opts.profileId}`);
    strings.push(ptxt);
    sections.push(`  <p class="ba-rep-profile">${esc(ptxt)}</p>`);
  }

  /* 6. leseveiledning */
  if (config.readingGuide) {
    const h = L(config.readingGuide.title, lang, 'readingGuide.title');
    const body = (config.readingGuide.body || []).map((b) => L(b, lang, 'readingGuide.body'));
    strings.push(h, ...body);
    sections.push([
      '<section class="ba-rep-guide">',
      `  <h3>${esc(h)}</h3>`,
      ...body.map((b) => `  <p>${esc(b)}</p>`),
      '</section>',
    ].join('\n'));
  }

  /* 7. tredjepartskontekst */
  if (config.thirdParty) {
    const h = L(config.thirdParty.title, lang, 'thirdParty.title');
    const b = L(config.thirdParty.body, lang, 'thirdParty.body');
    strings.push(h, b);
    const ctx = { testId: String(result.testId), lang };
    sections.push([
      '<section class="ba-rep-thirdparty">',
      `  <h3>${esc(h)}</h3>`,
      `  <p>${esc(b)}</p>`,
      `  <p class="ba-rep-context">${esc(`[${frame}] ${ctx.testId}`)}</p>`,
      '</section>',
    ].join('\n'));
    strings.push(`[${frame}] ${ctx.testId}`);
  }

  /* 8. mood-effekt */
  if (config.moodEffect && config.moodEffect.text) {
    const txt = L(config.moodEffect.text, lang, 'moodEffect.text');
    strings.push(txt);
    sections.push(`  <p class="ba-rep-mood">${esc(txt)}</p>`);
  }

  /* 9. employer-blokk (grundlag for samtale + forbud) */
  if (frame === 'employer') {
    const e = config.employer;
    if (!e || typeof e !== 'object') throw new Error('renderer: employer-frame krever config.employer');
    const cb = L(e.conversationBasis, lang, 'employer.conversationBasis');
    strings.push(cb);
    sections.push(`  <section class="ba-rep-employer"><p class="ba-rep-conversation-basis">${esc(cb)}</p></section>`);
    const v = scanBanned(strings.list, e.prohibitions || []);
    if (v.length) throw new Error('renderer: employer-frame bryter prohibitions: ' + JSON.stringify(v[0]));
    scanLog.push({ scope: 'employer.all-strings', violations: 0 });
    /* positivt krav: rammen MÅ eksplisitt fremstå som samtalegrunnlag */
    const convRe = /grunnlag\s+for\s+samtale|groundwork\s+for\s+a\s+conversation/i;
    if (!strings.list.some((s) => convRe.test(s))) throw new Error('renderer: employer-frame mangler eksplisitt «grunnlag for samtale»-formulering');
  }

  /* 10. disclaimer */
  const dis = L(config.disclaimer, lang, 'disclaimer');
  strings.push(dis);
  sections.push(`  <p class="ba-rep-disclaimer">${esc(dis)}</p>`);

  const html = sections.join('\n');
  return {
    lang,
    frame,
    html,
    svg,
    strings: strings.list.slice(),
    meta: { renderer: RENDERER_VERSION, sections: sections.length, scans: scanLog },
  };
}
