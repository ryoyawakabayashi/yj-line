'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

/**
 * カスタムフローノード
 * 上下両方に source/target ハンドルを配置し、
 * ユーザーがドラッグした方向に自然にエッジが接続される。
 */
function FlowNodeComponent({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-2 rounded-md border-2 bg-white text-sm text-center min-w-[120px] ${
        selected ? 'border-blue-500 shadow-md' : 'border-gray-300'
      }`}
      style={data._style || undefined}
    >
      {/* 上ハンドル: target（入力）+ source（出力） */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />

      {/* ラベル（JSX or テキスト） */}
      <div>{data.label || data.nodeType || 'ノード'}</div>

      {/* 下ハンドル: source（出力）+ target（入力） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{ background: '#94a3b8', width: 8, height: 8 }}
      />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
