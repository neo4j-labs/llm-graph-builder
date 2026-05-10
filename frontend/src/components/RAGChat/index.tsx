import { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Tag, Collapse, Empty, Statistic, Row, Col } from 'antd';
import { SendOutlined, BookOutlined } from '@ant-design/icons';
import type { TextbookFile, ChatMessage, RAGCitation } from '../../types';
import * as api from '../../services/api';

interface Props {
  files: TextbookFile[];
}

export default function RAGChat({ files }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{ indexedBooks: number; totalChunks: number } | null>(null);
  const [indexing, setIndexing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getRAGStatus().then(setIndexStatus).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleBuildIndex = async () => {
    const ids = files.filter((f) => f.status === 'completed').map((f) => f.id);
    if (ids.length === 0) return;
    setIndexing(true);
    try {
      const result = await api.buildRAGIndex(ids);
      setIndexStatus({ indexedBooks: result.indexed, totalChunks: result.chunks });
    } catch { /* ignore */ } finally {
      setIndexing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await api.queryRAG(input);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        timestamp: Date.now(),
        citations: result.citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `查询失败: ${err.message}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Index Status Bar */}
      <div className="p-3 border-b border-[#303030]">
        <Row gutter={12} align="middle">
          <Col>
            <Statistic
              title={<span className="text-xs text-gray-500">已索引</span>}
              value={indexStatus?.indexedBooks || 0}
              suffix="本"
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Col>
          <Col>
            <Statistic
              title={<span className="text-xs text-gray-500">知识块</span>}
              value={indexStatus?.totalChunks || 0}
              valueStyle={{ fontSize: 16, color: '#52c41a' }}
            />
          </Col>
          <Col flex="auto" className="text-right">
            <Button size="small" onClick={handleBuildIndex} loading={indexing}>
              建立索引
            </Button>
          </Col>
        </Row>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <Empty description="输入问题开始问答" className="mt-12" />
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-[#1677ff] text-white'
                  : 'bg-[#252525] text-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <Collapse
                  ghost
                  size="small"
                  className="mt-2"
                  items={[
                    {
                      key: 'citations',
                      label: <span className="text-xs text-gray-400"><BookOutlined /> 引用来源 ({msg.citations.length})</span>,
                      children: (
                        <div className="space-y-2">
                          {msg.citations.map((c: RAGCitation, j: number) => (
                            <Card key={j} size="small" className="!bg-[#1a1a1a]">
                              <div className="text-xs">
                                <Tag color="blue">{c.textbook}</Tag>
                                <span className="text-gray-400">{c.chapter}</span>
                                <span className="text-gray-500 ml-2">第{c.page}页</span>
                                <Tag className="ml-2" color={c.relevanceScore > 0.9 ? 'green' : 'default'}>
                                  {(c.relevanceScore * 100).toFixed(0)}%
                                </Tag>
                              </div>
                              {c.chunkContent && (
                                <div className="mt-1 text-xs text-gray-500 line-clamp-3">
                                  {c.chunkContent}
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#252525] rounded-lg px-3 py-2 text-sm text-gray-400">
              思考中...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#303030]">
        <Input.Search
          placeholder="输入医学问题，如：什么是动作电位？"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSearch={handleSend}
          enterButton={<Button type="primary" icon={<SendOutlined />} loading={loading}>发送</Button>}
          onPressEnter={handleSend}
        />
      </div>
    </div>
  );
}
