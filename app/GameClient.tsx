"use client";

import React, { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
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
import { GameData } from "@/app/action"; // 导入数据类型定义

// 注册Chart.js组件
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

// 持仓类型定义
interface Position {
  type: "long" | "short";
  shares: number;
  entryPrice: number;
}

interface Props {
  initialData: GameData;
}

export default function GameClient({ initialData }: Props) {
  // 游戏状态管理
  const [gameState, setGameState] = useState<"setup" | "playing" | "ended">(
    "setup",
  );
  const [stockData, setStockData] = useState<GameData>(initialData);
  const [currentDayIndex, setCurrentDayIndex] = useState(90); // 初始显示前90天数据
  const [cash, setCash] = useState(20000); // 初始资金2万
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 数据处理
  const historicalData = stockData.prices;
  // 用户当前可见的K线数据（只显示到当前交易日）
  const visibleData = useMemo(() => {
    return historicalData.slice(0, currentDayIndex + 1);
  }, [historicalData, currentDayIndex]);
  // 当前交易日的股价
  const currentPrice = historicalData[currentDayIndex]?.price || 0;

  // 核心游戏逻辑
  // 开始游戏
  const startGame = () => {
    setCurrentDayIndex(90);
    setCash(20000);
    setPosition(null);
    setGameState("playing");
  };

  // 再来一局（换新股票）
  const startNewGame = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/new-game");
      const newData = await res.json();
      setStockData(newData);
      setCurrentDayIndex(90);
      setCash(20000);
      setPosition(null);
      setGameState("playing");
    } catch (e) {
      console.error(e);
      alert("获取新股票失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 计算净资产
  const portfolioValue = useMemo(() => {
    let val = cash;
    if (position) {
      if (position.type === "long") {
        // 多头：净资产=现金+持仓市值
        val += position.shares * currentPrice;
      } else {
        // 空头：净资产=现金-需要买回的股票市值
        val = cash - position.shares * currentPrice;
      }
    }
    return val;
  }, [cash, position, currentPrice]);

  // 交易操作：买入/卖出/做空/平仓
  const handleAction = (type: "buy" | "sell" | "short" | "cover") => {
    if (!position) {
      // 无持仓，只能买入做多或做空
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
      // 有持仓，只能平仓
      if (position.type === "long" && type === "sell") {
        setCash(cash + position.shares * currentPrice);
        setPosition(null);
      } else if (position.type === "short" && type === "cover") {
        setCash(cash - position.shares * currentPrice);
        setPosition(null);
      }
    }
  };

  // 进入下一个交易日
  const nextDay = () => {
    if (currentDayIndex < historicalData.length - 1) {
      setCurrentDayIndex((prev) => prev + 1);
    } else {
      setGameState("ended"); // 走完所有交易日，游戏结束
    }
  };

  // K线图配置
  const chartData = {
    labels: visibleData.map((d) => d.date),
    datasets: [
      {
        label: "股价",
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
            盲盘炒股挑战
          </h1>
          <p className="text-slate-400 mb-8">
            基于真实市场历史数据，测试你的交易直觉
          </p>

          <div className="space-y-4 mb-8 text-left bg-slate-900/50 p-6 rounded-xl">
            <h3 className="font-semibold text-blue-400">挑战规则</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>
                初始资金 <span className="text-white font-bold">$20,000</span>
              </li>
              <li>随机抽取真实股票，仅显示所属行业</li>
              <li>初始可见前90天历史走势</li>
              <li>
                支持 <span className="text-green-400">做多</span> 与{" "}
                <span className="text-red-400">做空</span> 双向交易
              </li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            开始挑战
          </button>
        </div>
      </div>
    );
  }

  // 2. 主游戏界面
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 flex flex-col">
      {/* 顶部状态栏 */}
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-slate-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-slate-400 block">当前标的</span>
            <span className="font-bold text-lg">{stockData.industry}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">挑战进度</span>
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

      {/* 主体区域 */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* K线图区域 */}
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
                {position.type === "long" ? "多头持仓" : "空头持仓"}{" "}
                {position.shares} 股
              </div>
            )}
          </div>
          <div className="flex-1 min-h-[400px] relative">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* 交易操作区 */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 账户状态 */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold mb-4">账户状态</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>可用现金</span>
                <span className="text-white">${cash.toFixed(2)}</span>
              </div>
              {position && (
                <div className="flex justify-between text-slate-400">
                  <span>持仓浮动盈亏</span>
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

          {/* 交易按钮 */}
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
                    className="w-full py-4 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-xl transition-all"
                  >
                    平仓卖出
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction("cover")}
                    className="w-full py-4 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-xl transition-all"
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
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
            >
              {gameState === "ended" ? "挑战结束" : "下一个交易日 ▶"}
            </button>
          </div>
        </div>
      </main>

      {/* 挑战结束弹窗 */}
      {gameState === "ended" && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full border border-slate-600 text-center">
            <h2 className="text-3xl font-bold mb-2">挑战结束</h2>
            <p className="text-2xl text-yellow-400 mb-1">
              这只股票是：{stockData.symbol}
            </p>
            <p className="text-slate-500 mb-8">{stockData.industry}</p>

            <div
              className={`text-6xl font-black mb-2 ${portfolioValue >= 20000 ? "text-green-400" : "text-red-400"}`}
            >
              {(((portfolioValue - 20000) / 20000) * 100).toFixed(2)}%
            </div>
            <div className="text-2xl text-slate-300 mb-8">
              最终资产：${portfolioValue.toFixed(2)}
            </div>

            <button
              onClick={startNewGame}
              disabled={isLoading}
              className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {isLoading ? "加载中..." : "再来一局 (换新股票)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
