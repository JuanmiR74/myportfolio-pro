export async function fetchPrice(ticker: string, apiKey: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${apiKey}`;
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
    // Alpha Vantage free tier: 5 calls/min
    if (tickers.indexOf(ticker) < tickers.length - 1) {
      await new Promise(r => setTimeout(r, 12500));
    }
  }
  return results;
}
