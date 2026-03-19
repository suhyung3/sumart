import { useState, useEffect, useCallback } from 'react';
import AddStockBar from './components/AddStockBar';
import StockTable from './components/StockTable';
import SimpleView from './components/SimpleView';

const TABS = [
  { key: 'simple', label: '요약' },
  { key: 'detail', label: '상세' },
];

export default function App() {
  const [tab, setTab] = useState('simple');
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStocks = useCallback(async () => {
    const res = await fetch('/api/stocks');
    const data = await res.json();
    setStocks(data);
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/dashboard');
      const json = await res.json();
      setDashboard(json.data || json);
      if (json.lastUpdated) setLastUpdated(json.lastUpdated);
    } catch (e) {
      console.error('대시보드 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    fetchDashboard();
  }, [fetchStocks, fetchDashboard]);

  const handleAdd = async (stockCode, stockName) => {
    await fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockCode, stockName }),
    });
    await fetchStocks();
    await fetch('/api/data/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockCode }),
    });
    await fetchDashboard();
  };

  const handleDelete = async (stockCode) => {
    if (!confirm(`${stockCode} 삭제?`)) return;
    await fetch(`/api/stocks/${stockCode}`, { method: 'DELETE' });
    await fetchStocks();
    await fetchDashboard();
  };

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/data/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await fetchDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  const content = loading && dashboard.length === 0 ? (
    <div className="text-center text-gray-500 mt-12">로딩 중...</div>
  ) : dashboard.length === 0 ? (
    <div className="text-center text-gray-500 mt-12">종목을 추가하세요</div>
  ) : tab === 'simple' ? (
    <SimpleView data={dashboard} onDelete={handleDelete} />
  ) : (
    <StockTable data={dashboard} onDelete={handleDelete} />
  );

  return (
    <div className="min-h-screen p-4 max-w-[1800px] mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">SuMart</h1>
          <div className="flex gap-1 bg-gray-800 rounded p-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  tab === t.key ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              {new Date(lastUpdated).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
              {' '}
              {new Date(lastUpdated).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              {' 기준'}
            </span>
          )}
          <span className="text-xs text-gray-500">{stocks.length}종목</span>
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-white"
          >
            {refreshing ? '새로고침 중...' : '전체 새로고침'}
          </button>
        </div>
      </header>

      {tab === 'detail' && <AddStockBar onAdd={handleAdd} />}

      {content}
    </div>
  );
}
