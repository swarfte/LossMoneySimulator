# game/views.py
import random
import yfinance as yf
from datetime import datetime, timedelta
from django.shortcuts import render
from django.http import HttpResponseServerError
import json

# 股票池，所有数据只会从这里的标的拉取真实行情
STOCK_POOL = [
    {"symbol": "NVDA", "industry": "科技行业 (半导体)"},
    {"symbol": "TSLA", "industry": "新能源汽车行业"},
    {"symbol": "AAPL", "industry": "科技行业 (消费电子)"},
    {"symbol": "MSFT", "industry": "科技行业 (软件)"},
    {"symbol": "SPY", "industry": "美股指数"},
    {"symbol": "BABA", "industry": "中概电商"},
    {"symbol": "PDD", "industry": "中概电商"},
    {"symbol": "AMD", "industry": "半导体行业"},
    {"symbol": "GOOGL", "industry": "互联网行业"},
]

def index(request):
    # 随机选一只股票
    stock = random.choice(STOCK_POOL)
    # 时间范围：过去一整年
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)

    try:
        # 【唯一数据源】只从yfinance拉取真实OHLC数据
        ticker = yf.Ticker(stock['symbol'])
        hist = ticker.history(start=start_date, end=end_date, interval="1d")

        # 清洗真实数据
        candles = []
        for index, row in hist.iterrows():
            # 只保留完整的OHLC数据，跳过空值/停牌日
            if not row[['Open', 'High', 'Low', 'Close']].isnull().any():
                candles.append({
                    "time": int(index.timestamp()),
                    "date_str": index.strftime("%Y-%m-%d"),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close'])
                })

        # 【严格校验】数据不足直接报错，绝不生成假数据
        if len(candles) < 120:
            return HttpResponseServerError("获取到的真实数据长度不足，无法开始游戏，请刷新重试")

        # 只有真实数据校验通过，才会渲染页面
        return render(request, 'index.html', {
            "symbol": stock['symbol'],
            "industry": stock['industry'],
            "candles_json": json.dumps(candles),
            "initial_cash": 20000
        })

    except Exception as e:
        # 拉取失败直接报错，绝不兜底假数据
        print(f"拉取真实数据失败: {str(e)}")
        return HttpResponseServerError(f"获取真实股票数据失败，请刷新重试。错误信息：{str(e)}")