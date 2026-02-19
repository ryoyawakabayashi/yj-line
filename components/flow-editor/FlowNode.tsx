'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

/**
 * カスタムフローノード
 * 上下に1つずつハンドルを配置。
 * connectionMode="loose" と組み合わせて、どの方向からでも接続可能。
 */
function FlowNodeComponent({ data, selected }: NodeProps) {
  const nodeType = data.nodeType || '';
  const isMessageNode = nodeType === 'send_message';
  const warningLevel = data._warningLevel as 'error' | 'warning' | null;

  // 警告レベルに応じたボーダー色
  const borderClass = selected
    ? 'border-blue-500 shadow-md'
    : warningLevel === 'error'
      ? 'border-red-400'
      : warningLevel === 'warning'
        ? 'border-yellow-400'
        : 'border-gray-300';

  return (
    <div
      className={`relative px-4 py-2 rounded-md border-2 bg-white text-sm min-w-[120px] ${
        isMessageNode ? 'text-left max-w-[280px]' : 'text-center'
      } ${borderClass}`}
      style={data._style || undefined}
    >
      {/* 上ハンドル */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#94a3b8', width: 12, height: 12 }}
      />

      {/* 警告インジケーター */}
      {warningLevel && (
        <div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: warningLevel === 'error' ? '#ef4444' : '#f59e0b' }}
          title={warningLevel === 'error' ? 'エラーあり' : '警告あり'}
        >
          !
        </div>
      )}

      {/* 翻訳ロックインジケーター */}
      {data.translationLocked && (
        <div
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-green-500"
          title="翻訳済み"
        >
          🔒
        </div>
      )}

      {/* ラベル（JSX or テキスト） */}
      <div className={isMessageNode ? 'whitespace-pre-wrap break-words' : ''}>
        {data.label || data.nodeType || 'ノード'}
      </div>

      {/* 下ハンドル */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#94a3b8', width: 12, height: 12 }}
      />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
