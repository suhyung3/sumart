/**
 * 숫자 포맷 유틸리티
 */

export function fmtNum(v, decimals = 0) {
  if (v == null || isNaN(v)) return '-';
  return Number(v).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(v, decimals = 1) {
  if (v == null || isNaN(v)) return '-';
  const prefix = v > 0 ? '+' : '';
  return `${prefix}${Number(v).toFixed(decimals)}%`;
}

export function fmtPer(v) {
  if (v == null || isNaN(v)) return '-';
  return Number(v).toFixed(1);
}

export function pctColor(v) {
  if (v == null) return 'text-gray-500';
  if (v > 0) return 'text-red-400';
  if (v < 0) return 'text-blue-400';
  return 'text-gray-400';
}
