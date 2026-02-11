import { Hono } from 'hono';

export const cryptoRouter = new Hono();

// CoinGecko API base URL (free public API, no key required for basic usage)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

interface CoinPrice {
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

interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  description: { en: string };
  image: { large: string };
  market_cap_rank: number;
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap: { usd: number };
    total_volume: { usd: number };
    circulating_supply: number;
    max_supply: number | null;
  };
  links: {
    homepage: string[];
    blockchain_site: string[];
  };
}

// Cache for rate limiting (CoinGecko has rate limits on free tier)
let cachedPrices: CoinPrice[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

// GET /api/crypto/prices - Get top cryptocurrency prices
cryptoRouter.get('/prices', async (c) => {
  const now = Date.now();
  const currency = c.req.query('currency') || 'usd';
  const limit = parseInt(c.req.query('limit') || '20', 10);

  // Return cached data if still fresh
  if (cachedPrices && now - lastFetchTime < CACHE_DURATION_MS) {
    return c.json({
      coins: cachedPrices.slice(0, limit),
      currency,
      updatedAt: new Date(lastFetchTime).toISOString(),
      cached: true,
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CoinGecko API error:', response.status, errorText);
      return c.json(
        { error: `Failed to fetch prices: ${response.statusText}` },
        502
      );
    }

    const data = (await response.json()) as CoinPrice[];
    cachedPrices = data;
    lastFetchTime = now;

    return c.json({
      coins: data,
      currency,
      updatedAt: new Date(now).toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error);

    // Return stale cache if available
    if (cachedPrices) {
      return c.json({
        coins: cachedPrices.slice(0, limit),
        currency,
        updatedAt: new Date(lastFetchTime).toISOString(),
        cached: true,
        stale: true,
      });
    }

    return c.json(
      { error: 'Failed to fetch cryptocurrency prices' },
      503
    );
  }
});

// GET /api/crypto/search - Search for coins
cryptoRouter.get('/search', async (c) => {
  const query = c.req.query('q');

  if (!query || query.trim().length < 2) {
    return c.json({ error: 'Query must be at least 2 characters' }, 400);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      return c.json(
        { error: `Search failed: ${response.statusText}` },
        502
      );
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error('Error searching coins:', error);
    return c.json({ error: 'Failed to search coins' }, 503);
  }
});

// GET /api/crypto/coins/:id - Get detailed info about a specific coin
cryptoRouter.get('/coins/:id', async (c) => {
  const id = c.req.param('id').toLowerCase();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${COINGECKO_API}/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: 'Coin not found' }, 404);
      }
      return c.json(
        { error: `Failed to fetch coin details: ${response.statusText}` },
        502
      );
    }

    const data = (await response.json()) as CoinDetail;
    return c.json(data);
  } catch (error) {
    console.error('Error fetching coin details:', error);
    return c.json({ error: 'Failed to fetch coin details' }, 503);
  }
});

// GET /api/crypto/trending - Get trending coins
cryptoRouter.get('/trending', async (c) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${COINGECKO_API}/search/trending`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch trending: ${response.statusText}` },
        502
      );
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error('Error fetching trending:', error);
    return c.json({ error: 'Failed to fetch trending coins' }, 503);
  }
});

// GET /api/crypto/global - Get global market data
cryptoRouter.get('/global', async (c) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${COINGECKO_API}/global`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch global data: ${response.statusText}` },
        502
      );
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error('Error fetching global data:', error);
    return c.json({ error: 'Failed to fetch global market data' }, 503);
  }
});
