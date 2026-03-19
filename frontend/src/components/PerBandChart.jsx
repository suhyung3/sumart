import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function PerBandChart({ stockCode }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/data/${stockCode}/per-band`)
      .then((r) => r.json())
      .then((rows) => {
        setData(rows.map((r) => ({
          year: r.year,
          range: [r.per_low, r.per_high],
          avg: r.per_avg,
          low: r.per_low,
          high: r.per_high,
        })));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [stockCode]);

  if (loading) return <div className="text-gray-600 text-[10px]">로딩...</div>;
  if (data.length === 0) return <div className="text-gray-600 text-[10px]">데이터 없음</div>;

  return (
    <div className="absolute z-10 bg-gray-900 border border-gray-700 rounded p-2 mt-1 shadow-lg" style={{ width: 300, height: 160 }}>
      <div className="text-[10px] text-gray-400 mb-1">PER 밴드 (10년)</div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#999' }} />
          <YAxis tick={{ fontSize: 9, fill: '#999' }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', fontSize: 11 }}
            formatter={(value, name) => {
              if (name === 'high') return [`${value}x`, '고점 PER'];
              if (name === 'low') return [`${value}x`, '저점 PER'];
              if (name === 'avg') return [`${value}x`, '평균 PER'];
              return [value, name];
            }}
          />
          <Bar dataKey="low" fill="#3b82f6" stackId="band" />
          <Bar dataKey="high" fill="#3b82f680" stackId="band" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
