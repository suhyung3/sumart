const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/stocks — 종목 목록
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM stocks ORDER BY sort_order, created_at').all();
  res.json(rows);
});

// POST /api/stocks — 종목 추가
router.post('/', (req, res) => {
  const { stockCode, stockName, category } = req.body;
  if (!stockCode || !stockName) {
    return res.status(400).json({ error: 'stockCode, stockName 필수' });
  }

  try {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as mx FROM stocks').get().mx || 0;
    db.prepare(
      'INSERT OR IGNORE INTO stocks (stock_code, stock_name, category, sort_order) VALUES (?, ?, ?, ?)'
    ).run(stockCode, stockName, category || '', maxOrder + 1);
    res.json({ ok: true, stockCode, stockName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stocks/search?q=삼성 — 종목 검색 (네이버)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);
  try {
    const axios = require('axios');
    const { data } = await axios.get('https://ac.stock.naver.com/ac', {
      params: { q: q.trim(), target: 'stock' },
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const filtered = (data?.items || [])
      .filter(item => (item.typeCode === 'KOSPI' || item.typeCode === 'KOSDAQ') && /^\d{6}$/.test(item.code));
    filtered.sort((a, b) => a.name.length - b.name.length);
    const items = filtered.slice(0, 8)
      .map(item => ({ code: item.code, name: item.name, market: item.typeCode }));
    res.json(items);
  } catch (err) {
    res.json([]);
  }
});

// PATCH /api/stocks/:code — 종목 카테고리 변경
router.patch('/:code', (req, res) => {
  const { category } = req.body;
  db.prepare('UPDATE stocks SET category = ? WHERE stock_code = ?').run(category || '', req.params.code);
  res.json({ ok: true });
});

// DELETE /api/stocks/:code — 종목 삭제
router.delete('/:code', (req, res) => {
  const { code } = req.params;
  db.prepare('DELETE FROM stocks WHERE stock_code = ?').run(code);
  db.prepare('DELETE FROM fundamentals WHERE stock_code = ?').run(code);
  db.prepare('DELETE FROM valuation_band WHERE stock_code = ?').run(code);
  res.json({ ok: true });
});

module.exports = router;
