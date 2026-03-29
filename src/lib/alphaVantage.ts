export async function fetchPrice(tickerOrIsin: string, apiKey: string): Promise<number | null> {
  try {
    // Try SYMBOL_SEARCH first for ISIN-based lookups
    const isIsin = /^[A-Z]{2}[A-Z0-9]{10}$/.test(tickerOrIsin);
    if (isIsin) {
      const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${tickerOrIsin}&apikey=${apiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const match = searchData?.bestMatches?.[0];
      if (match) {
        const symbol = match['1. symbol'];
        // Wait before second call (rate limit)
        await new Promise(r => setTimeout(r, 12500));
        return fetchQuote(symbol, apiKey);
      }
      return null;
    }
    return fetchQuote(tickerOrIsin, apiKey);
  } catch {
    return null;
  }
}

async function fetchQuote(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = data?.['Global Quote']?.['05. price'];
    return price ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

export async function fetchAllPrices(tickers: string[], apiKey: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  for (const ticker of tickers) {
    const price = await fetchPrice(ticker, apiKey);
    if (price !== null) results[ticker] = price;
    if (tickers.indexOf(ticker) < tickers.length - 1) {
      await new Promise(r => setTimeout(r, 12500));
    }
  }
  return results;
}
