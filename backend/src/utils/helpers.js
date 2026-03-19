/**
 * 숫자 안전 파싱 (null/NaN → null)
 */
function safeNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 소수점 반올림 (null 통과)
 */
function round(v, decimals = 1) {
  if (v == null) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(v * factor) / factor;
}

module.exports = { safeNum, round };
