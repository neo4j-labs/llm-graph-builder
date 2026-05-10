import { useState } from 'react';
import { ConfigProvider, theme, Layout, Tabs } from 'antd';
import {
  FileTextOutlined,
  NodeIndexOutlined,
  MessageOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import FileManager from './components/FileManager';
import KnowledgeGraph from './components/KnowledgeGraph';
import RAGChat from './components/RAGChat';
import IntegrationPanel from './components/IntegrationPanel';
import Report from './components/Report';
import TaskProgress from './components/TaskProgress';
import { useTaskProgress } from './hooks/useTaskProgress';
import type { TextbookFile, GraphData, IntegrationStats } from './types';

const { Sider, Content } = Layout;

export default function App() {
  const [files, setFiles] = useState<TextbookFile[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], relations: [] });
  const [integrationStats, setIntegrationStats] = useState<IntegrationStats | null>(null);
  const [activeTab, setActiveTab] = useState('rag');
  const { task, startTask, cancelTask, resetTask } = useTaskProgress();

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: { colorPrimary: '#1677ff', borderRadius: 8 },
      }}
    >
      <Layout className="h-screen">
        <Sider width={280} className="!bg-[#1a1a1a] border-r border-[#303030] overflow-y-auto">
          <div className="p-4">
            <h1 className="text-lg font-bold mb-1 text-white">Med-KG</h1>
            <p className="text-xs text-gray-500 mb-4">医学知识图谱整合系统</p>
            <FileManager
              files={files}
              setFiles={setFiles}
              setGraphData={setGraphData}
              startTask={startTask}
              task={task}
            />
          </div>
        </Sider>

        <Content className="relative bg-[#141414]">
          <KnowledgeGraph data={graphData} />
          {integrationStats && (
            <div className="absolute top-4 right-4 bg-[#1f1f1f]/90 backdrop-blur rounded-lg p-3 text-xs border border-[#303030]">
              <div className="font-medium mb-1">整合统计</div>
              <div>压缩比: <span className="text-green-400">{(integrationStats.compressionRatio * 100).toFixed(1)}%</span></div>
              <div>节点: {integrationStats.originalNodeCount} → {integrationStats.mergedNodeCount}</div>
            </div>
          )}
          <TaskProgress task={task} onCancel={cancelTask} onDismiss={resetTask} />
        </Content>

        <Sider width={380} className="!bg-[#1a1a1a] border-l border-[#303030]">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="h-full [&_.ant-tabs-content]:h-[calc(100vh-46px)] [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-tabpane]:overflow-y-auto"
            centered
            items={[
              {
                key: 'rag',
                label: <span><MessageOutlined /> 问答</span>,
                children: <RAGChat files={files} startTask={startTask} task={task} />,
              },
              {
                key: 'integrate',
                label: <span><NodeIndexOutlined /> 整合</span>,
                children: (
                  <IntegrationPanel
                    files={files}
                    setGraphData={setGraphData}
                    setIntegrationStats={setIntegrationStats}
                    startTask={startTask}
                    task={task}
                  />
                ),
              },
              {
                key: 'report',
                label: <span><BarChartOutlined /> 报告</span>,
                children: <Report stats={integrationStats} />,
              },
            ]}
          />
        </Sider>
      </Layout>
    </ConfigProvider>
  );
}
