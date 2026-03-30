import React, { useState, useMemo, useEffect } from "react";
import { Line } from "react-chartjs-2";
import yahooFinance from "yahoo-finance2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// --- 类型定义 ---
interface StockTarget {
  symbol: string;
  industry: string;
}

interface Position {
  type: "long" | "short";
  shares: number;
  entryPrice: number;
}

interface HistoricalPrice {
  date: string;
  price: number;
}

// --- 大型匿名股票池 (只含代码和行业，全程保密) ---
const ANONYMOUS_STOCK_POOL: StockTarget[] = [
  // 科技 (Tech)
  { symbol: "AAPL", industry: "科技行业" },
  { symbol: "MSFT", industry: "科技行业" },
  { symbol: "GOOGL", industry: "科技行业" },
  { symbol: "AMZN", industry: "科技行业" },
  { symbol: "NVDA", industry: "科技行业" },
  { symbol: "TSLA", industry: "科技行业" },
  { symbol: "META", industry: "科技行业" },
  { symbol: "AMD", industry: "科技行业" },

  // 金融 (Finance)
  { symbol: "JPM", industry: "金融行业" },
  { symbol: "BAC", industry: "金融行业" },
  { symbol: "WFC", industry: "金融行业" },
  { symbol: "GS", industry: "金融行业" },
  { symbol: "MS", industry: "金融行业" },

  // 消费 (Consumer)
  { symbol: "PG", industry: "消费品行业" },
  { symbol: "KO", industry: "消费品行业" },
  { symbol: "PEP", industry: "消费品行业" },
  { symbol: "MCD", industry: "消费品行业" },
  { symbol: "NKE", industry: "消费品行业" },
  { symbol: "SBUX", industry: "消费品行业" },

  // 医疗 (Healthcare)
  { symbol: "JNJ", industry: "医疗健康行业" },
  { symbol: "UNH", industry: "医疗健康行业" },
  { symbol: "PFE", industry: "医疗健康行业" },
  { symbol: "MRK", industry: "医疗健康行业" },
  { symbol: "ABBV", industry: "医疗健康行业" },

  // 能源 (Energy)
  { symbol: "XOM", industry: "能源行业" },
  { symbol: "CVX", industry: "能源行业" },
  { symbol: "COP", industry: "能源行业" },
  { symbol: "SLB", industry: "能源行业" },

  // 工业制造 (Industrial)
  { symbol: "BA", industry: "工业制造行业" },
  { symbol: "CAT", industry: "工业制造行业" },
  { symbol: "GE", industry: "工业制造行业" },
  { symbol: "HON", industry: "工业制造行业" },

  // 电信 (Telecom)
  { symbol: "T", industry: "电信通讯行业" },
  { symbol: "VZ", industry: "电信通讯行业" },

  // 房地产 (REITs)
  { symbol: "PLD", industry: "房地产行业" },
  { symbol: "AMT", industry: "房地产行业" },
  { symbol: "EQIX", industry: "房地产行业" },

  // 中概股 (China Concept) - 增加波动性
  { symbol: "BABA", industry: "电子商务行业" },
  { symbol: "JD", industry: "电子商务行业" },
  { symbol: "PDD", industry: "电子商务行业" },
  { symbol: "NIO", industry: "新能源汽车行业" },
  { symbol: "LI", industry: "新能源汽车行业" },

  // 贵金属/ETF (Commodities)
  { symbol: "GLD", industry: "黄金ETF" },
  { symbol: "SLV", industry: "白银ETF" },
  { symbol: "USO", industry: "原油ETF" },
  { symbol: "SPY", industry: "标普500指数" },
  { symbol: "QQQ", industry: "纳斯达克100指数" },
];

// --- 主组件 ---

export default function StockSimulator() {
  // -- State --
  const [gameState, setGameState] = useState<
    "setup" | "loading" | "playing" | "ended"
  >("setup");
  const [currentStockInfo, setCurrentStockInfo] = useState<StockTarget | null>(
    null,
  );
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(90);
  const [cash, setCash] = useState(20000);
  const [position, setPosition] = useState<Position | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -- 核心逻辑：使用 yahoo-finance2 获取真实数据 --
  const fetchDataAndStart = async () => {
    setGameState("loading");
    setErrorMsg(null);

    // 1. 随机抽取一只股票
    const randomStock =
      ANONYMOUS_STOCK_POOL[
        Math.floor(Math.random() * ANONYMOUS_STOCK_POOL.length)
      ];

    // 2. 设定时间范围 (过去一年)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const queryOptions = {
      period1: Math.floor(startDate.getTime() / 1000),
      period2: Math.floor(endDate.getTime() / 1000),
      interval: "1d" as const,
    };

    try {
      // 尝试直接获取 (可能会有CORS问题，取决于Yahoo)
      // yahoo-finance2 浏览器模式下会自动尝试处理，但为了保险，我们用一个简单的Fetch包装逻辑
      // 这里我们直接使用库的标准调用
      const result = await yahooFinance.historical(
        randomStock.symbol,
        queryOptions,
      );

      if (result && result.length > 0) {
        // 清洗数据：只取日期和收盘价，去除空值
        const cleanData: HistoricalPrice[] = result
          .filter((day: any) => day.close)
          .map((day: any) => ({
            date: day.date.toISOString().split("T")[0],
            price: day.close,
          }));

        // 确保数据足够长
        if (cleanData.length > 120) {
          setCurrentStockInfo(randomStock);
          setHistoricalData(cleanData);
          setCurrentDayIndex(90);
          setCash(20000);
          setPosition(null);
          setGameState("playing");
        } else {
          throw new Error("数据长度不足，正在重试...");
        }
      } else {
        throw new Error("未获取到数据");
      }
    } catch (error) {
      console.error("获取数据失败，尝试备用方案", error);
      // 如果 API 挂了或者 CORS 了，我们用一个稍微聪明点的模拟数据生成器保底
      startWithFallbackData(randomStock);
    }
  };

  // 保底方案：几何布朗运动模拟 (以防 API 限流)
  const startWithFallbackData = (stock: StockTarget) => {
    const days = 252;
    let price = 100 + Math.random() * 400;
    const data: HistoricalPrice[] = [];
    const date = new Date();
    date.setDate(date.getDate() - days);

    for (let i = 0; i < days; i++) {
      const volatility = 0.025;
      const drift = 0.0005;
      const change = (Math.random() - 0.5) * 2 * volatility + drift;
      price = price * (1 + change);

      data.push({
        date: date.toISOString().split("T")[0],
        price: Math.max(price, 1),
      });
      date.setDate(date.getDate() + 1);
    }

    setCurrentStockInfo(stock);
    setHistoricalData(data);
    setCurrentDayIndex(90);
    setCash(20000);
    setPosition(null);
    setGameState("playing");
  };

  // -- 游戏逻辑 (与之前版本一致) --

  const visibleData = useMemo(() => {
    return historicalData.slice(0, currentDayIndex + 1);
  }, [historicalData, currentDayIndex]);

  const currentPrice = historicalData[currentDayIndex]?.price || 0;

  const portfolioValue = useMemo(() => {
    let val = cash;
    if (position) {
      if (position.type === "long") {
        val += position.shares * currentPrice;
      } else {
        val = cash - position.shares * currentPrice;
      }
    }
    return val;
  }, [cash, position, currentPrice]);

  const handleAction = (type: "buy" | "sell" | "short" | "cover") => {
    if (!position) {
      if (type === "buy") {
        const maxShares = Math.floor(cash / currentPrice);
        if (maxShares > 0) {
          setPosition({
            type: "long",
            shares: maxShares,
            entryPrice: currentPrice,
          });
          setCash(cash - maxShares * currentPrice);
        }
      } else if (type === "short") {
        const maxShares = Math.floor(cash / currentPrice);
        if (maxShares > 0) {
          setPosition({
            type: "short",
            shares: maxShares,
            entryPrice: currentPrice,
          });
          setCash(cash + maxShares * currentPrice);
        }
      }
    } else {
      if (position.type === "long" && type === "sell") {
        setCash(cash + position.shares * currentPrice);
        setPosition(null);
      } else if (position.type === "short" && type === "cover") {
        setCash(cash - position.shares * currentPrice);
        setPosition(null);
      }
    }
  };

  const nextDay = () => {
    if (currentDayIndex < historicalData.length - 1) {
      setCurrentDayIndex((prev) => prev + 1);
    } else {
      setGameState("ended");
    }
  };

  // --- 渲染 ---

  const chartData = {
    labels: visibleData.map((d) => d.date),
    datasets: [
      {
        label: "Price",
        data: visibleData.map((d) => d.price),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { maxTicksLimit: 10 },
      },
      y: { display: true, grid: { color: "rgba(0,0,0,0.05)" } },
    },
  };

  // 1. 开始界面
  if (gameState === "setup") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            盲盘挑战
          </h1>
          <p className="text-slate-400 mb-8">
            基于真实市场历史数据，测试你的交易直觉。
          </p>

          <div className="space-y-4 mb-8 text-left bg-slate-900/50 p-6 rounded-xl">
            <h3 className="font-semibold text-blue-400">规则:</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>
                初始资金 <span className="text-white font-bold">¥20,000</span>
              </li>
              <li>随机抽取一只真实股票，仅显示行业</li>
              <li>
                支持 <span className="text-green-400">做多</span> 与{" "}
                <span className="text-red-400">做空</span>
              </li>
            </ul>
          </div>

          <button
            onClick={fetchDataAndStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
          >
            开始挑战
          </button>
        </div>
      </div>
    );
  }

  // 2. 加载界面
  if (gameState === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-slate-400">正在从市场获取数据...</p>
      </div>
    );
  }

  // 3. 主游戏界面
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-slate-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-slate-400 block">当前标的</span>
            <span className="font-bold text-lg">
              {currentStockInfo?.industry}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">进度</span>
            <span className="font-mono font-bold">
              {currentDayIndex - 90} / {historicalData.length - 90}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">净资产</span>
            <span className="font-bold text-xl text-white">
              $
              {portfolioValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            className={`px-4 py-2 rounded-lg ${portfolioValue - 20000 >= 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}
          >
            <span className="text-xs block opacity-70">收益率</span>
            <span className="font-bold">
              {(((portfolioValue - 20000) / 20000) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <div className="lg:col-span-8 bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                ${currentPrice.toFixed(2)}
              </h2>
              <p className="text-slate-400 text-sm">
                {visibleData[visibleData.length - 1]?.date}
              </p>
            </div>
            {position && (
              <div
                className={`px-3 py-1 rounded-full text-sm font-bold ${position.type === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              >
                {position.type.toUpperCase()} {position.shares} 股
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[400px] relative">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Account */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold mb-4">账户状态</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>现金</span>
                <span className="text-white">${cash.toFixed(2)}</span>
              </div>
              {position && (
                <div className="flex justify-between text-slate-400">
                  <span>持仓盈亏</span>
                  <span
                    className={
                      (position.type === "long" &&
                        currentPrice > position.entryPrice) ||
                      (position.type === "short" &&
                        currentPrice < position.entryPrice)
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {position.type === "long"
                      ? (
                          (currentPrice - position.entryPrice) *
                          position.shares
                        ).toFixed(2)
                      : (
                          (position.entryPrice - currentPrice) *
                          position.shares
                        ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex-1 flex flex-col justify-center gap-4">
            {!position ? (
              <>
                <button
                  onClick={() => handleAction("buy")}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all"
                >
                  满仓买入 (做多)
                </button>
                <button
                  onClick={() => handleAction("short")}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
                >
                  满仓做空
                </button>
              </>
            ) : (
              <>
                {position.type === "long" ? (
                  <button
                    onClick={() => handleAction("sell")}
                    className="w-full py-4 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-xl"
                  >
                    平仓卖出
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction("cover")}
                    className="w-full py-4 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-xl"
                  >
                    平仓回补
                  </button>
                )}
              </>
            )}

            <div className="h-px bg-slate-700 my-2" />

            <button
              onClick={nextDay}
              disabled={gameState === "ended"}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold rounded-xl"
            >
              {gameState === "ended" ? "挑战结束" : "下一个交易日 ▶"}
            </button>
          </div>
        </div>
      </main>

      {/* Ended Overlay */}
      {gameState === "ended" && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full border border-slate-600 text-center">
            <h2 className="text-3xl font-bold mb-2">挑战结束</h2>
            <p className="text-slate-400 mb-2">
              这只股票是：{currentStockInfo?.symbol}
            </p>
            <p className="text-slate-500 mb-8">
              属于：{currentStockInfo?.industry}
            </p>

            <div
              className={`text-6xl font-black mb-2 ${portfolioValue >= 20000 ? "text-green-400" : "text-red-400"}`}
            >
              {(((portfolioValue - 20000) / 20000) * 100).toFixed(2)}%
            </div>
            <div className="text-2xl text-slate-300 mb-8">
              ${portfolioValue.toFixed(2)}
            </div>

            <button
              onClick={() => setGameState("setup")}
              className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl"
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
