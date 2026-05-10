#!/bin/bash
set -e

echo "=== Med-KG 开发环境启动 ==="

cd "$(dirname "$0")"

# 0. 激活 conda 环境
CONDA_ENV="medkg"
if command -v conda &>/dev/null; then
    eval "$(conda shell.bash hook)"
    conda activate "$CONDA_ENV" 2>/dev/null && echo "  已激活 conda 环境: $CONDA_ENV" \
        || echo "  ⚠ conda 环境 $CONDA_ENV 不存在，使用当前环境"
fi
export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"

# 1. 检查 Neo4j
echo "[1/4] 检查 Neo4j..."
if docker ps --format '{{.Names}}' | grep -q 'med-kg-neo4j'; then
    echo "  Neo4j 已运行"
else
    echo "  启动 Neo4j..."
    docker run -d --name med-kg-neo4j \
        -p 7475:7474 -p 7690:7687 \
        -e NEO4J_AUTH=neo4j/med-kg-password \
        -e NEO4J_PLUGINS='["apoc"]' \
        neo4j:5.26.0-community
    echo "  Neo4j 启动中，等待就绪..."
    sleep 10
fi

# 2. 后端依赖
echo "[2/4] 检查后端依赖..."
cd backend

# 3. 启动后端
echo "[3/4] 启动后端 (port 8765)..."
uvicorn score:app --host 0.0.0.0 --port 8765 --reload &
BACKEND_PID=$!
cd ..

# 4. 启动前端
echo "[4/4] 启动前端 (port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== 启动完成 ==="
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8765"
echo "  Neo4j: http://localhost:7475"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
