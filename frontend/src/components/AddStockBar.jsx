import { useState, useEffect, useRef } from 'react';

export default function AddStockBar({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 1) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleAdd = async (code, name) => {
    setAdding(code);
    try {
      await onAdd(code, name);
      setQuery('');
      setResults([]);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-4">
      <input
        type="text"
        placeholder="종목명 또는 코드 검색 (예: 삼성전자, 005930)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 w-80"
      />
      {results.length > 0 && (
        <div className="mt-1 bg-gray-800 border border-gray-700 rounded overflow-hidden w-80">
          {results.map(r => (
            <button
              key={r.code}
              onClick={() => handleAdd(r.code, r.name)}
              disabled={adding === r.code}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex justify-between items-center disabled:opacity-50"
            >
              <span className="text-white">{r.name}</span>
              <span className="text-gray-500 text-xs">{r.code} · {r.market}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
