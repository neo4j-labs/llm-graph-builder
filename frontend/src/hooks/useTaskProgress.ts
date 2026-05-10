import { useState, useRef, useCallback, useEffect } from 'react';
import type { TaskState, TaskType, TaskEvent } from '../types';
import { getStreamUrl, STREAM_PATHS } from '../services/api';

const INITIAL_STATE: TaskState = {
  taskType: 'kg_build',
  status: 'idle',
  label: '',
  phase: '',
  step: '',
  current: 0,
  total: 0,
  percent: 0,
  partialResults: {},
  elapsed: 0,
};

export function useTaskProgress() {
  const [task, setTask] = useState<TaskState>(INITIAL_STATE);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startTask = useCallback(
    (taskType: TaskType, params: Record<string, string>, label: string) => {
      cleanup();

      const url = getStreamUrl(STREAM_PATHS[taskType], params);
      const es = new EventSource(url);
      esRef.current = es;
      startTimeRef.current = Date.now();

      setTask({
        ...INITIAL_STATE,
        taskType,
        label,
        status: 'running',
        step: '正在初始化...',
      });

      timerRef.current = setInterval(() => {
        setTask((prev) =>
          prev.status === 'running'
            ? { ...prev, elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000) }
            : prev
        );
      }, 1000);

      const handleEvent = (e: MessageEvent) => {
        try {
          const data: TaskEvent = JSON.parse(e.data);
          setTask((prev) => ({
            ...prev,
            phase: data.phase || prev.phase,
            step: data.step || prev.step,
            current: data.current ?? prev.current,
            total: data.total ?? prev.total,
            percent: data.percent ?? prev.percent,
            partialResults: data.partialResult
              ? { ...prev.partialResults, ...data.partialResult }
              : prev.partialResults,
          }));
        } catch {
          // ignore parse errors
        }
      };

      es.addEventListener('progress', handleEvent);

      es.addEventListener('complete', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setTask((prev) => ({
            ...prev,
            status: 'completed',
            percent: 100,
            step: data.step || '已完成',
            phase: 'done',
            partialResults: data.partialResult
              ? { ...prev.partialResults, ...data.partialResult }
              : prev.partialResults,
            elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
          }));
        } catch { /* ignore */ }
        cleanup();
      });

      es.addEventListener('result', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          setTask((prev) => ({
            ...prev,
            finalResult: payload.data,
          }));
        } catch { /* ignore */ }
      });

      es.addEventListener('error', (e: any) => {
        if (e.data) {
          try {
            const data = JSON.parse(e.data);
            setTask((prev) => ({
              ...prev,
              status: 'error',
              error: data.step || '未知错误',
              elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
            }));
          } catch { /* ignore */ }
        }
        cleanup();
      });

      es.onerror = () => {
        setTask((prev) => {
          if (prev.status === 'completed') return prev;
          return { ...prev, status: 'error', error: 'SSE 连接断开' };
        });
        cleanup();
      };
    },
    [cleanup]
  );

  const cancelTask = useCallback(() => {
    cleanup();
    setTask((prev) => ({ ...prev, status: 'idle' }));
  }, [cleanup]);

  const resetTask = useCallback(() => {
    cleanup();
    setTask(INITIAL_STATE);
  }, [cleanup]);

  return { task, startTask, cancelTask, resetTask };
}
