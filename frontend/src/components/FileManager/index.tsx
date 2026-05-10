import { useState, useCallback } from 'react';
import { Upload, Button, List, Tag, message, Divider } from 'antd';
import { UploadOutlined, CloudUploadOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { TextbookFile, GraphData } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
  setFiles: React.Dispatch<React.SetStateAction<TextbookFile[]>>;
  setGraphData: React.Dispatch<React.SetStateAction<GraphData>>;
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

export default function FileManager({ files, setFiles, setGraphData }: Props) {
  const [loading, setLoading] = useState(false);
  const [buildingKG, setBuildingKG] = useState<string | null>(null);

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
    async (textbookId: string) => {
      setBuildingKG(textbookId);
      try {
        const graph = await api.buildKnowledgeGraph(textbookId);
        setGraphData(graph);
        message.success('知识图谱构建成功');
      } catch (err: any) {
        message.error(`构建失败: ${err.message}`);
      } finally {
        setBuildingKG(null);
      }
    },
    [setGraphData]
  );

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
                  type="link"
                  size="small"
                  loading={buildingKG === file.id}
                  onClick={() => handleBuildKG(file.id)}
                >
                  构建图谱
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
                  {file.chapterCount && <span className="text-gray-500">{file.chapterCount} 章</span>}
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );
}
