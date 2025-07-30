const patternInfo = {
  "Hammer (Bullish)": {
    desc: "A Hammer appears after a downtrend. It has a small body and long lower wick → signals potential bullish reversal.",
    icon: "🔨"
  },
  "Shooting Star (Bearish)": {
    desc: "A Shooting Star appears after an uptrend. Small body with long upper wick → signals potential bearish reversal.",
    icon: "⭐"
  },
  "Doji (Indecision)": {
    desc: "A Doji forms when open and close are nearly equal. Indicates market indecision.",
    icon: "➕"
  },
  "Bullish Engulfing": {
    desc: "Green candle fully engulfs previous red candle → strong bullish reversal.",
    icon: "📊"
  },
  "Bearish Engulfing": {
    desc: "Red candle fully engulfs previous green candle → strong bearish reversal.",
    icon: "📊"
  },
  "Morning Star (Bullish)": {
    desc: "3-candle pattern: red → indecision → strong green → bullish reversal signal.",
    icon: "⭐"
  },
  "Evening Star (Bearish)": {
    desc: "3-candle pattern: green → indecision → strong red → bearish reversal signal.",
    icon: "⭐"
  },
  "Three White Soldiers (Bullish)": {
    desc: "Three consecutive strong green candles → bullish continuation signal.",
    icon: "🪖"
  },
  "Three Black Crows (Bearish)": {
    desc: "Three consecutive strong red candles → bearish continuation signal.",
    icon: "🐦"
  }
};

let patternChart = null;

async function fetchCandlesForChart(symbol, interval = "5m", limit = 10) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();

  return data.map(c => ({
    x: new Date(c[0]),
    o: parseFloat(c[1]),
    h: parseFloat(c[2]),
    l: parseFloat(c[3]),
    c: parseFloat(c[4])
  }));
}

function getHighlightIndexes(pattern) {
  if (pattern.includes("Engulfing")) return [8, 9];
  if (pattern.includes("Star")) return [7, 8, 9];
  if (pattern.includes("Crows") || pattern.includes("Soldiers")) return [7, 8, 9];
  if (pattern.includes("Doji") || pattern.includes("Hammer")) return [9];
  return [9];
}

async function showPatternChart(symbol, pattern) {
  const candles = await fetchCandlesForChart(symbol, "5m", 10);
  const highlights = getHighlightIndexes(pattern);

  const ctx = document.getElementById("pattern-chart").getContext("2d");
  if (patternChart) patternChart.destroy();

  patternChart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: `${symbol} Chart`,
        data: candles,
        color: {
          up: '#26a69a',
          down: '#ef5350',
          unchanged: '#999'
        }
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#ccc' } },
        y: { ticks: { color: '#ccc' } }
      },
      animation: {
        duration: 0
      }
    }
  });

  // Highlight with glow effect
  highlights.forEach(i => {
    const candle = candles[i];
    if (candle) {
      const glow = ctx.createRadialGradient(175, 100, 20, 175, 100, 120);
      glow.addColorStop(0, "rgba(255, 215, 0, 0.5)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
    }
  });
}

class AdvancedCryptoTradingAdvisor {
  constructor() {
    this.coins = [];
    this.topCoins = [];
    this.config = {
      updateInterval: 300000, // 5 minutes
      priceUpdateInterval: 10000, // 10 seconds for price refresh
      scanInterval: 60000, // 1 minute for full scan
      maxTopCoins: 6, // Number of top coins to show
      minConfidence: 0.7, // Minimum confidence to be considered a top coin
      rsiPeriod: 14,
      emaPeriods: [20, 50, 200],
      baseRiskReward: 2,
      highConvictionMultiplier: 1.5,
      fallbackLogo: 'https://cryptologos.cc/logos/default-fallback-logo.png',
      binanceApiUrl: 'https://api.binance.com/api/v3',
      wsUrl: 'wss://stream.binance.com:9443/ws',
      simulationPositionSize: 10, // $10 base position
      simulationLeverage: 20 // 20x leverage
    };
    this.cache = {};
    this.priceWebSockets = {};
    this.scanIntervalId = null;
    this.isScanning = false;
    this.scannedPairs = 0;
    this.totalPairsToScan = 0;
    this.init();
  }

  async init() {
    try {
      this.setupEventListeners();
      document.getElementById("status").textContent = "Ready - Enter a coin symbol to analyze";
    } catch (error) {
      console.error("Initialization failed:", error);
      this.showStatus("❌ Initialization failed", "error");
    }
  }

  // ✅ Add formatPrice here
 formatPrice(price) {
  const num = Number(price);
  if (isNaN(num)) return "N/A";   // fallback if invalid

  if (num >= 1) return num.toFixed(2);        // e.g. 1980.45
  if (num >= 0.01) return num.toFixed(4);     // e.g. 0.0234
  if (num >= 0.0001) return num.toFixed(6);   // e.g. 0.000245
  return num.toFixed(8);                      // e.g. 0.00001130
}

  
  async safeFetch(url, retries = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retries > 0) {
      console.log("Retrying:", url);
      return this.safeFetch(url, retries - 1);
    }
    console.warn("API failed:", url, err.message);
    return null;
  }
}

  setupEventListeners() {
    document.getElementById("search-btn").addEventListener("click", () => this.addCoinByInput());
    document.getElementById("coin-search").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addCoinByInput();
    });
    
    document.getElementById("start-scan").addEventListener("click", () => this.startAutoScan());
    document.getElementById("stop-scan").addEventListener("click", () => this.stopAutoScan());
  }

  async addCoinByInput() {
    const input = document.getElementById("coin-search");
    const symbol = input.value.trim().toUpperCase();
    
    if (!symbol) {
      this.showStatus("Please enter a coin symbol", "error");
      return;
    }
    
    input.value = "";
    
    if (this.coins.some(c => c.id === symbol)) {
      this.showStatus(`${symbol} is already being analyzed`, "warning");
      return;
    }
    
    this.showStatus(`🔄 Adding ${symbol}...`, "loading");
    
    try {
      const exchangeInfo = await this.fetchExchangeInfo(symbol);
      if (!exchangeInfo.symbols.some(s => s.symbol === `${symbol}USDT`)) {
        throw new Error(`Trading pair ${symbol}USDT not found`);
      }

      const newCoin = {
        id: symbol,
        name: symbol,
        symbol: `${symbol}USDT`,
        logo: await this.fetchCoinGeckoLogo(symbol),
        fallbackLogo: this.config.fallbackLogo,
        currentPrice: 0,
        lastUpdate: new Date(),
        entryPrice: null,
        stopLoss: null,
        takeProfit: null
      };
      
      this.coins.push(newCoin);
      await this.addCoinToDOM(newCoin);
      await this.updateCoin(newCoin);
      this.setupLivePriceUpdates(newCoin);
      
      if (this.coins.length === 1) {
        setInterval(() => this.updateAll(), this.config.updateInterval);
      }
    } catch (error) {
      console.error(`Error adding ${symbol}:`, error);
      this.showStatus(`Failed to add ${symbol}: ${error.message}`, "error");
      this.coins = this.coins.filter(c => c.id !== symbol);
    }
  }

  setupLivePriceUpdates(coin) {
    if (this.priceWebSockets[coin.id]) {
      this.priceWebSockets[coin.id].close();
    }
    
    const ws = new WebSocket(`${this.config.wsUrl}/${coin.symbol.toLowerCase()}@ticker`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const price = parseFloat(data.c);
      const coinElement = document.getElementById(coin.id);
      
      if (coinElement && !isNaN(price)) {
        coin.currentPrice = price;
        coin.lastUpdate = new Date();
        
         // ✅ dynamic decimal formatting
  coinElement.querySelector('.price .value').textContent = this.formatPrice(price);
        
        const updateElement = coinElement.querySelector('.update-time');
        updateElement.textContent = 'Live';
        updateElement.classList.add('live');
        
        this.updateSimulation(coin);
      }
    };
    
    ws.onerror = (error) => {
      console.error(`WebSocket error for ${coin.id}:`, error);
    };
    
    ws.onclose = () => {
      console.log(`WebSocket closed for ${coin.id}`);
      const coinElement = document.getElementById(coin.id);
      if (coinElement) {
        const updateElement = coinElement.querySelector('.update-time');
        updateElement.textContent = 'Disconnected';
        updateElement.classList.remove('live');
      }
    };
    
    this.priceWebSockets[coin.id] = ws;
  }

  updateSimulation(coin) {
    const coinElement = document.getElementById(coin.id);
    if (!coinElement) return;
    
    const positionType = coinElement.querySelector('.position-type .value').textContent;
    const entryPrice = parseFloat(coinElement.querySelector('.entry-price .value').textContent);
    const stopLoss = parseFloat(coinElement.querySelector('.stop-loss .value').textContent);
    const takeProfit = parseFloat(coinElement.querySelector('.take-profit .value').textContent);
    
    if (positionType === 'HOLD' || isNaN(entryPrice) || isNaN(stopLoss) || isNaN(takeProfit)) {
      return;
    }
    
    const currentPrice = coin.currentPrice;
    const positionSize = this.config.simulationPositionSize * this.config.simulationLeverage;
    
    let pnl, pnlPercent, distanceToTP, distanceToSL;
    
    if (positionType === 'BUY') {
      pnl = positionSize * ((currentPrice - entryPrice) / entryPrice);
      pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      distanceToTP = ((takeProfit - currentPrice) / currentPrice) * 100;
      distanceToSL = ((currentPrice - stopLoss) / currentPrice) * 100;
    } else { // SELL
      pnl = positionSize * ((entryPrice - currentPrice) / entryPrice);
      pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
      distanceToTP = ((currentPrice - takeProfit) / currentPrice) * 100;
      distanceToSL = ((stopLoss - currentPrice) / currentPrice) * 100;
    }
    
    const pnlElement = coinElement.querySelector('#current-pnl');
    pnlElement.textContent = `$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`;
    pnlElement.className = pnl >= 0 ? 'value pnl positive' : 'value pnl negative';
    
    coinElement.querySelector('#distance-tp').textContent = `${distanceToTP.toFixed(2)}%`;
    coinElement.querySelector('#distance-sl').textContent = `${distanceToSL.toFixed(2)}%`;
  }

  async startAutoScan() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.scannedPairs = 0;
    document.getElementById("scan-status").textContent = "Fetching coin list...";
    document.getElementById("progress-bar").style.width = "0%";
    
    try {
      const exchangeInfo = await this.fetchExchangeInfo();
      const usdtPairs = exchangeInfo.symbols
        .filter(s => s.symbol.endsWith('USDT') && s.status === 'TRADING')
        .map(s => s.symbol.replace('USDT', ''));
      
      this.totalPairsToScan = usdtPairs.length;
      document.getElementById("scan-status").textContent = `Scanning 0/${this.totalPairsToScan} pairs...`;
      
      this.scanIntervalId = setInterval(() => this.scanBatch(usdtPairs), 1000);
    } catch (error) {
      console.error("Error starting scan:", error);
      document.getElementById("scan-status").textContent = "Scan failed: " + error.message;
      this.isScanning = false;
    }
  }

  async scanBatch(pairs) {
    if (!this.isScanning) return;
    
    const batchSize = 5;
    const batch = pairs.splice(0, batchSize);
    
    if (batch.length === 0) {
      this.completeScan();
      return;
    }
    
    try {
      const results = await Promise.all(batch.map(symbol => this.analyzePair(symbol + 'USDT')));
      
      const validResults = results.filter(r => r && r.recommendation && r.recommendation.confidence);
      validResults.forEach(result => {
        this.addToTopCoins({
          symbol: result.symbol.replace('USDT', ''),
          confidence: parseFloat(result.recommendation.confidence),
          recommendation: result.recommendation.positionType
        });
      });
      
      this.scannedPairs += batch.length;
      const progress = (this.scannedPairs / this.totalPairsToScan) * 100;
      document.getElementById("progress-bar").style.width = `${progress}%`;
      document.getElementById("scan-status").textContent = 
        `Scanning ${this.scannedPairs}/${this.totalPairsToScan} pairs...`;
    } catch (error) {
      console.error("Error scanning batch:", error);
    }
  }

  async analyzePair(symbol) {
    try {
      const coin = {
        id: symbol.replace('USDT', ''),
        name: symbol.replace('USDT', ''),
        symbol: symbol,
        currentPrice: 0
      };
      
      const analysis = await this.generateTradingSignals(coin);
      if (analysis.error) throw new Error(analysis.error);
      
      return {
        symbol: symbol,
        recommendation: analysis.recommendation,
        analysis: analysis
      };
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return null;
    }
  }

  addToTopCoins(coin) {
    if (Math.abs(coin.confidence) < this.config.minConfidence) return;
    
    const existingIndex = this.topCoins.findIndex(c => c.symbol === coin.symbol);
    
    if (existingIndex >= 0) {
      this.topCoins[existingIndex] = coin;
    } else {
      this.topCoins.push(coin);
    }
    
    this.topCoins.sort((a, b) => Math.abs(b.confidence) - Math.abs(a.confidence));
    
    if (this.topCoins.length > this.config.maxTopCoins) {
      this.topCoins = this.topCoins.slice(0, this.config.maxTopCoins);
    }
    
    this.updateTopCoinsDisplay();
  }

  updateTopCoinsDisplay() {
    const container = document.getElementById("top-coins-list");
    container.innerHTML = "";
    
    this.topCoins.forEach(coin => {
      const template = document.getElementById("top-coin-template");
      const clone = template.content.cloneNode(true);
      const element = clone.querySelector(".top-coin");
      
      element.querySelector(".top-coin-name").textContent = coin.symbol;
      element.querySelector(".top-coin-confidence .value").textContent = coin.confidence.toFixed(2);
      
      const recommendationElement = element.querySelector(".top-coin-recommendation .value");
      recommendationElement.textContent = coin.recommendation;
      recommendationElement.className = "value " + 
        (coin.recommendation === 'BUY' ? 'buy-recommendation' : 
         coin.recommendation === 'SELL' ? 'sell-recommendation' : '');
      
      element.addEventListener("click", () => {
        document.getElementById("coin-search").value = coin.symbol;
        document.getElementById("search-btn").click();
      });
      
      container.appendChild(element);
    });
  }

  completeScan() {
    clearInterval(this.scanIntervalId);
    this.isScanning = false;
    document.getElementById("progress-bar").style.width = "100%";
    document.getElementById("scan-status").textContent = 
      `Scan complete. Found ${this.topCoins.length} high-confidence opportunities.`;
    
    setTimeout(() => this.startAutoScan(), this.config.scanInterval);
  }

  stopAutoScan() {
    clearInterval(this.scanIntervalId);
    this.isScanning = false;
    document.getElementById("scan-status").textContent = "Scan stopped by user";
    document.getElementById("progress-bar").style.width = "0%";
  }

  async fetchExchangeInfo(symbol = null) {
    const cacheKey = 'exchangeInfo';
    if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 3600000) {
      return this.cache[cacheKey].data;
    }

    const response = await fetch(`${this.config.binanceApiUrl}/exchangeInfo`);
    if (!response.ok) throw new Error('Failed to fetch exchange info');
    
    const data = await response.json();
    this.cache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  }

  async fetchMarketData(symbol) {
    try {
      const cacheKey = `marketData-${symbol}`;
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 300000) {
        return this.cache[cacheKey].data;
      }

      const response = await fetch(
        `${this.config.binanceApiUrl}/klines?symbol=${symbol}&interval=4h&limit=100`
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Empty or invalid data received');
      }
      
      this.cache[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      return this.cache[`marketData-${symbol}`]?.data || null;
    }
  }

  async fetch24hTicker(symbol) {
    try {
      const response = await fetch(`${this.config.binanceApiUrl}/ticker/24hr?symbol=${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch 24h ticker');
      return await response.json();
    } catch (error) {
      console.error(`Error fetching 24h data for ${symbol}:`, error);
      return null;
    }
  }

  async fetchFundingRate(symbol) {
  try {
    // Binance Futures only works if pair exists there
    const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
    if (!res.ok) {
      // Fail safe for non-futures pairs (like XNOUSDT)
      return { lastFundingRate: "0.0000", markPrice: "0" };
    }
    return await res.json();
  } catch (e) {
    console.warn(`Funding API error for ${symbol}:`, e.message);
    return { lastFundingRate: "0.0000", markPrice: "0" };
  }
}

async fetchOpenInterest(symbol) {
  try {
    const res = await fetch(
      `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=2`
    );
    if (!res.ok) {
      // Fail safe if no futures market
      return [
        { sumOpenInterest: "0" },
        { sumOpenInterest: "0" }
      ];
    }
    return await res.json();
  } catch (e) {
    console.warn(`Open Interest API error for ${symbol}:`, e.message);
    return [
      { sumOpenInterest: "0" },
      { sumOpenInterest: "0" }
    ];
  }
}

  calculateVolumeWeightedSR(data) {
    const levels = [];
    for (let i = 2; i < data.length - 2; i++) {
      const price = data[i].close;
      const volumeWeight = data[i].volume / this.average(data.slice(i-5,i+5).map(d => d.volume));
      
      if ((price > data[i-1].close && price > data[i+1].close) ||
          (price < data[i-1].close && price < data[i+1].close)) {
        levels.push({
          price,
          strength: volumeWeight * (data[i].high - data[i].low)
        });
      }
    }
    
    const avgStrength = this.average(levels.map(l => l.strength)) || 1;
    const significantLevels = levels.filter(l => l.strength > avgStrength);
    
    return {
      support: significantLevels.length > 0 ? 
        Math.min(...significantLevels.map(l => l.price)) : 
        Math.min(...data.slice(-20).map(d => d.low)),
      resistance: significantLevels.length > 0 ?
        Math.max(...significantLevels.map(l => l.price)) :
        Math.max(...data.slice(-20).map(d => d.high))
    };
  }

  calculateVWMA(data, period) {
    if (data.length < period) return new Array(data.length).fill(0);
    
    const vwma = [];
    for (let i = period-1; i < data.length; i++) {
      const slice = data.slice(i-period+1, i+1);
      const sumPV = slice.reduce((sum, d) => sum + (d.close * d.volume), 0);
      const sumV = slice.reduce((sum, d) => sum + d.volume, 0);
      vwma.push(sumPV / (sumV || 1));
    }
    
    return vwma;
  }

  calculateMFI(data, period) {
    const moneyFlows = [];
    for (let i = 1; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const moneyFlow = typicalPrice * data[i].volume;
      moneyFlows.push({
        positive: data[i].close > data[i-1].close ? moneyFlow : 0,
        negative: data[i].close < data[i-1].close ? moneyFlow : 0
      });
    }
    
    let posMF = 0, negMF = 0;
    for (let i = 0; i < period; i++) {
      posMF += moneyFlows[moneyFlows.length-1-i].positive;
      negMF += moneyFlows[moneyFlows.length-1-i].negative;
    }
    
    const mfi = 100 - (100 / (1 + (posMF / (negMF || 0.0001))));
    return Math.min(Math.max(mfi, 0), 100);
  }

  calculateCMF(data, period) {
    const cmfValues = [];
    for (let i = 0; i < data.length; i++) {
      const moneyFlowMultiplier = ((data[i].close - data[i].low) - (data[i].high - data[i].close)) / 
                                (data[i].high - data[i].low || 1);
      const moneyFlowVolume = moneyFlowMultiplier * data[i].volume;
      cmfValues.push(moneyFlowVolume);
    }
    
    const periodVolume = data.slice(-period).reduce((sum, d) => sum + d.volume, 0);
    const periodMF = cmfValues.slice(-period).reduce((sum, v) => sum + v, 0);
    
    return periodMF / (periodVolume || 1);
  }

  calculateATR(data, period = 14) {
    if (data.length < period + 1) return 0;
    
    let trSum = 0;
    for (let i = 1; i <= period; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i-1].close;
      trSum += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    }
    return trSum / period;
  }

  determineTrend(vwma20, vwma50, currentPrice) {
    if (vwma20.length < 2 || vwma50.length < 2) return "Neutral";
    
    const vwma20Slope = vwma20[vwma20.length-1] - vwma20[vwma20.length-2];
    const vwma50Slope = vwma50[vwma50.length-1] - vwma50[vwma50.length-2];
    const above20 = currentPrice > vwma20[vwma20.length-1];
    const above50 = currentPrice > vwma50[vwma50.length-1];
    
    if (above20 && above50 && vwma20Slope > 0 && vwma50Slope > 0) {
      return "Strong Uptrend";
    } else if (above20 && vwma20Slope > 0) {
      return "Weak Uptrend";
    } else if (!above20 && !above50 && vwma20Slope < 0 && vwma50Slope < 0) {
      return "Strong Downtrend";
    } else if (!above20 && vwma20Slope < 0) {
      return "Weak Downtrend";
    }
    return "Neutral";
  }

  async generateTradingSignals(coin) {
  try {
    const [marketData, ticker24h, funding, oiData] = await Promise.all([
      this.fetchMarketData(coin.symbol),
      this.fetch24hTicker(coin.symbol),
      this.fetchFundingRate(coin.symbol),
      this.fetchOpenInterest(coin.symbol)
    ]);

    if (!marketData || !ticker24h) throw new Error('Market data fetch failed');

    const processedData = marketData.map(d => ({
      time: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
      quoteVolume: parseFloat(d[7])
    }));

    const currentPrice = parseFloat(ticker24h.lastPrice);
    const currentVolume = parseFloat(ticker24h.volume);
    const currentQuoteVolume = parseFloat(ticker24h.quoteVolume);
    const avgVolume = this.average(processedData.slice(-30).map(d => d.volume));
    const volumeRatio = currentVolume / avgVolume;
    const isHighConviction = volumeRatio > 1.5 && currentQuoteVolume > 1000000;

    const { support, resistance } = this.calculateVolumeWeightedSR(processedData);
    const atr = this.calculateATR(processedData);
    const vwma20 = this.calculateVWMA(processedData, 20);
    const vwma50 = this.calculateVWMA(processedData, 50);
    const mfi = this.calculateMFI(processedData, 14);
    const cmf = this.calculateCMF(processedData, 20);
    const trend = this.determineTrend(vwma20, vwma50, currentPrice);

    // Funding Rate & Open Interest (safe defaults)
    let fundingRate = 0;
    if (funding && funding.lastFundingRate) {
      fundingRate = parseFloat(funding.lastFundingRate);
    }

    let oiChange = 0;
    if (oiData && oiData.length >= 2) {
      const latestOI = parseFloat(oiData[oiData.length - 1].sumOpenInterest);
      const prevOI = parseFloat(oiData[oiData.length - 2].sumOpenInterest);
      oiChange = latestOI - prevOI;
    }

    let confidence = 0;
    const signals = [];

    if (trend.includes("Uptrend")) {
      confidence += isHighConviction ? 0.4 : 0.2;
      signals.push(trend);
      if (currentPrice > vwma20[vwma20.length - 1]) {
        confidence += 0.1;
        signals.push("Price > VWMA20");
      }
    } else if (trend.includes("Downtrend")) {
      confidence -= isHighConviction ? 0.4 : 0.2;
      signals.push(trend);
      if (currentPrice < vwma20[vwma20.length - 1]) {
        confidence -= 0.1;
        signals.push("Price < VWMA20");
      }
    }

    if (mfi > 80) {
      confidence -= 0.3;
      signals.push("Overbought (MFI)");
    } else if (mfi < 20) {
      confidence += isHighConviction ? 0.4 : 0.2;
      signals.push("Oversold (MFI)");
    }

    if (cmf > 0.2) {
      confidence += 0.25;
      signals.push("Strong Money Inflow");
    } else if (cmf < -0.2) {
      confidence -= 0.25;
      signals.push("Strong Money Outflow");
    }

    if (volumeRatio > 2) {
      confidence += trend.includes("Uptrend") ? 0.3 : -0.3;
      signals.push(`Volume Spike (${volumeRatio.toFixed(1)}x)`);
    }

    if (currentPrice <= support * 1.02 && currentPrice >= support * 0.98) {
      confidence += 0.2;
      signals.push("Near Support");
    } else if (currentPrice <= resistance * 1.02 && currentPrice >= resistance * 0.98) {
      confidence -= 0.2;
      signals.push("Near Resistance");
    }

    // Funding signals
    if (fundingRate > 0.0005) {
      confidence += 0.1;
      signals.push("⚠️ Short Squeeze Risk (shorts overcrowded)");
    } else if (fundingRate < -0.0005) {
      confidence -= 0.1;
      signals.push("⚠️ Long Squeeze Risk (longs overcrowded)");
    } else {
      signals.push("Funding Balanced");
    }

    // OI signals
    if (oiChange > 0 && trend.includes("Uptrend")) {
      confidence += 0.1;
      signals.push("OI Rising with Uptrend (Bullish Conviction)");
    } else if (oiChange > 0 && trend.includes("Downtrend")) {
      confidence -= 0.1;
      signals.push("OI Rising with Downtrend (Bearish Conviction)");
    } else {
      signals.push("OI Stable/Decreasing");
    }

        const baseRec = this.generateRecommendation(
      confidence,
      currentPrice,
      support,
      resistance,
      atr,
      trend,
      isHighConviction
    );

    // Get price/volume changes for overrides
    const priceChangePct = ((processedData[processedData.length-1].close -
                            processedData[processedData.length-4].close) /
                            processedData[processedData.length-4].close) * 100;
    const volumeSpike = volumeRatio > 5;
    const whaleData = { buyDetected: false, sellDetected: false }; // placeholder until whale API

    // Final decision
    const finalSignal = this.getFinalSignal(baseRec.positionType, {
      priceChangePct,
      volumeSpike,
      sellVolumeSpike: false // later refine
    }, whaleData);

    // Detect candlestick patterns
    const patterns = this.detectCandlestickPatterns(processedData);

    return {
      currentPrice,
      quoteVolume: currentQuoteVolume,
      indicators: {
        trend,
        mfi: mfi.toFixed(2),
        cmf: cmf.toFixed(3),
        volumeRatio: volumeRatio.toFixed(2),
        vwma20: this.formatPrice(vwma20[vwma20.length-1] || 0),
        vwma50: this.formatPrice(vwma50[vwma50.length-1] || 0),
        atr: this.formatPrice(atr),
        support: this.formatPrice(support),
        resistance: this.formatPrice(resistance),
        fundingRate: this.formatPrice(fundingRate * 100) + "%",
        oiChange: oiChange.toFixed(2)
      },
      signals,
      recommendation: baseRec,
      finalSignal,
      patterns,
      isHighConviction
    };
  } catch (error) {
    console.error(`Error generating signals for ${coin.name}:`, error);
    return { error: error.message };
  }
 }

 // === Final Signal Pipeline ===
getFinalSignal(baseSignal, marketData, whaleData) {
  let signal = baseSignal;  
  let overrideReason = null;  
  let confidence = baseSignal === "BUY" ? 1 : baseSignal === "SELL" ? -1 : 0;

  // ✅ Momentum Override (stricter)
if (signal === "SELL" && marketData.priceChangePct > 3) {
  signal = "HOLD";
  overrideReason = "Pump detected (Price ↑)";
  confidence = Math.max(confidence, 0);
} else if (signal === "BUY" && marketData.priceChangePct < -3) {
  signal = "HOLD";
  overrideReason = "Dump detected (Price ↓)";
  confidence = Math.min(confidence, 0);
}

// ✅ Volume Override (refined — only fires if conflict)
if (signal === "SELL" && marketData.volumeSpike) {
  signal = "HOLD";
  overrideReason = "Conflict: High Volume vs SELL signal";
  confidence = Math.max(confidence, 0);
} else if (signal === "BUY" && marketData.sellVolumeSpike) {
  signal = "HOLD";
  overrideReason = "Conflict: Heavy Sell-Side Volume vs BUY signal";
  confidence = Math.min(confidence, 0);
}

  // ✅ Whale Override
  if (whaleData.buyDetected) {
    if (signal === "SELL") signal = "HOLD";
    else if (signal === "HOLD") signal = "BUY";
    overrideReason = "Whale Buy Detected";
    confidence += 1;
  } else if (whaleData.sellDetected) {
    if (signal === "BUY") signal = "HOLD";
    else if (signal === "HOLD") signal = "SELL";
    overrideReason = "Whale Sell Detected";
    confidence -= 1;
  }

  // ✅ Cap confidence
  confidence = Math.max(-2, Math.min(2, confidence));

  return { signal, confidence, overrideReason };
 }

 // === Detect Major Candlestick Patterns ===
detectCandlestickPatterns(data) {
  if (!data || data.length < 3) return [];

  const patterns = [];
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const prev2 = data[data.length - 3];

  const body = Math.abs(last.close - last.open);
  const upperWick = last.high - Math.max(last.close, last.open);
  const lowerWick = Math.min(last.close, last.open) - last.low;
  const candleRange = last.high - last.low;

  // -------------------------
  // 🔹 Single-Candle Patterns
  // -------------------------

  // Hammer (Bullish) - long lower wick, small body on top
  if (lowerWick > 2 * body && last.close > last.open) {
    patterns.push("Hammer 🟢");
  }

  // Inverted Hammer (Bullish) - long upper wick, small body at bottom
  if (upperWick > 2 * body && last.close > last.open) {
    patterns.push("Inverted Hammer 🟢");
  }

  // Shooting Star (Bearish) - long upper wick, small body at bottom (but close lower)
  if (upperWick > 2 * body && last.close < last.open) {
    patterns.push("Shooting Star 🔴");
  }

  // Doji (Indecision) - open ≈ close
  if (Math.abs(last.close - last.open) <= candleRange * 0.1) {
    patterns.push("Doji ⚪");
  }

  // Spinning Top (Indecision but with wicks both sides)
  if (body <= candleRange * 0.3 && upperWick > body && lowerWick > body) {
    patterns.push("Spinning Top ⚪");
  }

  // -------------------------
  // 🔹 Dual-Candle Patterns
  // -------------------------

  // Bullish Engulfing
  if (last.close > last.open && prev.close < prev.open &&
      last.close > prev.open && last.open < prev.close) {
    patterns.push("Bullish Engulfing 🟢");
  }

  // Bearish Engulfing
  if (last.close < last.open && prev.close > prev.open &&
      last.open > prev.close && last.close < prev.open) {
    patterns.push("Bearish Engulfing 🔴");
  }

  // Piercing Line (Bullish) - gap down then strong bullish close > mid of prev
  if (prev.close < prev.open && last.open < prev.low && last.close > (prev.open + prev.close) / 2) {
    patterns.push("Piercing Line 🟢");
  }

  // Dark Cloud Cover (Bearish) - gap up then bearish close < mid of prev
  if (prev.close > prev.open && last.open > prev.high && last.close < (prev.open + prev.close) / 2) {
    patterns.push("Dark Cloud Cover 🔴");
  }

  // -------------------------
  // 🔹 Triple-Candle Patterns
  // -------------------------

  // Morning Star (Bullish) - downtrend, small body, then strong bullish
  if (prev2.close < prev2.open && Math.abs(prev.close - prev.open) <= candleRange * 0.3 &&
      last.close > (prev2.open + prev2.close) / 2) {
    patterns.push("Morning Star ⭐🟢");
  }

  // Evening Star (Bearish) - uptrend, small body, then strong bearish
  if (prev2.close > prev2.open && Math.abs(prev.close - prev.open) <= candleRange * 0.3 &&
      last.close < (prev2.open + prev2.close) / 2) {
    patterns.push("Evening Star ⭐🔴");
  }

  // Three White Soldiers (Bullish continuation)
  if (last.close > last.open && prev.close > prev.open && prev2.close > prev2.open &&
      last.close > prev.close && prev.close > prev2.close) {
    patterns.push("Three White Soldiers 🟢");
  }

  // Three Black Crows (Bearish continuation)
  if (last.close < last.open && prev.close < prev.open && prev2.close < prev2.open &&
      last.close < prev.close && prev.close < prev2.close) {
    patterns.push("Three Black Crows 🔴");
  }

  return patterns;
 }

  generateRecommendation(confidence, price, support, resistance, atr, trend, isHighConviction) {
  const positionType =
    confidence >= (isHighConviction ? 0.5 : 0.7) ? "BUY" :
    confidence <= (isHighConviction ? -0.5 : -0.7) ? "SELL" : "HOLD";

  let entryPrice, stopLoss, takeProfit, riskRewardRatio;

  if (positionType === "BUY") {
    entryPrice = price;
    stopLoss = Math.min(
      support,
      price * 0.97,
      price - (2 * atr)
    );
    takeProfit = entryPrice + (entryPrice - stopLoss) *
               (isHighConviction ? this.config.baseRiskReward * this.config.highConvictionMultiplier : this.config.baseRiskReward);
    riskRewardRatio = ((takeProfit - entryPrice) / (entryPrice - stopLoss)).toFixed(2);
  } 
  else if (positionType === "SELL") {
    entryPrice = price;
    stopLoss = Math.max(
      resistance,
      price * 1.03,
      price + (2 * atr)
    );
    takeProfit = entryPrice - (stopLoss - entryPrice) *
               (isHighConviction ? this.config.baseRiskReward * this.config.highConvictionMultiplier : this.config.baseRiskReward);
    riskRewardRatio = ((entryPrice - takeProfit) / (stopLoss - entryPrice)).toFixed(2);
  }

  return {
    positionType,
    entryPrice: entryPrice ? this.formatPrice(entryPrice) : "N/A",
    stopLoss: stopLoss ? this.formatPrice(stopLoss) : "N/A",
    takeProfit: takeProfit ? this.formatPrice(takeProfit) : "N/A",
    riskRewardRatio: riskRewardRatio || "N/A",
    confidence: confidence.toFixed(2),
    isHighConviction
  };
}

  async updateCoin(coin) {
    try {
      this.showStatus(`🔄 Analyzing ${coin.name}...`, "loading");
      
      const analysis = await this.generateTradingSignals(coin);
      if (analysis.error) throw new Error(analysis.error);
      
      const coinElement = document.getElementById(coin.id);
      if (!coinElement) throw new Error(`Element for ${coin.id} not found`);
      
      coinElement.querySelector('.price .value').textContent = this.formatPrice(analysis.currentPrice);
      coinElement.querySelector('.volume .value').textContent = (analysis.quoteVolume / 1000000).toFixed(2) + 'M';
      coinElement.querySelector('.trend .value').textContent = analysis.indicators.trend;
      coinElement.querySelector('.mfi .value').textContent = analysis.indicators.mfi;
      coinElement.querySelector('.cmf .value').textContent = analysis.indicators.cmf;
      
      const rec = analysis.recommendation;
      coinElement.querySelector('.confidence .value').textContent = rec.confidence;
      coinElement.querySelector('.position-type .value').textContent = rec.positionType;
      coinElement.querySelector('.entry-price .value').textContent = this.formatPrice(rec.entryPrice);
      coinElement.querySelector('.stop-loss .value').textContent = this.formatPrice(rec.stopLoss);
      coinElement.querySelector('.take-profit .value').textContent = this.formatPrice(rec.takeProfit);
      coinElement.querySelector('.risk-reward .value').textContent = rec.riskRewardRatio;

      // === Override & Pattern Display ===
  if (analysis.finalSignal) {
  const { signal, confidence, overrideReason } = analysis.finalSignal;

  // Update recommendation UI
  const posEl = coinElement.querySelector('.position-type .value');
  posEl.textContent = signal;
  posEl.parentElement.className = 'position-type ' + 
    (signal === 'BUY' ? 'buy-signal' : signal === 'SELL' ? 'sell-signal' : 'hold-signal');

  // Show override warning
  if (overrideReason) {
    let warnEl = coinElement.querySelector('.override-warning');
    if (!warnEl) {
      warnEl = document.createElement('div');
      warnEl.className = 'override-warning';
      coinElement.querySelector('.coin-data').appendChild(warnEl);
    }
    warnEl.textContent = `⚠️ Overridden: ${overrideReason}`;
    warnEl.style.color = "#ffc107";
  }

  // Show confidence
  coinElement.querySelector('.confidence .value').textContent = confidence;

  // Show detected candlestick patterns
  const patternTags = analysis.patterns || [];
  const signalsList = coinElement.querySelector('.signals-list');
  if (signalsList) {
    patternTags.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `🕯️ ${p}`;
      signalsList.appendChild(li);
    });
  }
}

        // === ✅ New: Funding + OI + Squeeze ===
      coinElement.querySelector('.funding-rate .value').textContent = analysis.indicators.fundingRate;
      coinElement.querySelector('.oi-change .value').textContent = analysis.indicators.oiChange;

      const squeezeEl = coinElement.querySelector('.squeeze-warning .value');
      const squeezeText = analysis.signals.find(s => s.includes("Squeeze")) || "Balanced";
      squeezeEl.textContent = squeezeText;

        // Color coding
        if (squeezeText.includes("Short Squeeze")) {
          squeezeEl.style.color = "#ff5252"; // red
        } else if (squeezeText.includes("Long Squeeze")) {
          squeezeEl.style.color = "#ff9800"; // orange
      } else {
        squeezeEl.style.color = "#4caf50"; // green
      }
      
      coin.entryPrice = parseFloat(rec.entryPrice);
      coin.stopLoss = parseFloat(rec.stopLoss);
      coin.takeProfit = parseFloat(rec.takeProfit);
      
      const signalsList = coinElement.querySelector('.signals-list');
      if (signalsList) {
        signalsList.innerHTML = analysis.signals.map(s => `<li>${s}</li>`).join('');
      }
      
      this.updateSimulation(coin);
      
      const now = new Date();
      coinElement.querySelector('.update-time').textContent = now.toLocaleTimeString();
      coinElement.querySelector('.update-time').classList.remove('live');
      
      const positionElement = coinElement.querySelector('.position-type');
      if (positionElement) {
        positionElement.className = 'position-type ' + 
          (rec.positionType === 'BUY' ? 'buy-signal' : 
           rec.positionType === 'SELL' ? 'sell-signal' : 'hold-signal');
        
        if (analysis.isHighConviction) {
          coinElement.classList.add('high-conviction');
        } else {
          coinElement.classList.remove('high-conviction');
        }
      }
      
      const errorElement = coinElement.querySelector('.error');
      if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating ${coin.name}:`, error);
      const coinElement = document.getElementById(coin.id);
      if (coinElement) {
        const errorElement = coinElement.querySelector('.error') || document.createElement('div');
        errorElement.className = 'error';
        errorElement.textContent = `Error: ${error.message}`;
        errorElement.style.display = 'block';
        coinElement.appendChild(errorElement);
      }
      return false;
    }
  }

  async updateAll() {
    if (this.coins.length === 0) return;
    
    const updateTime = new Date();
    this.showStatus(`⏳ Updating all coins...`, "loading");
    document.getElementById("last-update").textContent = updateTime.toLocaleString();
    
    try {
      const updatePromises = this.coins.map(coin => this.updateCoin(coin));
      const results = await Promise.all(updatePromises);
      
      if (results.every(Boolean)) {
        this.showStatus(`✅ Updated at ${updateTime.toLocaleTimeString()}`, "success");
      } else {
        this.showStatus(`⚠️ Partial update at ${updateTime.toLocaleTimeString()}`, "warning");
      }
    } catch (error) {
      console.error('Update failed:', error);
      this.showStatus(`❌ Update failed at ${updateTime.toLocaleTimeString()}`, "error");
    }
  }

  async addCoinToDOM(coin) {
    const template = document.getElementById("coin-template");
    const clone = template.content.cloneNode(true);
    const coinElement = clone.querySelector(".coin");
    coinElement.id = coin.id;
    
    coinElement.querySelector(".coin-name").textContent = coin.name;
    const logoImg = coinElement.querySelector(".coin-logo");
    logoImg.src = coin.logo;
    logoImg.alt = `${coin.name} Logo`;
    logoImg.onerror = () => {
      logoImg.src = coin.fallbackLogo;
    };
    
    coinElement.querySelector(".remove-coin").addEventListener("click", () => {
      this.removeCoin(coin.id);
    });
    
    document.getElementById("dynamic-results").prepend(coinElement);
  }

  removeCoin(coinId) {
    const element = document.getElementById(coinId);
    if (element) element.remove();
    this.coins = this.coins.filter(c => c.id !== coinId);
    
    if (this.priceWebSockets[coinId]) {
      this.priceWebSockets[coinId].close();
      delete this.priceWebSockets[coinId];
    }
  }

  showStatus(message, type = "info") {
    const statusElement = document.getElementById("status");
    statusElement.textContent = message;
    
    statusElement.style.color = "";
    statusElement.style.fontWeight = "";
    
    if (type === "error") {
      statusElement.style.color = "#f44336";
    } else if (type === "warning") {
      statusElement.style.color = "#ffc107";
    } else if (type === "success") {
      statusElement.style.color = "#4caf50";
    } else if (type === "loading") {
      statusElement.style.fontWeight = "bold";
    }
  }

  average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / (arr.length || 1);
  }

  // Add this method to your AdvancedCryptoTradingAdvisor class
  async fetchCoinGeckoLogo(symbol) {
    try {
      const cgListRes = await fetch('https://api.coingecko.com/api/v3/coins/list');
      const cgList = await cgListRes.json();
      const cgCoin = cgList.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
      if (cgCoin) {
        const cgDetailRes = await fetch(`https://api.coingecko.com/api/v3/coins/${cgCoin.id}`);
        if (cgDetailRes.ok) {
          const cgDetail = await cgDetailRes.json();
          return cgDetail.image?.large || cgDetail.image?.thumb || this.config.fallbackLogo;
        }
      }
    } catch (e) {}
    return this.config.fallbackLogo;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new AdvancedCryptoTradingAdvisor();
  } catch (error) {
    console.error("Failed to initialize trading advisor:", error);
    document.getElementById("status").textContent = "❌ Initialization failed";
    document.getElementById("status").style.color = "#f44336";
  }
});

function updatePatternsUI(patterns, symbol) {
  const patternsBox = document.getElementById("patterns");
  patternsBox.innerHTML = "";

  patterns.forEach(p => {
    let type = "neutral";
    if (p.includes("Bullish")) type = "bullish";
    if (p.includes("Bearish")) type = "bearish";

    const tag = document.createElement("div");
    tag.className = `pattern-tag ${type}`;
    tag.innerHTML = `${patternInfo[p]?.icon || "🕯️"} ${p}`;

    // On click → open modal with details + chart
    tag.onclick = async () => {
      document.getElementById("pattern-title").innerText = p;
      document.getElementById("pattern-desc").innerText = patternInfo[p]?.desc || "No description available.";
      document.getElementById("pattern-modal").style.display = "block";
      await showPatternChart(symbol, p);
    };

    patternsBox.appendChild(tag);
  });
}

document.getElementById("close-modal").onclick = () => {
  document.getElementById("pattern-modal").style.display = "none";
};
