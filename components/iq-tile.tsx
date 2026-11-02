"use client";

import type { TileDesc } from "@/lib/iq-engine";

export function polygonPoints(sides: number, rot: number, cx = 40, cy = 38, r = 20): string {
  const pts: string[] = [];
  for (let k = 0; k < sides; k++) {
    const a = ((rot - 90 + (k * 360) / sides) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

const QUAD: [string, string, string, string][] = [
  ["40", "18", "20", "20"], // TR clockwise first
  ["40", "38", "20", "20"], // BR
  ["20", "38", "20", "20"], // BL
  ["20", "18", "20", "20"], // TL
];

export function Tile({ d, size = 80 }: { d: TileDesc; size?: number }) {
  const filled = Math.max(0, Math.min(4, d.fillQ));
  const dx = 26 + ((d.pos >= 0 ? d.pos : 0) % 3) * 14;
  const dy = 24 + Math.floor(Math.max(0, d.pos) / 3) * 14;
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} role="img" aria-hidden="true">
      {d.sides === 3 && (
        <polygon points={polygonPoints(3, d.rot)} fill="none" stroke="var(--ba-accent)" strokeWidth={3} strokeLinejoin="round" />
      )}
      {d.sides === 4 && (
        <polygon points={polygonPoints(4, d.rot)} fill="none" stroke="var(--ba-accent)" strokeWidth={3} strokeLinejoin="round" />
      )}
      {d.sides === 5 && (
        <polygon points={polygonPoints(5, d.rot)} fill="none" stroke="var(--ba-accent)" strokeWidth={3} strokeLinejoin="round" />
      )}
      {d.sides === 7 && (
        <polygon points={polygonPoints(7, d.rot)} fill="none" stroke="var(--ba-accent)" strokeWidth={3} strokeLinejoin="round" />
      )}
      {d.sides === 6 && (
        <polygon points={polygonPoints(6, d.rot)} fill="none" stroke="var(--ba-accent)" strokeWidth={3} strokeLinejoin="round" />
      )}
      {Array.from({ length: filled }).map((_, i) => (
        <rect key={`q${i}`} x={QUAD[i][0]} y={QUAD[i][1]} width={QUAD[i][2]} height={QUAD[i][3]} fill="var(--ba-accent)" opacity={0.35} />
      ))}
      {d.dots > 0 &&
        Array.from({ length: Math.min(d.dots, 6) }).map((_, i) => (
          <circle key={`d${i}`} cx={30 + (i % 3) * 10} cy={62 + Math.floor(i / 3) * 8} r={2.6} fill="var(--ba-accent)" />
        ))}
      {d.pos >= 0 && <circle cx={dx} cy={dy} r={3.2} fill="var(--ba-accent)" />}
    </svg>
  );
}