/**
 * Brainarea — selv-bærende delingslenke (#fragment) v1 [BYGG] FASE 3, todo #3794.
 *
 * Kontrakt:
 * - Transport-formatet er identifikatorfritt: lenken bærer KUN skårtall (0–100),
 *   type-tagg og versjon. Ingen navn, e-post, identifikatorer, tidsstempler eller
 *   item-tekst krysser grensen — «generic-share»-forpligtelsen fra #3786-F2 hviler
 *   på dette (delte resultater er generiske, ingen persondata).
 * - Selv-bærende: hele resultatet ligger i URL-fragmentet (#d=<b64url>) — ingen
 *   server, ingen request inneholder resultatet (HTTP-grammatikken sender aldri
 *   fragmentet), ingen lagring, ingen koker. Lesing skjer 100% lokalt i nettleseren.
 * - Kast-aldri (samme konvensjon som _rel_compat_model.mjs/_nd_triage_model.mjs):
 *   ugyldig inndata gir { ok:false, error } — aldri kast, aldri halvgraf. (Render-
 *   flater kaster på konfigfeil; transportlaget er data-lag og må tåle limt innhold.)
 * - Determinisme: samme inndata gir byte-identisk payload. Ingen klokke, ingen rng,
 *   ingen DOM, ingen fs, ingen nett.
 * - Codec er ren JS over ASCII — ingen plattformkodek-hjelpere (FASE 4-leseren
 *   kjører i nettleseren; modulen er identisk i Node-selftest og i browser).
 * - Kvantiseringskontrakt: verdier lagres med 4 desimaler (SHARE_SCALE = 10000).
 *   Registry v1-typer har dyadisk granularitet (rel 1.5625 [= 100/64], nd 1.25
 *   [= 100/80]) og transporteres EKSAKT. En ikke-dyadisk granularitet (f.eks.
 *   3-item skala, 100/15) avviker ≤ 5e-5 per verdi — dokumentert grense.
 * - Registry v1: rel = closeness/openness/conflict/independence, 2 rader (byte-låst
 *   til _rel_compat_model.mjs DIMENSIONS v1), nd = adhd/autism, 1 rad (byte-låst
 *   til _nd_triage_model.mjs AXES v1.0.0). Ny type = registry-utvidelse med
 *   versjonsbump, aldri fritt felt.
 * - Fragmentprefiks: '#d=' skiller delingslenken fra andre fragmentbruk (#anker);
 *   payloadFromHash godtar kun 'd='-prefiks etter første '#'.
 * - URL-rom: payload er b64url uten padding ([A-Za-z0-9_-]) — trenger ingen %-koding;
 *   kalleren holder total URL ≤ 2000 tegn (assert i selftest på verstefall).
 *
 * Eierskap: kodingen eier #3794 (denne modulen). Delgraf-komponenten (_rel_share_graph.mjs)
 * og kompat-modellen tar bare dekodede vektorer; koblingen mot visningslaget er FASE 4
 * par-flyten (delgraf-verdikt PIN-3).
 */

export const SHARE_LINK_VERSION = 'v1';
export const SHARE_VERSION = 1;            // tall i payload
export const SHARE_SCALE = 10000;          // 4 desimaler
export const SHARE_MAX_PAYLOAD = 4096;     // tegn — DoS-grense før dekoding
export const SHARE_URL_LIMIT = 2000;       // praktisk URL-tak (assertes i selftest)
export const SHARE_FRAGMENT_PREFIX = 'd=';

export const SHARE_TYPES = Object.freeze({
  rel: Object.freeze({
    ids: Object.freeze(['closeness', 'openness', 'conflict', 'independence']),
    rows: 2,
    source: 'tests/schema/_rel_compat_model.mjs DIMENSIONS (v1)',
  }),
  nd: Object.freeze({
    ids: Object.freeze(['adhd', 'autism']),
    rows: 1,
    source: 'tests/schema/_nd_triage_model.mjs AXES (v1.0.0)',
  }),
});

/* ---------- codec: ren-JS base64url over ASCII (hjelpefri, browser-identisk) ---------- */

const A64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const REV = new Map([...A64].map((c, i) => [c, i]));
const CHARSET_RE = /^[A-Za-z0-9_-]+$/;

function b64urlEncodeAscii(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) return { ok: false, error: 'ikke-ascii' };
  }
  let out = '';
  for (let i = 0; i < s.length; i += 3) {
    const b0 = s.charCodeAt(i);
    const b1 = i + 1 < s.length ? s.charCodeAt(i + 1) : null;
    const b2 = i + 2 < s.length ? s.charCodeAt(i + 2) : null;
    out += A64[b0 >> 2];
    out += A64[((b0 & 3) << 4) | (b1 === null ? 0 : (b1 >> 4))];
    if (b1 !== null) {
      out += A64[((b1 & 15) << 2) | (b2 === null ? 0 : (b2 >> 6))];
      if (b2 !== null) out += A64[b2 & 63];
    }
  }
  return { ok: true, s: out };
}

/** Streng b64url-dekod: kanonisk trailing-bits, ASCII-utgang, ingen stille erstatning. */
function b64urlDecodeStrict(s) {
  if (!CHARSET_RE.test(s)) return { ok: false, error: 'tegn-utenfor-b64url' };
  const m = s.length % 4;
  if (m === 1) return { ok: false, error: 'laengde' };
  const tail = REV.get(s[s.length - 1]);
  if (m === 2 && (tail & 0x0f) !== 0) return { ok: false, error: 'ikke-kanonisk' };
  if (m === 3 && (tail & 0x03) !== 0) return { ok: false, error: 'ikke-kanonisk' };
  const bytes = [];
  for (let i = 0; i < s.length; ) {
    const n = Math.min(4, s.length - i);
    let acc = 0;
    for (let j = 0; j < n; j++) acc = ((acc << 6) | REV.get(s[i + j])) >>> 0;
    const take = n === 4 ? 3 : n === 3 ? 2 : 1;
    const shift = n === 4 ? 16 : n === 3 ? 10 : 4;
    for (let j = 0; j < take; j++) bytes.push((acc >> (shift - 8 * j)) & 255);
    i += n;
  }
  let text = '';
  for (const b of bytes) {
    if (b > 127) return { ok: false, error: 'ikke-ascii' };
    text += String.fromCharCode(b);
  }
  return { ok: true, s: text };
}

/* ---------- skjøring + kanonisk form ---------- */

function validScore(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
}

/**
 * rows = [[skår...], [skår...]] i registry-orden.
 * -> { ok:true, payload, canonical, length } | { ok:false, error, where? }
 */
export function encodeSharePayload({ type, rows } = {}) {
  const spec = SHARE_TYPES[type];
  if (!spec) return { ok: false, error: 'ukjent-type' };
  if (!Array.isArray(rows) || rows.length !== spec.rows) return { ok: false, error: 'radantall', where: String(spec.rows) };
  const intRows = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length !== spec.ids.length) {
      return { ok: false, error: 'dimantall', where: `r${r}` };
    }
    const ints = [];
    for (let c = 0; c < row.length; c++) {
      if (!validScore(row[c])) return { ok: false, error: 'skor-utenfor-omfang', where: `r${r}:${spec.ids[c]}` };
      ints.push(Math.round(row[c] * SHARE_SCALE));
    }
    intRows.push(ints);
  }
  const canonical = '{"v":' + SHARE_VERSION + ',"t":"' + type + '","d":['
    + intRows.map((r) => '[' + r.join(',') + ']').join(',') + ']}';
  const enc = b64urlEncodeAscii(canonical);
  if (!enc.ok) return enc;
  return { ok: true, payload: enc.s, canonical, length: enc.s.length, version: SHARE_LINK_VERSION };
}

/** {dimId: skår}-dikt -> registry-orden rader. Ukjente nøkler ignoreres (G6c-konvensjon);
 *  manglende/ugyldig nøkkel => { ok:false, error:'vektor-mangler-<id>' }. */
export function rowsFromVectors(type, vectors) {
  const spec = SHARE_TYPES[type];
  if (!spec) return { ok: false, error: 'ukjent-type' };
  if (!Array.isArray(vectors) || vectors.length !== spec.rows) return { ok: false, error: 'radantall', where: String(spec.rows) };
  const rows = [];
  for (let r = 0; r < vectors.length; r++) {
    const vec = vectors[r];
    if (!vec || typeof vec !== 'object' || Array.isArray(vec)) return { ok: false, error: 'vektor-mangler', where: `r${r}` };
    const row = [];
    for (const id of spec.ids) {
      const v = vec[id];
      if (!validScore(v)) return { ok: false, error: 'vektor-mangler-' + id, where: `r${r}` };
      row.push(v);
    }
    rows.push(row);
  }
  return { ok: true, rows };
}

/** Registry-orden rader -> [{dimId: skår}...] (inkvers av rowsFromVectors). Kast-aldri. */
export function rowsToVectors(type, rows) {
  const spec = SHARE_TYPES[type];
  if (!spec) return { ok: false, error: 'ukjent-type' };
  if (!Array.isArray(rows) || rows.length !== spec.rows) return { ok: false, error: 'radantall', where: String(spec.rows) };
  const out = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length !== spec.ids.length) return { ok: false, error: 'dimantall', where: `r${r}` };
    const vec = {};
    for (let c = 0; c < spec.ids.length; c++) {
      if (!validScore(row[c])) {
        return { ok: false, error: 'skor-utenfor-omfang', where: `r${r}:${spec.ids[c]}` };
      }
      vec[spec.ids[c]] = row[c];
    }
    out.push(vec);
  }
  return { ok: true, vectors: out };
}

/* ---------- dekoding ---------- */

/**
 * payload (b64url, uten prefiks) -> { ok:true, version, type, ids, rows }
 * | { ok:false, error, where? }. Kast aldri —Limt innhold er forventet.
 */
export function decodeSharePayload(payload) {
  if (typeof payload !== 'string' || payload.length === 0) return { ok: false, error: 'payload-mangler' };
  if (payload.length > SHARE_MAX_PAYLOAD) return { ok: false, error: 'for-lang' };
  const dec = b64urlDecodeStrict(payload);
  if (!dec.ok) return dec;
  let obj;
  try { obj = JSON.parse(dec.s); } catch { return { ok: false, error: 'ugyldig-json' }; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'ugyldig-form' };
  const KEYS = ['v', 't', 'd'];
  const own = Object.keys(obj);
  if (own.length !== KEYS.length || !KEYS.every((k) => Object.prototype.hasOwnProperty.call(obj, k))) {
    return { ok: false, error: 'ukjent-noekkel' };
  }
  if (obj.v !== SHARE_VERSION) return { ok: false, error: 'ukjent-versjon' };
  const spec = SHARE_TYPES[obj.t];
  if (!spec) return { ok: false, error: 'ukjent-type' };
  const d = obj.d;
  if (!Array.isArray(d) || d.length !== spec.rows) return { ok: false, error: 'radantall', where: String(spec.rows) };
  const rows = [];
  for (let r = 0; r < d.length; r++) {
    const row = d[r];
    if (!Array.isArray(row) || row.length !== spec.ids.length) return { ok: false, error: 'dimantall', where: `r${r}` };
    const nums = [];
    for (let c = 0; c < row.length; c++) {
      const q = row[c];
      if (!Number.isInteger(q) || q < 0 || q > 100 * SHARE_SCALE) {
        return { ok: false, error: 'skor-utenfor-omfang', where: `r${r}:${spec.ids[c]}` };
      }
      nums.push(q / SHARE_SCALE);
    }
    rows.push(nums);
  }
  return { ok: true, version: SHARE_VERSION, type: obj.t, ids: spec.ids.slice(0), rows, transportVersion: SHARE_LINK_VERSION };
}

/**
 * Hash eller hel URL -> payload. Godtar KUN '#d=<payload>' (dette skiller
 * delingslenken fra #anker-bruk). Kast-aldri.
 */
export function payloadFromHash(input) {
  if (typeof input !== 'string') return { ok: false, error: 'hash-mangler' };
  const s = input.trim();
  if (s.length === 0) return { ok: false, error: 'hash-mangler' };
  const idx = s.indexOf('#');
  if (idx < 0) return { ok: false, error: 'mangler-hash' };
  const frag = s.slice(idx + 1);
  if (frag.length === 0) return { ok: false, error: 'tom-hash' };
  if (!frag.startsWith(SHARE_FRAGMENT_PREFIX)) return { ok: false, error: 'ikke-delingslenke' };
  const payload = frag.slice(SHARE_FRAGMENT_PREFIX.length);
  if (payload.length === 0) return { ok: false, error: 'tom-hash' };
  if (payload.includes('#')) return { ok: false, error: 'fler-hash' };
  return { ok: true, payload };
}

/**
 * payload -> full URL { origin + path + '#d=' + payload }. origin/path kommer fra
 * kalleren (route-eierskap: app/locale.js, FASE 4-leseren). Kast-aldri.
 */
export function buildShareUrl(payload, { origin, path } = {}) {
  if (typeof payload !== 'string' || payload.length === 0 || !CHARSET_RE.test(payload)) {
    return { ok: false, error: 'payload-ugyldig' };
  }
  if (payload.length > SHARE_MAX_PAYLOAD) return { ok: false, error: 'for-lang' };
  if (typeof origin !== 'string' || origin.length === 0 || origin.includes('#')) return { ok: false, error: 'origin-ugyldig' };
  if (typeof path !== 'string' || path.length === 0 || path.includes('#')) return { ok: false, error: 'path-ugyldig' };
  const url = `${origin}${path}#${SHARE_FRAGMENT_PREFIX}${payload}`;
  return { ok: true, url, length: url.length };
}
