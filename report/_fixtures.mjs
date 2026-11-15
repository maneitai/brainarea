/**
 * Felles fixtures for rapport-selftest + demo ([BYGG] FASE 1, todo #3728/#3730).
 * RESULT_TRAIT er håndkonstruert i scoringkontrakt v1 (tests/engine/scoring.js:
 * scales[].normalized = 100*(raw-minPossible)/(maxPossible-minPossible);
 * trait.composite = vektet gjennomsnitt av normaliserte skalaer med data).
 * Kompositt-sanity: (50+75+20+37.5+90)/5 = 54.5 (like vekter) — sjekket i selftest.
 */
export const RESULT_TRAIT = {
  schemaVersion: 1, testId: 'fixture-big5', family: 'persona', lang: 'no', scoringType: 'trait',
  completed: true, expired: false, timeSpentSec: 612, answeredCount: 50, totalItems: 50, coverage: 1,
  scales: [
    { id: 'ekstroversi', weight: 1, itemsAnswered: 10, raw: 30, minPossible: 10, maxPossible: 50, normalized: 50, reversedCount: 3, itemIds: [] },
    { id: 'medmenneskelighet', weight: 1, itemsAnswered: 10, raw: 40, minPossible: 10, maxPossible: 50, normalized: 75, reversedCount: 2, itemIds: [] },
    { id: 'planlegging', weight: 1, itemsAnswered: 10, raw: 18, minPossible: 10, maxPossible: 50, normalized: 20, reversedCount: 4, itemIds: [] },
    { id: 'emosjonell-stabilitet', weight: 1, itemsAnswered: 10, raw: 25, minPossible: 10, maxPossible: 50, normalized: 37.5, reversedCount: 2, itemIds: [] },
    { id: '\u00e5penhet', weight: 1, itemsAnswered: 10, raw: 46, minPossible: 10, maxPossible: 50, normalized: 90, reversedCount: 0, itemIds: [] },
    { id: 'tom-skala', weight: 1, itemsAnswered: 0, raw: 0, minPossible: 0, maxPossible: 0, normalized: null, reversedCount: 0, itemIds: [] },
  ],
  total: { type: 'trait', composite: 54.5, norms: 'none', normsFile: null },
  notes: [{ id: 'note.trait.not-normed', no: 'Sk\u00e5r er prosent av skala-omfang, ikke persentiler \u2014 ingen normer er brukt.', en: 'Score is percent of scale range, not percentiles \u2014 no norms are applied.' }],
};
