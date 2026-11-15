/**
 * Brainarea — normerings-endpoint v1.0.0 (FASE 1, todo #3724)
 *
 * Kontrakt (stegetekst): "Pages Function, anonym POST (språk, test-ID,
 * itemsvar, tidsbruk, valgfri demografi). Kode bygges, testes ikke i dag"
 * — github.io kjører ikke Functions. LIVSSYKLUS (binding + utrulling) er
 * FASE 4 / UTSATT-mærket: denne filen definiserer KONTRAKTEN, ikke driften.
 * Derfor er KODE-fokus (denne filen):
 *   1. Full server-side validering av det anonyme POST-schemaet — streng,
 *      deterministisk, dokumentert. Ingen felt som kan identifisere bruker
 *      (beslutning 9): ingen e-post, ingen IP-bruk, ingen cookies, ingen
 *      session-id, ingen fingeravtrykk. Responsen lagres aldri med identitet.
 *   2. CORS (OPTIONS) for samme opphav (maneitai.github.io) og localhost-utvikling.
 *   3. LAGRING er betinget: hvis Pages-bindingen NORMERING_KV ikke finnes
 *      (github.io i dag), valideres payload fullt ut, svaret er 200 med
 *      stored:false — «mottatt, men ikke persistert». Ærlighet: klienten får
 *      aldri et stored:true-lokkehånslag uten at lagring faktisk skjedde.
 *      Når bindingen ligger der (FASE 4), lagres hver rad som
 *      norm/<testId>/<ms>-<tilfeldig> — tidsstempel sier NÅR, aldri HVEM.
 *
 * Hvorfor ingen Content-Type 415? Kontrakten er én rute, ett verb:
 * annet metodENUM = 405 POST+OPTIONS (Allow), feil Content-Type = 400
 * code:content-type. Mindre statuskoder, samme informasjon.
 *
 * Hvorfor Math.random i lagringsnøkkelen (ikke crypto)? Nøkkelen utelukker
 * kollisjoner; den bærer ingen identitet (kontrakten tillater bare
 * testId + tidsstempel + tilfeldige tegn). Math.random er deterministisk
 * nok til det og gjør modulen importbar i rene testmiljøer.
 *
 * Runtime-signatur: Cloudflare Pages Functions (request, env). Nulle
 * node-avhengigheter — filen krever ingenting og kan require():es direkte.
 */

export const LANGUAGES = ['no', 'en'];
export const MAX_ITEMS = 512;          // itemsvar pr. POST
export const MAX_BYTES = 8192;         // råkropp-grense (anonyme små-payloads)
export const MAX_DURATION_SEC = 86400; // én dag — lengre sesjon er ugyldig

// FASE 1-hvitelistene er dokumenterte forhåndsvalg, utvides i FASE 2 når
// itemspec-blokken fester sine kategorier. Ukjent verdi = hard 400 — datakvalitet
// fremfor fri tekst (fri tekst er både oppryddings- og personvernrisiko).
export const AGE_BANDS = ['under18', '18-29', '30-39', '40-49', '50-59', '60-69', '70+'];
export const GENDERS = ['female', 'male', 'other', 'undisclosed'];
export const DEMOGRAPHICS_KEYS = ['ageBand', 'gender'];

// CORS-oppforhav: browser-henvendelser fra disse opphavene får reply-skjemaet;
// alle andre klienter kan poste, men får ingen CORS-header (browseren blokkerer
// les av svaret). Ingen credentials, ingen ekstra headers.
export const ORIGIN_ALLOWLIST = ['https://maneitai.github.io'];
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const TEST_ID_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;

function jsonResponse(status, body, extraHeaders) {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  if (extraHeaders) for (const [k, v] of extraHeaders) headers.set(k, v);
  return new Response(JSON.stringify(body), { status, headers });
}

function validationError(code, message) {
  return jsonResponse(400, { ok: false, error: code, message });
}

function originAllowed(origin) {
  if (ORIGIN_ALLOWLIST.indexOf(origin) !== -1) return true;
  return LOCAL_ORIGIN.test(origin);
}

/** Server-side validering av POST-kroppen. Returnerer [error, normalized]. */
export function validatePostPayload(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return ['body-empty', null];
  if (raw.length > MAX_BYTES) return ['body-too-large', null];

  let data;
  try { data = JSON.parse(raw); } catch { return ['body-not-json', null]; }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return ['body-shape', null];

  // språk — eksakt streng, ingen casenøter (dataformat er maskinspråk, ikke visning)
  if (typeof data.language !== 'string') return ['language-required', null];
  if (LANGUAGES.indexOf(data.language) === -1) return ['language-unknown', null];

  // test-ID — samme mønster som test-definisjonenes id
  if (typeof data.testId !== 'string') return ['testId-required', null];
  if (!TEST_ID_RE.test(data.testId)) return ['testId-pattern', null];

  // itemsvar — opaque rekkefølgetro rekke; elementer er tall|bool|null (ubesvart)
  const answers = data.answers;
  if (!Array.isArray(answers)) return ['answers-array', null];
  if (answers.length === 0) return ['answers-empty', null];
  if (answers.length > MAX_ITEMS) return ['answers-too-many', null];
  for (const a of answers) {
    if (a === null || typeof a === 'boolean') continue;
    if (typeof a === 'number' && Number.isFinite(a)) continue;
    return ['answers-element', null];
  }

  // tidsbruk — integer sekunder
  const d = data.durationSec;
  if (!Number.isInteger(d)) return ['duration-type', null];
  if (d < 0) return ['duration-negative', null];
  if (d > MAX_DURATION_SEC) return ['duration-too-large', null];

  // valgfri demografi — fraværende => null; annet = valideringsfeil
  let demographics = null;
  if ('demographics' in data && data.demographics !== null) {
    if (typeof data.demographics !== 'object' || Array.isArray(data.demographics)) return ['demographics-shape', null];
    const keys = Object.keys(data.demographics);
    if (keys.length === 0) return ['demographics-empty', null];
    for (const k of keys) {
      if (DEMOGRAPHICS_KEYS.indexOf(k) === -1) return ['demographics-unknown-key', null];
      const v = data.demographics[k];
      const list = k === 'ageBand' ? AGE_BANDS : GENDERS;
      if (typeof v !== 'string' || list.indexOf(v) === -1) return ['demographics-value', null];
    }
    demographics = { };
    if ('ageBand' in data.demographics) demographics.ageBand = data.demographics.ageBand;
    if ('gender' in data.demographics) demographics.gender = data.demographics.gender;
  }

  return [null, {
    language: data.language,
    testId: data.testId,
    answers,            // rekkefølgetro kopi (uendret)
    durationSec: d,
    demographics,       // null | {ageBand?, gender?}
    at: new Date().toISOString(), // NÅR — aldri HVEM
  }];
}

/** POST: valider fullt, lagre BETINGET på NORMERING_KV, ærlig stored-flagg. */
export async function onRequestPost({ request, env }) {
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return validationError('content-type', 'POST-kroppen må være application/json');
  }

  let raw;
  try { raw = await request.text(); } catch { return validationError('body-read', 'POST-kroppen kunne ikke leses'); }

  const [err, entry] = validatePostPayload(raw);
  if (err) {
    if (err === 'body-too-large') {
      return jsonResponse(413, { ok: false, error: 'body-too-large', message: 'POST-kroppen er for stor (maks ' + MAX_BYTES + ' byte)' });
    }
    if (err === 'body-empty') return validationError('body-empty', 'POST-kroppen er tom');
    if (err === 'body-not-json') return validationError('body-not-json', 'POST-kroppen er ikke gyldig JSON');
    if (err === 'body-shape') return validationError('body-shape', 'POST-kroppen må være et JSON-objekt');
    if (err === 'language-required') return validationError('language-required', 'language må være en streng (' + LANGUAGES.join(', ') + ')');
    if (err === 'language-unknown') return validationError('language-unknown', 'language må være ' + LANGUAGES.join(', '));
    if (err === 'testId-required') return validationError('testId-required', 'testId må være en streng');
    if (err === 'testId-pattern') return validationError('testId-pattern', 'testId må matche ' + TEST_ID_RE.source);
    if (err === 'answers-array') return validationError('answers-array', 'answers må være en rekke');
    if (err === 'answers-empty') return validationError('answers-empty', 'answers kan ikke være tom');
    if (err === 'answers-too-many') return validationError('answers-too-many', 'answers maks ' + MAX_ITEMS + ' elementer');
    if (err === 'answers-element') return validationError('answers-element', 'hvert element i answers må være tall, bool eller null (ubesvart)');
    if (err === 'duration-type') return validationError('duration-type', 'durationSec må være et heltall');
    if (err === 'duration-negative') return validationError('duration-negative', 'durationSec kan ikke være negativ');
    if (err === 'duration-too-large') return validationError('duration-too-large', 'durationSec maks ' + MAX_DURATION_SEC + ' sekunder');
    if (err === 'demographics-shape') return validationError('demographics-shape', 'demographics må være et objekt');
    if (err === 'demographics-empty') return validationError('demographics-empty', 'demographics kan ikke være tomt');
    if (err === 'demographics-unknown-key') return validationError('demographics-unknown-key', 'tillatte nøkler: ' + DEMOGRAPHICS_KEYS.join(', '));
    if (err === 'demographics-value') return validationError('demographics-value', 'ageBand: ' + AGE_BANDS.join(', ') + ' | gender: ' + GENDERS.join(', '));
    return validationError(err, 'ugyldig payload');
  }

  const bytes = raw.length;

  const kv = env && env.NORMERING_KV ? env.NORMERING_KV : null;
  if (kv && typeof kv.put === 'function') {
    const suffix = Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e8).toString(36);
    const key = 'norm/' + entry.testId + '/' + suffix;
    try {
      await kv.put(key, JSON.stringify({
        v: 1,
        language: entry.language,
        answers: entry.answers,
        durationSec: entry.durationSec,
        demographics: entry.demographics,
        at: entry.at,
      }));
      return jsonResponse(200, { ok: true, stored: true, key });
    } catch {
      return jsonResponse(500, { ok: false, error: 'storage-failed', message: 'lagring feilet — klienten må prøve igjen senere' });
    }
  }

  // I DAG (github.io, ingen binding): full validering, ærlig non-storage-svar.
  return jsonResponse(200, {
    ok: true,
    stored: false,
    received: {
      bytes,
      items: entry.answers.length,
      language: entry.language,
      testId: entry.testId,
    },
    note: 'FASE 1 Pages-kontrakt: payload er valider mottatt, men NORMERING_KV-bindingen mangler — ingenting er persistert.',
  });
}

/** OPTIONS: CORS pre-flight. 204; ACAO bare for tillatte opphav. */
export async function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '';
  if (!originAllowed(origin)) return new Response(null, { status: 204 });
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
    },
  });
}
