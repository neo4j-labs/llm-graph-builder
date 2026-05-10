import { useState, useCallback, useEffect } from 'react';
import { Upload, Button, List, Tag, message, Divider, Modal, Collapse, Spin } from 'antd';
import { CloudUploadOutlined, DatabaseOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { TextbookFile, GraphData, TaskState, TaskType, TextbookPreview } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
  setFiles: React.Dispatch<React.SetStateAction<TextbookFile[]>>;
  setGraphData: React.Dispatch<React.SetStateAction<GraphData>>;
  startTask: (taskType: TaskType, params: Record<string, string>, label: string) => void;
  task: TaskState;
}

const statusColor: Record<string, string> = {
  uploading: 'processing',
  parsing: 'processing',
  completed: 'success',
  failed: 'error',
};

const statusText: Record<string, string> = {
  uploading: '上传中',
  parsing: '解析中',
  completed: '已完成',
  failed: '失败',
};

export default function FileManager({ files, setFiles, setGraphData, startTask, task }: Props) {
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<TextbookPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (
      task.taskType === 'kg_build' &&
      task.status === 'completed' &&
      task.finalResult
    ) {
      setGraphData(task.finalResult);
      message.success('知识图谱构建成功');
    }
  }, [task.status, task.taskType, task.finalResult, setGraphData]);

  const handleUpload = useCallback(
    async (options: any) => {
      const { file, onSuccess, onError, onProgress } = options;
      try {
        const result = await api.uploadFile(file, (pct) => onProgress?.({ percent: pct }));
        setFiles((prev) => [...prev, result]);
        onSuccess?.(result);
        message.success(`${file.name} 上传成功`);
      } catch (err: any) {
        onError?.(err);
        message.error(`上传失败: ${err.message}`);
      }
    },
    [setFiles]
  );

  const loadMineru = useCallback(async () => {
    setLoading(true);
    try {
      const textbooks = await api.loadMineruTextbooks();
      setFiles(textbooks);
      message.success(`已加载 ${textbooks.length} 本教材`);
    } catch (err: any) {
      message.error(`加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [setFiles]);

  const handleBuildKG = useCallback(
    (textbookId: string, title: string) => {
      startTask('kg_build', { textbook_id: textbookId }, title);
    },
    [startTask]
  );

  const handlePreview = useCallback(async (textbookId: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const data = await api.getTextbookPreview(textbookId);
      setPreviewData(data);
    } catch (err: any) {
      message.error(`加载预览失败: ${err.message}`);
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleViewAll = useCallback(async () => {
    try {
      const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
      if (ids.length === 0) return message.warning('没有已完成的教材');
      const graph = await api.getGraphVisualization(ids);
      setGraphData(graph);
    } catch (err: any) {
      message.error(`加载图谱失败: ${err.message}`);
    }
  }, [files, setGraphData]);

  const isBuildingKG = task.taskType === 'kg_build' && task.status === 'running';

  return (
    <div>
      <Upload.Dragger
        multiple
        accept=".pdf,.md,.txt,.docx"
        customRequest={handleUpload}
        showUploadList={false}
        className="!bg-[#252525] !border-[#404040] hover:!border-[#1677ff]"
      >
        <p className="text-gray-400">
          <CloudUploadOutlined className="text-2xl" />
        </p>
        <p className="text-xs text-gray-500 mt-1">拖拽或点击上传教材</p>
        <p className="text-xs text-gray-600">PDF / MD / TXT / DOCX</p>
      </Upload.Dragger>

      <Button
        block
        icon={<DatabaseOutlined />}
        onClick={loadMineru}
        loading={loading}
        className="mt-3"
      >
        加载 MinerU 预提取教材
      </Button>

      <Divider className="!my-3" />

      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-500">教材列表 ({files.length})</span>
        {files.length > 1 && (
          <Button type="link" size="small" onClick={handleViewAll}>
            查看全部图谱
          </Button>
        )}
      </div>

      <List
        size="small"
        dataSource={files}
        renderItem={(file) => (
          <List.Item
            className="!px-2 !py-1.5 rounded hover:bg-[#252525] cursor-pointer"
            actions={[
              file.status === 'completed' && (
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreview(file.id)}
                  title="预览内容"
                />
              ),
              file.status === 'completed' && (
                <Button
                  type="link"
                  size="small"
                  loading={isBuildingKG && task.label === (file.title || file.filename)}
                  disabled={isBuildingKG}
                  onClick={() => handleBuildKG(file.id, file.title || file.filename)}
                >
                  {file.hasKgCache ? '查看图谱' : '构建图谱'}
                </Button>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              title={
                <span className="text-sm text-gray-200">
                  {file.title || file.filename}
                </span>
              }
              description={
                <div className="flex items-center gap-2 text-xs">
                  <Tag color={statusColor[file.status]} className="text-xs">
                    {statusText[file.status]}
                  </Tag>
                  {file.hasKgCache && (
                    <Tag icon={<CheckCircleOutlined />} color="blue" className="text-xs">
                      已有图谱
                    </Tag>
                  )}
                  {file.chapterCount && <span className="text-gray-500">{file.chapterCount} 章</span>}
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title={previewData?.title || '教材预览'}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={640}
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
        {previewLoading ? (
          <div className="flex justify-center py-12"><Spin size="large" /></div>
        ) : previewData ? (
          <div>
            <div className="flex gap-4 mb-4 text-sm text-gray-400">
              <span>共 {previewData.chapterCount} 章</span>
              <span>{(previewData.totalChars / 10000).toFixed(1)} 万字</span>
              {previewData.totalPages > 0 && <span>{previewData.totalPages} 页</span>}
            </div>
            <Collapse
              size="small"
              items={previewData.chapters.map((ch, i) => ({
                key: i,
                label: (
                  <div className="flex justify-between items-center w-full pr-4">
                    <span>{ch.title}</span>
                    <span className="text-xs text-gray-500">{(ch.charCount / 1000).toFixed(1)}k 字</span>
                  </div>
                ),
                children: (
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {ch.preview}
                  </div>
                ),
              }))}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
