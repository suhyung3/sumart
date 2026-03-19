import { useState, useCallback } from 'react';
import { fmtNum, fmtPct, fmtPer, pctColor } from '../utils/format';
import EpsRevisionBadge from './EpsRevisionBadge';
import PerBandChart from './PerBandChart';

const COLUMNS = [
  { key: 'stock_name', label: '종목명', align: 'left' },
  { key: 'market_cap', label: '시총(억)', type: 'num' },
  { key: 'rev_26e', label: '매출 26E', type: 'num' },
  { key: 'rev_yoy_26', label: 'YoY', type: 'pct' },
  { key: 'rev_27e', label: '매출 27E', type: 'num' },
  { key: 'rev_yoy_27', label: 'YoY', type: 'pct' },
  { key: 'op_26e', label: '영업이익 26E', type: 'num' },
  { key: 'op_yoy_26', label: 'YoY', type: 'pct' },
  { key: 'op_27e', label: '영업이익 27E', type: 'num' },
  { key: 'op_yoy_27', label: 'YoY', type: 'pct' },
  { key: 'ni_26e', label: '순이익 26E', type: 'num' },
  { key: 'ni_yoy_26', label: 'YoY', type: 'pct' },
  { key: 'ni_27e', label: '순이익 27E', type: 'num' },
  { key: 'ni_yoy_27', label: 'YoY', type: 'pct' },
  { key: 'opm_26e', label: 'OPM 26E', type: 'pct_plain' },
  { key: 'opm_27e', label: 'OPM 27E', type: 'pct_plain' },
  { key: 'fwd_per', label: 'Fwd PER', type: 'per' },
  { key: 'fwd_pbr', label: 'PBR', type: 'per' },
  { key: 'peg', label: 'PEG', type: 'per' },
  { key: 'roe', label: 'ROE', type: 'pct_plain' },
  { key: 'eps_rev', label: 'EPS Rev', type: 'badge' },
  { key: 'per_band', label: 'PER Band', type: 'chart' },
  { key: 'actions', label: '', type: 'action' },
];

export default function StockTable({ data, onDelete }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedCode, setExpandedCode] = useState(null);

  const handleSort = useCallback((key) => {
    if (key === 'actions' || key === 'eps_rev' || key === 'per_band') return;
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'stock_name');
    }
  }, [sortKey, sortAsc]);

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-800">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`px-2 py-2 font-medium text-gray-400 whitespace-nowrap cursor-pointer hover:text-white ${
                  col.align === 'left' ? 'text-left' : 'text-right'
                } ${sortKey === col.key ? 'text-yellow-400' : ''}`}
              >
                {col.label}
                {sortKey === col.key && (sortAsc ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.stock_code} className="border-b border-gray-800/50 hover:bg-gray-900/50">
              <td className="px-2 py-2 text-left font-medium text-white whitespace-nowrap">
                {row.stock_name}
                <span className="text-gray-600 ml-1">{row.stock_code}</span>
              </td>
              <td className="px-2 py-2 text-right">{fmtNum(row.market_cap)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(row.rev_26e)}</td>
              <td className={`px-2 py-2 text-right ${pctColor(row.rev_yoy_26)}`}>{fmtPct(row.rev_yoy_26)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(row.rev_27e)}</td>
              <td className={`px-2 py-2 text-right ${pctColor(row.rev_yoy_27)}`}>{fmtPct(row.rev_yoy_27)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(row.op_26e)}</td>
              <td className={`px-2 py-2 text-right ${pctColor(row.op_yoy_26)}`}>{fmtPct(row.op_yoy_26)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(row.op_27e)}</td>
              <td className={`px-2 py-2 text-right ${pctColor(row.op_yoy_27)}`}>{fmtPct(row.op_yoy_27)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(row.ni_26e)}</td>
              <td className={`px-2 py-2 text-right ${pctColor(row.ni_yoy_26)}`}>{fmtPct(row.ni_yoy_26)}</td>
              <td className="px-2 py-2 text-right">{fmtNum(row.ni_27e)}</td>
              <td className={`px-2 py-2 text-right ${pctColor(row.ni_yoy_27)}`}>{fmtPct(row.ni_yoy_27)}</td>
              <td className="px-2 py-2 text-right">{row.opm_26e != null ? `${row.opm_26e.toFixed(1)}%` : '-'}</td>
              <td className="px-2 py-2 text-right">{row.opm_27e != null ? `${row.opm_27e.toFixed(1)}%` : '-'}</td>
              <td className="px-2 py-2 text-right">{fmtPer(row.fwd_per)}</td>
              <td className="px-2 py-2 text-right">{fmtPer(row.fwd_pbr)}</td>
              <td className={`px-2 py-2 text-right ${pegColor(row.peg)}`}>{fmtPer(row.peg)}</td>
              <td className="px-2 py-2 text-right">{row.roe != null ? `${row.roe.toFixed(1)}%` : '-'}</td>
              <td className="px-2 py-2 text-center">
                <EpsRevisionBadge rev1m={row.eps_rev_1m} rev3m={row.eps_rev_3m} />
              </td>
              <td className="px-2 py-2">
                <button
                  onClick={() => setExpandedCode(expandedCode === row.stock_code ? null : row.stock_code)}
                  className="text-gray-500 hover:text-white text-xs"
                  title="PER 밴드"
                >
                  {expandedCode === row.stock_code ? '▼' : '▶'}
                </button>
                {expandedCode === row.stock_code && (
                  <PerBandChart stockCode={row.stock_code} />
                )}
              </td>
              <td className="px-2 py-2">
                <button
                  onClick={() => onDelete(row.stock_code)}
                  className="text-gray-600 hover:text-red-400 text-xs"
                  title="삭제"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pegColor(peg) {
  if (peg == null) return 'text-gray-500';
  if (peg < 1) return 'text-green-400';
  if (peg < 1.5) return 'text-yellow-400';
  return 'text-red-400';
}
