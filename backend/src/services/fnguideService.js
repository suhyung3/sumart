/**
 * FnGuide 스크래퍼 (SuMart 전용)
 *
 * stock-monitor에서 복사 + ROE/시총/PER밴드 추가
 */

const axios = require('axios');
const cheerio = require('cheerio');

const FNGUIDE_BASE = 'https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp';
const FNGUIDE_INVEST = 'https://comp.fnguide.com/SVO2/ASP/SVD_Invest.asp';
const TIMEOUT_MS = 15000;

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

async function fetchHtml(url) {
  const { data } = await axios.get(url, { timeout: TIMEOUT_MS, headers: HEADERS });
  return data;
}

/**
 * FnGuide 메인 페이지에서 밸류에이션 + Financial Highlight 스크래핑
 */
async function fetchFundamentals(stockCode) {
  if (process.env.FNGUIDE_SCRAPE_ENABLED === 'false') return null;

  const cacheKey = `fund_${stockCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const url = `${FNGUIDE_BASE}?gicode=A${stockCode}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const valuation = extractValuation($);
    const highlight = extractHighlight($);
    const fetchedAt = new Date().toISOString();

    const result = { stockCode, valuation, highlight, fetchedAt };
    cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error(`[FnGuide] ${stockCode} 스크래핑 실패:`, err.message);
    return null;
  }
}

/**
 * Snapshot 영역: PER, 12M FwdPER, PBR, 시가총액
 */
function extractValuation($) {
  const result = {
    per: null,
    fwdPER: null,
    pbr: null,
    marketCap: null,
    dividendYield: null,
    currentPrice: null,
  };

  try {
    const snapshotDiv = $('#corp_group2').length ? $('#corp_group2') : $('body');
    const snapshotText = snapshotDiv.text();

    const perMatch = snapshotText.match(/PER\s*[\(배\)]*\s*([\d,.]+)/);
    if (perMatch) result.per = parseFloat(perMatch[1].replace(/,/g, ''));

    const fwdPerMatch = snapshotText.match(/12M\s*PER\s*([\d,.]+)/);
    if (fwdPerMatch) result.fwdPER = parseFloat(fwdPerMatch[1].replace(/,/g, ''));

    const pbrMatch = snapshotText.match(/PBR\s*[\(배\)]*\s*([\d,.]+)/);
    if (pbrMatch) result.pbr = parseFloat(pbrMatch[1].replace(/,/g, ''));

    const divMatch = snapshotText.match(/배당수익률\s*([\d,.]+)/);
    if (divMatch) result.dividendYield = parseFloat(divMatch[1].replace(/,/g, ''));

    // 시가총액 추출 (억 원)
    const mcMatch = snapshotText.match(/시가총액\s*[\(억\)]*\s*([\d,]+)/);
    if (mcMatch) result.marketCap = parseFloat(mcMatch[1].replace(/,/g, ''));

    // 종가 추출 (svdMainGrid1 영역: "종가/ 전일대비/ 수익률 208,500/ ...")
    const priceText = $('#svdMainGrid1').text();
    const priceMatch = priceText.match(/종가[\s/]*전일대비[\s/]*수익률\s*([\d,]+)/);
    if (priceMatch) result.currentPrice = parseInt(priceMatch[1].replace(/,/g, ''), 10);
  } catch (err) {
    console.error('[FnGuide] 밸류에이션 파싱 실패:', err.message);
  }

  return result;
}

/**
 * Financial Highlight (#highlight_D_Y) — 연간 재무 + ROE 파싱
 */
function extractHighlight($) {
  const estimates = [];

  try {
    const targetTable = $('#highlight_D_Y table').first();
    if (!targetTable.length) {
      console.warn('[FnGuide] #highlight_D_Y 테이블을 찾을 수 없음');
      return { estimates: [] };
    }

    const rows = targetTable.find('tr');
    if (rows.length < 3) return { estimates: [] };

    const yearPattern = /(\d{4})\/(\d{2})/;
    const yearHeaders = [];
    $(rows.eq(1)).find('td, th').each((ci, c) => {
      const text = $(c).text().trim();
      const m = text.match(yearPattern);
      if (m) {
        yearHeaders.push({
          colIdx: ci + 1,
          year: m[1],
          isEstimate: /\(E\)/.test(text),
        });
      }
    });

    if (yearHeaders.length === 0) return { estimates: [] };

    const rowData = {};
    rows.each((ri, tr) => {
      if (ri < 2) return;
      const cells = $(tr).find('td, th');
      if (cells.length < 2) return;

      const label = $(cells.eq(0)).text().trim();
      const key = mapRowLabel(label);
      if (!key) return;

      rowData[key] = {};
      yearHeaders.forEach(({ colIdx, year }) => {
        const cell = cells.eq(colIdx);
        if (!cell.length) return;
        const val = cell.text().trim().replace(/,/g, '').replace(/\s/g, '');
        const num = parseFloat(val);
        if (!isNaN(num)) rowData[key][year] = num;
      });
    });

    for (const yh of yearHeaders) {
      const { year } = yh;
      const est = { year, isEstimate: yh.isEstimate };
      if (rowData.revenue?.[year] != null) est.revenue = rowData.revenue[year];
      if (rowData.operatingProfit?.[year] != null) est.operatingProfit = rowData.operatingProfit[year];
      if (rowData.netIncome?.[year] != null) est.netIncome = rowData.netIncome[year];
      if (rowData.eps?.[year] != null) est.eps = rowData.eps[year];
      if (rowData.roe?.[year] != null) est.roe = rowData.roe[year];
      if (rowData.pbr?.[year] != null) est.pbr = rowData.pbr[year];

      if (Object.keys(est).length > 2) estimates.push(est);
    }
  } catch (err) {
    console.error('[FnGuide] Highlight 파싱 실패:', err.message);
  }

  return { estimates };
}

function mapRowLabel(label) {
  if (/^EPS/.test(label)) return 'eps';
  if (/^ROE/.test(label)) return 'roe';
  if (/^PBR/.test(label)) return 'pbr';
  if (/^매출액/.test(label)) return 'revenue';
  if (/^영업이익$/.test(label) || (/^영업이익\s/.test(label) && !/발표기준/.test(label) && !/영업이익률/.test(label))) return 'operatingProfit';
  if (/^당기순이익/.test(label)) return 'netIncome';
  if (/^지배주주순이익/.test(label)) return 'netIncome';
  return null;
}

/**
 * Consensus Trend JSON — EPS 변화 추이
 * FY1/FY2 각 5시점: 현재, 1M전, 3M전, 6M전, 1Y전
 */
async function fetchConsensusTrend(stockCode) {
  if (process.env.FNGUIDE_SCRAPE_ENABLED === 'false') return null;

  const cacheKey = `trend_${stockCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const result = {};
    for (const fy of ['FY1', 'FY2']) {
      const url = `https://comp.fnguide.com/SVO2/json/data/01_06/02_A${stockCode}_A_D_${fy}.json`;
      const { data } = await axios.get(url, {
        timeout: TIMEOUT_MS,
        headers: { ...HEADERS, Accept: 'application/json' },
      });

      const rows = data?.comp;
      if (!Array.isArray(rows) || rows.length < 2) {
        result[fy.toLowerCase()] = [];
        continue;
      }

      const header = rows[0];
      const today = header.D_1 ? new Date(header.D_1.replace(/\//g, '-')) : new Date();
      const dateOffsets = { D_1: 0, D_2: -30, D_3: -90, D_4: -180, D_5: -365 };

      const points = [];
      for (const [col, offset] of Object.entries(dateOffsets)) {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        const dateStr = d.toISOString().slice(0, 10);

        const point = { date: dateStr };
        const fieldMap = [
          [1, 'revenue'], [2, 'operatingProfit'], [3, 'netIncome'],
          [4, 'eps'], [5, 'per'], [7, 'targetPrice'],
        ];

        for (const [rowIdx, key] of fieldMap) {
          if (rows[rowIdx]) {
            const raw = String(rows[rowIdx][col] || '').replace(/,/g, '').trim();
            const num = parseFloat(raw);
            if (!isNaN(num)) point[key] = num;
          }
        }

        if (Object.keys(point).length > 1) points.push(point);
      }

      result[fy.toLowerCase()] = points;
    }

    cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error(`[FnGuide] ${stockCode} 컨센서스 추이 실패:`, err.message);
    return null;
  }
}

/**
 * PER/PBR 밴드 — SVD_Invest.asp 첫 번째 테이블 파싱
 *
 * T0 구조 (5개 연도, 각 최고/최저):
 *   R0: 헤더 연도 (2021/12, 2022/12, ...)
 *   R1: "최고 | 최저 | 최고 | 최저 | ..."
 *   R2: 주가(원) | 91,000 | 68,800 | ...
 *   R3: 시가총액 | ...
 *   R4: PER | 15.75 | 11.91 | ...
 *   R5: PBR | 2.09 | 1.58 | ...
 */
async function fetchValuationBand(stockCode) {
  if (process.env.FNGUIDE_SCRAPE_ENABLED === 'false') return null;

  const cacheKey = `vband_${stockCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const url = `${FNGUIDE_INVEST}?gicode=A${stockCode}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const tbl = $('table').eq(0);
    const rows = tbl.find('tr');
    if (rows.length < 6) return null;

    // R0에서 연도 추출
    const years = [];
    $(rows.eq(0)).find('td, th').each((ci, c) => {
      if (ci === 0) return;
      const m = $(c).text().trim().match(/(\d{4})/);
      if (m) years.push(parseInt(m[1], 10));
    });
    if (years.length === 0) return null;

    // 행 파싱 헬퍼: 최고/최저 쌍으로 추출
    const parseRow = (ri) => {
      const vals = [];
      $(rows.eq(ri)).find('td, th').each((ci, c) => {
        if (ci === 0) return;
        const v = parseFloat($(c).text().trim().replace(/,/g, ''));
        vals.push(isNaN(v) ? null : v);
      });
      // [최고, 최저, 최고, 최저, ...] → [[최고,최저], ...]
      const pairs = [];
      for (let i = 0; i < vals.length; i += 2) {
        pairs.push({ high: vals[i], low: vals[i + 1] ?? null });
      }
      return pairs;
    };

    const pricePairs = parseRow(2);
    const perPairs = parseRow(4);
    const pbrPairs = parseRow(5);

    const bands = years.map((year, i) => ({
      year,
      price_high: pricePairs[i]?.high ?? null,
      price_low: pricePairs[i]?.low ?? null,
      per_high: perPairs[i]?.high ?? null,
      per_low: perPairs[i]?.low ?? null,
      pbr_high: pbrPairs[i]?.high ?? null,
      pbr_low: pbrPairs[i]?.low ?? null,
    }));

    cache.set(cacheKey, { data: bands, ts: Date.now() });
    return bands;
  } catch (err) {
    console.error(`[FnGuide] ${stockCode} 밸류에이션 밴드 실패:`, err.message);
    return null;
  }
}

function clearCache(stockCode) {
  if (stockCode) {
    cache.delete(`fund_${stockCode}`);
    cache.delete(`trend_${stockCode}`);
    cache.delete(`vband_${stockCode}`);
  } else {
    cache.clear();
  }
}

module.exports = { fetchFundamentals, fetchConsensusTrend, fetchValuationBand, clearCache };
