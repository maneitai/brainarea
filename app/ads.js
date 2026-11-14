/**
 * Brainarea ad-slot component — MOCK ([BYGG] FASE 1, todo #3720).
 *
 * Beslutning 11 (preplan, GODKJENT av operatøren): reklamen finansierer siden,
 * men NEVER in the test flow, never between the last question and the result,
 * no popup/interstitial/sticky. This component serves MOCK slots with REAL
 * display formats from day one, explicitly marked as mock. AdSense placement,
 * loading and any third-party request is a later step (todo #3722 + aktivering):
 * in THIS build the component renders pure static markup —
 *   no <script>, no <iframe>, no <img>, no off-site URLs, no click-through.
 *
 * Formats (exact, decision 11 — verifiable data, todo #3721 measures against these):
 *   medium_rectangle  300×250   (fixed)
 *   large_rectangle   336×280   (fixed)
 *   leaderboard       728×90    (fixed)
 *   mobile_banner     320×50    (fixed)
 *   in_feed           fluid     (width follows the feed it sits in, banded height)
 *
 * Contract:
 * - renderAd({ format, slot, t }) is a PURE, deterministic function: same
 *   arguments -> byte-identical markup. No clock, no randomness.
 * - All visible strings resolve through the i18n catalog (page.ad.*) — no free
 *   text in markup, so the V3 text-source inventory (app/_verify_hreflang.mjs)
 *   keeps holding when placement lands.
 * - `slot` is the placement key (slug, e.g. "home-bottom", "evne-result-after")
 *   — required, validated, emitted as data-ba-slot. Placement contract for #3722.
 * - Unknown format / bad slot / missing i18n fn => hard fail (build error, not
 *   runtime event — i18n resolves never-throw; routing/ads fail loud, same split
 *   as described in app/locale.js).
 */

export const AD_FORMATS = [
  { id: 'medium_rectangle', w: 300, h: 250, fluid: false, spec: '300×250' },
  { id: 'large_rectangle', w: 336, h: 280, fluid: false, spec: '336×280' },
  { id: 'leaderboard', w: 728, h: 90, fluid: false, spec: '728×90' },
  { id: 'mobile_banner', w: 320, h: 50, fluid: false, spec: '320×50' },
  { id: 'in_feed', w: null, h: 130, fluid: true, spec: 'in-feed' },
];

/** Format-oppslag: kaster ved ukjent id. */
export function adFormat(id) {
  const f = AD_FORMATS.find((x) => x.id === id);
  if (!f) {
    throw new Error(`ads: ukjent annonsesformat "${id}" (kjent: ${AD_FORMATS.map((x) => x.id).join(', ')})`);
  }
  return f;
}

/** Plasseringsnøkkel-grammatikk: liten slug, 1–40 tegn, [a-z0-9-]. */
const SLOT_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Render én mock-annonse-slot.
 * @param {{ format: string, slot: string, t: (key: string) => string }} opts
 * @returns {string} HTML-fragment (deterministisk, ingen eksterne ressurser)
 */
export function renderAd({ format, slot, t }) {
  if (typeof t !== 'function') throw new Error('ads: t (i18n-oppslag) kreves');
  if (typeof slot !== 'string' || !SLOT_RE.test(slot)) {
    throw new Error(`ads: ugyldig slot "${slot}" — slug [a-z0-9-], 1–40 tegn, kreves`);
  }
  const f = adFormat(format);
  const label = esc(t('page.ad.label'));
  const badge = esc(t('page.ad.mockBadge'));
  const boxText = esc(t(`page.ad.mock.${f.id}`));
  const note = esc(t('page.ad.disclaimer'));
  const dimAttr = f.fluid ? 'fluid' : `${f.w}x${f.h}`;
  const boxStyle = f.fluid ? 'height:130px' : `width:${f.w}px;height:${f.h}px`;
  return [
    `<aside class="ba-ad ba-ad--${f.id}" aria-label="${label}" data-ba-ad="${f.id}" data-ba-format="${dimAttr}" data-ba-slot="${slot}" data-ba-mock="1">`,
    `  <span class="ba-ad__meta"><span class="ba-ad__label">${label}</span><span class="ba-ad__badge">${badge}</span></span>`,
    `  <div class="ba-ad__box${f.fluid ? ' ba-ad__box--fluid' : ''}" style="${boxStyle}">${boxText}</div>`,
    `  <span class="ba-ad__note">${note}</span>`,
    `</aside>`,
  ].join('\n');
}
