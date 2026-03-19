const express = require('express');
const router = express.Router();
const db = require('../db');
const { fetchFundamentals, fetchConsensusTrend, fetchValuationBand, clearCache } = require('../services/fnguideService');
const { calcFundamentals } = require('../services/calcService');
const { round } = require('../utils/helpers');

// GET /api/data/dashboard — 전체 대시보드 데이터 (밴드 포함)
router.get('/dashboard', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT f.*, s.sort_order, s.category
      FROM fundamentals f
      JOIN stocks s ON s.stock_code = f.stock_code
      ORDER BY s.category, s.sort_order, s.created_at
    `).all();

    // 밴드 데이터를 조인
    const bandStmt = db.prepare('SELECT * FROM valuation_band WHERE stock_code = ? ORDER BY year');
    const result = rows.map((row) => {
      const bands = bandStmt.all(row.stock_code);
      if (bands.length === 0) return { ...row, band: null };

      // 이상치 제거: PER 50 이상, PBR 20 이상은 실적 급감기 노이즈
      const PER_CAP = 50;
      const PBR_CAP = 20;
      const perHighs = bands.map(b => b.per_high).filter(v => v != null && v <= PER_CAP);
      const perLows = bands.map(b => b.per_low).filter(v => v != null && v <= PER_CAP);
      const pbrHighs = bands.map(b => b.pbr_high).filter(v => v != null && v <= PBR_CAP);
      const pbrLows = bands.map(b => b.pbr_low).filter(v => v != null && v <= PBR_CAP);

      return {
        ...row,
        band: {
          years: bands,
          per_5y_high: perHighs.length ? Math.max(...perHighs) : null,
          per_5y_low: perLows.length ? Math.min(...perLows) : null,
          pbr_5y_high: pbrHighs.length ? Math.max(...pbrHighs) : null,
          pbr_5y_low: pbrLows.length ? Math.min(...pbrLows) : null,
        },
      };
    });

    // 전체 데이터 중 가장 오래된 fetched_at
    const oldest = rows.reduce((min, r) => {
      if (!r.fetched_at) return min;
      return !min || r.fetched_at < min ? r.fetched_at : min;
    }, null);

    res.json({ data: result, lastUpdated: oldest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/data/refresh — 전체 or 특정 종목 새로고침
router.post('/refresh', async (req, res) => {
  try {
    const { stockCode } = req.body;
    let targets;

    if (stockCode) {
      const row = db.prepare('SELECT * FROM stocks WHERE stock_code = ?').get(stockCode);
      if (!row) return res.status(404).json({ error: '종목 없음' });
      targets = [row];
    } else {
      targets = db.prepare('SELECT * FROM stocks ORDER BY sort_order').all();
    }

    if (targets.length === 0) return res.json({ ok: true, refreshed: 0 });

    const results = [];
    for (const stock of targets) {
      try {
        const data = await refreshOne(stock.stock_code, stock.stock_name);
        results.push({ stockCode: stock.stock_code, ok: true, data });
      } catch (err) {
        console.error(`[Refresh] ${stock.stock_code} 실패:`, err.message);
        results.push({ stockCode: stock.stock_code, ok: false, error: err.message });
      }
      if (targets.length > 1) await sleep(500);
    }

    res.json({ ok: true, refreshed: results.filter(r => r.ok).length, total: targets.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/data/:code/band — 밸류에이션 밴드 (PER + PBR)
router.get('/:code/band', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM valuation_band WHERE stock_code = ? ORDER BY year'
    ).all(req.params.code);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 단일 종목 새로고침 (FnGuide 스크래핑 + 계산 + DB 저장)
 */
async function refreshOne(stockCode, stockName) {
  clearCache(stockCode);

  // 1. FnGuide 메인 (밸류에이션 + Highlight)
  const fnData = await fetchFundamentals(stockCode);
  if (!fnData) throw new Error('FnGuide 스크래핑 실패');

  // 2. Consensus Trend (EPS 변화율)
  const trend = await fetchConsensusTrend(stockCode);

  // 3. 계산
  const calc = calcFundamentals(fnData.highlight, fnData.valuation, trend);

  // 3.5. FnGuide 종가 우선 사용
  if (fnData.valuation?.currentPrice) {
    calc.current_price = fnData.valuation.currentPrice;
  }

  // 4. KIS 시총/현재가 폴백 (FnGuide에서 못 가져온 경우)
  let marketCap = calc.market_cap;
  if (!marketCap || !calc.current_price) {
    try {
      const { getPrice } = require('../services/kisService');
      const price = await getPrice(stockCode);
      if (price?.hts_avls && !marketCap) {
        marketCap = parseFloat(price.hts_avls);
      }
      if (price?.stck_prpr && !calc.current_price) {
        calc.current_price = parseInt(price.stck_prpr, 10) || null;
      }
    } catch (e) {
      console.warn(`[KIS] ${stockCode} 시총 폴백 실패:`, e.message);
    }
  }

  // 4.5. per_27e 계산 (현재가 / 27E EPS)
  if (calc.current_price && calc.eps_27e && calc.eps_27e > 0) {
    calc.per_27e = Math.round((calc.current_price / calc.eps_27e) * 10) / 10;
  }

  // 5. DB 저장 (UPSERT)
  const r = round;
  db.prepare(`
    INSERT INTO fundamentals (
      stock_code, stock_name, current_price, market_cap,
      rev_26e, rev_27e, rev_yoy_26, rev_yoy_27,
      op_26e, op_27e, op_yoy_26, op_yoy_27,
      ni_26e, ni_27e, ni_yoy_26, ni_yoy_27,
      eps_26e, eps_27e,
      opm_26e, opm_27e,
      fwd_per, fwd_pbr, peg, roe,
      eps_rev_1m, eps_rev_3m, per_27e,
      fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(stock_code) DO UPDATE SET
      stock_name=excluded.stock_name, current_price=excluded.current_price, market_cap=excluded.market_cap,
      rev_26e=excluded.rev_26e, rev_27e=excluded.rev_27e, rev_yoy_26=excluded.rev_yoy_26, rev_yoy_27=excluded.rev_yoy_27,
      op_26e=excluded.op_26e, op_27e=excluded.op_27e, op_yoy_26=excluded.op_yoy_26, op_yoy_27=excluded.op_yoy_27,
      ni_26e=excluded.ni_26e, ni_27e=excluded.ni_27e, ni_yoy_26=excluded.ni_yoy_26, ni_yoy_27=excluded.ni_yoy_27,
      eps_26e=excluded.eps_26e, eps_27e=excluded.eps_27e,
      opm_26e=excluded.opm_26e, opm_27e=excluded.opm_27e,
      fwd_per=excluded.fwd_per, fwd_pbr=excluded.fwd_pbr, peg=excluded.peg, roe=excluded.roe,
      eps_rev_1m=excluded.eps_rev_1m, eps_rev_3m=excluded.eps_rev_3m, per_27e=excluded.per_27e,
      fetched_at=excluded.fetched_at
  `).run(
    stockCode, stockName, calc.current_price || null, marketCap,
    r(calc.rev_26e), r(calc.rev_27e), r(calc.rev_yoy_26), r(calc.rev_yoy_27),
    r(calc.op_26e), r(calc.op_27e), r(calc.op_yoy_26), r(calc.op_yoy_27),
    r(calc.ni_26e), r(calc.ni_27e), r(calc.ni_yoy_26), r(calc.ni_yoy_27),
    r(calc.eps_26e), r(calc.eps_27e),
    r(calc.opm_26e), r(calc.opm_27e),
    r(calc.fwd_per), r(calc.fwd_pbr, 2), r(calc.peg, 2), r(calc.roe),
    r(calc.eps_rev_1m), r(calc.eps_rev_3m), calc.per_27e || null
  );

  // 6. 밸류에이션 밴드 저장 (PER + PBR)
  try {
    const bands = await fetchValuationBand(stockCode);
    if (bands && bands.length > 0) {
      const upsert = db.prepare(`
        INSERT INTO valuation_band (stock_code, year, price_high, price_low, per_high, per_low, pbr_high, pbr_low)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(stock_code, year) DO UPDATE SET
          price_high=excluded.price_high, price_low=excluded.price_low,
          per_high=excluded.per_high, per_low=excluded.per_low,
          pbr_high=excluded.pbr_high, pbr_low=excluded.pbr_low
      `);
      const tx = db.transaction(() => {
        for (const b of bands) {
          upsert.run(stockCode, b.year, b.price_high, b.price_low,
            r(b.per_high, 2), r(b.per_low, 2), r(b.pbr_high, 2), r(b.pbr_low, 2));
        }
      });
      tx();
    }
  } catch (e) {
    console.warn(`[Band] ${stockCode} 저장 실패:`, e.message);
  }

  return calc;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = router;
