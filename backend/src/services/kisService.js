/**
 * KIS API — 현재가 + 시총 (폴백용)
 * stock-monitor kisApi.js에서 필요한 부분만 추출
 */

const axios = require('axios');

const BASE_URL_REAL = 'https://openapi.koreainvestment.com:9443';
const BASE_URL_DEMO = 'https://openapivts.koreainvestment.com:29443';

let accessToken = null;
let tokenExpiry = null;
let tokenPromise = null;

function getBaseUrl() {
  return process.env.KIS_ENV === 'demo' ? BASE_URL_DEMO : BASE_URL_REAL;
}

function getCredentials() {
  return {
    appkey: process.env.KIS_APP_KEY,
    appsecret: process.env.KIS_APP_SECRET,
  };
}

async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) return accessToken;
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const { appkey, appsecret } = getCredentials();
    if (!appkey || !appsecret) throw new Error('KIS API 키가 설정되지 않았습니다');
    const res = await axios.post(`${getBaseUrl()}/oauth2/tokenP`, {
      grant_type: 'client_credentials', appkey, appsecret,
    });
    accessToken = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    console.log('[KIS] 토큰 발급 완료');
    return accessToken;
  })().finally(() => { tokenPromise = null; });

  return tokenPromise;
}

function getHeaders(trId) {
  const { appkey, appsecret } = getCredentials();
  return {
    'content-type': 'application/json; charset=utf-8',
    authorization: `Bearer ${accessToken}`,
    appkey, appsecret, tr_id: trId,
  };
}

/**
 * 현재가 조회 (FHKST01010100)
 * 반환: { stck_prpr, hts_avls(시총, 억), ... }
 */
async function getPrice(stockCode) {
  await getAccessToken();
  const res = await axios.get(
    `${getBaseUrl()}/uapi/domestic-stock/v1/quotations/inquire-price`,
    {
      headers: getHeaders('FHKST01010100'),
      params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stockCode },
    }
  );
  return res.data.output;
}

/**
 * 현재가 + MA10/MA20 조회
 * 일봉 20일치를 가져와 MA 계산
 */
async function getPriceWithMA(stockCode) {
  await getAccessToken();

  // 현재가
  const priceRes = await axios.get(
    `${getBaseUrl()}/uapi/domestic-stock/v1/quotations/inquire-price`,
    {
      headers: getHeaders('FHKST01010100'),
      params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: stockCode },
    }
  );
  const currentPrice = parseInt(priceRes.data.output?.stck_prpr, 10) || null;

  // 일봉 (최근 20일)
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 45); // 주말/공휴일 감안 여유
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

  const chartRes = await axios.get(
    `${getBaseUrl()}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
    {
      headers: getHeaders('FHKST03010100'),
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: stockCode,
        FID_INPUT_DATE_1: fmt(from),
        FID_INPUT_DATE_2: fmt(today),
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '0',
      },
    }
  );

  const candles = (chartRes.data.output2 || [])
    .map((c) => parseInt(c.stck_clpr, 10))
    .filter((v) => v > 0);

  const ma10 = candles.length >= 10
    ? Math.round(candles.slice(0, 10).reduce((a, b) => a + b, 0) / 10)
    : null;
  const ma20 = candles.length >= 20
    ? Math.round(candles.slice(0, 20).reduce((a, b) => a + b, 0) / 20)
    : null;

  return { currentPrice, ma10, ma20 };
}

module.exports = { getPrice, getPriceWithMA };
