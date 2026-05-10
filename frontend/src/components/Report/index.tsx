import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Empty, Tag, Divider } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import type { IntegrationStats, IntegrationDecision } from '../../types';
import * as api from '../../services/api';

interface Props {
  stats: IntegrationStats | null;
}

export default function Report({ stats }: Props) {
  const [decisions, setDecisions] = useState<IntegrationDecision[]>([]);

  useEffect(() => {
    if (stats) {
      api.getIntegrationReport().then((r) => setDecisions(r.examples || [])).catch(() => {});
    }
  }, [stats]);

  if (!stats) {
    return (
      <div className="p-6">
        <Empty description="执行整合后可查看报告" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      <Card size="small" title="整合概览" className="!bg-[#1f1f1f]">
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <Statistic
              title={<span className="text-xs text-gray-500">压缩比</span>}
              value={(stats.compressionRatio * 100).toFixed(1)}
              suffix="%"
              valueStyle={{
                fontSize: 24,
                color: stats.compressionRatio <= 0.3 ? '#52c41a' : '#faad14',
              }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title={<span className="text-xs text-gray-500">节点变化</span>}
              value={stats.mergedNodeCount}
              prefix={`${stats.originalNodeCount} →`}
              valueStyle={{ fontSize: 16, color: '#1677ff' }}
            />
          </Col>
          <Col span={24}>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>{(stats.originalCharCount / 10000).toFixed(1)}万字</span>
              <ArrowRightOutlined />
              <span className="text-green-400">{(stats.mergedCharCount / 10000).toFixed(1)}万字</span>
            </div>
          </Col>
        </Row>
      </Card>

      <Card size="small" title="决策统计" className="!bg-[#1f1f1f]">
        <Row gutter={12}>
          <Col span={8}>
            <Statistic
              title={<span className="text-xs text-gray-500">合并</span>}
              value={stats.mergeCount}
              valueStyle={{ fontSize: 18, color: '#faad14' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<span className="text-xs text-gray-500">保留</span>}
              value={stats.keepCount}
              valueStyle={{ fontSize: 18, color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<span className="text-xs text-gray-500">删除</span>}
              value={stats.removeCount}
              valueStyle={{ fontSize: 18, color: '#999' }}
            />
          </Col>
        </Row>
      </Card>

      {decisions.length > 0 && (
        <Card size="small" title="典型整合案例" className="!bg-[#1f1f1f]">
          {decisions.map((d, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <Tag color={d.action === 'merge' ? 'gold' : d.action === 'keep' ? 'green' : 'default'}>
                  {d.action === 'merge' ? '合并' : d.action === 'keep' ? '保留' : '删除'}
                </Tag>
                <span className="text-sm text-gray-200">{d.resultNode?.name || '—'}</span>
              </div>
              <p className="text-xs text-gray-500 pl-6">{d.reason}</p>
              {i < decisions.length - 1 && <Divider className="!my-2" />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
