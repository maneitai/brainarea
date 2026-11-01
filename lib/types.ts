export type Item = {
  id: string;
  d: string; // dimensjonsnøkkel
  k: 1 | -1; // scoringsretning: 1 = positivt formulert, -1 = revers
  t: string; // utsagn
};

export type Dimension = {
  key: string;
  name: string;
  high: string;
  low: string;
};

export type TestSpec = {
  id: string;
  title: string;
  intro: string;
  disclaimer: string;
  items: Item[];
  dimensions: Dimension[];
};

export type DimensionResult = {
  key: string;
  name: string;
  mean: number; // 1–5
  pct: number; // 0–100
  high: string;
  low: string;
};

export type Likert = 1 | 2 | 3 | 4 | 5;