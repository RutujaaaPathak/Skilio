export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

export function wordOverlap(a, b) {
  const wa = new Set(a.toLowerCase().split(/\s+/));
  const wb = new Set(b.toLowerCase().split(/\s+/));
  if (wa.size === 0 && wb.size === 0) return 1;
  const common = new Set([...wa].filter(w => wb.has(w)));
  return (2 * common.size) / (wa.size + wb.size);
}

export function combinedSimilarity(expected, recognized) {
  if (!recognized || !expected) return 0;
  const cleanExpected = expected.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const cleanRecognized = recognized.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const charSim = levenshtein(cleanExpected.toLowerCase(), cleanRecognized.toLowerCase());
  const wordSim = wordOverlap(cleanExpected, cleanRecognized);
  return Math.round(Math.max(charSim, wordSim) * 100);
}
