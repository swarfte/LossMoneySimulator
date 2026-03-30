# 基础镜像：Python 3.14 轻量版
FROM python:3.14-slim

# 环境配置（防止缓存、乱码）
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=0

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 工作目录
WORKDIR /app

# 复制依赖文件
COPY pyproject.toml ./

# 安装依赖（uv 极速安装）
RUN uv sync --no-dev

# 复制项目全部代码
COPY . .

# ====================== 修复核心：所有命令加 uv run ======================
# 收集静态文件
RUN uv run python manage.py collectstatic --noinput

# 数据库迁移
RUN uv run python manage.py migrate --noinput

# 暴露 8000 端口
EXPOSE 8000

# 启动服务（uv run + gunicorn）
CMD ["uv", "run", "gunicorn", "--bind", "0.0.0.0:8000", "lost_money_simulator.wsgi:application"]