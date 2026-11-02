// Short tests (Relationships + Play) — English specs on the shared Likert engine.
import type { TestSpec } from "@/lib/types";

export const samspillSpecEn: TestSpec = {
  id: "samspill-en",
  title: "Connection style",
  intro:
    "16 statements about how you function in close relationships — friendships and partnerships. Takes about four minutes.",
  disclaimer:
    "Indicative self-insight tool based on average scores — not a diagnosis or a professional relationship assessment.",
  dimensions: [
    { key: "NER", name: "Closeness", high: "You let people close and are comfortable with closeness.", low: "You keep some distance even from people you love." },
    { key: "AAP", name: "Openness", high: "You talk about feelings and needs.", low: "You keep feelings and needs to yourself." },
    { key: "KON", name: "Conflict handling", high: "You address disagreements directly and follow up afterwards.", low: "You step away from conflict and leave things unsaid." },
    { key: "SEL", name: "Independence", high: "You keep your own interests and opinions in relationships.", low: "Your plans bend strongly toward the people you are close to." },
  ],
  items: [
    { id: "ne1", d: "NER", k: 1, t: "I am comfortable when people get close to me." },
    { id: "ne2", d: "NER", k: -1, t: "I keep some distance even from people I love." },
    { id: "ne3", d: "NER", k: 1, t: "It is easy for me to trust the people I care about." },
    { id: "ne4", d: "NER", k: -1, t: "When someone becomes very fond of me, I often start pulling away." },
    { id: "aa1", d: "AAP", k: 1, t: "I speak up when something bothers me in a relationship." },
    { id: "aa2", d: "AAP", k: -1, t: "I keep my feelings to myself to avoid problems." },
    { id: "aa3", d: "AAP", k: 1, t: "I ask people how they are doing, and I mean it." },
    { id: "aa4", d: "AAP", k: -1, t: "I rarely manage to put words on what I need from others." },
    { id: "ko1", d: "KON", k: 1, t: "When we disagree, I raise it directly instead of letting it sit." },
    { id: "ko2", d: "KON", k: -1, t: "I withdraw from discussions rather than standing in them." },
    { id: "ko3", d: "KON", k: 1, t: "After conflicts I follow up and repair things." },
    { id: "ko4", d: "KON", k: -1, t: "I avoid stating my opinion if it might create disagreement." },
    { id: "se1", d: "SEL", k: 1, t: "I keep my own interests even when the people close to me do not share them." },
    { id: "se2", d: "SEL", k: -1, t: "My plans bend completely after the people I am close to." },
    { id: "se3", d: "SEL", k: 1, t: "I do not need others' approval to have an opinion." },
    { id: "se4", d: "SEL", k: -1, t: "I find it hard to hold a different view from the people around me." },
  ],
};

export const arbeidsstilSpecEn: TestSpec = {
  id: "arbeidsstil-en",
  title: "Work style",
  intro:
    "12 statements about how you work — structure, drive, collaboration and independence. Takes about three minutes.",
  disclaimer:
    "Indicative self-insight tool — does not replace a professional job analysis or an employer's assessment.",
  dimensions: [
    { key: "STR", name: "Structure", high: "You plan and finish systematically.", low: "You work more loosely and in bursts." },
    { key: "DRI", name: "Drive", high: "You take initiative and hold pace over time.", low: "You get started when others ask, or when pressure builds." },
    { key: "SAM", name: "Collaboration", high: "You enjoy contributing in a team.", low: "You prefer working alone from start to finish." },
    { key: "UAS", name: "Independence", high: "You bring your own solutions and handle responsibility without close supervision.", low: "You follow instructions and wait for directions." },
  ],
  items: [
    { id: "s1", d: "STR", k: 1, t: "I plan my work before I start." },
    { id: "s2", d: "STR", k: -1, t: "I start tasks late and often end up under time pressure." },
    { id: "s3", d: "STR", k: 1, t: "I finish what I begin." },
    { id: "s4", d: "DRI", k: 1, t: "I take on new tasks without being asked." },
    { id: "s5", d: "DRI", k: -1, t: "I tend to wait until someone else gets things going." },
    { id: "s6", d: "DRI", k: 1, t: "I find it easy to keep up the pace over time." },
    { id: "s7", d: "SAM", k: 1, t: "I work best when we solve things together." },
    { id: "s8", d: "SAM", k: -1, t: "I prefer working alone from start to finish." },
    { id: "s9", d: "SAM", k: 1, t: "I share knowledge freely with people on the team." },
    { id: "s10", d: "UAS", k: 1, t: "I bring my own solutions instead of waiting for instructions." },
    { id: "s11", d: "UAS", k: -1, t: "I follow instructions exactly even when I see a better way." },
    { id: "s12", d: "UAS", k: 1, t: "I am comfortable with responsibility without close supervision." },
  ],
};

export const pressSpecEn: TestSpec = {
  id: "press-en",
  title: "Under pressure",
  intro:
    "10 statements about how you react when things heat up — calm, endurance and recovery. Takes about two and a half minutes.",
  disclaimer:
    "Indicative self-insight tool — not a stress or health assessment.",
  dimensions: [
    { key: "RO", name: "Calm", high: "You keep overview when several things happen at once.", low: "You lose overview when several things happen at once." },
    { key: "UT", name: "Endurance", high: "You hold steady under sustained pressure.", low: "You struggle for a long time before things ease." },
    { key: "RES", name: "Recovery", high: "You bounce back quickly after setbacks.", low: "You need a long time to gather yourself after setbacks." },
  ],
  items: [
    { id: "q1", d: "RO", k: 1, t: "I keep a clear head when several things happen at once." },
    { id: "q2", d: "RO", k: -1, t: "When my plans collapse, I lose overview." },
    { id: "q3", d: "RO", k: 1, t: "I keep a courteous tone even when things heat up." },
    { id: "q4", d: "RO", k: -1, t: "Small obstacles can ruin my whole day." },
    { id: "q5", d: "UT", k: 1, t: "I hold steady under sustained pressure." },
    { id: "q6", d: "UT", k: -1, t: "I give up quickly when pressure builds." },
    { id: "q7", d: "UT", k: 1, t: "The more pressure, the more focus I get." },
    { id: "q8", d: "RES", k: 1, t: "I bounce back quickly after setbacks." },
    { id: "q9", d: "RES", k: -1, t: "I need a long time to get over mistakes and setbacks." },
    { id: "q10", d: "RES", k: 1, t: "I know how to get my energy back." },
  ],
};

export const kreativSpecEn: TestSpec = {
  id: "kreativ-en",
  title: "Creativity profile",
  intro:
    "10 statements about how ideas arise and take shape for you. Takes about two and a half minutes.",
  disclaimer:
    "Indicative self-insight tool — not a creativity measure or an ability test.",
  dimensions: [
    { key: "IDE", name: "Idea flow", high: "Ideas often come to you without effort.", low: "New thoughts rarely come on their own." },
    { key: "EXP", name: "Experimenting", high: "You like trying new tools, methods and combinations.", low: "You stick with what already works." },
    { key: "FIN", name: "Follow-through", high: "You carry ideas through to something concrete.", low: "Your ideas rarely become finished things." },
  ],
  items: [
    { id: "k1", d: "IDE", k: 1, t: "Ideas often come to me without effort." },
    { id: "k2", d: "IDE", k: -1, t: "I struggle to come up with new ways of doing things." },
    { id: "k3", d: "IDE", k: 1, t: "I see connections others do not see." },
    { id: "k4", d: "EXP", k: 1, t: "I like trying new tools and methods." },
    { id: "k5", d: "EXP", k: -1, t: "I stick to what works from before." },
    { id: "k6", d: "EXP", k: 1, t: "I like combining things that do not normally go together." },
    { id: "k7", d: "FIN", k: 1, t: "I carry my ideas through to something concrete." },
    { id: "k8", d: "FIN", k: -1, t: "My ideas rarely become finished things." },
    { id: "k9", d: "FIN", k: 1, t: "I finish creative projects I start." },
  ],
};