import { useState, useCallback } from 'react';
import { fmtNum, fmtPct, fmtPer, pctColor } from '../utils/format';
import EpsRevisionBadge from './EpsRevisionBadge';

const COLUMNS = [
  { key: 'stock_name', label: '종목명', align: 'left' },
  { key: 'market_cap', label: '시총(억)' },
  { key: 'rev_26e', label: '매출 26E', yoy: 'rev_yoy_26' },
  { key: 'rev_27e', label: '매출 27E', yoy: 'rev_yoy_27' },
  { key: 'op_26e', label: '영익 26E', yoy: 'op_yoy_26', opm: 'opm_26e' },
  { key: 'op_27e', label: '영익 27E', yoy: 'op_yoy_27', opm: 'opm_27e' },
  { key: 'ni_26e', label: 'NI 26E', yoy: 'ni_yoy_26' },
  { key: 'ni_27e', label: 'NI 27E', yoy: 'ni_yoy_27' },
  { key: 'fwd_per', label: 'Fwd PER' },
  { key: 'per_band', label: 'PER 5Y', type: 'band_per' },
  { key: 'fwd_pbr', label: 'Fwd PBR' },
  { key: 'pbr_band', label: 'PBR 5Y', type: 'band_pbr' },
  { key: 'peg', label: 'PEG' },
  { key: 'roe', label: 'ROE' },
  { key: 'eps_rev', label: 'EPS Rev', type: 'badge' },
  { key: 'actions', label: '', type: 'action' },
];

export default function StockTable({ data, onDelete }) {
  const [sortKey, setSortKey] = useState('market_cap');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = useCallback((key) => {
    if (key === 'actions' || key === 'eps_rev' || key === 'per_band' || key === 'pbr_band') return;
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
              {COLUMNS.map((col) => (
                <td key={col.key} className={`px-2 py-3 align-top ${col.align === 'left' ? 'text-left' : 'text-right'}`}>
                  {renderCell(col, row, onDelete)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(col, row, onDelete) {
  const { key, type, yoy } = col;

  // 종목명
  if (key === 'stock_name') {
    const code = row.stock_code;
    return (
      <span className="font-medium text-white whitespace-nowrap">
        {row.stock_name}
        <span className="text-gray-600 ml-1">{code}</span>
        <a href={`https://finance.naver.com/item/main.naver?code=${code}`} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[10px] text-green-600 hover:text-green-400" title="네이버금융">N</a>
        <a href={`https://comp.fnguide.com/SVO2/ASP/SVD_Consensus.asp?pGB=1&gicode=A${code}&cID=&MenuYn=Y&ReportGB=&NewMenuID=108&stkGb=701`} target="_blank" rel="noopener noreferrer" className="ml-1 text-[10px] text-blue-600 hover:text-blue-400" title="FnGuide 컨센서스">F</a>
      </span>
    );
  }

  // 삭제 버튼
  if (type === 'action') {
    return <button onClick={() => onDelete(row.stock_code)} className="text-gray-600 hover:text-red-400" title="삭제">✕</button>;
  }

  // EPS Rev 뱃지
  if (type === 'badge') {
    return <EpsRevisionBadge rev1m={row.eps_rev_1m} rev3m={row.eps_rev_3m} />;
  }

  // PER 밴드 범위
  if (type === 'band_per') {
    if (!row.band) return <span className="text-gray-600">-</span>;
    return <span className="text-gray-400 text-[10px]">{fmtPer(row.band.per_5y_low)}~{fmtPer(row.band.per_5y_high)}</span>;
  }

  // PBR 밴드 범위
  if (type === 'band_pbr') {
    if (!row.band) return <span className="text-gray-600">-</span>;
    return <span className="text-gray-400 text-[10px]">{fmtPer(row.band.pbr_5y_low)}~{fmtPer(row.band.pbr_5y_high)}</span>;
  }

  const v = row[key];

  // 숫자 + YoY (+ OPM) 한 셀
  if (yoy) {
    const yoyVal = row[yoy];
    const opmVal = col.opm ? row[col.opm] : null;
    return (
      <div className="leading-relaxed">
        <div className="font-mono">{fmtNum(v)}</div>
        <div className={`text-[11px] ${pctColor(yoyVal)}`}>{fmtPct(yoyVal)}</div>
        {opmVal != null && <div className="text-[11px] text-gray-400">OPM {opmVal.toFixed(1)}%</div>}
      </div>
    );
  }

  // ROE (% 표시)
  if (key === 'roe') {
    return <span className="font-mono">{v != null ? `${v.toFixed(1)}%` : '-'}</span>;
  }

  // PEG (색상)
  if (key === 'peg') {
    return <span className={`font-mono ${pegColor(v)}`}>{fmtPer(v)}</span>;
  }

  // 시총
  if (key === 'market_cap') {
    return <span className="font-mono">{fmtNum(v)}</span>;
  }

  // Fwd PER / PBR
  return <span className="font-mono">{fmtPer(v)}</span>;
}

function pegColor(peg) {
  if (peg == null) return 'text-gray-500';
  if (peg < 1) return 'text-green-400';
  if (peg < 1.5) return 'text-yellow-400';
  return 'text-red-400';
}
