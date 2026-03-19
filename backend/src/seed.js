/**
 * 종목 시드 데이터 — 배포 시 자동 복구용
 */
const SEED_STOCKS = [
  // 성장주
  { code: '005930', name: '삼성전자', category: '성장주' },
  { code: '000660', name: 'SK하이닉스', category: '성장주' },
  { code: '009150', name: '삼성전기', category: '성장주' },
  { code: '003230', name: '삼양식품', category: '성장주' },
  { code: '071055', name: '한국금융지주우', category: '성장주' },
  { code: '039490', name: '키움증권', category: '성장주' },
  { code: '006800', name: '미래에셋증권', category: '성장주' },
  { code: '298040', name: '효성중공업', category: '성장주' },
  { code: '267260', name: 'HD현대일렉트릭', category: '성장주' },
  { code: '012450', name: '한화에어로스페이스', category: '성장주' },
  // 꿈주식
  { code: '174900', name: '앱클론', category: '꿈주식' },
  { code: '126340', name: '비나텍', category: '꿈주식' },
  { code: '101490', name: '에스앤에스텍', category: '꿈주식' },
  { code: '263750', name: '펄어비스', category: '꿈주식' },
  { code: '108490', name: '로보티즈', category: '꿈주식' },
  { code: '138080', name: '오이솔루션', category: '꿈주식' },
  { code: '277810', name: '레인보우로보틱스', category: '꿈주식' },
  { code: '475830', name: '오름테라퓨틱', category: '꿈주식' },
  { code: '218410', name: 'RFHIC', category: '꿈주식' },
  { code: '124500', name: '아이티센글로벌', category: '꿈주식' },
  { code: '327260', name: 'RF머트리얼즈', category: '꿈주식' },
  { code: '322000', name: 'HD현대에너지솔루션', category: '꿈주식' },
];

function seedStocks(db) {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM stocks').get().cnt;
  if (count > 0) return;

  console.log('[Seed] 종목 시드 데이터 삽입 중...');
  const insert = db.prepare(
    'INSERT OR IGNORE INTO stocks (stock_code, stock_name, category, sort_order) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    SEED_STOCKS.forEach((s, i) => insert.run(s.code, s.name, s.category, i + 1));
  });
  tx();
  console.log(`[Seed] ${SEED_STOCKS.length}개 종목 삽입 완료`);
}

module.exports = { seedStocks, SEED_STOCKS };
