/**
 * Brainarea i18n — EN base file.
 * Key file structure ([BYGG] FASE 1, todo #3716 "i18n-nøkkelfil-struktur — EN=base, NO=overlay").
 *
 * EN is the base: this object MUST stay complete at all times. Every other
 * language file (no.js, later de.js) is an OVERLAY: missing keys resolve
 * through this file. Resolution order (see index.js): overlay key -> EN key -> key itself.
 *
 * Key grammar: "<namespace>.<name>" where namespace is one of:
 *   ui    — engine UI strings (render.js BASE_DICT is generated from here)
 *   note  — scoring notes (scoring.js pushNote texts are generated from here;
 *           note.id matches result.notes[].id)
 *   aria  — accessibility labels for synthesised controls (render.js order-move buttons)
 * Adding a namespace is a spec-contract change (schema/i18n/_key-spec.schema.json).
 *
 * Placeholders {a} {b} are positional; their order is FIXED by this EN file.
 * Translations must not reorder placeholders.
 * No HTML, no concatenation in code — full sentences only.
 */
export const LANG = 'en';
export const KEYS = {
  ui: {
    'next': 'Next',
    'finish': 'Finish and show result',
    'questionOf': 'Question {a} of {b}',
    'timeLeft': 'Time left',
    'timeUsed': 'Time used',
    'timeExpired': 'Time is up — your answers have been saved.',
    'orderHint': 'Put the elements in the correct order:',
    'orderSelect': 'Select an element, use the arrow buttons to move it.',
    'progressLabel': 'Test progress',
    'resume': 'Interrupted session found: {a}/{b} answered questions. Continuing automatically where you left off. Can be ended below.',
    'resumeQuit': 'End the session now',
    'resumeBye': 'Session is saved on this device — continue later.',
  },
  note: {
    'trait.not-normed': 'Score is percent of scale range, not percentiles — no norms are applied.',
    'threshold.screening': 'Screening, not diagnosis — disclaimer id is rendered on the result page.',
    'gscore.not-normed': 'Raw count and theta only (1PL over placeholder item difficulties). Not an IQ number — the z100 metric requires norm data from the normering endpoint.',
  },
  aria: {
    'orderMoveUp': 'move {a} up',
    'orderMoveDown': 'move {a} down',
  },
};
