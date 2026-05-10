import { useEffect, useState } from 'react';
import { Tag } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { TaskState } from '../../types';

interface Props {
  task: TaskState;
  onCancel: () => void;
  onDismiss: () => void;
}

const TASK_LABELS: Record<string, string> = {
  kg_build: '知识图谱构建',
  integrate: '跨教材整合',
  rag_index: 'RAG 索引构建',
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function TaskProgress({ task, onCancel, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (task.status === 'running' || task.status === 'completed' || task.status === 'error') {
      setVisible(true);
    }
  }, [task.status]);

  if (!visible || task.status === 'idle') return null;

  const isRunning = task.status === 'running';
  const isComplete = task.status === 'completed';
  const isError = task.status === 'error';

  const borderColor = isError ? '#ff4d4f' : isComplete ? '#52c41a' : '#1677ff';

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  return (
    <div
      className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border overflow-hidden transition-all duration-500"
      style={{
        background: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(12px)',
        borderColor: borderColor,
        borderLeftWidth: 3,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {isRunning && <ThunderboltOutlined className="text-blue-400 animate-pulse-glow" />}
          {isComplete && <CheckCircleOutlined className="text-green-400" />}
          {isError && <CloseCircleOutlined className="text-red-400" />}
          <span className="font-medium text-sm text-gray-100">
            {TASK_LABELS[task.taskType] || task.taskType}
          </span>
          {task.label && (
            <span className="text-xs text-gray-500">— {task.label}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 tabular-nums">
            {formatElapsed(task.elapsed)}
          </span>
          {isRunning && (
            <span className="text-blue-400 font-bold text-sm tabular-nums">
              {task.percent}%
            </span>
          )}
          {isRunning ? (
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-0.5 rounded border border-gray-700 hover:border-red-400/50"
            >
              取消
            </button>
          ) : (
            <button onClick={handleDismiss} className="text-gray-500 hover:text-gray-300">
              <CloseOutlined className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="px-4 pb-1">
          <div className="progress-bar-track rounded-full h-1.5 overflow-hidden relative">
            <div
              className="progress-bar-gradient h-full rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${task.percent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-1/3 animate-scan-line rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* Step Info */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          {isRunning && <LoadingOutlined className="text-blue-400" />}
          <span className="text-gray-300">{task.step}</span>
        </div>

        {/* Steps indicator for multi-step tasks */}
        {task.total > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Array.from({ length: task.total }, (_, i) => {
              const idx = i + 1;
              const done = idx < task.current;
              const active = idx === task.current;
              return (
                <div
                  key={i}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium transition-all duration-300 ${
                    done
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : active
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 animate-pulse-glow'
                        : 'bg-white/5 text-gray-600 border border-white/10'
                  }`}
                >
                  {done ? '✓' : idx}
                </div>
              );
            })}
          </div>
        )}

        {/* Partial Results */}
        {Object.keys(task.partialResults).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {task.partialResults.nodesCount != null && (
              <Tag color="blue" className="!text-xs">{task.partialResults.nodesCount} 知识点</Tag>
            )}
            {task.partialResults.relationsCount != null && (
              <Tag color="cyan" className="!text-xs">{task.partialResults.relationsCount} 关系</Tag>
            )}
            {task.partialResults.chunksCount != null && (
              <Tag color="green" className="!text-xs">{task.partialResults.chunksCount} 知识块</Tag>
            )}
            {task.partialResults.candidatePairs != null && (
              <Tag color="gold" className="!text-xs">{task.partialResults.candidatePairs} 候选对</Tag>
            )}
            {task.partialResults.compressionRatio != null && (
              <Tag color="green" className="!text-xs">
                压缩比 {(task.partialResults.compressionRatio * 100).toFixed(1)}%
              </Tag>
            )}
            {task.partialResults.decisionsCount != null && (
              <Tag color="purple" className="!text-xs">{task.partialResults.decisionsCount} 条决策</Tag>
            )}
            {task.partialResults.totalNodes != null && (
              <Tag color="blue" className="!text-xs">共 {task.partialResults.totalNodes} 节点</Tag>
            )}
          </div>
        )}

        {/* Error Message */}
        {isError && task.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
            {task.error}
          </div>
        )}
      </div>
    </div>
  );
}
