/**
 * Brainarea pages-data ([BYGG] FASE 1, todo #3718).
 *
 * Layout-sjikt: rute-liste + slot-funksjoner som resolver alle SYNLIGE
 * strenger gjennom i18n-katalogen (i18n/index.js getT). Ingen synlig tekst
 * i koden — bare nøkler. Kortene/resulatsjiktet tilhører bygg- og kjøresjiktet
 * (build.js / test-run-motoren), ikke pages-data.
 *
 * CTA-hrefs resolves gjennom app/locale.js (BASE-relative, subpath-sikre).
 * Kortlistens orden: persona, evne, rel, play (kildesite orden, fast).
 */
import { localizedPath } from './locale.js';

/** Rutene i build-orden. testId = motorens test-familie (null = statisk side). */
export const RUTE_LISTE = [
  { route: 'home', testId: null },
  { route: 'persona', testId: 'persona' },
  { route: 'evne', testId: 'iq' },
  { route: 'rel', testId: 'relational' },
  { route: 'nd', testId: 'nd' },
  { route: 'play', testId: 'puzzle' },
  { route: 'about', testId: null },
  { route: 'privacy', testId: null },
];

/** Test-rutene (brukes av engine-sjiktet; statiske sider har ingen). */
export const TEST_ROUTES = RUTE_LISTE.filter((r) => r.testId !== null);

/**
 * Annonse-plasseringer ([BYGG] FASE 1, todo #3722) — beslutning 11 (preplan,
 * GODKJENT): reklamen finansierer siden — plassert paa LANDINGSIDENE, aldri i
 * testflyten, aldri mellom siste spoersmaal og resultat, aldri over folden som
 * foerste element, ingen popup/interstitial/sticky.
 *
 * FASE 1 (denne plasseringen): kun de statiske landingsrutene home/play/about
 * — to enheter per rute: in_feed mellom seksjonene (fluid, full kolonnebredde)
 * + leaderboard nederst (siste slot foer footer). privacy faar INGEN annonse
 * (annonse rett ved personvernteksten bryter aarepen forventning). Test-rutene
 * (persona/evne/rel) er UTENFOR hele denne plasseringen: resultat-omraadet
 * (evne-result-after / result-under, mock 336x280 + 320x50) er #3722-rest —
 * adSlots() kaster hardt dersom noen proever aa plassere der.
 *
 * { format } er en beslutning-11-format-id (app/ads.js AD_FORMATS);
 * { slot } er plasseringsnoekkel som emitres som data-ba-slot (kontrakt for
 * senere aktivering). renderAd kalles i build.js — layout-slot-ene forblir
 * plattformneutrale deskriptorer ({ kind: 'ad', format, slot }).
 */
const AD_PLACEMENTS = {
  home: [
    { format: 'in_feed', slot: 'home-after-cards' },
    { format: 'leaderboard', slot: 'home-bottom' },
  ],
  about: [
    { format: 'in_feed', slot: 'about-intro-after' },
    { format: 'leaderboard', slot: 'about-bottom' },
  ],
};

/**
 * Plasseringsliste for en rute — kaster paa test-ruter og ukjente ruter
 * (beslutning 11-vakt: ingen annonser i testflyten, aldri).
 */
export function adSlots(route) {
  if (TEST_ROUTES.some((r) => r.route === route)) {
    throw new Error(`pages-data: annonse-plassering er nektet paa test-rute "${route}" (beslutning 11: testflyten er alltid annonsesfri)`);
  }
  const slots = AD_PLACEMENTS[route];
  if (!slots) {
    throw new Error(`pages-data: ukjent annonse-rute "${route}" (kjent: ${Object.keys(AD_PLACEMENTS).join(', ')})`);
  }
  return slots.map((s) => ({ kind: 'ad', ...s }));
}

/** Hjem-kortene: title/desc resolver per språk, href er locale-klar rute. */
export function homeCards() {
  return [
    { route: 'persona', titleKey: 'page.home.card.persona.title', descKey: 'page.home.card.persona.desc' },
    { route: 'evne', titleKey: 'page.home.card.evne.title', descKey: 'page.home.card.evne.desc' },
    { route: 'rel', titleKey: 'page.home.card.rel.title', descKey: 'page.home.card.rel.desc' },
    { route: 'nd', titleKey: 'page.home.card.nd.title', descKey: 'page.home.card.nd.desc' },
    { route: 'play', titleKey: 'page.home.card.play.title', descKey: 'page.home.card.play.desc' },
  ];
}

/**
 * Layout for én side. Returnerer en plattform-uavhengig descriptor-liste;
 * i18n-strenger er allerede resolvete, lenker er BASE-relative ferdig-stier.
 */
export function layout(route, locale, t) {
  const sw = (target) => localizedPath(locale, target); /* sammet-spraak lenke */
  const link = (target) => localizedPath(locale, target);

  if (route === 'home') {
    return [
      { kind: 'node', tag: 'h1', cls: 'text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl', html: true, parts: [
        { text: t('page.home.h1.a') },
        { text: ' ' },
        { tag: 'span', cls: '', style: 'color:var(--ba-accent)', text: t('page.home.h1.b') },
      ] },
      { kind: 'node', tag: 'p', cls: 'mt-3 text-base leading-relaxed text-gray-600 sm:text-lg', text: t('page.home.intro') },
      /* kortene + badges legges til i build.js fra CARD_FELT/innholdet over */
      { kind: 'cards', badgeKey: 'page.home.badge.open' },
      adSlots('home')[0], /* in_feed: mellom kortseksjonen og metode/begrensninger */
      { kind: 'node', tag: 'p', cls: 'mt-6 text-sm', parts: [
        { text: t('page.home.methodLink'), tag: 'a', cls: 'font-semibold underline', style: 'color:var(--ba-accent)', href: link('about') },
      ] },
      { kind: 'node', tag: 'p', cls: 'mt-10 text-xs leading-relaxed text-gray-500', text: t('page.home.disclaimer') },
      adSlots('home')[1], /* leaderboard: nederst, siste slot foer footer */
    ];
  }

  if (route === 'nd') {
    return [
      { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.nd.h1') },
      { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-500', text: t('page.nd.intro') },
      { kind: 'test-mount', testId: RUTE_LISTE.find((r) => r.route === route).testId },
      { kind: 'node', tag: 'section', cls: 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6', children: [
        { kind: 'node', tag: 'h2', cls: 'font-bold', text: t('page.nd.methodHeading') },
        { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-600', text: t('page.nd.methodBody') },
        { kind: 'node', tag: 'p', cls: 'mt-4 text-xs leading-relaxed text-gray-500', text: t('page.nd.deepNote') },
      ] },
    ];
  }
  if (route === 'persona' || route === 'evne' || route === 'rel') {
    const slots = [];
    if (route === 'persona') {
      slots.push(
        { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.persona.h1') },
        { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-500', text: t('page.persona.intro') },
      );
    } else if (route === 'evne') {
      slots.push(
        { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.evne.h1') },
        { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-500', text: t('page.evne.intro') },
      );
    } else {
      slots.push(
        { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.rel.h1') },
        { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-500', text: t('page.rel.intro') },
      );
    }
    slots.push(
      { kind: 'test-mount', testId: RUTE_LISTE.find((r) => r.route === route).testId },
    );
    if (route === 'evne') {
      slots.push(
        { kind: 'node', tag: 'section', cls: 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6', children: [
          { kind: 'node', tag: 'h2', cls: 'font-bold', text: t('page.evne.methodHeading') },
          { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-600', text: t('page.evne.methodBody') },
          { kind: 'node', tag: 'p', cls: 'mt-3 text-sm leading-relaxed text-gray-600', text: t('page.evne.score') },
          { kind: 'node', tag: 'p', cls: 'mt-4 text-xs leading-relaxed text-gray-500', text: t('page.evne.nvNote') },
        ] },
      );
    }
    if (route === 'persona') {
      slots.push(
        { kind: 'node', tag: 'section', cls: 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6', children: [
          { kind: 'node', tag: 'h2', cls: 'font-bold', text: t('page.persona.methodHeading') },
          { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', parts: [
            { text: t('page.persona.methodBody') },
            { text: t('page.persona.ipipLink'), tag: 'a', cls: 'font-semibold underline', style: 'color:var(--ba-accent)', href: 'https://ipip.ori.org/' },
            { text: t('page.persona.p.methodTail') },
          ] },
          { kind: 'node', tag: 'p', cls: 'mt-4 text-xs leading-relaxed text-gray-500', text: t('page.persona.nonNormed') },
        ] },
      );
    }
    if (route === 'rel') {
      slots.push(
        { kind: 'node', tag: 'section', cls: 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6', children: [
          { kind: 'node', tag: 'h2', cls: 'font-bold', text: t('page.rel.methodHeading') },
          { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-600', text: t('page.rel.methodBody') },
          { kind: 'node', tag: 'p', cls: 'mt-4 text-xs leading-relaxed text-gray-500', text: t('page.rel.nonValidated') },
        ] },
      );
    }
    return slots;
  }

  if (route === 'play') {
    return [
      { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.play.h1') },
      { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-500', text: t('page.play.intro') },
      { kind: 'test-mount', testId: RUTE_LISTE.find((r) => r.route === route).testId },
      { kind: 'cards' },
      /* [BYGG] #3841: play er naa test-rute (puzzle-mount) — beslutning 11:
         testflyten er alltid annonsesfri. adSlots('play') ville kastet hardt. */
    ];
  }

  if (route === 'about') {
    return [
      { kind: 'node', tag: 'p', cls: 'text-sm font-semibold', parts: [
        { text: t('page.about.back'), tag: 'a', cls: '', href: sw('home'), tailText: '' },
      ] },
      { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.about.h1') },
      { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-600', text: t('page.about.intro') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.about.h.how') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.about.p.how') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.about.h.ipip') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.about.p.ipip'), parts: [
        { text: t('page.about.ipipLink'), tag: 'a', cls: 'font-semibold underline', style: 'color:var(--ba-accent)', href: 'https://ipip.ori.org/' },
        { text: t('page.about.p.ipipTail') },
      ] },
      { kind: 'node', tag: 'p', cls: 'mt-3 leading-relaxed text-gray-600', text: t('page.about.p.mbti') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.about.h.iq') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.about.p.iq1') },
      { kind: 'node', tag: 'p', cls: 'mt-3 leading-relaxed text-gray-600', text: t('page.about.p.iq2'), parts: [
        { text: t('page.about.em.notValidated'), tag: 'em', tailText: t('page.about.p.iq3') },
      ] },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.about.h.not') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.about.p.not1') },
      { kind: 'node', tag: 'p', cls: 'leading-relaxed text-gray-600', text: t('page.about.p.not2') },
      { kind: 'node', tag: 'p', cls: 'leading-relaxed text-gray-600', text: t('page.about.p.not3') },
      { kind: 'node', tag: 'p', cls: 'leading-relaxed text-gray-600', text: t('page.about.p.not4') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.about.h.privacy') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.about.p.privacy') },
      { kind: 'node', tag: 'p', cls: 'mt-8 text-xs leading-relaxed text-gray-500', text: t('page.about.tail') },
      ...adSlots('about'),
    ];
  }

  if (route === 'privacy') {
    return [
      { kind: 'node', tag: 'p', cls: 'text-sm font-semibold', parts: [
        { text: t('page.privacy.back'), tag: 'a', cls: '', href: sw('home'), tailText: '' },
      ] },
      { kind: 'node', tag: 'h1', cls: 'text-3xl font-extrabold tracking-tight', text: t('page.privacy.h1') },
      { kind: 'node', tag: 'p', cls: 'mt-2 text-sm font-semibold', text: t('page.privacy.short') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.privacy.h.data') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.privacy.p.data') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.privacy.h.future') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.privacy.p.future') },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.privacy.h.ads') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.privacy.p.ads'), parts: [
        { text: t('page.privacy.adsLink'), tag: 'a', cls: 'font-semibold underline', style: 'color:var(--ba-accent)', href: 'https://policies.google.com/privacy' },
        { text: t('page.privacy.p.adsTail') },
      ] },
      { kind: 'node', tag: 'h2', cls: 'mt-8 text-xl font-bold', text: t('page.privacy.h.owner') },
      { kind: 'node', tag: 'p', cls: 'mt-2 leading-relaxed text-gray-600', text: t('page.privacy.p.owner'), parts: [
        { text: t('page.privacy.ownerLink'), tag: 'a', cls: 'font-semibold underline', style: 'color:var(--ba-accent)', href: 'mailto:manieten@pm.me', tailText: t('page.privacy.p.ownerTail') },
      ] },
      { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-600', text: t('page.privacy.p.responsible') },
      { kind: 'node', tag: 'section', cls: 'mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm', children: [
        { kind: 'node', tag: 'h2', cls: 'text-xl font-bold', text: t('page.privacy.h.consent') },
        { kind: 'node', tag: 'p', cls: 'mt-2 text-sm leading-relaxed text-gray-600', text: t('page.privacy.consentLine') },
      ] },
      { kind: 'node', tag: 'p', cls: 'mt-8 text-xs text-gray-500', text: t('page.privacy.updated') },
    ];
  }

  throw new Error(`pages-data: ukjent rute "${route}"`);
}

/** Språkvelger-descriptor (renderes i build.js; href fra locale.js). */
export function langSwitcher() {
  return { activeCls: 'rounded-full px-3 py-1.5 font-semibold text-white', inactiveCls: 'rounded-full px-3 py-1.5 text-gray-400 transition hover:text-gray-600', badges: { no: 'NO', en: 'EN' } };
}
