# SuMart

컨센서스 펀더멘탈 대시보드 (Minervini SEPA 돌파매매 보조)

## 구조
```
sumart/
├── backend/src/
│   ├── server.js                     # Express 서버 (포트 4100)
│   ├── db.js                         # SQLite 스키마 (stocks, fundamentals, per_band)
│   ├── routes/
│   │   ├── stocks.js                 # 종목 CRUD
│   │   └── data.js                   # 대시보드 데이터, 새로고침, PER밴드
│   ├── services/
│   │   ├── fnguideService.js         # FnGuide 스크래퍼 (밸류에이션/Highlight/Trend/PER밴드)
│   │   ├── kisService.js             # KIS API (현재가, 시총 폴백)
│   │   └── calcService.js            # OPM, YoY%, PEG, EPS변화율 계산
│   └── utils/
│       └── helpers.js
└── frontend/src/
    ├── App.jsx                       # 메인 앱 (종목 추가/삭제/새로고침)
    └── components/
        ├── StockTable.jsx            # 정렬 가능한 메인 테이블
        ├── AddStockBar.jsx           # 종목 검색/추가
        ├── PerBandChart.jsx          # PER 밴드 시각화
        └── EpsRevisionBadge.jsx      # EPS 변화율 뱃지
```

## 기술 스택
- Frontend: React 18, Vite, Tailwind CSS, Recharts
- Backend: Express, SQLite (better-sqlite3)
- 포트: Backend 4100, Frontend 3100
- 배포: PM2 (`ecosystem.config.cjs`)

## 데이터 소스
- **FnGuide**: SVD_Main.asp (밸류에이션, Highlight), Consensus Trend JSON, SVD_Invest.asp (PER밴드)
- **KIS API**: 현재가/시총 폴백

## 환경변수 (.env)
- KIS_APP_KEY / KIS_APP_SECRET / KIS_ENV
- FNGUIDE_SCRAPE_ENABLED

## 빌드/실행
- 백엔드: `cd backend && npm run dev`
- 프론트엔드: `cd frontend && npm start`
- 프로덕션: `pm2 start ecosystem.config.cjs`
