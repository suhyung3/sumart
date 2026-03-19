import { useState } from 'react';

export default function AddStockBar({ onAdd }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimCode = code.trim();
    const trimName = name.trim();
    if (!trimCode || !trimName) return;

    setAdding(true);
    try {
      await onAdd(trimCode, trimName);
      setCode('');
      setName('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        placeholder="종목코드 (예: 005930)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 w-40"
        maxLength={6}
      />
      <input
        type="text"
        placeholder="종목명 (예: 삼성전자)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 w-40"
      />
      <button
        type="submit"
        disabled={adding || !code.trim() || !name.trim()}
        className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded text-white"
      >
        {adding ? '추가 중...' : '추가'}
      </button>
    </form>
  );
}
