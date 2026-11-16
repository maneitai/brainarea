/**
 * [VERIFISER DeepSeek] 3rd-party-lesbarhet av rapport-PDF-laget — uavhengig kontroll
 * av det som allerede er levert (report/2026-11-16-fase3-pdf.md, 105/105).
 *
 * Vinkel: «generer/les én PDF — mangler den kontekst en tredjepart trenger?»
 * Ikke en duplikat av _fase3_pdf_selftest.mjs (writer-interne bevis); denne prova
 * PDF-en UTFRA, som en viser/tredjepart leser den.
 *
 * v2: objektlokasjon går via den klassiske xref-tabellen (binærsikker: dict avgrenset
 * mot «stream»/«endobj», body = eksakt /Length + endstream-sjekk), og klassifisering
 * skjer kun på dict-strengen — aldri dekomprimerte bytes. 2 kjøringer skal gi identisk
 * stdout (md5-determinisme).
 *
 *   V0  xref-objektlokasjon binærsikker (15/15), Tj-grammatikk funnet i content-streams.
 *   V1  Font-ordnekontrakt: begge CIDFontType2-descendantene har /DW 1000 og INGEN
 *       /W — per PDF 32000-4.3 faller visere da til DW=1000 for CID-er uten gyldig
 *       mapping. /CIDToGIDMap /Identity gir CID == GID, Tj-kodene er unicode —
 *       alle kodepunkt >= numGlyphs (82) er UKOBLETT og får uniform advance =
 *       fontstørrelse pt per tegn (avhengighet provet mot hmtx, V7).
 *   V1b Descriptor-objektene INNEHOLDER fontdata (sfnt, numGlyphs=82, format-4 cmap (3/1 Windows Unicode),
 *       hmtx med 82 metrikker) — dvs. fontdata ligger i fila, men dict mangler
 *       /Type /FontDescriptor og /FontFile2-nøkkelen (se V6).
 *   V2  Geometri: uniform advance sender paragraflinjer (x=48, 8.8 pt) FORBI
 *       sidekanten (595.28) — visere tegner/ekstraherer med klipp midt i ord.
 *       Writer-ens wrapTextT brukte ekte hmtx-vidder (maks 499.28) — mismatch
 *       er font-ordboken, ikke layouten.
 *   V3  Innholdet er FULLT i fila: alle sink-/layout-linjer ligger som Identity-H
 *       hex i content-streams — tapet er viser-metrikk, ikke tapte bytes.
 *   V4  Fullførings-kontekst: ingen sted i rendret innhold står completed/
 *       expired/coverage/timeSpentSec/answeredCount/besvarte/fullførte — PDF-en
 *       sier ikke at testen ble fullført, eller hvor mye som ble besvart.
 *   V5  Demo-markering: demo-PDF-ene (konstruerte data, ekte testId) har ingen
 *       DEMO-badge — demoen leses som ekte rapport.
 *   V6  Struktur-hull (REGISTRERT AVVIK — ikke rettet her, VERIFISER-konvensjon):
 *       FontDescriptor-objektet skrives i brainarea-pdf.mjs:655 med bare
 *       '<< /Filter /FlateDecode /Length .. /Length1 .. >>' — mangler
 *       /Type /FontDescriptor og /FontFile2-nøkkel, slik en spec-lesende viser
 *       ikke kan binde fontdata. FIX-KRAV for neste writer-bygg:
 *         (a) descriptor-dikt må ha /Type /FontDescriptor + /FontFile2 N 0 R
 *         (b) descendanten må få /W med HELTALLS-CID-er — hex-CID (<0025>) i /W
 *             ble IGNORERT av visere (probe 2026-11-16: null effekt), integer-CID
 *             ga full bredde (siste tegn x1=568.0 < 595.28, ingen klipp).
 *   V7  Advance-provet: cmaps format-4 mapper alle brukte kodepunkter til GID-er,
 *       og embedded hmtx har VARIERENDE vidder (flere enn 10 distinkte verdier, min
 *       < upem/2) — metrikken er ikke «alle 1 em», altsaa kan uniform 8.8 pt/tegn
 *       ikke stamme herfra. Uniform advance (= 1.0 em = 8.8 pt ved 8.8 pt font) er
 *       dermed provbar isolert til /DW 1000-fallbacken i font-ordboken.
 *
 * Kjør: node tests/schema/_fase3_pdf_3rdparty_verify.mjs  (node>=20, ingen deps)
 */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

let pass = 0; const failures = [];
const ok = (name, cond, extra = '') => { if (cond) { pass++; } else { failures.push(name); console.log(`FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const md5 = (x) => createHash('md5').update(x).digest('hex');

const HERE = new URL('.', import.meta.url);
const DEMO_URL = new URL('../../report/demo/', HERE);
const PAGE_W = 595.28, MARGIN = 48, RIGHT_MARGIN = PAGE_W - MARGIN;

const hex2str = (h) => {
  h = h.replace(/[<>]/g, '');
  if (h.length % 2) h += '0';
  return Buffer.from(h, 'hex').swap16().toString('utf16le').replace(/\0/g, '');
};

/* --- xref-basert objektlokasjon (binærsikker) --- */
function locateObjects(bytes) {
  const s = bytes.toString('latin1');
  const tailAt = Math.max(0, s.length - 1024);
  const xi = s.indexOf('startxref', tailAt);
  const xr = parseInt(s.slice(xi + 9).trim().split(/\s+/)[0], 10);
  const hm = s.slice(xr, xr + 100).match(/xref\n(\d+) (\d+)\n/);
  if (!hm) throw new Error('klassisk xref-tabell ikke funnet');
  const first = +hm[1], count = +hm[2];
  const base = xr + hm.index + hm[0].length;
  const objs = new Map();
  for (let j = 0; j < count; j++) {
    const row = bytes.slice(base + j * 20, base + j * 20 + 20).toString('latin1');
    const mm = row.match(/^(\d{10}) (\d{5}) (n|f)/);
    if (!mm || mm[3] === 'f') continue;
    const id = first + j;
    const off = +mm[1];
    const eo = s.indexOf('endobj', off);
    if (eo === -1) continue;
    const sm = s.indexOf('stream', off);
    let dictStr, body = null;
    if (sm !== -1 && sm < eo) {
      dictStr = s.slice(off, sm);
      const lm = dictStr.match(/\/Length (\d+)/);
      if (!lm) throw new Error('/Length mangler i stream-objekt ' + id);
      const L = +lm[1];
      if (s.charCodeAt(sm + 6) !== 10) throw new Error('stream EOL-avvik obj ' + id);
      body = bytes.slice(sm + 7, sm + 7 + L);
      const after = s.slice(sm + 7 + L, sm + 7 + L + 12);
      if (!/^[\r\n]?endstream/.test(after)) throw new Error('Length-avvik obj ' + id + ': ' + JSON.stringify(after.slice(0, 9)));
    } else {
      dictStr = s.slice(off, eo + 6);
    }
    objs.set(id, { id, dictStr, body });
  }
  return { objs, count };
}

const dictPart = (o) => o.dictStr;
const streamBody = (o) => o.body;
const inflate = (b) => zlib.inflateSync(Buffer.from(b, 'latin1'));

/* --- minimal sfnt-parser: numGlyphs, upem, cmap(format-6), hmtx --- */
function parseTTF(b) {
  const u16 = (o) => b.readUInt16BE(o);
  const u32 = (o) => b.readUInt32BE(o);
  const nt = u16(4);
  const tabs = {};
  for (let t = 0; t < nt; t++) {
    const o = 12 + t * 16;
    tabs[b.toString('latin1', o, o + 4)] = { off: u32(o + 8), len: u32(o + 12) };
  }
  const numGlyphs = u16(tabs['maxp'].off + 4);
  const upem = u16(tabs['head'].off + 18);
  const nhm = u16(tabs['hhea'].off + 34);
  if (!tabs['cmap']) return { numGlyphs, upem, nhm, hasCmap: false, subtables: 0, fmtSeen: 0, mapGid: () => null, adv: () => 0 };
  const cm = tabs['cmap'].off;
  const cs = u16(cm + 2);
  let segs = null, subtables = 0, fmtSeen = 0;
  for (let sIdx = 0; sIdx < cs; sIdx++) {
    const po = u32(cm + 4 + sIdx * 8 + 4);
    const fmt = u16(cm + po);
    subtables++; fmtSeen = fmt;
    if (fmt !== 4) continue;
    const segCount = u16(cm + po + 6) / 2;
    const ends = [], starts = [], deltas = [], rangeOffs = [];
    for (let i = 0; i < segCount; i++) ends.push(u16(cm + po + 14 + i * 2));
    for (let i = 0; i < segCount; i++) starts.push(u16(cm + po + 16 + segCount * 2 + i * 2));
    for (let i = 0; i < segCount; i++) deltas.push(u16(cm + po + 16 + segCount * 4 + i * 2));
    for (let i = 0; i < segCount; i++) rangeOffs.push(u16(cm + po + 16 + segCount * 6 + i * 2));
    segs = { starts, ends, deltas, rangeOffs, segCount, rangeOffAt: cm + po + 16 + segCount * 6 };
  }
  const mapGid = (cp) => {
    if (!segs) return null;
    for (let i = 0; i < segs.segCount; i++) {
      if (cp >= segs.starts[i] && cp <= segs.ends[i]) {
        if (segs.rangeOffs[i] === 0) return (cp + segs.deltas[i]) & 0xFFFF;
        const ga = segs.rangeOffAt + i * 2 + segs.rangeOffs[i] + (cp - segs.starts[i]) * 2;
        const g = u16(ga);
        return g === 0 ? 0 : (g + segs.deltas[i]) & 0xFFFF;
      }
    }
    return null;
  };
  const adv = (gid) => (tabs['hmtx'] && nhm > 0) ? u16(tabs['hmtx'].off + Math.min(gid, nhm - 1) * 4) : 0;
  return { numGlyphs, upem, nhm, hasCmap: !!segs, subtables, fmtSeen, mapGid, adv };
}

function analyze(file) {
  const lang = file.includes('-no') ? 'no' : 'en';
  const bytes = readFileSync(new URL(file, DEMO_URL));
  const res = { lang, file, md5: md5(bytes) };

  /* V0: xref-objektlokasjon */
  const { objs, count } = locateObjects(bytes);
  res.objCount = objs.size;
  ok(`V0.xref-objekter-${lang}`, objs.size === count - 1 && objs.size === 15, `lokat=${objs.size}/${count}`);

  /* klassifisering kun på dict-deler */
  const cidObjs = [], fdObjs = [], tuObjs = [], contentObjs = [];
  for (const o of objs.values()) {
    const d = dictPart(o);
    if (d.includes('/Subtype /CIDFontType2')) cidObjs.push(o);
    else if (d.includes('/Length1')) fdObjs.push(o);   /* fontdata-objekt per writer-konvensjon */
    else if (d.includes('/FlateDecode')) {
      const dec = inflate(streamBody(o)).toString('latin1');
      if (dec.includes('begincmap')) tuObjs.push(o); else contentObjs.push(o);
    }
  }
  ok(`V1.antall-cidfonts-${lang}`, cidObjs.length === 2, String(cidObjs.length));
  ok(`V1b.antall-tounicode-${lang}`, tuObjs.length === 2, String(tuObjs.length));

  /* V1: font-ordnekontrakt på CIDFontType2-dictene */
  for (const o of cidObjs) {
    const d = dictPart(o);
    ok(`V1.dw1000-${lang}-${o.id}`, d.includes('/DW 1000'));
    ok(`V1.ingen-W-${lang}-${o.id}`, !/\/W[\s\[]/.test(d));
    ok(`V1.identity-map-${lang}-${o.id}`, d.includes('/CIDToGIDMap /Identity'));
  }

  /* V1b/V6/V7: descriptor-objektene — fontdata + struktur-hull + metrikk */
  ok(`V1b.antall-fdobjekter-${lang}`, fdObjs.length === 2, String(fdObjs.length));
  const ttfs = [];
  for (const o of fdObjs) {
    const d = dictPart(o);
    /* V6 = registrert avvik: dict mangler /Type /FontDescriptor og /FontFile2-nøkkelen */
    const manglerType = !d.includes('/Type /FontDescriptor');
    const manglerFileKey = !d.includes('/FontFile2');
    ok(`V6.descriptor-mangler-Type-${lang}-${o.id}`, manglerType);
    ok(`V6.descriptor-mangler-FontFile2-${lang}-${o.id}`, manglerFileKey);
    const ttf = inflate(streamBody(o));
    ttfs.push(ttf);
    ok(`V1b.fontdata-sfnt-${lang}-${o.id}`, ttf.length > 1000 && ttf.readUInt32BE(0) === 0x00010000);
    if (d.includes('/Length1')) ok(`V1b.length1-naayaktig-${lang}-${o.id}`, d.includes('/Length1 ' + ttf.length + ' '));
  }
  const tt = ttfs.map(parseTTF);
  const minGlyphs = Math.min(...tt.map((t) => t.numGlyphs));
  res.numGlyphs = tt.map((t) => t.numGlyphs);
  ok(`V1.numglyphs-under-ascii-S-${lang}`, minGlyphs < 0x53, 'numGlyphs=' + minGlyphs);
  ok(`V1b.cmap-format4-${lang}`, tt.every((t) => t.hasCmap && t.subtables === 1 && t.fmtSeen === 4));
  ok(`V1b.hmtx-metrikker-${lang}`, tt.every((t) => t.nhm === t.numGlyphs));

  /* content-streams: Tj-grammatikk */
  const TjLines = [];
  for (const o of contentObjs) {
    const ops = inflate(streamBody(o)).toString('latin1');
    for (const line of ops.split('\n')) {
      const mm = line.match(/BT \/(F[12]) ([\d.]+) Tf .*1 0 0 1 ([\d.-]+) ([\d.-]+) Tm <([0-9A-Fa-f]+)> Tj ET/);
      if (mm) TjLines.push({ text: hex2str(mm[5]), x: parseFloat(mm[3]), size: parseFloat(mm[2]), font: mm[1] });
    }
  }
  ok(`V0.typer-forventet-${lang}`, TjLines.length > 20, 'fant ' + TjLines.length + ' Tj-linjer');
  res.tjCount = TjLines.length;

  /* V1-fullført: kodepunkt >= numGlyphs i rendret tekst = ukoblet CID */
  const unconnected = [];
  for (const l of TjLines) for (const ch of l.text) {
    const cp = ch.codePointAt(0);
    if (cp >= minGlyphs && cp <= 0xFFFF && !unconnected.includes(cp)) unconnected.push(cp);
  }
  ok(`V1.ukoblet-cid-i-bruk-${lang}`, unconnected.length > 30, 'antall ukoblede cp=' + unconnected.length);

  /* V7: embedded metrikk er proporsjonal — kan ikke gi uniform advance */
  let gidDekning = 0, gidManglers = 0, minAdv = Infinity, maxAdv = 0;
  const upem0 = tt[0].upem;
  const advSet = new Set();
  for (const l of TjLines) for (const ch of l.text) {
    const cp = ch.codePointAt(0);
    if (cp > 0xFFFF) continue;
    let gid = null, adv = -1;
    for (const t of tt) { const g = t.mapGid(cp); if (g !== null) { gid = g; adv = t.adv(g); break; } }
    if (gid === null) gidManglers++;
    else { gidDekning++; if (adv < minAdv) minAdv = adv; if (adv > maxAdv) maxAdv = adv; advSet.add(adv); }
  }
  res.v7 = { gidDekning, gidManglers, minAdv, maxAdv, distinct: advSet.size, upem: upem0 };
  ok(`V7.gid-full-dekning-${lang}`, gidManglers === 0, 'mangler=' + gidManglers);
  /* embedded metrikker er VARIERENDE (ikke alle 1 em) — uniform 8.8 pt/tegn kan
     ikke stamme herfra; /DW 1000-fallbacken gir netto 1.0 em = 8.8 pt ved 8.8 pt font */
  ok(`V7.ikke-uniform-metrikk-${lang}`, advSet.size > 10 && minAdv < upem0 * 0.5 && maxAdv <= upem0, `min=${minAdv} max=${maxAdv}/upem=${upem0} distinct=${advSet.size}`);

  /* V2: viser-geometri (uniform advance = size pt per tegn): paragraflinjer fra
     x=48 med end X forbi sidekant klippes midt i ord. */
  const beyondPage = [], beyondMargin = [];
  for (const l of TjLines) {
    if (Math.abs(l.x - MARGIN) > 0.01) continue;
    const endX = l.x + l.text.length * l.size;
    if (endX > PAGE_W) beyondPage.push({ text: l.text.slice(0, 40), endX: +endX.toFixed(1), size: l.size, n: l.text.length });
    if (endX > RIGHT_MARGIN + 1) beyondMargin.push(l.text.slice(0, 40));
  }
  res.beyondPage = beyondPage.length;
  res.beyondMargin = beyondMargin.length;
  res.worstEndX = beyondPage.length ? beyondPage.reduce((a, b) => Math.max(a, b.endX), 0) : 0;
  ok(`V2.linjer-forbi-sidekant-${lang}`, beyondPage.length >= 1, JSON.stringify(beyondPage.slice(0, 2)));
  ok(`V2.linjer-forbi-margin-${lang}`, beyondMargin.length >= 1);

  /* V3: innholdet er FULLT i fila (bryting skjedde i writeren) */
  const allText = TjLines.map((l) => l.text).join('\n');
  const needFull = lang === 'no'
    ? ['ikke normert mot en', 'Midtpunktet p\u00E5 skalaen (50) er skalaens midt', 'psykometrisk validert i denne implementasjonen']
    : ['not percentiles, not normed', 'normed against a population', 'not psychometrically validated'];
  for (const n of needFull) ok(`V3.innhold-full-${lang}:${n.slice(0, 24)}`, allText.includes(n));

  /* V4: fullførings-kontekst finnes ikke i rendret innhold */
  const ctxKeys = ['completed', 'expired', 'coverage', 'timespent', 'answeredcount', 'fullf\u00F8rte', 'besvarte'];
  res.ctxHits = ctxKeys.filter((k) => allText.toLowerCase().includes(k));
  ok(`V4.ingen-fullfoeringsfelt-${lang}`, res.ctxHits.length === 0, JSON.stringify(res.ctxHits));

  /* V5: demo-markering mangler i demoen */
  const hasBadge = allText.includes('DEMO med konstruerte data') || allText.includes('Demo with constructed data');
  res.hasDemoBadge = hasBadge;
  ok(`V5.demo-badge-mangler-${lang}`, !hasBadge);

  return res;
}

const A = analyze('pdf-demo-no.pdf');
const B = analyze('pdf-demo-en.pdf');
console.log('--- analyse ---');
console.log(JSON.stringify({
  no: { md5: A.md5, tj: A.tjCount, numGlyphs: A.numGlyphs, v7: A.v7, beyondMargin: A.beyondMargin, beyondPage: A.beyondPage, worstEndX: A.worstEndX, ctxHits: A.ctxHits, demoBadge: A.hasDemoBadge },
  en: { md5: B.md5, tj: B.tjCount, numGlyphs: B.numGlyphs, v7: B.v7, beyondMargin: B.beyondMargin, beyondPage: B.beyondPage, worstEndX: B.worstEndX, ctxHits: B.ctxHits, demoBadge: B.hasDemoBadge },
}));
console.log(`3RD-PARTY PDF VERIFY: ${pass} PASS / ${failures.length} FAIL`);
if (failures.length) { console.log('FAILS:', failures.join(', ')); process.exit(1); }
