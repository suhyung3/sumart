require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { seedStocks } = require('./seed');

// 시드 데이터 자동 삽입 (DB 비어있을 때)
seedStocks(db);

const app = express();

app.use(cors({ origin: ['http://localhost:3100', 'http://localhost:5173'] }));
app.use(express.json());

// API 라우트
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/data', require('./routes/data'));
app.use('/api/tags', require('./routes/tags'));

app.get('/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 프론트엔드 정적 파일 서빙
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_DIST));
app.get(/^(?!\/api).*/, (_, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`[SuMart] http://localhost:${PORT} 실행 중`);
});
