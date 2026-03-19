import { useMemo } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, Cell, Customized
} from 'recharts';

/**
 * 종목별 PBR 비교 차트 (인라인)
 * - 회색 바: 5년 PBR 밴드 최소~최대
 * - 흰색 가로선: 5년 평균 PBR
 * - 흰 점: Fwd PBR
 */
export default function PbrCompareChart({ stocks }) {
  const chartData = useMemo(() => {
    return stocks
      .filter((s) => s.fwd_pbr != null)
      .map((s) => {
        let pbrLow = null, pbrHigh = null, avgPbr = null;
        if (s.band?.years?.length > 0) {
          const valid = s.band.years.filter((b) => b.pbr_high != null && b.pbr_low != null && b.pbr_high <= 20);
          if (valid.length > 0) {
            pbrLow = Math.min(...valid.map((b) => b.pbr_low));
            pbrHigh = Math.max(...valid.map((b) => b.pbr_high));
            const mids = valid.map((b) => (b.pbr_high + b.pbr_low) / 2);
            avgPbr = Math.round((mids.reduce((a, c) => a + c, 0) / mids.length) * 100) / 100;
          }
        }
        return {
          name: s.stock_name,
          pbrLow,
          pbrRange: pbrLow != null && pbrHigh != null ? Math.round((pbrHigh - pbrLow) * 100) / 100 : null,
          pbrHigh,
          avgPbr,
          fwdPbr: s.fwd_pbr ? Math.round(s.fwd_pbr * 100) / 100 : null,
        };
      })
      .sort((a, b) => (a.avgPbr || 999) - (b.avgPbr || 999));
  }, [stocks]);

  if (chartData.length === 0) return null;

  const yMax = 10;

  return (
    <div className="mt-4 pt-3 border-t border-gray-700/50">
      <div className="text-[11px] text-white font-bold mb-2">PBR 비교</div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 15, bottom: 10, left: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#ccc' }} axisLine={{ stroke: '#555' }} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 9, fill: '#999' }} axisLine={false} tickLine={false} domain={[0, yMax]} tickFormatter={(v) => `${v}x`} width={35} />
            <Tooltip content={<PbrTooltip />} />
            <Legend content={<PbrLegend />} />
            <Bar dataKey="pbrLow" stackId="range" fill="transparent" barSize={28} />
            <Bar dataKey="pbrRange" stackId="range" name="5Y 범위" barSize={28} radius={[2, 2, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill="#4b5563" />)}
            </Bar>
            <Customized component={<PbrDotsOverlay data={chartData} yMax={yMax} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[9px] text-gray-600 mt-1">* 회색 바: 5Y PBR 범위 / 흰선: 5Y 평균 / 흰점: Fwd PBR. PBR 20x 이상 이상치 제거.</div>
    </div>
  );
}

function PbrDotsOverlay({ data, yMax, xAxisMap, yAxisMap }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  if (!xAxis || !yAxis) return null;
  const { x: axX, width: axW, bandSize } = xAxis;
  const { y: ayY, height: ayH } = yAxis;
  const barW = Math.min(bandSize || 28, 28);
  const toY = (val) => ayY + ayH - (val / yMax) * ayH;
  return (
    <g>
      {data.map((d, i) => {
        const cx = axX + (axW / data.length) * (i + 0.5);
        const els = [];
        if (d.avgPbr != null) {
          const ly = toY(d.avgPbr);
          els.push(<line key={`a${i}`} x1={cx - barW / 2} x2={cx + barW / 2} y1={ly} y2={ly} stroke="#fff" strokeWidth={2} />);
        }
        if (d.fwdPbr != null) {
          els.push(<circle key={`f${i}`} cx={cx} cy={toY(d.fwdPbr)} r={5} fill="#fff" stroke="#ccc" strokeWidth={1.5} />);
        }
        return els;
      })}
    </g>
  );
}

function PbrTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs shadow-lg">
      <div className="font-bold text-white mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#4b5563' }} />
        <span className="text-gray-400">5Y 범위:</span>
        <span className="text-white font-mono">{d.pbrLow != null ? `${d.pbrLow}~${d.pbrHigh}x` : '-'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-0.5 inline-block" style={{ background: '#fff' }} />
        <span className="text-gray-400">5Y 평균:</span>
        <span className="text-white font-mono">{d.avgPbr != null ? `${d.avgPbr}x` : '-'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#fff', border: '1.5px solid #ccc' }} />
        <span className="text-gray-400">Fwd PBR:</span>
        <span className="text-white font-mono">{d.fwdPbr != null ? `${d.fwdPbr}x` : '-'}</span>
      </div>
    </div>
  );
}

function PbrLegend() {
  return (
    <div className="flex items-center justify-center gap-4 mt-1">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span className="w-3.5 h-2.5 rounded-sm inline-block" style={{ background: '#4b5563' }} />5Y 범위
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span className="w-3.5 h-0.5 inline-block" style={{ background: '#fff' }} />5Y 평균
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#fff', border: '1.5px solid #ccc' }} />Fwd PBR
      </div>
    </div>
  );
}
