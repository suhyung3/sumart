const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tags — 전체 태그 목록 (사용 중인 태그만)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT tag FROM stock_tags ORDER BY tag').all();
  res.json(rows.map(r => r.tag));
});

// GET /api/tags/:code — 특정 종목의 태그
router.get('/:code', (req, res) => {
  const rows = db.prepare('SELECT tag FROM stock_tags WHERE stock_code = ?').all(req.params.code);
  res.json(rows.map(r => r.tag));
});

// POST /api/tags/:code — 종목에 태그 추가
router.post('/:code', (req, res) => {
  const { tag } = req.body;
  if (!tag || !tag.trim()) return res.status(400).json({ error: 'tag 필수' });
  const trimmed = tag.trim();
  db.prepare('INSERT OR IGNORE INTO stock_tags (stock_code, tag) VALUES (?, ?)').run(req.params.code, trimmed);
  res.json({ ok: true });
});

// DELETE /api/tags/:code/:tag — 종목에서 태그 제거
router.delete('/:code/:tag', (req, res) => {
  db.prepare('DELETE FROM stock_tags WHERE stock_code = ? AND tag = ?').run(req.params.code, decodeURIComponent(req.params.tag));
  res.json({ ok: true });
});

module.exports = router;
