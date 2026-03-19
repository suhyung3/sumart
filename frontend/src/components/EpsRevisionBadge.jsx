export default function EpsRevisionBadge({ rev1m, rev3m }) {
  if (rev1m == null && rev3m == null) return <span className="text-gray-600">-</span>;

  const badge = (val, label) => {
    if (val == null) return null;
    const color = val > 0 ? 'bg-red-900/50 text-red-300' : val < 0 ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800 text-gray-400';
    const prefix = val > 0 ? '+' : '';
    return (
      <span className={`inline-block px-1 py-0.5 rounded text-[10px] ${color}`} title={`${label} EPS 변화율`}>
        {label} {prefix}{val.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-0.5 items-center">
      {badge(rev1m, '1M')}
      {badge(rev3m, '3M')}
    </div>
  );
}
