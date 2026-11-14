/**
 * Brainarea i18n — NO overlay file.
 *
 * Overlay: only keys that differ from EN. Missing keys resolve via en.js
 * (see index.js). When a key equals the EN base it is still written out
 * explicitly so translators/translators-of-the-next-language see a full
 * reading of NO; the overlay property is structural (resolver), not textual.
 *
 * Same key grammar and placeholder rules as en.js. NO placeholder order
 * must match EN: {a} {b} in that sequence.
 */
export const LANG = 'no';
export const KEYS = {
  ui: {
    'next': 'Neste',
    'finish': 'Fullfør og vis resultat',
    'questionOf': 'Spørsmål {a} av {b}',
    'timeLeft': 'Tid igjen',
    'timeUsed': 'Tid brukt',
    'timeExpired': 'Tiden er ute — dine svar er lagret.',
    'orderHint': 'Sett elementene i riktig rekkefølge:',
    'orderSelect': 'Velg et element, bruk pil-knappene for å flytte.',
    'progressLabel': 'Testfremgang',
    'resume': 'Avbrutt økt funnet: {a}/{b} besvarte spørsmål. Fortsetter automatisk der du slapp. Kan avsluttes nedenfor.',
    'resumeQuit': 'Avslutt økten nå',
    'resumeBye': 'Økten er lagret på denne enheten — fortsett senere.',
  },
  note: {
    'trait.not-normed': 'Skår er prosent av skala-omfang, ikke persentiler — ingen normer er brukt.',
    'threshold.screening': 'Screening, ikke diagnose — disclaimer-id gjengis på resultatsiden.',
    'gscore.not-normed': 'Kun råtrekk og theta (1PL over item-difficulty—placeholder verdier før kalibrering). IQ-skala (M=100, SD=15) krever normdata: ikke et IQ-tall. Gjenoppgitt ikke-kortest mulig intervall i theta-metrikken.',
  },
  aria: {
    'orderMoveUp': 'flytt {a} opp',
    'orderMoveDown': 'flytt {a} ned',
  },
};
