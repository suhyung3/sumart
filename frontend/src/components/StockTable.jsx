import { useState } from 'react';
import { fmtNum, fmtPct, fmtPer, pctColor } from '../utils/format';

/* ── 행 정의 (지표 = 세로) ── */
const ROWS = [
  // base (항상 표시)
  { key: 'market_cap', label: '시총(억)', fmt: v => fmtNum(v), group: 'base' },
  { key: 'current_price', label: '현재가', fmt: v => fmtPrice(v), group: 'base' },

  // 실적 26E
  { key: 'div_26e', type: 'divider', label: '실적 26E', group: 'earnings' },
  { key: 'rev_26e', label: '매출', fmt: v => fmtNum(v), yoy: 'rev_yoy_26', group: 'earnings' },
  { key: 'op_26e', label: '영익', fmt: v => fmtNum(v), yoy: 'op_yoy_26', opm: 'opm_26e', group: 'earnings' },
  { key: 'ni_26e', label: 'NI', fmt: v => fmtNum(v), yoy: 'ni_yoy_26', group: 'earnings' },
  { key: 'eps_26e', label: 'EPS', fmt: v => fmtNum(v), group: 'earnings' },

  // 실적 27E
  { key: 'div_27e', type: 'divider', label: '실적 27E', group: 'earnings' },
  { key: 'rev_27e', label: '매출', fmt: v => fmtNum(v), yoy: 'rev_yoy_27', group: 'earnings' },
  { key: 'op_27e', label: '영익', fmt: v => fmtNum(v), yoy: 'op_yoy_27', opm: 'opm_27e', group: 'earnings' },
  { key: 'ni_27e', label: 'NI', fmt: v => fmtNum(v), yoy: 'ni_yoy_27', group: 'earnings' },
  { key: 'eps_27e', label: 'EPS', fmt: v => fmtNum(v), group: 'earnings' },

  // 밸류에이션
  { key: 'div_val', type: 'divider', label: '밸류에이션', group: 'valuation' },
  { key: 'fwd_per', label: 'Fwd PER', fmt: v => fmtPer(v), group: 'valuation' },
  { key: 'per_27e', label: '27E PER', fmt: v => fmtPer(v), group: 'valuation' },
  { key: 'fwd_pbr', label: 'Fwd PBR', fmt: v => fmtPer(v), group: 'valuation' },
  { key: 'peg', label: 'PEG', fmt: v => fmtPer(v), colorFn: pegColor, group: 'valuation' },
  { key: 'roe', label: 'ROE', fmt: v => v != null ? `${v.toFixed(1)}%` : '-', group: 'valuation' },

  // 밴드
  { key: 'div_band', type: 'divider', label: '밴드', group: 'band' },
  { key: 'per_band', label: 'PER 5Y', type: 'band_per', group: 'band' },
  { key: 'pbr_band', label: 'PBR 5Y', type: 'band_pbr', group: 'band' },

  // 성장
  { key: 'div_growth', type: 'divider', label: '성장', group: 'growth' },
  { key: 'eps_rev_1m', label: 'EPS Rev 1M', type: 'eps_rev', field: 'eps_rev_1m', group: 'growth' },
  { key: 'eps_rev_3m', label: 'EPS Rev 3M', type: 'eps_rev', field: 'eps_rev_3m', group: 'growth' },
  { key: 'eps_trend', label: 'EPS 추이', type: 'sparkline', group: 'growth' },

  // 손익비
  { key: 'div_rr', type: 'divider', label: '손익비', group: 'riskReward' },
  { key: 'rr_current', label: '현재가', type: 'rr_field', field: 'current_price', group: 'riskReward' },
  { key: 'rr_stop', label: '손절가', type: 'rr_field', field: 'stop_loss', group: 'riskReward' },
  { key: 't_per_band', label: '①PER밴드', type: 'rr_field', field: 't_per_band', group: 'riskReward' },
  { key: 't_cons_1m', label: '②컨센1M', type: 'rr_field', field: 't_cons_1m', group: 'riskReward' },
  { key: 't_cons_top25', label: '③컨센Top25', type: 'rr_field', field: 't_cons_top25', group: 'riskReward' },
  { key: 'rr_per_band', label: 'R:R ①', type: 'rr_ratio', field: 'rr_per_band', group: 'riskReward' },
  { key: 'rr_cons_1m', label: 'R:R ②', type: 'rr_ratio', field: 'rr_cons_1m', group: 'riskReward' },
  { key: 'rr_cons_top25', label: 'R:R ③', type: 'rr_ratio', field: 'rr_cons_top25', group: 'riskReward' },
];

const GROUPS = [
  { key: 'earnings', label: '실적' },
  { key: 'valuation', label: '밸류에이션' },
  { key: 'band', label: '밴드' },
  { key: 'growth', label: '성장' },
  { key: 'riskReward', label: '손익비' },
];

const DEFAULT_ACTIVE = ['earnings', 'valuation'];

export default function StockTable({ data, onDelete }) {
  const [activeGroups, setActiveGroups] = useState(new Set(DEFAULT_ACTIVE));

  const toggleGroup = (groupKey) => {
    setActiveGroups(prev => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  };

  const visibleRows = ROWS.filter(
    row => row.group === 'base' || activeGroups.has(row.group)
  );

  const stocks = [...data].sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {GROUPS.map(g => (
          <button
            key={g.key}
            onClick={() => toggleGroup(g.key)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              activeGroups.has(g.key)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-3 py-2 text-left text-gray-500 font-medium w-24 min-w-[96px]" />
              {stocks.map(s => (
                <th key={s.stock_code} className="px-3 py-2 text-center font-medium text-white whitespace-nowrap min-w-[80px]">
                  {s.stock_name}
                  <div className="flex justify-center gap-2 mt-0.5">
                    <a href={`https://finance.naver.com/item/main.naver?code=${s.stock_code}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-green-600 hover:text-green-400 font-normal" title="네이버금융">N</a>
                    <a href={`https://comp.fnguide.com/SVO2/ASP/SVD_Consensus.asp?pGB=1&gicode=A${s.stock_code}&cID=&MenuYn=Y&ReportGB=&NewMenuID=108&stkGb=701`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-400 font-normal" title="FnGuide 컨센서스">F</a>
                    <button onClick={() => onDelete(s.stock_code)} className="text-[10px] text-gray-600 hover:text-red-400" title="삭제">✕</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, ri) => {
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
                  {stocks.map(s => (
                    <td key={s.stock_code} className="px-3 py-2 text-center font-mono">
                      {renderCell(row, s)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 미니 스파크라인 (SVG) ── */
function EpsSparkline({ points }) {
  if (!points || points.length < 2) return <span className="text-gray-600">-</span>;

  const values = points.map(p => p.eps).filter(v => v != null);
  if (values.length < 2) return <span className="text-gray-600">-</span>;

  const W = 72, H = 24, PAD = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const first = values[0];
  const last = values[values.length - 1];
  const isUp = last >= first;
  const strokeColor = isUp ? '#34D399' : '#F87171';
  const pctChange = ((last - first) / Math.abs(first) * 100).toFixed(1);

  return (
    <div className="flex items-center gap-1.5 justify-center">
      <svg width={W} height={H} className="flex-shrink-0">
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2" fill={strokeColor} />
      </svg>
      <span className={`text-[10px] whitespace-nowrap ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{pctChange}%
      </span>
    </div>
  );
}

/* ── 셀 렌더링 ── */
function renderCell(row, stock) {
  const { type } = row;

  // EPS Rev (분리 표시)
  if (type === 'eps_rev') {
    const v = stock[row.field];
    if (v == null) return <span className="text-gray-600">-</span>;
    const color = v > 0 ? 'text-red-400' : v < 0 ? 'text-blue-400' : 'text-gray-400';
    const prefix = v > 0 ? '+' : '';
    return <span className={`font-bold ${color}`}>{prefix}{v.toFixed(1)}%</span>;
  }

  // EPS 스파크라인
  if (type === 'sparkline') {
    return <EpsSparkline points={stock.epsTrend} />;
  }

  // PER 밴드
  if (type === 'band_per') {
    if (!stock.band) return <span className="text-gray-600">-</span>;
    return <span className="text-gray-400 text-[10px]">{fmtPer(stock.band.per_5y_low)}~{fmtPer(stock.band.per_5y_high)}</span>;
  }

  // PBR 밴드
  if (type === 'band_pbr') {
    if (!stock.band) return <span className="text-gray-600">-</span>;
    return <span className="text-gray-400 text-[10px]">{fmtPer(stock.band.pbr_5y_low)}~{fmtPer(stock.band.pbr_5y_high)}</span>;
  }

  // 손익비 가격
  if (type === 'rr_field') {
    const v = stock.riskReward?.[row.field];
    const isCurrentPrice = row.field === 'current_price';
    return <span className={isCurrentPrice ? 'text-yellow-400 font-bold' : 'text-gray-200'}>{fmtPrice(v)}</span>;
  }

  // 손익비 비율
  if (type === 'rr_ratio') {
    const v = stock.riskReward?.[row.field];
    return <span className={`font-bold ${rrColor(v)}`}>{fmtRR(v)}</span>;
  }

  const v = stock[row.key];

  // YoY + OPM 포함 행
  if (row.yoy) {
    const yoyVal = stock[row.yoy];
    const opmVal = row.opm ? stock[row.opm] : null;
    return (
      <div className="leading-relaxed">
        <div>{row.fmt(v)}</div>
        <div className={`text-[11px] ${pctColor(yoyVal)}`}>{fmtPct(yoyVal)}</div>
        {opmVal != null && <div className="text-[11px] text-gray-400">OPM {opmVal.toFixed(1)}%</div>}
      </div>
    );
  }

  // 색상 함수가 있는 행
  if (row.colorFn) {
    return <span className={row.colorFn(v)}>{row.fmt(v)}</span>;
  }

  // 기본 포맷
  if (row.fmt) {
    return <span className="text-gray-200">{row.fmt(v)}</span>;
  }

  return <span className="text-gray-200">{v ?? '-'}</span>;
}

/* ── 유틸 ── */
function fmtPrice(v) {
  if (v == null) return '-';
  return v.toLocaleString();
}

function fmtRR(v) {
  if (v == null) return '-';
  return `${v.toFixed(1)} : 1`;
}

function rrColor(rr) {
  if (rr == null) return 'text-gray-500';
  if (rr >= 3) return 'text-green-400';
  if (rr >= 2) return 'text-yellow-400';
  return 'text-red-400';
}

function pegColor(peg) {
  if (peg == null) return 'text-gray-500';
  if (peg < 1) return 'text-green-400';
  if (peg < 1.5) return 'text-yellow-400';
  return 'text-red-400';
}
