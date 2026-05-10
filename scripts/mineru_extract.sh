#!/usr/bin/env bash
# 使用 conda 环境 mineru 提取文档文本，输出到仓库 warehouse/extracted 目录。
# 用法: ./scripts/mineru_extract.sh <输入文件路径>

set -euo pipefail

export MINERU_MODEL_SOURCE=modelscope
export CUDA_VISIBLE_DEVICES=2

usage() {
  echo "用法: $(basename "$0") <输入文件路径>" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage

INPUT_PATH="$1"
if [[ ! -e "$INPUT_PATH" ]]; then
  echo "错误: 文件或路径不存在: $INPUT_PATH" >&2
  exit 1
fi

# 仓库根目录（本脚本位于 <repo>/scripts/）
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$REPO_ROOT/warehouse/extracted"
mkdir -p "$OUTPUT_DIR"

# 转为绝对路径，避免 conda run 工作目录变化导致找不到输入
INPUT_ABS="$(cd "$(dirname "$INPUT_PATH")" && pwd)/$(basename "$INPUT_PATH")"

if ! command -v conda >/dev/null 2>&1; then
  echo "错误: 未找到 conda，请先安装 Anaconda/Miniconda 并初始化 shell。" >&2
  exit 1
fi

echo "输入: $INPUT_ABS"
echo "输出目录: $OUTPUT_DIR"

conda run -n mineru --no-capture-output mineru -p "$INPUT_ABS" -o "$OUTPUT_DIR"

echo "完成。"
