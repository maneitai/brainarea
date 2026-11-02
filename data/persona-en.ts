import type { TestSpec } from "@/lib/types";

/**
 * PERSONA v1 (English) — IPIP Big-Five Factor Markers, 50 items.
 * Source: Goldberg (1992), administered via ipip.ori.org. Public domain —
 * items used verbatim (first-person form), no permission required.
 * Dimension keys and scoring direction (k) match the Norwegian spec exactly.
 * Factor 5 is called "Intellect/Imagination" by IPIP; labelled here with the
 * common Big-Five name "Openness to Experience" (noted on the page).
 */
export const personaEnSpec: TestSpec = {
  id: "persona-en",
  title: "PERSONA",
  intro:
    "50 statements about how you usually are. Answer as you actually are, not as you would like to be. Takes about 10–15 minutes.",
  disclaimer:
    "The result is an indicative self-insight tool based on average scores — not a diagnosis, not normed against the population, and not to be used alone for hiring or other important decisions. The English items are the original IPIP factor markers, but this online implementation is not psychometrically validated.",
  dimensions: [
    {
      key: "E",
      name: "Extraversion",
      high: "Often enjoys social contact and takes initiative.",
      low: "Tends to prefer quieter, less social situations.",
    },
    {
      key: "A",
      name: "Agreeableness",
      high: "Warm, considerate and interested in other people.",
      low: "More direct or skeptical in dealing with others.",
    },
    {
      key: "C",
      name: "Conscientiousness",
      high: "Structured, precise and goal-oriented at work.",
      low: "Tends to prefer flexibility and spontaneity.",
    },
    {
      key: "N",
      name: "Emotional Stability",
      high: "Often experiences calm and emotional steadiness.",
      low: "More often experiences worry, stress or mood swings.",
    },
    {
      key: "O",
      name: "Openness to Experience",
      high: "Curious, imaginative and interested in abstract ideas.",
      low: "Tends to prefer concrete, well-known approaches.",
    },
  ],
  items: [
    { id: "e1", d: "E", k: 1, t: "I am the life of the party." },
    { id: "e2", d: "E", k: -1, t: "I don't talk a lot." },
    { id: "e3", d: "E", k: 1, t: "I feel comfortable around people." },
    { id: "e4", d: "E", k: -1, t: "I keep in the background." },
    { id: "e5", d: "E", k: 1, t: "I start conversations." },
    { id: "e6", d: "E", k: -1, t: "I have little to say." },
    { id: "e7", d: "E", k: 1, t: "I talk to a lot of different people at parties." },
    { id: "e8", d: "E", k: -1, t: "I don't like to draw attention to myself." },
    { id: "e9", d: "E", k: 1, t: "I don't mind being the center of attention." },
    { id: "e10", d: "E", k: -1, t: "I am quiet around strangers." },
    { id: "a1", d: "A", k: -1, t: "I feel little concern for others." },
    { id: "a2", d: "A", k: 1, t: "I am interested in people." },
    { id: "a3", d: "A", k: -1, t: "I insult people." },
    { id: "a4", d: "A", k: 1, t: "I sympathize with others' feelings." },
    { id: "a5", d: "A", k: -1, t: "I am not interested in other people's problems." },
    { id: "a6", d: "A", k: 1, t: "I have a soft heart." },
    { id: "a7", d: "A", k: -1, t: "I am not really interested in others." },
    { id: "a8", d: "A", k: 1, t: "I take time out for others." },
    { id: "a9", d: "A", k: 1, t: "I feel others' emotions." },
    { id: "a10", d: "A", k: 1, t: "I make people feel at ease." },
    { id: "c1", d: "C", k: 1, t: "I am always prepared." },
    { id: "c2", d: "C", k: -1, t: "I leave my belongings around." },
    { id: "c3", d: "C", k: 1, t: "I pay attention to details." },
    { id: "c4", d: "C", k: -1, t: "I make a mess of things." },
    { id: "c5", d: "C", k: 1, t: "I get chores done right away." },
    { id: "c6", d: "C", k: -1, t: "I often forget to put things back in their proper place." },
    { id: "c7", d: "C", k: 1, t: "I like order." },
    { id: "c8", d: "C", k: -1, t: "I shirk my duties." },
    { id: "c9", d: "C", k: 1, t: "I follow a schedule." },
    { id: "c10", d: "C", k: 1, t: "I am exacting in my work." },
    { id: "n1", d: "N", k: -1, t: "I get stressed out easily." },
    { id: "n2", d: "N", k: 1, t: "I am relaxed most of the time." },
    { id: "n3", d: "N", k: -1, t: "I worry about things." },
    { id: "n4", d: "N", k: 1, t: "I seldom feel blue." },
    { id: "n5", d: "N", k: -1, t: "I am easily disturbed." },
    { id: "n6", d: "N", k: -1, t: "I change my mood a lot." },
    { id: "n7", d: "N", k: -1, t: "I get upset easily." },
    { id: "n8", d: "N", k: -1, t: "I have frequent mood swings." },
    { id: "n9", d: "N", k: -1, t: "I get irritated easily." },
    { id: "n10", d: "N", k: -1, t: "I often feel blue." },
    { id: "o1", d: "O", k: 1, t: "I have a rich vocabulary." },
    { id: "o2", d: "O", k: -1, t: "I have difficulty understanding abstract ideas." },
    { id: "o3", d: "O", k: 1, t: "I have a vivid imagination." },
    { id: "o4", d: "O", k: -1, t: "I am not interested in abstract ideas." },
    { id: "o5", d: "O", k: 1, t: "I have excellent ideas." },
    { id: "o6", d: "O", k: -1, t: "I do not have a good imagination." },
    { id: "o7", d: "O", k: 1, t: "I am quick to understand things." },
    { id: "o8", d: "O", k: 1, t: "I use difficult words." },
    { id: "o9", d: "O", k: 1, t: "I spend time reflecting on things." },
    { id: "o10", d: "O", k: 1, t: "I am full of ideas." },
  ],
};