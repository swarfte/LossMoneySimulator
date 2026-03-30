import React, { useState, useEffect, useMemo, useRef } from "react";
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

// --- Types ---

interface StockData {
  date: string;
  price: number;
}

interface Position {
  type: "long" | "short";
  shares: number;
  entryPrice: number;
}

// --- Mock Data Generator ---

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "AMD", name: "AMD" },
  { symbol: "MSFT", name: "Microsoft" },
];

const generateStockData = (startPrice: number, days: number): StockData[] => {
  let currentPrice = startPrice;
  const data: StockData[] = [];
  const date = new Date();
  date.setDate(date.getDate() - days);

  for (let i = 0; i < days; i++) {
    const volatility = 0.03;
    const change = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + change);

    data.push({
      date: date.toISOString().split("T")[0],
      price: Math.max(currentPrice, 1),
    });

    date.setDate(date.getDate() + 1);
  }
  return data;
};

// --- Main Component ---

export default function StockSimulator() {
  // -- State --
  const [gameState, setGameState] = useState<"setup" | "playing" | "ended">(
    "setup",
  );
  const [stock, setStock] = useState<(typeof STOCKS)[0] | null>(null);
  const [historicalData, setHistoricalData] = useState<StockData[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(90);
  const [cash, setCash] = useState(20000);
  const [position, setPosition] = useState<Position | null>(null);

  // -- Game Logic --

  const startGame = () => {
    const randomStock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const startPrice = 50 + Math.random() * 450;
    const data = generateStockData(startPrice, 365);

    setStock(randomStock);
    setHistoricalData(data);
    setCurrentDayIndex(90);
    setCash(20000);
    setPosition(null);
    setGameState("playing");
  };

  const visibleData = useMemo(() => {
    return historicalData.slice(0, currentDayIndex + 1);
  }, [historicalData, currentDayIndex]);

  const currentPrice = historicalData[currentDayIndex]?.price || 0;

  // Calculate Portfolio Value
  const portfolioValue = useMemo(() => {
    let val = cash;
    if (position) {
      if (position.type === "long") {
        val += position.shares * currentPrice;
      } else {
        // Short: Value = Initial Cash + (Shorted Value - Current Value)
        // We simplified this logic in the execute function to just track cash,
        // but let's make it visual here.
        // Actually, in our setup, cash already reflects the short collateral/profit.
        // The position for short just tracks how much we owe back in shares.
        // So net worth is Cash - (shares * current price)
        val = cash - position.shares * currentPrice;
      }
    }
    return val;
  }, [cash, position, currentPrice]);

  const handleAction = (type: "buy" | "sell" | "short" | "cover") => {
    if (!position) {
      // No position
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
        // Short logic: We "sell" borrowed shares, getting cash.
        // We need to keep 100% collateral (standard).
        // So we calculate max shares we can short based on current cash.
        const maxShares = Math.floor(cash / currentPrice);
        if (maxShares > 0) {
          setPosition({
            type: "short",
            shares: maxShares,
            entryPrice: currentPrice,
          });
          // We get the cash from the sale, but it's locked.
          // For simulator simplicity, let's just add it to cash to make PNL visible immediately,
          // but we must remember we owe shares.
          setCash(cash + maxShares * currentPrice);
        }
      }
    } else {
      // Existing position
      if (position.type === "long" && type === "sell") {
        setCash(cash + position.shares * currentPrice);
        setPosition(null);
      } else if (position.type === "short" && type === "cover") {
        // Buy back shares
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

  // --- Render Helpers ---

  const chartData = {
    labels: visibleData.map((d) => d.date),
    datasets: [
      {
        label: stock?.symbol || "Price",
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
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { display: true, grid: { display: false } },
      y: { display: true, grid: { color: "rgba(0,0,0,0.05)" } },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  if (gameState === "setup") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Quant Trader
          </h1>
          <p className="text-slate-400 mb-8">
            Test your intuition against historical volatility.
          </p>

          <div className="space-y-4 mb-8 text-left bg-slate-900/50 p-6 rounded-xl">
            <h3 className="font-semibold text-blue-400">Rules:</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
              <li>
                Start with <span className="text-white font-bold">$20,000</span>
              </li>
              <li>
                You can <span className="text-green-400">Go Long</span> or{" "}
                <span className="text-red-400">Go Short</span>
              </li>
              <li>You see 90 days of history first</li>
              <li>Trade your way through the next year</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/20"
          >
            Start Simulation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8 flex flex-col">
      {/* Header Stats */}
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-slate-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-slate-400 block">Asset</span>
            <span className="font-bold text-lg">{stock?.symbol}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Day</span>
            <span className="font-mono font-bold">
              {currentDayIndex} / {historicalData.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">
              Portfolio Value
            </span>
            <span className="font-bold text-xl text-white">
              $
              {portfolioValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            className={`px-4 py-2 rounded-lg ${portfolioValue - 20000 >= 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}
          >
            <span className="text-xs block opacity-70">Return</span>
            <span className="font-bold">
              {(((portfolioValue - 20000) / 20000) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart Section */}
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
                {position.type.toUpperCase()} {position.shares} shares
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[400px] relative">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Controls Section */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Account Status */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold mb-4">Account</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>Cash</span>
                <span className="text-white">${cash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Position</span>
                <span className="text-white">
                  {position
                    ? position.type === "long"
                      ? "Long"
                      : "Short"
                    : "None"}
                </span>
              </div>
              {position && (
                <div className="flex justify-between text-slate-400">
                  <span>Unrealized PnL</span>
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

          {/* Action Buttons */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex-1 flex flex-col justify-center gap-4">
            {!position ? (
              <>
                <button
                  onClick={() => handleAction("buy")}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-lg">Buy (Long)</span>
                  <span className="text-xs opacity-75">
                    All-in with available cash
                  </span>
                </button>
                <button
                  onClick={() => handleAction("short")}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all flex flex-col items-center gap-1"
                >
                  <span className="text-lg">Short Sell</span>
                  <span className="text-xs opacity-75">
                    Bet on price falling
                  </span>
                </button>
              </>
            ) : (
              <>
                <div className="text-center p-4 bg-slate-900 rounded-xl mb-2">
                  <p className="text-sm text-slate-400">
                    You are currently{" "}
                    {position.type === "long" ? "Long" : "Short"}.
                  </p>
                  <p className="text-xs text-slate-500">
                    Close your position to proceed.
                  </p>
                </div>
                {position.type === "long" ? (
                  <button
                    onClick={() => handleAction("sell")}
                    className="w-full py-4 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-xl transition-all"
                  >
                    Sell Position
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction("cover")}
                    className="w-full py-4 bg-slate-200 hover:bg-white text-slate-900 font-bold rounded-xl transition-all"
                  >
                    Cover Short
                  </button>
                )}
              </>
            )}

            <div className="h-px bg-slate-700 my-2" />

            <button
              onClick={nextDay}
              disabled={gameState === "ended"}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
            >
              {gameState === "ended" ? "Simulation Ended" : "Next Day ▶"}
            </button>
          </div>
        </div>
      </main>

      {/* Game Ended Overlay */}
      {gameState === "ended" && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full border border-slate-600 text-center">
            <h2 className="text-3xl font-bold mb-2">Simulation Complete</h2>
            <p className="text-slate-400 mb-8">You survived the year!</p>

            <div
              className={`text-6xl font-black mb-2 ${portfolioValue >= 20000 ? "text-green-400" : "text-red-400"}`}
            >
              {(((portfolioValue - 20000) / 20000) * 100).toFixed(2)}%
            </div>
            <div className="text-2xl text-slate-300 mb-8">
              ${portfolioValue.toFixed(2)}
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
