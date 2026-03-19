/**
 * 계산 서비스 — OPM, YoY%, PEG, EPS변화율
 */

/**
 * Financial Highlight estimates에서 대시보드 데이터 계산
 * @param {Object} highlight - { estimates: [...] }
 * @param {Object} valuation - { fwdPER, pbr, marketCap }
 * @param {Object} trend - { fy1: [...], fy2: [...] }
 */
function calcFundamentals(highlight, valuation, trend) {
  const estimates = highlight?.estimates || [];
  const nowYear = new Date().getFullYear();
  const y1 = String(nowYear); // 26E
  const y2 = String(nowYear + 1); // 27E
  const y0 = String(nowYear - 1); // 25 (실적)

  const get = (year, field) => {
    const est = estimates.find(e => e.year === year);
    return est?.[field] ?? null;
  };

  // 매출/영업이익/순이익 추정치
  const rev26 = get(y1, 'revenue');
  const rev27 = get(y2, 'revenue');
  const rev25 = get(y0, 'revenue');
  const op26 = get(y1, 'operatingProfit');
  const op27 = get(y2, 'operatingProfit');
  const op25 = get(y0, 'operatingProfit');
  const ni26 = get(y1, 'netIncome');
  const ni27 = get(y2, 'netIncome');
  const ni25 = get(y0, 'netIncome');
  const eps26 = get(y1, 'eps');
  const eps27 = get(y2, 'eps');

  // YoY% 계산
  const yoy = (curr, prev) => {
    if (curr == null || prev == null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  // OPM = 영업이익 / 매출 * 100
  const opm = (op, rev) => {
    if (op == null || rev == null || rev === 0) return null;
    return (op / rev) * 100;
  };

  // PEG = FwdPER / EPS성장률
  const fwdPer = valuation?.fwdPER ?? null;
  const epsGrowth = yoy(eps27, eps26);
  const peg = (fwdPer && epsGrowth && epsGrowth > 0)
    ? fwdPer / epsGrowth
    : null;

  // ROE, Fwd PBR (Highlight에서 직접 파싱)
  const roe = get(y1, 'roe');
  const fwdPbr = get(y1, 'pbr');

  // EPS Revision (Consensus Trend에서)
  const epsRev = calcEpsRevision(trend);

  return {
    market_cap: valuation?.marketCap ?? null,
    rev_26e: rev26, rev_27e: rev27,
    rev_yoy_26: yoy(rev26, rev25), rev_yoy_27: yoy(rev27, rev26),
    op_26e: op26, op_27e: op27,
    op_yoy_26: yoy(op26, op25), op_yoy_27: yoy(op27, op26),
    ni_26e: ni26, ni_27e: ni27,
    ni_yoy_26: yoy(ni26, ni25), ni_yoy_27: yoy(ni27, ni26),
    eps_26e: eps26, eps_27e: eps27,
    opm_26e: opm(op26, rev26), opm_27e: opm(op27, rev27),
    fwd_per: fwdPer,
    fwd_pbr: fwdPbr ?? valuation?.pbr ?? null,
    peg,
    roe,
    eps_rev_1m: epsRev.rev1m,
    eps_rev_3m: epsRev.rev3m,
  };
}

/**
 * EPS Revision 계산 (FY1 기준)
 * trend.fy1 배열에서 현재 vs 1M전 / 3M전 비교
 */
function calcEpsRevision(trend) {
  const result = { rev1m: null, rev3m: null };
  if (!trend?.fy1 || trend.fy1.length < 2) return result;

  const points = trend.fy1;
  // points는 [현재, 1M전, 3M전, 6M전, 1Y전] 순서 (date 내림차순)
  // 또는 date 오름차순일 수 있으므로 정렬
  const sorted = [...points].sort((a, b) => b.date.localeCompare(a.date));

  const current = sorted[0];
  if (!current?.eps) return result;

  // 1개월 전 (인덱스 1)
  const m1 = sorted[1];
  if (m1?.eps && m1.eps !== 0) {
    result.rev1m = ((current.eps - m1.eps) / Math.abs(m1.eps)) * 100;
  }

  // 3개월 전 (인덱스 2)
  const m3 = sorted[2];
  if (m3?.eps && m3.eps !== 0) {
    result.rev3m = ((current.eps - m3.eps) / Math.abs(m3.eps)) * 100;
  }

  return result;
}

module.exports = { calcFundamentals };
