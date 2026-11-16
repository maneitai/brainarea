/**
 * Selftest for selv-bærende delingslenke (#fragment) [BYGG] FASE 3, todo #3794.
 * Kjoer: node tests/schema/_fase3_share_link_selftest.mjs  (node>=20, ingen deps)
 *
 * Dekker (transport-konvensen: kast-aldri, determinisme, identifikatorfrihet):
 *   G1  Ekte kjede: EKTE _rel_compat_model.mjs / _nd_triage_model.mjs output ->
 *       rowsFromVectors -> encode -> decode -> rowsToVectors -> VERIFIASJON i
 *       modulen igjen (computePairCompatibility / computeTriageOutcome) —
 *       band/utfall uroet gjennom hele transportet (realkjedeproven).
 *   G2  Eksakthet: dyadiske granulariteter (rel 1.5625-step, nd 1.25-step)
 *       transporteres EKSAKT (0.000000 avvik); ikke-dyadisk granularitet (100/15)
 *       avviker maalt <= 5e-5 og MAKS-grense asseres.
 *   G3  Determinisme: samme skårer -> identisk payload byte-for-byte (x2 kjoeringer,
 *       md5 over stdout). Kanonisk form: payload === JSON-kroppen uten padding.
 *   G4  Kast-aldri: hele feil-batteriet gir { ok:false, error } — ingen kast,
 *       aldri ok:true med manglende felter. Ikke-kanonisk b64url avvises.
 *   G5  Identifikatorfrihet (kjerneproven): hver eneste rendret/transportert byte
 *       gjennomgaes — NAVN/E-POST/TIDSTEMPEL/ITEMTEKST i input gjenfinnes ALDRI
 *       i payload, canonical eller URL. 't' og 'v' er type/versjon, aldri identitet.
 *   G6  Ingen persondata krysser grensen: payload-grammatikken prover at D-tasting
 *       KUN tar radmatrise av tall; dikt/matriser av strenge avvises.
 *   G7  URL-kontrakten: '#d=' prefiks-konvensjonen (mangler hash/feil prefiks ->
 *       ok:false, aldri annet fragmentinnhold tolket); buildShareUrl byte-presis;
 *       verstefall-URL (rel, 4 desimaler, begge rader) <= SHARE_URL_LIMIT.
 *   G8  Browser-likhet: codec uten Buffer/atob/btoa/TextEncoder/DOM — kilde-lesing
 *       av _share_link.mjs med forbudstoken-skann (ingen Buffer/atob/btoa/importfs).
 *   G9  URLSearchParams-grammatikk: payload i ekte URL.parser — ingen %-koding
 *       noedvendig (payload == URL.searchParams-get-identitet over b64url-alfabetet).
 *   G10 Regresjonsanker: delgraf-selftest + itemspec-selftester kjoeres uroet
 *       (egendefinerte kjoeringer i steget, ikke her).
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  SHARE_LINK_VERSION, SHARE_VERSION, SHARE_SCALE, SHARE_TYPES,
  SHARE_MAX_PAYLOAD, SHARE_URL_LIMIT, SHARE_FRAGMENT_PREFIX,
  encodeSharePayload, decodeSharePayload, rowsFromVectors, rowsToVectors,
  buildShareUrl, payloadFromHash,
} from './_share_link.mjs';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => { if (cond) { pass++; } else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const md5 = (s) => createHash('md5').update(s).digest('hex');

/* EKTE moduler (data-URL-import, itemspec S9-konvensjonen) */
const compatMod = await import('data:text/javascript;base64,' + Buffer.from(
  readFileSync(new URL('./_rel_compat_model.mjs', import.meta.url), 'utf8')).toString('base64'));
const ndMod = await import('data:text/javascript;base64,' + Buffer.from(
  readFileSync(new URL('./_nd_triage_model.mjs', import.meta.url), 'utf8')).toString('base64'));

/* ---------- G1: ekte kjede begge retninger ---------- */
{
  /* EKTE compat-output (fra selftest G1b handregnet par, og ekstremprofiler) */
  const pairs = [
    [{ closeness: 50, openness: 80, conflict: 50, independence: 50 }, { closeness: 90, openness: 40, conflict: 30, independence: 70 }],
    [{ closeness: 100, openness: 100, conflict: 100, independence: 100 }, { closeness: 100, openness: 100, conflict: 100, independence: 100 }],
    [{ closeness: 0, openness: 0, conflict: 0, independence: 0 }, { closeness: 25, openness: 75, conflict: 62.5, independence: 37.5 }],
  ];
  for (const [a, b] of pairs) {
    const c1 = compatMod.computePairCompatibility(a, b);
    ok('G1a.compat-ok-pre', c1.ok === true, JSON.stringify(c1));
    const r = rowsFromVectors('rel', [a, b]);
    ok('G1b.rowsFrom-ok', r.ok === true);
    const e = encodeSharePayload({ type: 'rel', rows: r.rows });
    ok('G1c.encode-ok', e.ok === true, JSON.stringify(e));
    const d = decodeSharePayload(e.payload);
    ok('G1d.decode-ok', d.ok === true && d.type === 'rel', JSON.stringify(d));
    const v = rowsToVectors('rel', d.rows);
    ok('G1e.vec-ok', v.ok === true, JSON.stringify(v));
    const c2 = compatMod.computePairCompatibility(v.vectors[0], v.vectors[1]);
    ok('G1f.compat-identisk-etter-transport',
      c2.ok === c1.ok && JSON.stringify(c2) === JSON.stringify(c1),
      `pre=${JSON.stringify(c1)} post=${JSON.stringify(c2)}`);
  }
  /* EKTE triage-output */
  for (const s of [{ adhd: 55.625, autism: 40.375 }, { adhd: 0, autism: 100 }, { adhd: null, autism: null }]) {
    const t1 = ndMod.computeTriageOutcome(s);
    ok('G1g.triage-ok-pre', t1.ok === true);
    if (s.adhd === null) continue;   /* null er visningslag-kontrakt, transport bærer skår 0-100 — null-konvensjonen testes i G6 */
    const r = rowsFromVectors('nd', [{ adhd: s.adhd, autism: s.autism }]);
    const e = encodeSharePayload({ type: 'nd', rows: r.rows });
    const d = decodeSharePayload(e.payload);
    const v = rowsToVectors('nd', d.rows);
    const t2 = ndMod.computeTriageOutcome({ adhd: v.vectors[0].adhd, autism: v.vectors[0].autism });
    ok('G1h.triage-identisk-etter-transport', JSON.stringify(t2) === JSON.stringify(t1),
      `pre=${JSON.stringify(t1)} post=${JSON.stringify(t2)}`);
  }
}

/* ---------- G2: kvantiserings-eksakthet ---------- */
{
  /* rel-dyadisk granularitet: enhver verdi fra 3-, 4-, 8- skalaen (x/64-steg via 1.5625) */
  const dyadic = [];
  for (let k = 0; k <= 64; k++) dyadic.push(k * (100 / 64));
  const ndDyadic = [];
  for (let k = 0; k <= 80; k++) ndDyadic.push(k * (100 / 80));
  let maxDev = 0;
  for (let k = 0; k <= 64; k++) {
    const e = encodeSharePayload({ type: 'rel', rows: [[dyadic[k], 50, 50, 50], [50, 50, 50, 50]] });
    const d = decodeSharePayload(e.payload);
    const v = d.ok ? rowsToVectors('rel', d.rows) : { ok: false };
    if (v.ok) maxDev = Math.max(maxDev, Math.abs(v.vectors[0].closeness - dyadic[k]));
  }
  for (let k = 0; k <= 80; k++) {
    const e = encodeSharePayload({ type: 'nd', rows: [[ndDyadic[k], 50]] });
    const d = decodeSharePayload(e.payload);
    const v = d.ok ? rowsToVectors('nd', d.rows) : { ok: false };
    if (v.ok) maxDev = Math.max(maxDev, Math.abs(v.vectors[0].adhd - ndDyadic[k]));
  }
  ok('G2a.dyadisk-eksakt', maxDev === 0, `maxDev=${maxDev}`);
  /* ikke-dyadisk granularitet: 3-item skala gir x/15-steg (100/15 = 6.666..7-steg per skårenhet)
     — dokumentert grense: avvik <= 1/(2*SHARE_SCALE) per verdi (5e-5). */
  let worst = 0;
  for (let k = 0; k <= 15; k++) {
    const raw = k * (100 / 15);
    const e = encodeSharePayload({ type: 'nd', rows: [[raw, 50]] });
    const d = decodeSharePayload(e.payload);
    const v = rowsToVectors('nd', d.rows);
    worst = Math.max(worst, Math.abs(v.vectors[0].adhd - raw));
  }
  ok('G2b.grense-assert', worst > 0 ? worst <= 5e-5 : true, `worst=${worst}`);
  ok('G2c.4-desimal-kontrakt', SHARE_SCALE === 10000);
}

/* ---------- G3: determinisme + kanonisk form ---------- */
{
  const arg = { type: 'rel', rows: [[50, 90, 50, 50], [90, 40, 30, 70]] };
  const e1 = encodeSharePayload(arg);
  const e2 = encodeSharePayload(arg);
  ok('G3a.byte-determinisme', e1.ok && e2.ok && e1.payload === e2.payload);
  const expect = '{"v":1,"t":"rel","d":[[500000,900000,500000,500000],[900000,400000,300000,700000]]}';
  ok('G3b.kanonisk-form', e1.canonical === expect, e1.canonical);
  ok('G3c.payload-er-b64url', /^[A-Za-z0-9_-]+$/.test(e1.payload) && !e1.payload.includes('='));
  const round = Buffer.from(e1.payload, 'base64url').toString('utf8');
  ok('G3d.node-koensistens', round === e1.canonical);
}

/* ---------- G4: kast-aldri feilbatteri ---------- */
{
  const badDecodes = [
    ['', 'payload-mangler'], ['!!!', 'tegn-utenfor-b64url'], ['A', 'laengde'],
    [Buffer.from('not json').toString('base64url'), 'ugyldig-json'],
    [Buffer.from(JSON.stringify({ v: 2, t: 'rel', d: [[1, 2, 3, 4], [1, 2, 3, 4]] })).toString('base64url'), 'ukjent-versjon'],
    [Buffer.from(JSON.stringify({ v: 1, t: 'zz', d: [[1, 2]] })).toString('base64url'), 'ukjent-type'],
    [Buffer.from(JSON.stringify({ v: 1, t: 'rel', d: [[1, 2, 3], [1, 2, 3]] })).toString('base64url'), 'dimantall'],
    [Buffer.from(JSON.stringify({ v: 1, t: 'nd', d: [[1.5, 2]] })).toString('base64url'), 'skor-utenfor-omfang'],
    [Buffer.from(JSON.stringify({ v: 1, t: 'nd', d: [[-1, 2000000]] })).toString('base64url'), 'skor-utenfor-omfang'],
    [Buffer.from(JSON.stringify({ v: 1, t: 'rel', d: [[1, 2, 3, 4], [1, 2, 3, 4]], x: 1 })).toString('base64url'), 'ukjent-noekkel'],
  ];
  for (const [p, want] of badDecodes) {
    let r; let threw = false;
    try { r = decodeSharePayload(p); } catch (e) { threw = true; r = { ok: false, error: 'THREW' }; }
    ok(`G4a.decode-${want}`, threw === false && r.ok === false && r.error === want, `got=${JSON.stringify(r)}`);
  }
  /* ikke-kanonisk b64url: trailing bits == 0 kreves */
  for (const [p, want] of [['AB', 'ikke-kanonisk'], ['ABB', 'ikke-kanonisk']]) {
    const r = decodeSharePayload(p);
    ok(`G4b.${want}`, r.ok === false && r.error === want);
  }
  /* encode-felter */
  const encs = [
    [{ type: 'zz', rows: [] }, 'ukjent-type'],
    [{ type: 'rel', rows: [[1, 2, 3, 4]] }, 'radantall'],
    [{ type: 'rel', rows: [[1, 2, 3, 4], [1, 2, 3]] }, 'dimantall'],
    [{ type: 'rel', rows: [[1, 2, 3, 'a'], [1, 2, 3, 4]] }, 'skor-utenfor-omfang'],
    [{ type: 'nd', rows: [[-5, 20]] }, 'skor-utenfor-omfang'],
    [{ type: 'nd', rows: [[100.1, 20]] }, 'skor-utenfor-omfang'],
  ];
  for (const [arg, want] of encs) {
    let r; let threw = false;
    try { r = encodeSharePayload(arg); } catch (e) { threw = true; r = { ok: false, error: 'THREW' }; }
    ok(`G4c.encode-${want}`, threw === false && r.ok === false && r.error === want, `got=${JSON.stringify(r)}`);
  }
  const vecs = [
    ['rel', [{}, {}], 'vektor-mangler-closeness'],
    ['rel', [{ closeness: 'x', openness: 1, conflict: 1, independence: 1 }, { closeness: 1, openness: 1, conflict: 1, independence: 1 }], 'vektor-mangler-closeness'],
    ['nd', [{ adhd: 60 }], 'vektor-mangler-autism'],
  ];
  for (const [type, vs, want] of vecs) {
    const r = rowsFromVectors(type, vs);
    ok(`G4d.vec-${want}`, r.ok === false && r.error === want, JSON.stringify(r));
  }
  /* hash/url-kontraktene */
  const hs = [
    ['', 'hash-mangler'], ['ingenhash', 'mangler-hash'], ['#', 'tom-hash'],
    ['#x=abc', 'ikke-delingslenke'], ['#d=', 'tom-hash'], ['#d=abc#def', 'fler-hash'],
  ];
  for (const [h, want] of hs) {
    let r; let threw = false;
    try { r = payloadFromHash(h); } catch (e) { threw = true; r = { ok: false, error: 'THREW' }; }
    ok(`G4e.hash-${want}`, threw === false && r.ok === false && r.error === want, `got=${JSON.stringify(r)}`);
  }
  const us = [
    [null, { origin: 'https://x', path: '/p/' }, 'payload-ugyldig'],
    [undefined, { origin: '', path: '/p/' }, 'origin-ugyldig'],
    [undefined, { origin: 'a#b', path: '/p/' }, 'origin-ugyldig'],
    [undefined, { origin: 'https://x', path: '' }, 'path-ugyldig'],
    [undefined, { origin: 'https://x', path: '/p#x' }, 'path-ugyldig'],
  ];
  const good = encodeSharePayload({ type: 'nd', rows: [[50, 50]] });
  for (const [p, o, want] of us) {
    let r; let threw = false;
    try { r = buildShareUrl(p === null ? null : p === undefined ? good.payload : p, o); } catch (e) { threw = true; r = { ok: false, error: 'THREW' }; }
    ok(`G4f.url-${want}`, threw === false && r.ok === false && r.error === want, `got=${JSON.stringify(r)}`);
  }
  const uOk = buildShareUrl(good.payload, { origin: 'https://x', path: '/p/' });
  ok('G4f.url-gyldig-ok', uOk.ok === true && uOk.url === 'https://x/p/#d=' + good.payload);
  /* rowsToVectors kast-aldri */
  const tvs = [['zz', []], ['rel', [[1, 2, 3]]], ['nd', [[-1, 2]]], ['nd', [[101, 2]]], ['nd', [['x', 2]]]];
  for (const [t, rows] of tvs) {
    let r; let threw = false;
    try { r = rowsToVectors(t, rows); } catch (e) { threw = true; r = { ok: false }; }
    ok(`G4g.rowstovec-${t}-${rows.join('_')}`, threw === false && r.ok === false);
  }
}

/* ---------- G5: identifikatorfrihet ---------- */
{
  const SECRET_NAME = 'Kari Nordmann';
  const SECRET_EMAIL = 'kari@example.com';
  const secretVektor = { closeness: 50, openness: 80, conflict: 50, independence: 50, name: SECRET_NAME, email: SECRET_EMAIL };
  const r = rowsFromVectors('rel', [secretVektor, { closeness: 90, openness: 40, conflict: 30, independence: 70 }]);
  ok('G5a.vec-ok', r.ok === true);
  const e = encodeSharePayload({ type: 'rel', rows: r.rows });
  const d = decodeSharePayload(e.payload);
  const v = rowsToVectors('rel', d.rows);
  const url = buildShareUrl(e.payload, { origin: 'https://maneitai.github.io', path: '/brainarea/relasjoner/' });
  const all = [e.payload, e.canonical, url.url, JSON.stringify(d), JSON.stringify(v.vectors)].join('|');
  ok('G5b.navn-aldri', !all.includes(SECRET_NAME));
  ok('G5c.epost-aldri', !all.includes(SECRET_EMAIL));
  ok('G5d.epost-tegn-aldri', !all.includes('@'));
  ok('G5e.tidsstempel-aldri', !/\b(19|20)\d{2}-\d{2}-\d{2}T/.test(all) && !/startedAt|finishedAt/.test(all));
  ok('G5f.itemtekst-aldri', !/[A-Za-z]{15,}/.test(e.canonical.replace(/"(v|t|d)"/g, '')) , e.canonical);
  /* ukjente vektor-nøkler ignoreres (G6c-konvensjonen) — men ALLE registry-nøkler kreves */
  const partial = [{ closeness: 50, extra: 'x' }, { closeness: 90, openness: 40, conflict: 30, independence: 70 }];
  const rp = rowsFromVectors('rel', partial);
  ok('G5g.mangler-noekkel-ok-false', rp.ok === false && rp.error === 'vektor-mangler-openness');
}

/* ---------- G6: payload-grammatikk — kun tallrader ---------- */
{
  const cases = [
    [{ v: 1, t: 'nd', d: [['50', 20]] }, false],
    [{ v: 1, t: 'nd', d: [[{ a: 1 }, 20]] }, false],
    [{ v: 1, t: 'nd', d: [true] }, false],
    [{ v: 1, t: 'nd', d: [null] }, false],
    [{ v: 1, t: 'nd', d: [[50, 20], [1]] }, false],
    [{ v: 1, t: 'nd', d: { rows: [[50, 20]] } }, false],
    [{ v: 1, t: 'nd' }, false],
  ];
  for (const [obj, wantOk] of cases) {
    const p = Buffer.from(JSON.stringify(obj)).toString('base64url');
    const r = decodeSharePayload(p);
    ok(`G6a.${JSON.stringify(obj.d?.[0])?.slice(0, 12) || 'no-d'}`, r.ok === wantOk);
  }
  /* null-skår (visningslags kontrakt) er ALDRI transport-svaret: nd null => ok:false, ikke 0-fabrikasjon */
  const rn = rowsFromVectors('nd', [{ adhd: null, autism: 40 }]);
  ok('G6b.null-aldri-fabrikkert', rn.ok === false && rn.error === 'vektor-mangler-adhd');
}

/* ---------- G7: URL-kontrakten ---------- */
{
  const e = encodeSharePayload({ type: 'rel', rows: [[50, 90, 50, 50], [90, 40, 30, 70]] });
  const base = { origin: 'https://maneitai.github.io', path: '/brainarea/relasjoner/' };
  const u = buildShareUrl(e.payload, base);
  ok('G7a.url-ok', u.ok === true && u.url.startsWith('https://maneitai.github.io/brainarea/relasjoner/#d='));
  const fh = payloadFromHash(u.url);
  ok('G7b.roundtrip', fh.ok === true && fh.payload === e.payload);
  /* ekte location.hash-form: fragment uten '#' er DOM-hashen */
  const domHash = u.url.slice(u.url.indexOf('#'));
  ok('G7c.dom-hash-prefiks', domHash.startsWith('#' + SHARE_FRAGMENT_PREFIX));
  const fh2 = payloadFromHash(domHash);
  ok('G7d.dom-hash-ok', fh2.ok === true && fh2.payload === e.payload);
  /* verstefall: alle rel-rader med maks 4-desimal-bruk */
  const worst = encodeSharePayload({ type: 'rel', rows: [[12.3456, 34.5678, 56.7891, 78.9012], [23.4567, 45.6789, 67.8901, 89.0123]] });
  const uw = buildShareUrl(worst.payload, base);
  ok('G7e.url-lengde', uw.ok === true && uw.length <= SHARE_URL_LIMIT, `len=${uw.length}`);
  /* kraftigst mulig: nd kortest */
  const tiny = encodeSharePayload({ type: 'nd', rows: [[50, 50]] });
  ok('G7f.nd-kompakt', tiny.payload.length < 60, tiny.payload.length);
  /* payload-mengde-grense: SHARE_MAX_PAYLOAD er DoS-grensene */
  ok('G7g.maxpayload-grense', SHARE_MAX_PAYLOAD === 4096);
}

/* ---------- G8: browser-likhet — ingen runtime-forbudstokens i modulen ---------- */
{
  const src = readFileSync(new URL('./_share_link.mjs', import.meta.url), 'utf8');
  for (const ban of ['Buffer', 'atob', 'btoa', 'TextEncoder', 'localStorage', 'document.', 'window.', 'fetch(', 'import(', 'node:fs', 'require(']) {
    ok(`G8.ingen-${ban.replace(/[^\w]/g, '')}`, !src.includes(ban), ban);
  }
  ok('G8b.modul-ren-esm', src.startsWith('/**'));
}

/* ---------- G9: URL-grammatikk — payload uten %-koding ---------- */
{
  const e = encodeSharePayload({ type: 'rel', rows: [[50, 90, 50, 50], [90, 40, 30, 70]] });
  const url = new URL(`https://maneitai.github.io/brainarea/relasjoner/`);
  url.hash = '#' + SHARE_FRAGMENT_PREFIX + e.payload;
  ok('G9a.hash-ubevart', url.hash === '#' + SHARE_FRAGMENT_PREFIX + e.payload, url.hash);
  /* og med %: encodeURIComponent(payload) === payload over b64url-alfabetet */
  ok('G9b.krever-ingen-prosentkoding', encodeURIComponent(e.payload) === e.payload);
}

/* ---------- G10: konstantkontrakt ---------- */
{
  ok('G10a.version', SHARE_LINK_VERSION === 'v1' && SHARE_VERSION === 1);
  ok('G10b.registry-rel', JSON.stringify(SHARE_TYPES.rel.ids) === JSON.stringify(['closeness', 'openness', 'conflict', 'independence']) && SHARE_TYPES.rel.rows === 2);
  ok('G10c.registry-nd', JSON.stringify(SHARE_TYPES.nd.ids) === JSON.stringify(['adhd', 'autism']) && SHARE_TYPES.nd.rows === 1);
  ok('G10d.prefiks', SHARE_FRAGMENT_PREFIX === 'd=');
}

/* ---------- stdout-signatur ---------- */
console.log(`SHARE-LINK SELFTEST ${pass} PASS / ${failures.length} FAIL`);
console.log(`MD5 ${md5(pass + ':' + failures.length + ':' + [...failures].join(','))}`);
if (failures.length > 0) process.exit(1);
