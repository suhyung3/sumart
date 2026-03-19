import { fmtNum, fmtPct, fmtPer, pctColor } from '../utils/format';
import PerCompareChart from './PerCompareChart';
import PbrCompareChart from './PbrCompareChart';

const ROWS = [
  { key: 'op_26e', label: "영익 26E", fmt: (v) => fmtNum(v) },
  { key: 'op_27e', label: "영익 27E", fmt: (v) => fmtNum(v) },
  { key: 'opm_26e', label: 'OPM 26E', fmt: (v) => v != null ? `${v.toFixed(1)}%` : '-' },
  { key: 'opm_27e', label: 'OPM 27E', fmt: (v) => v != null ? `${v.toFixed(1)}%` : '-' },
  { key: 'fwd_per', label: 'Fwd PER', fmt: (v) => fmtPer(v) },
  { key: 'per_pos', label: 'PER 위치', type: 'position_per' },
  { key: 'fwd_pbr', label: 'Fwd PBR', fmt: (v) => fmtPer(v) },
  { key: 'pbr_pos', label: 'PBR 위치', type: 'position_pbr' },
  { key: 'peg', label: 'PEG', fmt: (v) => fmtPer(v), colorFn: pegColor },
  { key: 'eps_rev_1m', label: 'EPS Rev 1M', fmt: (v) => fmtPct(v), color: true },
  { key: 'eps_rev_3m', label: 'EPS Rev 3M', fmt: (v) => fmtPct(v), color: true },
  { key: 'div_rr', type: 'divider', label: '진입 손익비' },
  { key: 'rr_target', label: '목표가', type: 'rr_target' },
  { key: 'rr_stop', label: '손절가', type: 'rr_stop' },
  { key: 'rr_ratio', label: 'R:R', type: 'rr_ratio' },
];

// 밴드 내 위치 계산 (0~100)
function bandPosition(current, low, high) {
  if (current == null || low == null || high == null || high === low) return null;
  const pos = ((current - low) / (high - low)) * 100;
  return Math.round(Math.max(0, Math.min(100, pos)));
}

function posColor(pos) {
  if (pos == null) return 'text-gray-500';
  if (pos <= 25) return 'text-green-400';
  if (pos <= 50) return 'text-yellow-400';
  if (pos <= 75) return 'text-orange-400';
  return 'text-red-400';
}

// 손익비 계산
function calcRiskReward(s) {
  const price = s.current_price;
  const perHigh = s.band?.per_5y_high;
  const eps = s.eps_26e;
  if (!price || !perHigh || !eps || eps <= 0) return { target: null, stop: null, rr: null };

  const target = Math.round(perHigh * eps);
  const stop = Math.round(price * 0.9);
  const risk = price - stop;
  const rr = risk > 0 ? Math.round(((target - price) / risk) * 100) / 100 : null;
  return { target, stop, rr };
}

function rrColor(rr) {
  if (rr == null) return 'text-gray-500';
  if (rr >= 3) return 'text-green-400';
  if (rr >= 2) return 'text-yellow-400';
  return 'text-red-400';
}

function fmtPrice(v) {
  if (v == null) return '-';
  return v.toLocaleString();
}

function fmtRR(v) {
  if (v == null) return '-';
  return `${v.toFixed(1)} : 1`;
}

export default function SimpleView({ data }) {
  const byMcap = (a, b) => (b.market_cap || 0) - (a.market_cap || 0);
  const growth = data.filter((d) => d.category === '성장주').sort(byMcap);
  const dream = data.filter((d) => d.category === '꿈주식').sort(byMcap);
  const etc = data.filter((d) => !d.category || (d.category !== '성장주' && d.category !== '꿈주식')).sort(byMcap);

  return (
    <div className="space-y-8">
      {growth.length > 0 && <Section title="성장주" subtitle="실적 두 자릿수 성장" stocks={growth} />}
      {dream.length > 0 && <Section title="꿈주식" subtitle="미래 실적 기반 밸류에이션" stocks={dream} />}
      {etc.length > 0 && <Section title="미분류" stocks={etc} />}
      <p className="text-[10px] text-gray-600 mt-4">
        * PER/PBR 위치: 5년 밴드 내 Fwd 값의 백분위 (0=역대 최저, 100=역대 최고). PER 50x 이상, PBR 20x 이상 이상치 제거.
        <br />* 손익비: 목표가=PER밴드 5Y 상단×26E EPS, 손절가=현재가×0.9. R:R ≥3 초록, ≥2 노랑, &lt;2 빨강.
      </p>
    </div>
  );
}

function Section({ title, subtitle, stocks }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
        <span className="text-xs text-gray-600">{stocks.length}종목</span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-3 py-2 text-left text-gray-500 font-medium w-24 min-w-[96px]" />
              {stocks.map((s) => (
                <th key={s.stock_code} className="px-3 py-2 text-center font-medium text-white whitespace-nowrap min-w-[80px]">
                  {s.stock_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              // 구분선
              if (row.type === 'divider') {
                return (
                  <tr key={row.key} className="border-t border-gray-600">
                    <td className="px-3 py-2 text-left text-gray-300 font-bold whitespace-nowrap text-[11px]" colSpan={stocks.length + 1}>
                      {row.label}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={row.key} className={`${ri % 2 === 0 ? 'bg-gray-900/30' : ''} hover:bg-gray-800/50`}>
                  <td className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                    {row.label}
                  </td>
                  {stocks.map((s) => {
                    if (row.type === 'position_per') {
                      const pos = s.band ? bandPosition(s.fwd_per, s.band.per_5y_low, s.band.per_5y_high) : null;
                      return (
                        <td key={s.stock_code} className={`px-3 py-2 text-center font-mono ${posColor(pos)}`}>
                          {pos != null ? <PositionBar value={pos} /> : '-'}
                        </td>
                      );
                    }
                    if (row.type === 'position_pbr') {
                      const pos = s.band ? bandPosition(s.fwd_pbr, s.band.pbr_5y_low, s.band.pbr_5y_high) : null;
                      return (
                        <td key={s.stock_code} className={`px-3 py-2 text-center font-mono ${posColor(pos)}`}>
                          {pos != null ? <PositionBar value={pos} /> : '-'}
                        </td>
                      );
                    }
                    // 손익비 관련
                    if (row.type === 'rr_target' || row.type === 'rr_stop' || row.type === 'rr_ratio') {
                      const rr = calcRiskReward(s);
                      if (row.type === 'rr_target') {
                        return (
                          <td key={s.stock_code} className="px-3 py-2 text-center font-mono text-gray-200">
                            {fmtPrice(rr.target)}
                          </td>
                        );
                      }
                      if (row.type === 'rr_stop') {
                        return (
                          <td key={s.stock_code} className="px-3 py-2 text-center font-mono text-gray-200">
                            {fmtPrice(rr.stop)}
                          </td>
                        );
                      }
                      // rr_ratio
                      return (
                        <td key={s.stock_code} className={`px-3 py-2 text-center font-mono font-bold ${rrColor(rr.rr)}`}>
                          {fmtRR(rr.rr)}
                        </td>
                      );
                    }

                    const v = s[row.key];
                    const colorClass = row.colorFn ? row.colorFn(v)
                      : row.color ? pctColor(v)
                      : 'text-gray-200';
                    return (
                      <td key={s.stock_code} className={`px-3 py-2 text-center font-mono ${colorClass}`}>
                        {row.fmt(v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* 인라인 차트 */}
      <PerCompareChart stocks={stocks} />
      <PbrCompareChart stocks={stocks} />
    </div>
  );
}

// 미니 바 + 숫자
function PositionBar({ value }) {
  const barColor = value <= 25 ? 'bg-green-500' : value <= 50 ? 'bg-yellow-500' : value <= 75 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5 justify-center">
      <div className="w-10 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px]">{value}</span>
    </div>
  );
}

function pegColor(peg) {
  if (peg == null) return 'text-gray-500';
  if (peg < 1) return 'text-green-400';
  if (peg < 1.5) return 'text-yellow-400';
  return 'text-red-400';
}
