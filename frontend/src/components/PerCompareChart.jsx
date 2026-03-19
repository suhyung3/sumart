import { useMemo } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, Cell, Customized
} from 'recharts';

/**
 * 종목별 PER 비교 차트
 * - 회색 바: 5년 PER 밴드 최소~최대
 * - 흰색 가로선: 5년 평균 PER
 * - 검정 점: 26E Fwd PER
 * - 파란 점: 27E PER
 */
export default function PerCompareChart({ stocks, onClose }) {
  const chartData = useMemo(() => {
    return stocks
      .filter((s) => s.fwd_per != null)
      .map((s) => {
        let perLow = null, perHigh = null, avgPer = null;
        if (s.band?.years?.length > 0) {
          const valid = s.band.years.filter((b) => b.per_high != null && b.per_low != null && b.per_high <= 50);
          if (valid.length > 0) {
            perLow = Math.min(...valid.map((b) => b.per_low));
            perHigh = Math.max(...valid.map((b) => b.per_high));
            const mids = valid.map((b) => (b.per_high + b.per_low) / 2);
            avgPer = Math.round((mids.reduce((a, c) => a + c, 0) / mids.length) * 10) / 10;
          }
        }

        // DB에 저장된 per_27e 우선, 없으면 클라이언트 계산
        let per27e = s.per_27e || null;
        if (!per27e && s.current_price && s.eps_27e && s.eps_27e > 0) {
          per27e = Math.round((s.current_price / s.eps_27e) * 10) / 10;
        }

        return {
          name: s.stock_name,
          perLow,
          perRange: perLow != null && perHigh != null ? Math.round((perHigh - perLow) * 10) / 10 : null,
          perHigh,
          avgPer,
          fwdPer: s.fwd_per ? Math.round(s.fwd_per * 10) / 10 : null,
          per27e,
        };
      })
      .sort((a, b) => (a.avgPer || 999) - (b.avgPer || 999));
  }, [stocks]);

  if (chartData.length === 0) return null;

  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.perHigh || 0, d.fwdPer || 0, d.per27e || 0))
  );
  const yMax = Math.ceil(maxVal * 1.2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-5 shadow-2xl"
        style={{ width: Math.min(chartData.length * 90 + 120, 1200), maxWidth: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">PER 비교</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">&times;</button>
        </div>

        <div style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#ccc' }}
                axisLine={{ stroke: '#555' }}
                tickLine={false}
                interval={0}
                angle={chartData.length > 10 ? -30 : 0}
                textAnchor={chartData.length > 10 ? 'end' : 'middle'}
                height={chartData.length > 10 ? 60 : 30}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#999' }}
                axisLine={false}
                tickLine={false}
                domain={[0, yMax]}
                tickFormatter={(v) => `${v}x`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />

              {/* 투명 베이스 (perLow까지) + 회색 범위 바 (perLow~perHigh) */}
              <Bar dataKey="perLow" stackId="range" fill="transparent" barSize={32} />
              <Bar dataKey="perRange" stackId="range" name="5Y 범위" barSize={32} radius={[2, 2, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="#4b5563" />
                ))}
              </Bar>

              {/* SVG 위에 직접 그리기 — Scatter 대신 Customized로 확실하게 렌더링 */}
              <Customized component={<DotsOverlay data={chartData} yMax={yMax} />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[10px] text-gray-600 mt-2">
          * 회색 바: 5Y PER 최소~최대. 흰선: 5Y 평균. 검정점: 26E Fwd PER. 파란점: 27E PER.
          PER 50x 이상 이상치 제거.
        </p>
      </div>
    </div>
  );
}

/** Customized 컴포넌트: 평균선 + 26E/27E 점을 바 위에 직접 렌더링 */
function DotsOverlay({ data, yMax, xAxisMap, yAxisMap }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  if (!xAxis || !yAxis) return null;

  const { x: axX, width: axW, bandSize } = xAxis;
  const { y: ayY, height: ayH } = yAxis;

  const barW = Math.min(bandSize || 32, 32);
  const toPixelY = (val) => ayY + ayH - (val / yMax) * ayH;

  return (
    <g>
      {data.map((d, i) => {
        const cx = axX + (axW / data.length) * (i + 0.5);
        const elements = [];

        // 흰색 가로선 (5Y 평균)
        if (d.avgPer != null) {
          const ly = toPixelY(d.avgPer);
          elements.push(
            <line key={`avg-${i}`} x1={cx - barW / 2} x2={cx + barW / 2} y1={ly} y2={ly} stroke="#fff" strokeWidth={2} />
          );
        }

        // 검정 점 (26E Fwd PER)
        if (d.fwdPer != null) {
          elements.push(
            <circle key={`fwd-${i}`} cx={cx} cy={toPixelY(d.fwdPer)} r={5} fill="#1a1a1a" stroke="#fff" strokeWidth={1.5} />
          );
        }

        // 파란 점 (27E PER)
        if (d.per27e != null) {
          elements.push(
            <circle key={`27e-${i}`} cx={cx} cy={toPixelY(d.per27e)} r={5} fill="#3b82f6" stroke="#60a5fa" strokeWidth={1} />
          );
        }

        return elements;
      })}
    </g>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs shadow-lg">
      <div className="font-bold text-white mb-1">{label}</div>
      <Row icon={<span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#4b5563' }} />} label="5Y 범위" value={data.perLow != null ? `${data.perLow}~${data.perHigh}x` : '-'} />
      <Row icon={<span className="w-3 h-0.5 inline-block" style={{ background: '#fff' }} />} label="5Y 평균" value={data.avgPer != null ? `${data.avgPer}x` : '-'} />
      <Row icon={<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#1a1a1a', border: '1.5px solid #fff' }} />} label="26E PER" value={data.fwdPer != null ? `${data.fwdPer}x` : '-'} />
      <Row icon={<span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#3b82f6' }} />} label="27E PER" value={data.per27e != null ? `${data.per27e}x` : '-'} />
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}

function CustomLegend() {
  const items = [
    { label: '5Y 범위', type: 'bar', color: '#4b5563' },
    { label: '5Y 평균', type: 'line', color: '#fff' },
    { label: '26E PER', type: 'dot', color: '#1a1a1a', border: '#fff' },
    { label: '27E PER', type: 'dot', color: '#3b82f6' },
  ];
  return (
    <div className="flex items-center justify-center gap-4 mt-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-gray-400">
          {item.type === 'bar' && (
            <span className="w-4 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
          )}
          {item.type === 'line' && (
            <span className="w-4 h-0.5 inline-block" style={{ background: item.color }} />
          )}
          {item.type === 'dot' && (
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: item.color, border: item.border ? `1.5px solid ${item.border}` : 'none' }}
            />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}
