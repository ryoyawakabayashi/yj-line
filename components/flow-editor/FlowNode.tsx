'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

/**
 * カスタムフローノード
 * 上下に1つずつハンドルを配置。
 * connectionMode="loose" と組み合わせて、どの方向からでも接続可能。
 */
function FlowNodeComponent({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-2 rounded-md border-2 bg-white text-sm text-center min-w-[120px] ${
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

      {/* ラベル（JSX or テキスト） */}
      <div>{data.label || data.nodeType || 'ノード'}</div>

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
