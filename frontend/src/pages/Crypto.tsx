import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap: number;
  total_volume: number;
  image: string;
  sparkline_in_7d?: { price: number[] };
}

interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_change_percentage_24h_usd: number;
  };
}

export default function Crypto() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [globalData, setGlobalData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [currency] = useState('usd');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ coins: Coin[]; updatedAt: string }>(`/crypto/prices?currency=${currency}&limit=50`);
      setCoins(response.coins);
      setLastUpdated(response.updatedAt);
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalData = async () => {
    try {
      const response = await api.get<GlobalData>('/crypto/global');
      setGlobalData(response);
    } catch (error) {
      console.error('Failed to fetch global data:', error);
    }
  };

  useEffect(() => {
    fetchPrices();
    fetchGlobalData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchPrices();
      fetchGlobalData();
    }, 60000);

    return () => clearInterval(interval);
  }, [currency]);

  const filteredCoins = coins.filter(
    (coin) =>
      coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${(value / 1e3).toFixed(1)}K`;
  };

  const Sparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    });

    const isPositive = data[data.length - 1] >= data[0];

    return (
      <svg
        viewBox="0 0 100 100"
        className="w-24 h-10"
        preserveAspectRatio="none"
      >
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={isPositive ? '#22c55e' : '#ef4444'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-yellow-400" aria-hidden="true">💲</span>
            Crypto Markets
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time cryptocurrency prices via CoinGecko API (read-only)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPrices()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.64 18.36A9 9 0 1020 12" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Global Stats */}
      {globalData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span aria-hidden="true">🌐</span>
              Market Cap
            </div>
            <div className="text-xl font-semibold text-white">
              {formatMarketCap(globalData.data.total_market_cap.usd)}
            </div>
            <div
              className={`text-sm flex items-center gap-1 mt-1 ${
                globalData.data.market_cap_change_percentage_24h_usd >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {globalData.data.market_cap_change_percentage_24h_usd >= 0 ? (
                <span aria-hidden="true">↗</span>
              ) : (
                <span aria-hidden="true">↘</span>
              )}
              {globalData.data.market_cap_change_percentage_24h_usd.toFixed(2)}% (24h)
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span aria-hidden="true">📊</span>
              24h Volume
            </div>
            <div className="text-xl font-semibold text-white">
              {formatMarketCap(globalData.data.total_volume.usd)}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span aria-hidden="true">🪙</span>
              Active Coins
            </div>
            <div className="text-xl font-semibold text-white">
              {globalData.data.active_cryptocurrencies.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span aria-hidden="true">🏦</span>
              Markets
            </div>
            <div className="text-xl font-semibold text-white">
              {globalData.data.markets.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">🔍</span>
        <input
          type="text"
          placeholder="Search coins..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
        />
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-sm text-gray-500">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}

      {/* Coins Table */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                  #
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">
                  Coin
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                  Price
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                  24h %
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm">
                  7d %
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm hidden md:table-cell">
                  Market Cap
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm hidden lg:table-cell">
                  Volume (24h)
                </th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium text-sm hidden xl:table-cell">
                  Last 7 Days
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && coins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <svg className="w-8 h-8 animate-spin mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M5.64 18.36A9 9 0 1020 12" />
                    </svg>
                    Loading prices...
                  </td>
                </tr>
              ) : filteredCoins.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No coins found matching "{searchQuery}"
                  </td>
                </tr>
              ) : (
                filteredCoins.map((coin, index) => (
                  <tr
                    key={coin.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCoin(coin)}
                  >
                    <td className="py-4 px-4 text-gray-500">{index + 1}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={coin.image}
                          alt={coin.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-white">
                            {coin.name}
                          </div>
                          <div className="text-sm text-gray-500 uppercase">
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-white">
                      {formatPrice(coin.current_price)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`flex items-center justify-end gap-1 ${
                          coin.price_change_percentage_24h >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {coin.price_change_percentage_24h >= 0 ? (
                          <span aria-hidden="true">↗</span>
                        ) : (
                          <span aria-hidden="true">↘</span>
                        )}
                        {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`flex items-center justify-end gap-1 ${
                          (coin.price_change_percentage_7d_in_currency || 0) >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}
                      >
                        {Math.abs(coin.price_change_percentage_7d_in_currency || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300 hidden md:table-cell">
                      {formatMarketCap(coin.market_cap)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300 hidden lg:table-cell">
                      {formatVolume(coin.total_volume)}
                    </td>
                    <td className="py-4 px-4 text-right hidden xl:table-cell">
                      {coin.sparkline_in_7d?.price && (
                        <Sparkline data={coin.sparkline_in_7d.price} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Coin Detail Modal */}
      {selectedCoin && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedCoin(null)}
        >
          <div
            className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-6">
              <img
                src={selectedCoin.image}
                alt={selectedCoin.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedCoin.name}
                </h2>
                <p className="text-gray-400 uppercase">{selectedCoin.symbol}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price</span>
                <span className="font-medium text-white">
                  {formatPrice(selectedCoin.current_price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Change</span>
                <span
                  className={`font-medium ${
                    selectedCoin.price_change_percentage_24h >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {selectedCoin.price_change_percentage_24h >= 0 ? '+' : ''}
                  {selectedCoin.price_change_percentage_24h.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="font-medium text-white">
                  {formatMarketCap(selectedCoin.market_cap)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Volume</span>
                <span className="font-medium text-white">
                  {formatVolume(selectedCoin.total_volume)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedCoin(null)}
              className="w-full mt-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
