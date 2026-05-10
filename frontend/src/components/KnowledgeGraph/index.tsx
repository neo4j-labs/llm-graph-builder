import { useEffect, useRef, useState } from 'react';
import { Graph } from '@antv/g6';
import { Input, Drawer, Descriptions, Tag, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { GraphData, KnowledgeNode } from '../../types';

interface Props {
  data: GraphData;
}

const TEXTBOOK_COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#eb2f96',
  '#722ed1', '#13c2c2', '#faad14',
];

export default function KnowledgeGraph({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return;

    const textbookIds = [...new Set(data.nodes.map((n) => n.textbookId))];
    const colorMap = Object.fromEntries(textbookIds.map((id, i) => [id, TEXTBOOK_COLORS[i % TEXTBOOK_COLORS.length]]));

    const maxFreq = Math.max(...data.nodes.map((n) => n.frequency || 1));

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const graph = new Graph({
      container: containerRef.current,
      autoFit: 'view',
      data: {
        nodes: data.nodes.map((n) => ({
          id: n.id,
          data: { ...n },
          style: {
            size: 20 + ((n.frequency || 1) / maxFreq) * 30,
            fill: n.status === 'removed'
              ? '#555'
              : n.status === 'merged'
                ? '#faad14'
                : colorMap[n.textbookId] || '#1677ff',
            stroke: n.status === 'removed' ? '#333' : '#fff',
            lineWidth: 1,
            opacity: n.status === 'removed' ? 0.4 : 1,
            labelText: n.name,
            labelFill: '#ccc',
            labelFontSize: 10,
            labelPlacement: 'bottom',
          },
        })),
        edges: data.relations.map((r, i) => ({
          id: `edge-${i}`,
          source: r.source,
          target: r.target,
          data: { ...r },
          style: {
            stroke: '#444',
            lineWidth: 1,
            endArrow: r.relationType === 'prerequisite' || r.relationType === 'contains',
            labelText: r.relationType === 'prerequisite' ? '前置' :
              r.relationType === 'contains' ? '包含' :
                r.relationType === 'parallel' ? '并列' : '应用',
            labelFill: '#666',
            labelFontSize: 8,
          },
        })),
      },
      layout: {
        type: 'd3-force',
        preventOverlap: true,
        nodeStrength: -200,
        linkDistance: 120,
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    });

    graph.on('node:click', (evt: any) => {
      const nodeData = evt.target?.attributes?.data || data.nodes.find((n) => n.id === evt.targetId);
      if (nodeData) setSelectedNode(nodeData);
    });

    graph.render();
    graphRef.current = graph;

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [data]);

  useEffect(() => {
    if (!graphRef.current || !searchText) return;
    const graph = graphRef.current;
    data.nodes.forEach((n) => {
      const match = n.name.includes(searchText);
      graph.updateNodeData([{
        id: n.id,
        style: {
          stroke: match ? '#ff4d4f' : '#fff',
          lineWidth: match ? 3 : 1,
        },
      }]);
    });
    graph.draw();
  }, [searchText, data]);

  return (
    <div className="relative w-full h-full">
      {data.nodes.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <Empty description="上传教材并构建知识图谱以查看可视化" />
        </div>
      ) : (
        <>
          <div className="absolute top-4 left-4 z-10">
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索知识点..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="w-64"
            />
          </div>

          <div className="absolute bottom-4 left-4 z-10 bg-[#1f1f1f]/80 backdrop-blur rounded-lg p-3 text-xs border border-[#303030]">
            <div className="font-medium mb-2">图例</div>
            <div className="flex flex-wrap gap-2">
              {[...new Set(data.nodes.map((n) => n.textbookId))].map((id, i) => {
                const title = data.nodes.find((n) => n.textbookId === id)?.textbookTitle || id;
                return (
                  <div key={id} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: TEXTBOOK_COLORS[i % TEXTBOOK_COLORS.length] }}
                    />
                    <span className="text-gray-400">{title}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-[#303030]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-gray-400">已合并</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-gray-600" />
                <span className="text-gray-400">已删除</span>
              </div>
            </div>
          </div>

          <div ref={containerRef} className="w-full h-full" />
        </>
      )}

      <Drawer
        title={selectedNode?.name}
        open={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        width={360}
      >
        {selectedNode && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="定义">{selectedNode.definition}</Descriptions.Item>
            <Descriptions.Item label="类别">
              <Tag>{selectedNode.category}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="章节">{selectedNode.chapter}</Descriptions.Item>
            <Descriptions.Item label="页码">第 {selectedNode.page} 页</Descriptions.Item>
            <Descriptions.Item label="来源教材">{selectedNode.textbookTitle}</Descriptions.Item>
            {selectedNode.frequency && (
              <Descriptions.Item label="跨教材频次">
                <Tag color="blue">{selectedNode.frequency} 本教材</Tag>
              </Descriptions.Item>
            )}
            {selectedNode.status && (
              <Descriptions.Item label="整合状态">
                <Tag color={selectedNode.status === 'kept' ? 'green' : selectedNode.status === 'merged' ? 'gold' : 'default'}>
                  {selectedNode.status === 'kept' ? '保留' : selectedNode.status === 'merged' ? '已合并' : '已删除'}
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
