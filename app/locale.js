/**
 * Brainarea locale-routing — single source for base, language paths and
 * cross-language links ([BYGG] FASE 1, todo #3718).
 *
 * Regler:
 * - NO lever ved roten av siten, EN lever under /en/. Dette er deploy-kontrakten
 *   til github.io (subpath-hosting under /brainarea/) — alle URL-er bygges fra
 *   BASE med trailing slash, aldri root-absolute (gamle Next-bygget brukte /en/
 *   som brekker under subpath).
 * - En rutefamilie har nøyaktig to medlemmer: { no, en }. Flere/mindre = feil.
 * - Denne modulen kan kaste: ukjent rute er en byggfeil, ikke en kjøretidshendelse.
 *   (i18n-oppslag kaster aldri; routing-indeks gjør det — ulike kontrakter.)
 */
export const BASE = '/brainarea/';

/** Rute-familier: samme app, to språk — ingen dupliserte ruter. */
export const ROUTES = {
  home:       { no: '',            en: '' },
  persona:    { no: 'persona',     en: 'persona' },
  evne:       { no: 'evne',        en: 'ability' },
  rel:        { no: 'relasjoner',  en: 'relations' },
  play:       { no: 'play',        en: 'play' },
  about:      { no: 'om-testene',  en: 'about' },
  privacy:    { no: 'personvern',  en: 'privacy' },
};

export const LOCALES = ['no', 'en'];

/** Valider familien ved import — feiler hardt ved manglende språkmedlem. */
(function validateRoutes() {
  for (const [route, fam] of Object.entries(ROUTES)) {
    const have = LOCALES.filter((l) => typeof fam[l] === 'string');
    if (have.length !== LOCALES.length) {
      throw new Error(`locale: rute "${route}" mangler språkmedlem (${have.join(', ')})`);
    }
  }
})();

/** URL-prefiks per språk: NO eier roten, EN lever under /en/. */
const LANG_PREFIX = { no: '', en: 'en/' };

/** Hvilket språk og hvilken rute peker denne stien på? Kaster på ukjent sti. */
export function pathToLocale(path) {
  let p = String(path || '');
  if (p.startsWith(BASE)) p = p.slice(BASE.length);
  else if (p.startsWith('brainarea/')) p = p.slice('brainarea/'.length);
  else if (p.startsWith('/')) p = p.slice(1);
  for (const locale of LOCALES) {
    const pref = LANG_PREFIX[locale];
    let rest = p;
    if (pref) {
      if (!p.startsWith(pref)) continue;
      rest = p.slice(pref.length);
      if (rest === '' || rest === '/') {
        return { locale, route: 'home', langSwitchable: true, originalPath: path }; /* spraak-rot = home */
      }
    }
    for (const [route, fam] of Object.entries(ROUTES)) {
      const seg = fam[locale];
      if (seg === '') continue; /* tom sti matches kun eksplisitt (roten) */
      if (rest === seg || rest.startsWith(seg + '/')) {
        return { locale, route, langSwitchable: true, originalPath: path };
      }
    }
  }
  if (p === '' || p === '/') return { locale: 'no', route: 'home', langSwitchable: true, originalPath: path };
  throw new Error(`locale: ukjent sti "${path}"`);
}

/** Kanonisk lokal-sti for rute+språk (med BASE og trailing slash). */
export function localizedPath(locale, route) {
  const fam = ROUTES[route];
  if (!fam) throw new Error(`locale: ukjent rute "${route}"`);
  const seg = fam[locale];
  if (typeof seg !== 'string') throw new Error(`locale: ruten "${route}" har ikke språk "${locale}"`);
  return BASE + LANG_PREFIX[locale] + (seg ? seg + '/' : '');
}

/** Full canonical-URL for rute+språk. */
export function canonicalUrl(locale, route) {
  return 'https://maneitai.github.io' + localizedPath(locale, route);
}

/**
 * Språkbytte: denne stien -> samme rute på det andre språket.
 * Ren funksjon: sti inn (med/uten BASE og /-prefiks), sti ut. Kaster på ukjent sti.
 */
export function langSwitchHref(path) {
  const { locale, route } = pathToLocale(path);
  const other = locale === 'no' ? 'en' : 'no';
  return localizedPath(other, route);
}

/** Er dette en kjent rute-nøkkel (pages-data-format)? */
export function isKnownRoute(route) {
  return Object.prototype.hasOwnProperty.call(ROUTES, route);
}
