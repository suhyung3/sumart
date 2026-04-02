import { useState, useEffect, useCallback, useMemo } from 'react';
import AddStockBar from './components/AddStockBar';
import StockTable from './components/StockTable';
import SimpleView from './components/SimpleView';

const TABS = [
  { key: 'simple', label: '요약' },
  { key: 'detail', label: '아지트픽' },
];

// 카테고리 필터 (성장주/꿈주식)
const CATEGORY_FILTERS = [
  { key: 'all', label: '전체' },
  { key: '성장주', label: '성장주' },
  { key: '꿈주식', label: '꿈주식' },
];

export default function App() {
  const [tab, setTab] = useState('simple');
  const [stocks, setStocks] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 필터 상태
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState(null); // null = 태그 필터 없음

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

  // 사용 중인 태그 목록 추출
  const allTags = useMemo(() => {
    const tagSet = new Set();
    dashboard.forEach(s => (s.tags || []).forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [dashboard]);

  // 필터 적용된 데이터
  const filteredDashboard = useMemo(() => {
    return dashboard.filter(s => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (tagFilter && !(s.tags || []).includes(tagFilter)) return false;
      return true;
    });
  }, [dashboard, categoryFilter, tagFilter]);

  // 태그 추가/제거 핸들러
  const handleAddTag = async (stockCode, tag) => {
    await fetch(`/api/tags/${stockCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag }),
    });
    await fetchDashboard();
  };

  const handleRemoveTag = async (stockCode, tag) => {
    await fetch(`/api/tags/${stockCode}/${encodeURIComponent(tag)}`, { method: 'DELETE' });
    await fetchDashboard();
  };

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
    <SimpleView data={filteredDashboard} onDelete={handleDelete} />
  ) : (
    <StockTable
      data={filteredDashboard}
      onDelete={handleDelete}
      onAddTag={handleAddTag}
      onRemoveTag={handleRemoveTag}
    />
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
              {new Date(lastUpdated + '+09:00').toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })}
              {' '}
              {new Date(lastUpdated + '+09:00').toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })}
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

      {/* 카테고리 + 태그 필터 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* 카테고리 필터 */}
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setCategoryFilter(f.key); setTagFilter(null); }}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              categoryFilter === f.key && !tagFilter
                ? 'bg-white text-gray-900 font-bold'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* 구분선 */}
        {allTags.length > 0 && <span className="text-gray-600 mx-1">|</span>}

        {/* 태그 필터 */}
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => {
              setTagFilter(tagFilter === tag ? null : tag);
              setCategoryFilter('all');
            }}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              tagFilter === tag
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-gray-800 text-purple-400 hover:text-purple-300'
            }`}
          >
            #{tag}
          </button>
        ))}

        {/* 필터 카운트 */}
        {(categoryFilter !== 'all' || tagFilter) && (
          <span className="text-xs text-gray-500 ml-2">
            {filteredDashboard.length}/{dashboard.length}종목
          </span>
        )}
      </div>

      {tab === 'detail' && <AddStockBar onAdd={handleAdd} />}

      {content}
    </div>
  );
}
