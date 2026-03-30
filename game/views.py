# game/views.py
import random
import yfinance as yf
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

# 我们的股票池
STOCK_POOL = [
    {"symbol": "NVDA", "industry": "科技行业 (半导体)"},
    {"symbol": "TSLA", "industry": "新能源汽车行业"},
    {"symbol": "AAPL", "industry": "科技行业 (消费电子)"},
    {"symbol": "MSFT", "industry": "科技行业 (软件)"},
    {"symbol": "GOOGL", "industry": "科技行业 (互联网)"},
    {"symbol": "AMZN", "industry": "电子商务行业"},
    {"symbol": "SPY", "industry": "美股指数"},
]

def fetch_stock_data(symbol):
    """获取过去一年的真实数据"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    try:
        # 使用 yfinance 获取数据
        ticker = yf.Ticker(symbol)
        hist = ticker.history(start=start_date, end=end_date, interval="1d")
        
        # 格式化数据
        prices = []
        for index, row in hist.iterrows():
            prices.append({
                "date": index.strftime("%Y-%m-%d"),
                "price": float(row['Close'])
            })
        return prices
    except Exception as e:
        print(f"获取数据出错: {e}")
        # 保底模拟数据
        return generate_mock_data()

def generate_mock_data():
    """生成模拟数据以防 API 失效"""
    base_price = 100 + random.random() * 400
    data = []
    start_date = datetime.now() - timedelta(days=252)
    for i in range(252):
        date = start_date + timedelta(days=i)
        change = (random.random() - 0.5) * 0.05
        base_price = base_price * (1 + change)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": max(base_price, 1)
        })
    return data

@csrf_exempt
@require_http_methods(["GET"])
def start_game(request):
    """开始新游戏：随机选股票并获取数据"""
    stock = random.choice(STOCK_POOL)
    prices = fetch_stock_data(stock['symbol'])
    
    # 确保数据足够长
    if len(prices) < 120:
        prices = generate_mock_data()

    return JsonResponse({
        "symbol": stock['symbol'],
        "industry": stock['industry'],
        "prices": prices,
        "initial_cash": 20000
    })