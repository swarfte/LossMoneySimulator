from django.contrib import admin
from django.urls import path
from django.views.generic import TemplateView

# 【关键】必须导入 game 应用里的视图函数
from game.views import start_game

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API 接口：获取股票数据
    path('api/start', start_game, name='start_game'),
    
    # 首页：指向我们的 HTML 游戏页面
    path('', TemplateView.as_view(template_name='index.html')),
]