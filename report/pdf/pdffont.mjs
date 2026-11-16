/**
 * pdffont.mjs — TTF parser + TrueType subsetter v1.0.0 ([BYGG] FASE 3, todo-run leaf
 * «PDF-nedlasting av resultat», søster til #3790-delgrafen i beslutning 16-kjeden).
 *
 * Formål: lese lokal TTF (DejaVu Sans/Bold), beregne per-kodepunkt-vidder fra
 * cmap+hmtx, og bygge en minimal TrueType-fil som bare inneholder de glyfene
 * et gitt tegnsett trenger (inkludert kompositt-glyf-lukking). Utdata brukes av
 * brainarea-pdf.mjs som FontFile2 i en Type0/CIDFontType2 PDF-font med Identity-H.
 *
 * Konvensjoner (arvet fra renderer/delgraf, gjentas ikke blindt):
 *  - Kast på konfigfeil (ugyldig TTF/tegn som mangler glyf) — aldri stille fallback.
 *  - Determinisme: ingen klokke, ingen Math.random; samme input gir byte-lik font.
 *  - Ingen tredjepartsavhengigheter, ingen fs/nett-tilgang: mottar font-byte via
 *    parameter (leses av kalleren), kan testes Node-fritt.
 *
 * PDF-eksponeringsgrunnlag (PDF-SPES):
 *  - code == unicode (Identity-H): kodepunktet skrives direkte som 2 bytes, derfor
 *    trenger vi ingen CID-mapping-tabell — bare cmap i fonten for fremlesing.
 *  - Vidder i PDF = advanceWidth/unitsPerEm*1000 (PDF-tekst-operatoren måler i 1/1000 em).
 *  - .notdef (gid 0) håndheves alltid i subsettet.
 *
 * Kjent grense (dokumentert): kodepunkt uten glyf er et HARD-FEIL-tilfelle for
 * rapportdata (assertHasGlyphs) — et kodepunkt glyfen ikke dekker skriver ut
 * .notdef (tom boks) i flertallslesere, og rapportlagen har per kontrakt aldri
 * stille tegnerstatning.
 */

export const PDFFONT_VERSION = '1.0.0';

/* ---------- små bytereader (kun big-endian, som TTF krever) ---------- */

class Reader {
  constructor(data) { this.d = data; }
  u8(o) { return this.d[o]; }
  u16(o) { return (this.d[o] << 8) | this.d[o + 1]; }
  i16(o) { const v = this.u16(o); return v >= 0x8000 ? v - 0x10000 : v; }
  u32(o) { return (((this.d[o] << 8) | this.d[o + 1]) << 8 | this.d[o + 2]) << 8 | this.d[o + 3]; }
}

/** Parse TTF-tabelldirektoriet. Kaster på feil. */
export function readTables(data) {
  if (!(data instanceof Uint8Array) || data.length < 12) throw new Error('pdffont: font-data mangler/fin');
  const r = new Reader(data);
  const sfnt = r.u32(0);
  if (sfnt !== 0x00010000 && sfnt !== 0x74746366) throw new Error('pdffont: ikke TrueType (OpenType/CFF og WOFF krever konvertering)');
  const numTables = r.u16(4);
  const tables = new Map();
  for (let i = 0; i < numTables; i++) {
    const off = 12 + i * 16;
    const name = String.fromCharCode(data[off], data[off + 1], data[off + 2], data[off + 3]);
    tables.set(name, { offset: r.u32(off + 8), length: r.u32(off + 12) });
  }
  const must = ['head', 'hhea', 'hmtx', 'maxp', 'cmap', 'glyf', 'loca'];
  for (const tag of must) if (!tables.has(tag)) throw new Error('pdffont: mangler tabell ' + tag);
  return tables;
}

/**
 * Map kodepunkt -> glyph-id fra fontens cmap (format 12 foretrukket, format 4 fallback).
 * Returnerer { map, format }.
 */
export function readCmap(data, tables) {
  const c = tables.get('cmap');
  const r = new Reader(data);
  const n = r.u16(c.offset + 2);
  let best = null; /* { offset, rank } */
  for (let i = 0; i < n; i++) {
    const pid = r.u16(c.offset + 4 + i * 4), eid = r.u16(c.offset + 4 + i * 4 + 2);
    const subOff = c.offset + r.u32(c.offset + 4 + i * 4 + 4);
    const fmt = r.u16(subOff);
    /* Unicode-plattform(0) eller Windows(3); foretrekk UCS-4 (eid 4/10) over BMP (eid 1); format 12 over 4 */
    const rankEid = (eid === 4 || eid === 10) ? 2 : eid === 1 ? 1 : 0;
    const rankFmt = fmt === 12 ? 2 : fmt === 4 ? 1 : 0;
    const rank = rankFmt * 10 + rankEid;
    if ((pid === 0 || pid === 3) && rankFmt > 0 && (!best || rank > best.rank)) best = { offset: subOff, fmt, rank };
  }
  if (!best) throw new Error('pdffont: ingen brukbar cmap-subtabell (mangler format 4/12)');
  const map = new Map();
  if (best.fmt === 12) {
    const nGroups = r.u32(best.offset + 12);
    for (let g = 0; g < nGroups; g++) {
      const base = best.offset + 16 + g * 12;
      const startC = r.u32(base), endC = r.u32(base + 4), startG = r.u32(base + 8);
      if (endC > 0x10FFFF) continue;
      for (let cp = startC; cp <= endC; cp++) {
        if (!map.has(cp)) map.set(cp, startG + (cp - startC));
      }
    }
  } else {
    const segX2 = r.u16(best.offset + 6);
    const seg = segX2 / 2;
    const endsBase = best.offset + 14;
    const startsBase = endsBase + segX2 + 2;
    const deltasBase = startsBase + segX2;
    const rangeBase = deltasBase + segX2;
    for (let i = 0; i < seg; i++) {
      const startC = r.u16(startsBase + i * 2), endC = r.u16(endsBase + i * 2);
      const delta = r.i16(deltasBase + i * 2), rng = r.u16(rangeBase + i * 2);
      if (startC === 0xFFFF) continue;
      for (let cp = startC; cp <= endC; cp++) {
        let gid;
        if (rng === 0) gid = (cp + delta) & 0xFFFF;
        else {
          const pos = rangeBase + i * 2 + rng + (cp - startC) * 2;
          gid = r.u16(pos);
          if (gid === 0) continue;
          gid = (gid + delta) & 0xFFFF;
        }
        if (gid !== 0 && !map.has(cp)) map.set(cp, gid);
      }
    }
  }
  return { map, format: best.fmt };
}

/**
 * Subset fonten til nøydvendige glyfer. neededCps: Iterable<number> kodepunkter (BMP).
 * Returnerer { fontBytes, gidOf(cp), width1000(cp), numGlyphs, unitsPerEm } — deterministisk.
 */
export function subsetFont(inputData, tables, neededCps) {
  /* eier-kopi: Buffer.slice deler minne — subsettet MÅ aldri mutere anropserens font-buffer
     (Buffer-kall del ellers: head-skrivingene her overskriver originalen og neste subset leser
     en ødelagt indexToLocFormat). Kost: 1 fontstørrelses-kopi per subset — akseptert. */
  const data = new Uint8Array(inputData);
  const r = new Reader(data);
  const { map } = readCmap(data, tables);
  const head = tables.get('head'), hhea = tables.get('hhea'), hmtx = tables.get('hmtx'), maxp = tables.get('maxp');
  const loca = tables.get('loca'), glyf = tables.get('glyf');
  const unitsPerEm = r.u16(head.offset + 18);
  const indexToLocFormat = r.i16(head.offset + 50);
  const numGlyphs = r.u16(maxp.offset + 4);
  const numHMetrics = r.u16(hhea.offset + 34);

  const mrows = [];
  for (let i = 0; i < numHMetrics; i++) {
    const o = hmtx.offset + i * 4;
    mrows.push([r.u16(o), r.i16(o + 2)]);
  }
  const awLast = mrows[numHMetrics - 1][0], lsbLast = mrows[numHMetrics - 1][1];
  const metricOf = (gid) => (gid < numHMetrics ? mrows[gid] : [awLast, lsbLast]);
  const locaOf = (g) => (indexToLocFormat === 0 ? r.u16(loca.offset + g * 2) * 2 : r.u32(loca.offset + g * 4));

  /* --- glyf-lukking: kompositt-glyfer trekker inn refererte glyfer --- */
  const keep = new Set([0]);
  for (const cp of neededCps) {
    if (!(Number.isInteger(cp) && cp >= 0 && cp <= 0xFFFF)) throw new Error('pdffont: ugyldig kodepunkt ' + cp);
    const gid = map.get(cp);
    if (gid === undefined || gid === 0) throw new Error('pdffont: glyf mangler for U+' + cp.toString(16).toUpperCase() + " ('" + String.fromCodePoint(cp) + "')");
    keep.add(gid);
  }
  const queue = [...keep];
  while (queue.length) {
    const g = queue.pop();
    const start = locaOf(g), end = locaOf(g + 1);
    if (start === end || end - start < 10) continue;
    const nc = r.i16(glyf.offset + start);
    if (nc >= 0) continue;
    let off = glyf.offset + start + 10;
    while (true) {
      const flags = r.u16(off), gi = r.u16(off + 2);
      if (!keep.has(gi)) { keep.add(gi); queue.push(gi); }
      off += 4 + (flags & 1 ? 4 : 2) + (flags & 8 ? 2 : (flags & 0x40) ? 4 : (flags & 0x80) ? 8 : 0);
      if (!(flags & 0x20)) break;
      if (off > glyf.offset + end) throw new Error('pdffont: kompositt-glyf ' + g + ' peker forbi slutt');
    }
  }
  const newGids = [...keep].sort((a, b) => a - b);
  const gmap = new Map(newGids.map((g, i) => [g, i]));

  /* --- glyf- og loca-tabell, kompositt-gid-overskriving, 4-byte justering --- */
  const glyfOut = new Uint8Array(glyf.length); /* subset overstiger aldri original størrelse */
  let glyfLen = 0;
  const locaOut = [0];
  for (const g of newGids) {
    const start = locaOf(g), end = locaOf(g + 1);
    if (start === end) { locaOut.push(glyfLen); continue; }
    let chunk = data.subarray(glyf.offset + start, glyf.offset + end);
    const nc = r.i16(glyf.offset + start);
    if (nc < 0) {
      const b = Uint8Array.from(chunk);
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
      let off = 10;
      while (true) {
        const flags = dv.getUint16(off), gi = dv.getUint16(off + 2);
        const ng = gmap.get(gi);
        if (ng === undefined) throw new Error('pdffont: kompositt-glyf refererer glyf utenfor lukking');
        dv.setUint16(off + 2, ng);
        off += 4 + (flags & 1 ? 4 : 2) + (flags & 8 ? 2 : (flags & 0x40) ? 4 : (flags & 0x80) ? 8 : 0);
        if (!(flags & 0x20)) break;
      }
      chunk = b;
    }
    if (glyfLen % 4 !== 0) { const pad = 4 - (glyfLen % 4); glyfOut.fill(0, glyfLen, glyfLen + pad); glyfLen += pad; }
    glyfOut.set(chunk, glyfLen); glyfLen += chunk.length;
    locaOut.push(glyfLen);
  }
  const locaFmt = glyfLen >= 0x20000 ? 1 : 0;
  const locaOutPadded = locaOut.slice();
  while (locaOutPadded.length < newGids.length + 1) locaOutPadded.push(glyfLen);
  let locaBytes;
  if (locaFmt === 0) {
    locaBytes = new Uint8Array(locaOutPadded.length * 2);
    const dv = new DataView(locaBytes.buffer);
    locaOutPadded.forEach((v, i) => dv.setUint16(i * 2, v / 2));
  } else {
    locaBytes = new Uint8Array(locaOutPadded.length * 4);
    const dv = new DataView(locaBytes.buffer);
    locaOutPadded.forEach((v, i) => dv.setUint32(i * 4, v));
  }

  /* --- hmtx i ny gid-orden (advance + lsb per ny gid) --- */
  const hmtxBytes = new Uint8Array(newGids.length * 4);
  {
    const dv = new DataView(hmtxBytes.buffer);
    newGids.forEach((g, i) => {
      const [a, l] = metricOf(g);
      dv.setUint16(i * 4, a); dv.setInt16(i * 4 + 2, l);
    });
  }

  /* --- head (54 B): oppdater indexToLocFormat + nullstill checkSumAdjustment --- */
  const headBytes = data.slice(head.offset, head.offset + 54);
  {
    const dv = new DataView(headBytes.buffer, headBytes.byteOffset);
    dv.setInt16(50, locaFmt); dv.setUint32(8, 0);
  }
  /* --- hhea: nytt numHMetrics --- */
  const hheaBytes = data.slice(hhea.offset, hhea.offset + 36);
  {
    const dv = new DataView(hheaBytes.buffer, hheaBytes.byteOffset);
    dv.setUint16(34, newGids.length);
  }
  /* --- maxp: nytt numGlyphs --- */
  const maxpVer = r.u32(maxp.offset);
  const maxpLen = maxpVer === 0x00010000 ? 32 : 6;
  const maxpBytes = data.slice(maxp.offset, maxp.offset + maxpLen);
  {
    const dv = new DataView(maxpBytes.buffer, maxpBytes.byteOffset);
    dv.setUint16(4, newGids.length);
  }
  /* --- cmap format 4: eksponert kodepunkt -> ny gid --- */
  const cp2new = new Map();
  for (const cp of neededCps) cp2new.set(cp, gmap.get(map.get(cp)));
  const cmapTable = buildCmap4Table(cp2new);
  /* --- OS/2, name kopieres rått; post kuttes til v3 (32 B, ingen glyph-navn) --- */
  const os2 = tables.has('OS/2') ? data.slice(tables.get('OS/2').offset, tables.get('OS/2').offset + tables.get('OS/2').length) : null;
  const name = tables.has('name') ? data.slice(tables.get('name').offset, tables.get('name').offset + tables.get('name').length) : null;
  const post = new Uint8Array(32);
  {
    const dv = new DataView(post.buffer);
    dv.setUint32(0, 0x00030000); /* v3.0: ingen glyph-navn (stringData må være tom) */
    dv.setInt32(4, 0);           /* italicAngle */
    dv.setUint16(8, 0); dv.setInt16(10, 0); /* underlinePos/thickness */
    dv.setUint32(12, 0xFFFFFFFF); /* isFixedPitch */
    /* min/max mem-typografi = 0 (v3: udefinert) */
  }
  /* fpgm/prep/cvt kopieres hvis finnes (hinting-konsistens for glyf-hinting-flagg) */
  const extra = {};
  for (const tag of ['fpgm', 'prep', 'cvt ']) {
    if (tables.has(tag)) {
      const t = tables.get(tag);
      extra[tag] = data.slice(t.offset, t.offset + t.length);
    }
  }

  const assembled = assembleTtf({
    head: headBytes, hhea: hheaBytes, maxp: maxpBytes, hmtx: hmtxBytes,
    cmap: cmapTable, glyf: glyfOut.subarray(0, glyfLen), loca: locaBytes,
    ...(os2 ? { 'OS/2': os2 } : {}), ...(name ? { name } : {}), post, ...extra,
  });

  const gidOf = (cp) => {
    const og = map.get(cp);
    return og === undefined ? undefined : gmap.get(og);
  };
  const width1000 = (cp) => {
    const ng = gidOf(cp);
    if (ng === undefined) throw new Error('pdffont: vidd krever kodepunkt i subsettet: U+' + cp.toString(16).toUpperCase().padStart(4, '0') + " ('" + String.fromCodePoint(cp) + "')");
    return Math.round(metricOf(newGids[ng])[0] / unitsPerEm * 1000);
  };
  return { fontBytes: assembled, gidOf, width1000, numGlyphs: newGids.length, unitsPerEm, exposedCps: new Set(cp2new.keys()) };
}

/** cmap-tabell (katalog + format 4 subtabell) for en sparse mengde kodepunkt. Deterministisk. */
export function buildCmap4Table(cp2gid) {
  const cps = [...cp2gid.keys()].sort((a, b) => a - b);
  const segs = [];
  let s0 = null, p0 = null;
  for (const cp of cps) {
    if (p0 !== null && cp === p0 + 1 && cp2gid.get(cp) === cp2gid.get(p0) + 1) p0 = cp;
    else { if (s0 !== null) segs.push([s0, p0]); s0 = p0 = cp; }
  }
  if (s0 !== null) segs.push([s0, p0]);
  if (!segs.length || segs[segs.length - 1][1] !== 0xFFFF) segs.push([0xFFFF, 0xFFFF]);
  const n = segs.length, segX2 = n * 2;
  const search = 2 * (2 ** Math.floor(Math.log2(n)));
  const es = Math.floor(Math.log2(n));

  const segKind = [], glyphCounts = [];
  for (const [s, e] of segs) {
    if (s === e && s === 0xFFFF) { segKind.push('d'); glyphCounts.push(0); continue; }
    const first = cp2gid.get(s);
    let contiguous = true;
    for (let c = s; c <= e; c++) if (!cp2gid.has(c) || cp2gid.get(c) !== first + (c - s)) { contiguous = false; break; }
    if (contiguous) { segKind.push('d'); glyphCounts.push(0); }
    else { segKind.push('r'); glyphCounts.push(e - s + 1); }
  }
  const headerLen = 14 + segX2 * 4 + 2; /* 14 hdr + ends + reservedPad + starts + idDelta + idRange */
  const positions = [];
  let cursor = headerLen;
  for (let i = 0; i < n; i++) {
    positions.push(cursor);
    cursor += segKind[i] === 'r' ? 2 + glyphCounts[i] * 2 : 2;
  }
  const glyphBase = cursor;
  const arrayBytes = segs.reduce((a, _, i) => a + (segKind[i] === 'r' ? glyphCounts[i] * 2 : 0), 0);

  const bytes = new Uint8Array(cursor + arrayBytes);
  const dv = new DataView(bytes.buffer);
  dv.setUint16(0, 4); dv.setUint16(2, bytes.length); dv.setUint16(4, 0);
  dv.setUint16(6, segX2); dv.setUint16(8, search); dv.setUint16(10, es); dv.setUint16(12, segX2 - search);
  segs.forEach(([_s, e], i) => dv.setUint16(14 + i * 2, e));
  dv.setUint16(14 + segX2, 0); /* reservedPad */
  segs.forEach(([s], i) => dv.setUint16(14 + segX2 + 2 + i * 2, s));
  segs.forEach(([s], i) => {
    if (segKind[i] === 'd') dv.setUint16(14 + segX2 * 2 + 2 + i * 2, (s === 0xFFFF ? 1 : (cp2gid.get(s) - s) & 0xFFFF));
    else dv.setUint16(14 + segX2 * 2 + 2 + i * 2, 0);
  });
  segs.forEach((_, i) => {
    const pos = 14 + segX2 * 3 + 2 + i * 2;
    if (segKind[i] === 'r') {
      dv.setUint16(pos, glyphBase - positions[i]);
      const [s, e] = segs[i];
      let gc = glyphBase;
      for (let j = 0; j < i; j++) if (segKind[j] === 'r') gc += glyphCounts[j] * 2;
      for (let c = s; c <= e; c++) { dv.setUint16(gc, cp2gid.get(c) ?? 0); gc += 2; }
    } else dv.setUint16(pos, 0);
  });
  /* katalog: versjon 0, én subtabell (Windows Unicode BMP, offset 12) */
  const dir = new Uint8Array(12);
  const ddv = new DataView(dir.buffer);
  ddv.setUint16(0, 0); ddv.setUint16(2, 1); ddv.setUint16(4, 3); ddv.setUint16(6, 1); ddv.setUint32(8, 12);
  return concatBytes(dir, bytes);
}

/** Sett sammen en gyldig sfnt-fil med checksums + head.checkSumAdjustment. */
export function assembleTtf(tables) {
  const tags = Object.keys(tables).sort();
  const num = tags.length;
  const sr = 2 ** Math.floor(Math.log2(num));
  const header = new Uint8Array(12);
  const hv = new DataView(header.buffer);
  hv.setUint32(0, 0x00010000); hv.setUint16(4, num); hv.setUint16(6, sr); hv.setUint16(8, Math.floor(Math.log2(num))); hv.setUint16(10, num * 16 - sr * 16);

  const enc = new TextEncoder();
  const recs = [];
  let bodyLen = 0;
  for (const tag of tags) {
    const b = tables[tag];
    recs.push({ tag, checksum: sum32(b), offset: 12 + num * 16 + bodyLen, len: b.length });
    bodyLen += b.length + ((4 - (b.length % 4)) % 4);
  }
  const dir = new Uint8Array(num * 16);
  const ddv = new DataView(dir.buffer);
  recs.forEach((rec, i) => {
    const nm = enc.encode(rec.tag);
    if (nm.length !== 4) throw new Error('pdffont: ugyldig tabellnavn ' + rec.tag);
    dir.set(nm, i * 16);
    ddv.setUint32(i * 16 + 4, rec.checksum); ddv.setUint32(i * 16 + 8, rec.offset); ddv.setUint32(i * 16 + 12, rec.len);
  });
  const body = new Uint8Array(bodyLen);
  let off = 0;
  for (const tag of tags) {
    body.set(tables[tag], off);
    off += tables[tag].length + ((4 - (tables[tag].length % 4)) % 4);
  }
  const font = concatBytes(concatBytes(header, dir), body);
  /* checkSumAdjustment: 0xB1B0AFBA - checksum(hele fonten der adj-feltet er 0) */
  const total = sum32(font);
  const adj = (0xB1B0AFBA - total) >>> 0;
  const headRec = recs.find((x) => x.tag === 'head');
  const dv = new DataView(font.buffer, font.byteOffset + headRec.offset);
  dv.setUint32(8, adj);
  return font;
}

function sum32(b) {
  const padded = (b.length % 4 === 0) ? b : concatBytes(b, new Uint8Array(4 - (b.length % 4)));
  const dv = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  let s = 0;
  for (let i = 0; i < padded.length; i += 4) s = (s + dv.getUint32(i)) % 0x100000000;
  return s >>> 0;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0); out.set(b, a.length);
  return out;
}

/** Tegn-sjekk: returnerer lista av tegn som mangler glyf (tom = ok). */
export function assertHasGlyphs(data, tables, text) {
  const { map } = readCmap(data, tables);
  const missing = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp > 0xFFFF || !map.has(cp)) missing.push(String.fromCodePoint(cp));
  }
  return missing;
}
