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

module.exports = { getPrice };
