# game/views.py
import random
import yfinance as yf
from datetime import datetime, timedelta
from django.shortcuts import render
from django.http import HttpResponseServerError
import json

# 股票池，所有数据只会从这里的标的拉取真实行情
STOCK_POOL = [
    # 原有标的（9只）
    {"symbol": "NVDA", "industry": "科技行业 (半导体)"},
    {"symbol": "TSLA", "industry": "新能源汽车行业"},
    {"symbol": "AAPL", "industry": "科技行业 (消费电子)"},
    {"symbol": "MSFT", "industry": "科技行业 (软件)"},
    {"symbol": "SPY", "industry": "美股指数"},
    {"symbol": "BABA", "industry": "中概电商"},
    {"symbol": "PDD", "industry": "中概电商"},
    {"symbol": "AMD", "industry": "半导体行业"},
    {"symbol": "GOOGL", "industry": "互联网行业"},
    # 新增热门宽基/行业ETF（11只，美股成交量最高的核心交易标的）
    {"symbol": "QQQ", "industry": "美股指数"},
    {"symbol": "VOO", "industry": "美股指数"},
    {"symbol": "TQQQ", "industry": "美股指数 (纳指三倍做多)"},
    {"symbol": "SQQQ", "industry": "美股指数 (纳指三倍做空)"},
    {"symbol": "SOXL", "industry": "行业ETF (半导体三倍做多)"},
    {"symbol": "XLF", "industry": "行业ETF (金融精选)"},
    {"symbol": "XLE", "industry": "行业ETF (能源精选)"},
    {"symbol": "IBIT", "industry": "商品ETF (比特币信托)"},
    {"symbol": "BITO", "industry": "商品ETF (比特币期货)"},
    {"symbol": "KWEB", "industry": "行业ETF (中概互联网)"},
    {"symbol": "CQQQ", "industry": "行业ETF (中国科技)"},
    # 新增科技/互联网巨头（12只，美股核心权重龙头）
    {"symbol": "META", "industry": "互联网行业 (社交与元宇宙)"},
    {"symbol": "AMZN", "industry": "电商与云计算行业"},
    {"symbol": "NFLX", "industry": "互联网行业 (流媒体)"},
    {"symbol": "ORCL", "industry": "科技行业 (企业软件与数据库)"},
    {"symbol": "ADBE", "industry": "科技行业 (创意设计软件)"},
    {"symbol": "CRM", "industry": "科技行业 (企业级SaaS)"},
    {"symbol": "CSCO", "industry": "科技行业 (网络通信设备)"},
    {"symbol": "IBM", "industry": "科技行业 (企业服务与AI)"},
    {"symbol": "PLTR", "industry": "科技行业 (大数据与AI分析)"},
    {"symbol": "PYPL", "industry": "金融科技行业 (跨境支付)"},
    {"symbol": "UBER", "industry": "互联网行业 (出行与本地生活)"},
    {"symbol": "SQ", "industry": "金融科技行业 (商家支付服务)"},
    # 新增半导体/AI产业链龙头（10只，2026年最高景气赛道核心标的）
    {"symbol": "AVGO", "industry": "半导体行业 (AI网络芯片)"},
    {"symbol": "INTC", "industry": "半导体行业 (芯片制造)"},
    {"symbol": "MU", "industry": "半导体行业 (存储芯片)"},
    {"symbol": "ASML", "industry": "半导体行业 (光刻机设备)"},
    {"symbol": "QCOM", "industry": "半导体行业 (移动与汽车芯片)"},
    {"symbol": "TXN", "industry": "半导体行业 (模拟芯片)"},
    {"symbol": "AMAT", "industry": "半导体行业 (晶圆制造设备)"},
    {"symbol": "LRCX", "industry": "半导体行业 (刻蚀设备)"},
    {"symbol": "WDC", "industry": "半导体行业 (存储芯片)"},
    {"symbol": "NXPI", "industry": "半导体行业 (汽车半导体)"},
    # 新增热门中概股（18只，美股中概成交量最高的核心标的）
    {"symbol": "JD", "industry": "中概电商"},
    {"symbol": "NTES", "industry": "中概互联网 (游戏与门户)"},
    {"symbol": "BIDU", "industry": "中概互联网 (搜索与AI)"},
    {"symbol": "TCOM", "industry": "中概互联网 (旅游出行)"},
    {"symbol": "NIO", "industry": "中概新能源汽车"},
    {"symbol": "XPEV", "industry": "中概新能源汽车"},
    {"symbol": "LI", "industry": "中概新能源汽车"},
    {"symbol": "BILI", "industry": "中概互联网 (视频社区)"},
    {"symbol": "TME", "industry": "中概互联网 (音乐娱乐)"},
    {"symbol": "YUMC", "industry": "中概消费 (连锁餐饮)"},
    {"symbol": "LKNCY", "industry": "中概消费 (咖啡连锁)"},
    {"symbol": "EDU", "industry": "中概教育"},
    {"symbol": "TAL", "industry": "中概教育"},
    {"symbol": "ZTO", "industry": "中概物流"},
    {"symbol": "BZ", "industry": "中概互联网 (在线招聘)"},
    {"symbol": "HTHT", "industry": "中概消费 (连锁酒店)"},
    {"symbol": "FUTU", "industry": "中概金融科技"},
    {"symbol": "MNSO", "industry": "中概消费 (零售)"},
    # 新增金融行业龙头（10只，美股金融板块核心标的）
    {"symbol": "JPM", "industry": "金融行业 (银行)"},
    {"symbol": "BAC", "industry": "金融行业 (银行)"},
    {"symbol": "BRK.B", "industry": "金融行业 (保险与投资)"},
    {"symbol": "V", "industry": "金融行业 (支付清算)"},
    {"symbol": "MA", "industry": "金融行业 (支付清算)"},
    {"symbol": "WFC", "industry": "金融行业 (银行)"},
    {"symbol": "GS", "industry": "金融行业 (投行)"},
    {"symbol": "MS", "industry": "金融行业 (投行)"},
    {"symbol": "AXP", "industry": "金融行业 (消费金融)"},
    {"symbol": "SCHW", "industry": "金融行业 (券商)"},
    # 新增医疗健康行业龙头（8只，机构重仓刚需赛道）
    {"symbol": "LLY", "industry": "医疗健康行业 (创新药)"},
    {"symbol": "NVO", "industry": "医疗健康行业 (创新药)"},
    {"symbol": "JNJ", "industry": "医疗健康行业 (医药与健康消费)"},
    {"symbol": "MRK", "industry": "医疗健康行业 (制药)"},
    {"symbol": "PFE", "industry": "医疗健康行业 (制药)"},
    {"symbol": "UNH", "industry": "医疗健康行业 (医疗保险)"},
    {"symbol": "ABT", "industry": "医疗健康行业 (医疗器械)"},
    {"symbol": "TMO", "industry": "医疗健康行业 (生命科学)"},
    # 新增消费行业龙头（7只，美股必需/可选消费核心标的）
    {"symbol": "WMT", "industry": "消费行业 (零售)"},
    {"symbol": "COST", "industry": "消费行业 (会员制零售)"},
    {"symbol": "PG", "industry": "消费行业 (日用消费品)"},
    {"symbol": "KO", "industry": "消费行业 (饮料)"},
    {"symbol": "PEP", "industry": "消费行业 (饮料与零食)"},
    {"symbol": "MCD", "industry": "消费行业 (连锁餐饮)"},
    {"symbol": "NKE", "industry": "消费行业 (运动服饰)"},
    # 新增能源与工业龙头（5只，周期与防御板块核心标的）
    {"symbol": "XOM", "industry": "能源行业 (石油天然气)"},
    {"symbol": "CVX", "industry": "能源行业 (石油天然气)"},
    {"symbol": "CAT", "industry": "工业行业 (工程机械)"},
    {"symbol": "GE", "industry": "工业行业 (综合工业)"},
    {"symbol": "HON", "industry": "工业行业 (工业自动化)"}
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