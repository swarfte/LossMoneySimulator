"use server";

import YahooFinance from "yahoo-finance2";

// 匿名股票池，全程只显示行业，结束才公布代码
const ANONYMOUS_POOL = [
  { symbol: "NVDA", industry: "科技行业 (半导体)" },
  { symbol: "TSLA", industry: "新能源汽车行业" },
  { symbol: "AAPL", industry: "科技行业 (消费电子)" },
  { symbol: "MSFT", industry: "科技行业 (软件)" },
  { symbol: "GOOGL", industry: "科技行业 (互联网)" },
  { symbol: "AMZN", industry: "电子商务行业" },
  { symbol: "META", industry: "社交媒体行业" },
  { symbol: "AMD", industry: "科技行业 (半导体)" },
  { symbol: "JPM", industry: "金融行业" },
  { symbol: "SPY", industry: "标普500指数" },
  { symbol: "QQQ", industry: "纳斯达克100指数" },
  { symbol: "BTC-USD", industry: "加密货币 (比特币)" },
];

export interface GameData {
  symbol: string;
  industry: string;
  prices: { date: string; price: number }[];
}

// 核心：获取随机股票的过去一年真实历史数据
export async function getRandomStockData(): Promise<GameData> {
  // 1. 随机抽取一只股票
  const stock =
    ANONYMOUS_POOL[Math.floor(Math.random() * ANONYMOUS_POOL.length)];

  // 2. 设定时间范围：过去一整年
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  // 3. 实例化Yahoo Finance客户端（严格遵循v3版本官方用法）
  const yahooClient = new YahooFinance();

  try {
    // 4. 调用API获取日线数据
    const result = await yahooClient.historical(stock.symbol, {
      period1: Math.floor(startDate.getTime() / 1000),
      period2: Math.floor(endDate.getTime() / 1000),
      interval: "1d",
    });

    // 5. 清洗数据，只保留日期和收盘价
    const prices = result
      .filter((day: any) => day.close)
      .map((day: any) => ({
        date: day.date.toISOString().split("T")[0],
        price: day.close,
      }));

    return {
      symbol: stock.symbol,
      industry: stock.industry,
      prices,
    };
  } catch (error) {
    console.error("获取股票数据失败", error);
    // 保底方案：API失败时生成模拟数据，保证页面不会崩溃
    const fallbackPrices = Array.from({ length: 252 }, (_, i) => {
      const basePrice = 100 + Math.random() * 400;
      const volatility = 0.025;
      const change = (Math.random() - 0.5) * 2 * volatility;
      return {
        date: new Date(Date.now() - (252 - i) * 86400000)
          .toISOString()
          .split("T")[0],
        price: Math.max(basePrice * (1 + change), 1),
      };
    });
    return {
      symbol: "DEMO",
      industry: "演示行业",
      prices: fallbackPrices,
    };
  }
}
