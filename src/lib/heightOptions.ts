function buildHeightOptionsFtIn(): string[] {
  const out: string[] = [];
  for (let ft = 7; ft >= 4; ft--) {
    const startIn = ft === 7 ? 6 : 11;
    const endIn = ft === 4 ? 11 : 0;
    for (let inch = startIn; inch >= endIn; inch--) {
      out.push(`${ft} ft ${inch} in`);
    }
  }
  return out;
}

export const HEIGHT_OPTIONS_FT_IN = buildHeightOptionsFtIn() as readonly string[];

export const DEFAULT_HEIGHT_FT_IN = "5 ft 8 in";

function parseLooseHeightToInches(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;

  const canonical = t.match(/^(\d+)\s*ft\s*(\d+)\s*in$/i);
  if (canonical) {
    return parseInt(canonical[1], 10) * 12 + parseInt(canonical[2], 10);
  }

  const prime = t.match(/^(\d+)['′]\s*(\d+)["″]?$/);
  if (prime) {
    return parseInt(prime[1], 10) * 12 + parseInt(prime[2], 10);
  }

  const cm = t.match(/^(\d{2,3})\s*cm$/i);
  if (cm) {
    const n = parseInt(cm[1], 10);
    if (n < 100 || n > 250) return null;
    return Math.round(n / 2.54);
  }

  return null;
}

function inchesToCanonicalOption(totalInches: number): string | null {
  const minIn = 4 * 12 + 11;
  const maxIn = 7 * 12 + 6;
  const clamped = Math.max(minIn, Math.min(maxIn, Math.round(totalInches)));
  const ft = Math.floor(clamped / 12);
  const inch = clamped % 12;
  const key = `${ft} ft ${inch} in`;
  return HEIGHT_OPTIONS_FT_IN.includes(key) ? key : null;
}

export function coerceHeightFtIn(raw: string | null | undefined): string {
  const t = raw?.trim() ?? "";
  if (HEIGHT_OPTIONS_FT_IN.includes(t)) return t;
  const inches = parseLooseHeightToInches(t);
  if (inches === null) return DEFAULT_HEIGHT_FT_IN;
  return inchesToCanonicalOption(inches) ?? DEFAULT_HEIGHT_FT_IN;
}
