'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

/**
 * カスタムフローノード
 * 上下に1つずつハンドルを配置。
 * connectionMode="loose" と組み合わせて、どの方向からでも接続可能。
 */
function FlowNodeComponent({ id, data, selected }: NodeProps) {
  const nodeType = data.nodeType || '';
  const isMessageNode = nodeType === 'send_message';

  return (
    <div
      className={`px-4 py-2 rounded-md border-2 bg-white text-sm min-w-[120px] ${
        isMessageNode ? 'text-left max-w-[280px]' : 'text-center'
      } ${
        selected ? 'border-blue-500 shadow-md' : 'border-gray-300'
      }`}
      style={data._style || undefined}
    >
      {/* 上ハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />

      {/* ノードID */}
      <div className="text-[10px] text-gray-400 mb-0.5">{id}</div>

      {/* ラベル（JSX or テキスト） */}
      <div className={isMessageNode ? 'whitespace-pre-wrap break-words' : ''}>
        {data.label || data.nodeType || 'ノード'}
      </div>

      {/* 下ハンドル */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
