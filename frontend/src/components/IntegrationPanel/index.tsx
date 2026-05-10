import { useState } from 'react';
import { Button, Input, List, Tag, Card, message, Divider, Progress } from 'antd';
import { MergeCellsOutlined, SendOutlined } from '@ant-design/icons';
import type { TextbookFile, GraphData, IntegrationStats, IntegrationDecision, ChatMessage } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
  setGraphData: React.Dispatch<React.SetStateAction<GraphData>>;
  setIntegrationStats: React.Dispatch<React.SetStateAction<IntegrationStats | null>>;
}

const actionTag: Record<string, { color: string; text: string }> = {
  merge: { color: 'gold', text: '合并' },
  keep: { color: 'green', text: '保留' },
  remove: { color: 'default', text: '删除' },
};

export default function IntegrationPanel({ files, setGraphData, setIntegrationStats }: Props) {
  const [integrating, setIntegrating] = useState(false);
  const [decisions, setDecisions] = useState<IntegrationDecision[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const handleIntegrate = async () => {
    const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
    if (ids.length < 2) return message.warning('至少需要2本教材进行整合');
    setIntegrating(true);
    try {
      const result = await api.integrateKnowledgeGraphs(ids);
      setDecisions(result.decisions);
      setIntegrationStats(result.statistics);
      const graph = await api.getGraphVisualization(ids);
      setGraphData(graph);
      message.success(`整合完成，压缩比 ${(result.statistics.compressionRatio * 100).toFixed(1)}%`);
    } catch (err: any) {
      message.error(`整合失败: ${err.message}`);
    } finally {
      setIntegrating(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const result = await api.sendChatMessage(chatInput, sessionId, chatMessages);
      setChatMessages((prev) => [...prev, result]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#303030]">
        <Button
          type="primary"
          block
          icon={<MergeCellsOutlined />}
          onClick={handleIntegrate}
          loading={integrating}
          disabled={files.filter((f) => f.status === 'completed').length < 2}
        >
          执行跨教材整合
        </Button>
      </div>

      {/* Decisions List */}
      <div className="flex-1 overflow-y-auto p-3">
        {decisions.length > 0 ? (
          <List
            size="small"
            header={<span className="text-xs text-gray-500">整合决策 ({decisions.length})</span>}
            dataSource={decisions.slice(0, 50)}
            renderItem={(d) => (
              <List.Item className="!px-0">
                <Card size="small" className="w-full !bg-[#252525]">
                  <div className="flex items-start gap-2">
                    <Tag color={actionTag[d.action]?.color}>{actionTag[d.action]?.text}</Tag>
                    <div className="flex-1 text-xs">
                      <div className="text-gray-300">
                        {d.resultNode?.name || d.affectedNodes.join(', ')}
                      </div>
                      <div className="text-gray-500 mt-1">{d.reason}</div>
                      {d.confidence > 0 && (
                        <Progress
                          percent={Math.round(d.confidence * 100)}
                          size="small"
                          className="mt-1"
                          strokeColor={d.confidence > 0.9 ? '#52c41a' : '#faad14'}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <div className="text-center text-gray-500 text-xs mt-8">
            点击上方按钮执行整合后查看决策列表
          </div>
        )}

        {decisions.length > 0 && (
          <>
            <Divider className="!my-3"><span className="text-xs text-gray-500">对话调整</span></Divider>
            <div className="space-y-2 mb-3">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-xs rounded-lg px-3 py-2 ${
                    msg.role === 'user' ? 'bg-[#1677ff]/20 text-gray-200 ml-4' : 'bg-[#252525] text-gray-300 mr-4'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {chatLoading && (
                <div className="text-xs bg-[#252525] rounded-lg px-3 py-2 text-gray-400 mr-4">
                  思考中...
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat Input */}
      {decisions.length > 0 && (
        <div className="p-3 border-t border-[#303030]">
          <Input
            placeholder="例如：请保留'免疫应答'，不要删除"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onPressEnter={handleChatSend}
            suffix={
              <Button type="text" icon={<SendOutlined />} onClick={handleChatSend} loading={chatLoading} size="small" />
            }
          />
        </div>
      )}
    </div>
  );
}
