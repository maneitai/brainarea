// Korte tester (Relasjoner + Play) — norske specs på felles Likert-motor.
import type { TestSpec } from "@/lib/types";

export const samspillSpec: TestSpec = {
  id: "samspill",
  title: "Samspill",
  intro:
    "16 utsagn om hvordan du fungerer i nære relasjoner — vennskap og samliv. Tar rundt fire minutter.",
  disclaimer:
    "Indikativt selvinnsikt-verktøy basert på gjennomsnittskår — ikke en diagnose eller profesjonell relasjonsvurdering.",
  dimensions: [
    { key: "NER", name: "Nærhet", high: "Kommer folk nær, og trives med nærhet.", low: "Holder en viss avstand selv til folk du er glad i." },
    { key: "AAP", name: "Åpenhet", high: "Snakker ut om følelser og behov.", low: "Holder følelser og behov for deg selv." },
    { key: "KON", name: "Konflikthåndtering", high: "Møter uenighet direkte og følger opp etterpå.", low: "Viker unna for konflikt og later ting ligge." },
    { key: "SEL", name: "Selvstendighet", high: "Beholder egne interesser og meninger i relasjoner.", low: "Planene og meningene dine legger seg sterkt etter andre." },
  ],
  items: [
    { id: "ne1", d: "NER", k: 1, t: "Jeg trives når noen kommer meg nær." },
    { id: "ne2", d: "NER", k: -1, t: "Jeg holder en viss avstand selv til folk jeg er glad i." },
    { id: "ne3", d: "NER", k: 1, t: "Det er enkelt for meg å stole på de jeg er glad i." },
    { id: "ne4", d: "NER", k: -1, t: "Når noen blir veldig glade i meg, begynner jeg ofte å trekke meg litt unna." },
    { id: "åp1", d: "AAP", k: 1, t: "Jeg sier ifra når noe plager meg i en relasjon." },
    { id: "åp2", d: "AAP", k: -1, t: "Jeg holder mine følelser for meg selv for å unngå problemer." },
    { id: "åp3", d: "AAP", k: 1, t: "Jeg spør hvordan folk har det, og mener det." },
    { id: "åp4", d: "AAP", k: -1, t: "Jeg klarer sjelden å sette ord på hva jeg trenger fra andre." },
    { id: "ko1", d: "KON", k: 1, t: "Når vi er uenige, tar jeg det opp direkte i stedet for å la det ligge." },
    { id: "ko2", d: "KON", k: -1, t: "Jeg trekker meg fra diskusjoner heller enn å stå i dem." },
    { id: "ko3", d: "KON", k: 1, t: "Etter konflikter følger jeg opp og retter opp ting." },
    { id: "ko4", d: "KON", k: -1, t: "Jeg unngår å si min mening hvis det kan skape uenighet." },
    { id: "se1", d: "SEL", k: 1, t: "Jeg holder på egne interesser selv om de jeg er nær ikke deler dem." },
    { id: "se2", d: "SEL", k: -1, t: "Mine planer legger seg helt etter de jeg er nær." },
    { id: "se3", d: "SEL", k: 1, t: "Jeg trenger ikke andres godkjenning for å mene noe." },
    { id: "se4", d: "SEL", k: -1, t: "Jeg har vanskelig for å mene noe annerledes enn folk rundt meg." },
  ],
};

export const arbeidsstilSpec: TestSpec = {
  id: "arbeidsstil",
  title: "Arbeidsstil",
  intro:
    "12 utsagn om hvordan du arbeider — struktur, drivkraft, samarbeid og selvstendighet. Tar rundt tre minutter.",
  disclaimer:
    "Indikativt selvinnsikt-verktøy — erstatter ikke en profesjonell jobbanalyse eller arbeidsgivers vurdering.",
  dimensions: [
    { key: "STR", name: "Struktur", high: "Planlegger og fullfører systematisk.", low: "Arbeider mer løst og i rykk." },
    { key: "DRI", name: "Drivkraft", high: "Tar initiativ og holder tempo over tid.", low: "Setter i gang når andre ber, eller når presset kommer." },
    { key: "SAM", name: "Samarbeid", high: "Trives og bidrar i team.", low: "Foretrekker å jobbe alene fra start til slutt." },
    { key: "UAS", name: "Selvstendighet", high: "Kommer med egne løsninger og tåler ansvar uten tett oppfølging.", low: "Følger instrukser og venter på beskjed." },
  ],
  items: [
    { id: "w1", d: "STR", k: 1, t: "Jeg planlegger arbeidet mitt før jeg starter." },
    { id: "w2", d: "STR", k: -1, t: "Jeg starter oppgaver sent og ender ofte opp i tidspress." },
    { id: "w3", d: "STR", k: 1, t: "Jeg fullfører det jeg begynner på." },
    { id: "w4", d: "DRI", k: 1, t: "Jeg tar fatt på nye oppgaver uten å bli bedt om det." },
    { id: "w5", d: "DRI", k: -1, t: "Jeg venter gjerne til noen andre setter i gang." },
    { id: "w6", d: "DRI", k: 1, t: "Jeg har lett for å holde tempoet oppe over tid." },
    { id: "w7", d: "SAM", k: 1, t: "Jeg trives best når vi løser ting sammen." },
    { id: "w8", d: "SAM", k: -1, t: "Jeg foretrekker å jobbe alene fra start til slutt." },
    { id: "w9", d: "SAM", k: 1, t: "Jeg deler kunnskap fritt med folk på teamet." },
    { id: "w10", d: "UAS", k: 1, t: "Jeg kommer med egne løsninger i stedet for å vente på beskjed." },
    { id: "w11", d: "UAS", k: -1, t: "Jeg følger instrukser nøyaktig selv når jeg ser en bedre vei." },
    { id: "w12", d: "UAS", k: 1, t: "Jeg trives med ansvar uten tett oppfølging." },
  ],
};

export const pressSpec: TestSpec = {
  id: "press",
  title: "Under press",
  intro:
    "10 utsagn om hvordan du reagerer når det koker — ro, utholdenhet og restitusjon. Tar rundt to og en halv minutter.",
  disclaimer:
    "Indikativt selvinnsikt-verktøy — ikke en stress- eller helsevurdering.",
  dimensions: [
    { key: "RO", name: "Sinnsro", high: "Beholder oversikten når ting skjer samtidig.", low: "Mister oversikten når ting skjer samtidig." },
    { key: "UT", name: "Utholdenhet", high: "Holder stand under langvarig press.", low: "Sliter lenge før ting løsner." },
    { key: "RES", name: "Restitusjon", high: "Kommer raskt tilbake etter tilbakeslag.", low: "Trenger lang tid på å samle deg etter motgang." },
  ],
  items: [
    { id: "p1", d: "RO", k: 1, t: "Jeg beholder hodet klart når ting skjer samtidig." },
    { id: "p2", d: "RO", k: -1, t: "Når planene mine raser, mister jeg oversikten." },
    { id: "p3", d: "RO", k: 1, t: "Jeg holder tonen høflig selv når det koker." },
    { id: "p4", d: "RO", k: -1, t: "Små hindringer kan ødelegge hele dagen min." },
    { id: "p5", d: "UT", k: 1, t: "Jeg holder stand under langvarig press." },
    { id: "p6", d: "UT", k: -1, t: "Jeg gir opp fort når presset kommer." },
    { id: "p7", d: "UT", k: 1, t: "Jo mer press, jo mer fokus får jeg." },
    { id: "p8", d: "RES", k: 1, t: "Jeg kommer raskt tilbake etter tilbakeslag." },
    { id: "p9", d: "RES", k: -1, t: "Jeg trenger lang tid før jeg kommer over feil og motgang." },
    { id: "p10", d: "RES", k: 1, t: "Jeg vet hvordan jeg henter energien min tilbake." },
  ],
};

export const kreativSpec: TestSpec = {
  id: "kreativ",
  title: "Kreativ profil",
  intro:
    "10 utsagn om hvordan idéer oppstår og blir til noe hos deg. Tar rundt to og en halv minutter.",
  disclaimer:
    "Indikativt selvinnsikt-verktøy — ikke et kreativitetsmål eller en evnetest.",
  dimensions: [
    { key: "IDE", name: "Idéflyt", high: "Får ofte idéer uten å prøve.", low: "Nye tanker kommer sjelden av seg selv." },
    { key: "EXP", name: "Eksperimentering", high: "Prøver gjerne nye verktøy, metoder og kombinasjoner.", low: "Holder deg til det som fungerer fra før." },
    { key: "FIN", name: "Fokusering", high: "Følger opp idéene til noe konkret.", low: "Idéene sjelden blir til noe ferdig." },
  ],
  items: [
    { id: "c1", d: "IDE", k: 1, t: "Jeg får ofte idéer uten å prøve." },
    { id: "c2", d: "IDE", k: -1, t: "Jeg sliter med å komme på nye måter å gjøre ting på." },
    { id: "c3", d: "IDE", k: 1, t: "Jeg ser sammenhenger andre ikke ser." },
    { id: "c4", d: "EXP", k: 1, t: "Jeg prøver gjerne nye verktøy og metoder." },
    { id: "c5", d: "EXP", k: -1, t: "Jeg holder meg til det som fungerer fra før." },
    { id: "c6", d: "EXP", k: 1, t: "Jeg kombinerer gjerne ting som vanligvis ikke hører sammen." },
    { id: "c7", d: "FIN", k: 1, t: "Jeg følger opp idéene mine til noe konkret." },
    { id: "c8", d: "FIN", k: -1, t: "Idéene mine blir sjelden til noe ferdig." },
    { id: "c9", d: "FIN", k: 1, t: "Jeg fullfører kreative prosjekter jeg starter på." },
  ],
};