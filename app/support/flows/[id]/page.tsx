'use client';

import { useState, useCallback, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FaqImportModal } from '@/components/flow-editor/FaqImportModal';

// カスタムエッジ型（order プロパティを追加）
type CustomEdge = Edge & { order?: number };

export default function EditFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');
  const [triggerType, setTriggerType] = useState<string>('support_button');
  const [triggerValue, setTriggerValue] = useState('');
  const [service, setService] = useState<string>('');
  const [priority, setPriority] = useState(0);
  const [urlSourceType, setUrlSourceType] = useState<string>('flow');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFaqImportModal, setShowFaqImportModal] = useState(false);
  const [activeLang, setActiveLang] = useState<string>('ja');
  const [translating, setTranslating] = useState(false);

  const LANGS = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'EN' },
    { code: 'ko', name: 'KO' },
    { code: 'zh', name: 'ZH' },
    { code: 'vi', name: 'VI' },
  ];

  // フローデータ読み込み
  useEffect(() => {
    loadFlow();
  }, [id]);

  const loadFlow = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/flows/${id}`);
      if (res.ok) {
        const data = await res.json();
        const flow = data.flow;

        setFlowName(flow.name);
        setFlowDescription(flow.description || '');
        setTriggerType(flow.triggerType);
        setTriggerValue(flow.triggerValue || '');
        setService(flow.service || '');
        setPriority(flow.priority);
        setUrlSourceType(flow.flowDefinition.variables?.urlSourceType || 'flow');

        // ノードとエッジを復元
        const loadedNodes = flow.flowDefinition.nodes.map((node: any) => ({
          id: node.id,
          type: 'default',
          position: node.position,
          data: {
            ...node.data,
            nodeType: node.type, // ノードタイプを data に保存
          },
        }));

        const loadedEdges = flow.flowDefinition.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          label: edge.label,
          labels: edge.labels,
          order: edge.order,
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
      } else {
        alert('フローの読み込みに失敗しました');
        router.push('/support/flows');
      }
    } catch (error) {
      console.error('フロー読み込みエラー:', error);
      alert('フローの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // エッジ接続時のハンドラー
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        // 同じソースから出ているエッジの数を取得
        const sameSourceEdges = eds.filter((e) => e.source === params.source);
        const newOrder = sameSourceEdges.length;

        // 新しいエッジに order を設定
        return addEdge({ ...params, order: newOrder } as any, eds);
      });
    },
    [setEdges]
  );

  // ノードクリック時のハンドラー
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // キャンバスクリック時のハンドラー（選択解除）
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // --- 親ノードドラッグで子ノードも追従（マインドマップ風） ---
  const dragState = useRef<{
    startPos: { x: number; y: number };
    descendants: Array<{ id: string; startPos: { x: number; y: number } }>;
  } | null>(null);

  // エッジから子孫ノードIDを再帰的に取得
  const getDescendants = useCallback((nodeId: string, edgeList: Edge[]): string[] => {
    const children = edgeList.filter((e) => e.source === nodeId).map((e) => e.target);
    const all: string[] = [...children];
    for (const child of children) {
      all.push(...getDescendants(child, edgeList));
    }
    return [...new Set(all)]; // 重複除去
  }, []);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const descendants = getDescendants(node.id, edges);
      dragState.current = {
        startPos: { x: node.position.x, y: node.position.y },
        descendants: descendants.map((id) => {
          const n = nodes.find((nd) => nd.id === id);
          return { id, startPos: { x: n?.position.x || 0, y: n?.position.y || 0 } };
        }),
      };
    },
    [edges, nodes, getDescendants]
  );

  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!dragState.current || dragState.current.descendants.length === 0) return;
      const dx = node.position.x - dragState.current.startPos.x;
      const dy = node.position.y - dragState.current.startPos.y;

      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          const desc = dragState.current?.descendants.find((d) => d.id === n.id);
          if (desc) {
            return {
              ...n,
              position: { x: desc.startPos.x + dx, y: desc.startPos.y + dy },
            };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  const onNodeDragStop = useCallback(() => {
    dragState.current = null;
  }, []);

  // ノード追加
  const addNode = (nodeType: string) => {
    let position = { x: 250, y: 150 }; // デフォルト位置

    // 既存ノードがある場合、最後のノードの下に配置
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      position = {
        x: lastNode.position.x,
        y: lastNode.position.y + 150, // 150px下に配置
      };
    }

    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: getNodeLabel(nodeType),
        config: getDefaultConfig(nodeType),
        nodeType: nodeType, // ノードタイプを保存
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // ノードタイプのラベル取得
  const getNodeLabel = (nodeType: string): string => {
    const labels: Record<string, string> = {
      send_message: 'メッセージ送信',
      quick_reply: 'クイックリプライ',
      wait_user_input: 'ユーザー入力待機',
      faq_search: 'FAQ検索',
      end: '終了',
    };
    return labels[nodeType] || nodeType;
  };

  // デフォルト設定取得
  const getDefaultConfig = (nodeType: string): any => {
    switch (nodeType) {
      case 'send_message':
        return {
          messageType: 'text',
          content: 'こんにちは！',
        };
      case 'quick_reply':
        return {
          message: 'どちらを選択しますか？',
        };
      case 'wait_user_input':
        return {
          variableName: 'userInput',
          nextNodeId: '',
        };
      case 'faq_search':
        return {
          threshold: 0.7,
          maxResults: 3,
          outputHandles: {
            found: '',
            notFound: '',
          },
        };
      default:
        return {};
    }
  };

  // ノード設定更新
  const updateNodeConfig = (nodeId: string, newConfig: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: newConfig,
            },
          };
        }
        return node;
      })
    );

    // selectedNodeも更新
    if (selectedNode?.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          config: newConfig,
        },
      });
    }
  };

  // エッジの順序を変更
  const moveEdgeOrder = (edgeId: string, direction: 'up' | 'down') => {
    if (!selectedNode) return;

    // 現在のノードから出ているエッジを取得してソート
    const outgoingEdges = (edges as CustomEdge[])
      .filter((edge) => edge.source === selectedNode.id)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    const currentIndex = outgoingEdges.findIndex((edge) => edge.id === edgeId);
    if (currentIndex === -1) return;

    // 移動不可能な場合は終了
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === outgoingEdges.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    // order を入れ替え
    const newEdges = edges.map((edge) => {
      if (edge.id === outgoingEdges[currentIndex].id) {
        return { ...edge, order: targetIndex };
      }
      if (edge.id === outgoingEdges[targetIndex].id) {
        return { ...edge, order: currentIndex };
      }
      return edge;
    });

    setEdges(newEdges);
  };

  // FAQインポート処理
  const handleFaqImport = (faqData: Array<{ id: string; question: string }>) => {
    if (!selectedNode) return;

    // 現在のノードから出ているエッジの最大order値を取得
    const currentEdges = (edges as CustomEdge[]).filter((e) => e.source === selectedNode.id);
    const maxOrder = currentEdges.reduce(
      (max, edge) => Math.max(max, edge.order ?? 0),
      -1
    );

    // 選択されたFAQからエッジを作成
    const newEdges: Edge[] = faqData.map((faq, index) => ({
      id: `edge-faq-${faq.id}-${Date.now()}-${index}`,
      source: selectedNode.id,
      target: '', // ユーザーが後で接続する
      label: faq.question,
      order: maxOrder + index + 1,
    } as Edge));

    // エッジを追加
    setEdges((prevEdges) => [...prevEdges, ...newEdges]);
  };

  // エッジラベルを更新
  const updateEdgeLabel = (edgeId: string, newLabel: string) => {
    setEdges((prevEdges) =>
      prevEdges.map((edge) =>
        edge.id === edgeId ? { ...edge, label: newLabel } : edge
      )
    );
  };

  // 多言語コンテンツのヘルパー関数
  const getContentForLang = (content: string | Record<string, string> | undefined, lang: string): string => {
    if (!content) return '';
    if (typeof content === 'object') return content[lang] || '';
    return lang === 'ja' ? content : '';
  };

  const setContentForLang = (
    content: string | Record<string, string> | undefined,
    lang: string,
    value: string
  ): string | Record<string, string> => {
    if (lang === 'ja' && typeof content !== 'object') {
      return value;
    }
    const obj = typeof content === 'object' ? { ...content } : { ja: String(content || '') };
    obj[lang] = value;
    return obj;
  };

  const getEdgeLabelForLang = (edge: any, lang: string): string => {
    if (lang === 'ja') return (edge.label as string) || '';
    return edge.labels?.[lang] || '';
  };

  const updateEdgeLabelForLang = (edgeId: string, newLabel: string, lang: string) => {
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        if (edge.id !== edgeId) return edge;
        if (lang === 'ja') {
          return { ...edge, label: newLabel };
        }
        const currentLabels = (edge as any).labels || {};
        return { ...edge, labels: { ...currentLabels, [lang]: newLabel } };
      })
    );
  };

  // 一括翻訳
  const handleTranslateAll = async () => {
    setTranslating(true);
    try {
      const texts: string[] = [];
      const textSources: Array<{ type: string; id: string }> = [];

      nodes.forEach((node) => {
        const nodeType = node.data.nodeType || (node.id.startsWith('trigger') ? 'trigger' : node.id.split('-')[0]);
        if (nodeType === 'send_message') {
          const content = typeof node.data.config.content === 'object'
            ? node.data.config.content.ja
            : node.data.config.content;
          if (content) {
            texts.push(content);
            textSources.push({ type: 'node_content', id: node.id });
          }
        }
        if (nodeType === 'quick_reply') {
          const message = typeof node.data.config.message === 'object'
            ? node.data.config.message.ja
            : node.data.config.message;
          if (message) {
            texts.push(message);
            textSources.push({ type: 'node_message', id: node.id });
          }
        }
      });

      edges.forEach((edge) => {
        if (edge.label) {
          texts.push(edge.label as string);
          textSources.push({ type: 'edge_label', id: edge.id });
        }
      });

      if (texts.length === 0) {
        alert('翻訳対象のテキストがありません');
        setTranslating(false);
        return;
      }

      const res = await fetch('/api/dashboard/flows/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      });

      if (!res.ok) throw new Error('Translation API failed');
      const data = await res.json();
      const translations = data.translations;

      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          const source = textSources.find(
            (s) => s.id === node.id && (s.type === 'node_content' || s.type === 'node_message')
          );
          if (!source) return node;
          const idx = textSources.indexOf(source);
          const t = translations[idx];
          if (!t) return node;

          const configKey = source.type === 'node_content' ? 'content' : 'message';
          return {
            ...node,
            data: {
              ...node.data,
              config: {
                ...node.data.config,
                [configKey]: { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi },
              },
            },
          };
        })
      );

      setEdges((prevEdges) =>
        prevEdges.map((edge) => {
          const source = textSources.find((s) => s.id === edge.id && s.type === 'edge_label');
          if (!source) return edge;
          const idx = textSources.indexOf(source);
          const t = translations[idx];
          if (!t) return edge;
          return {
            ...edge,
            labels: { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi },
          };
        })
      );

      // selectedNode も更新
      if (selectedNode) {
        const source = textSources.find((s) => s.id === selectedNode.id);
        if (source) {
          const idx = textSources.indexOf(source);
          const t = translations[idx];
          if (t) {
            const configKey = source.type === 'node_content' ? 'content' : 'message';
            setSelectedNode({
              ...selectedNode,
              data: {
                ...selectedNode.data,
                config: {
                  ...selectedNode.data.config,
                  [configKey]: { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi },
                },
              },
            });
          }
        }
      }

      alert(`${texts.length}件のテキストを翻訳しました`);
    } catch (error) {
      console.error('翻訳エラー:', error);
      alert('翻訳に失敗しました');
    } finally {
      setTranslating(false);
    }
  };

  // 選択されたノードのタイプを取得
  const getSelectedNodeType = (): string => {
    if (!selectedNode) return '';
    // data.nodeType が存在する場合はそれを使用（読み込み時）
    if (selectedNode.data.nodeType) return selectedNode.data.nodeType;
    // 新規作成時は ID から推測
    if (selectedNode.id.startsWith('trigger')) return 'trigger';
    return selectedNode.id.split('-')[0];
  };

  // フロー更新
  const handleUpdate = async () => {
    if (!flowName) {
      alert('フロー名を入力してください');
      return;
    }

    if (nodes.length === 0) {
      alert('最低1つのノードが必要です');
      return;
    }

    try {
      setSaving(true);

      const flowDefinition = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.data.nodeType || (node.id.startsWith('trigger') ? 'trigger' : node.id.split('-')[0]),
          position: node.position,
          data: {
            label: node.data.label,
            config: node.data.config,
          },
        })),
        edges: (edges as CustomEdge[]).map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          label: edge.label,
          labels: (edge as any).labels,
          order: edge.order,
        })),
        variables: {
          urlSourceType,
        },
      };

      const res = await fetch(`/api/dashboard/flows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowName,
          description: flowDescription,
          triggerType,
          triggerValue: triggerValue || undefined,
          service: service || undefined,
          priority,
          flowDefinition,
        }),
      });

      if (res.ok) {
        alert('フローを更新しました');
        router.push('/support/flows');
      } else {
        const error = await res.json();
        alert(`更新エラー: ${error.error}`);
      }
    } catch (error) {
      console.error('フロー更新エラー:', error);
      alert('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/support/flows')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← 戻る
            </button>
            <h1 className="text-xl font-bold text-gray-900">フロー編集</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTranslateAll}
              disabled={translating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm"
            >
              {translating ? '翻訳中...' : '一括翻訳 (5言語)'}
            </button>
            <button
              onClick={handleUpdate}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? '保存中...' : '更新'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Flow Settings */}
        <aside className="w-80 bg-white border-r p-4 overflow-y-auto">
          <h2 className="font-bold text-lg mb-4">フロー設定</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                フロー名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="例: サポート問い合わせフロー"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                placeholder="フローの説明を入力..."
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                トリガー <span className="text-red-500">*</span>
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="support_button">サポートボタン</option>
                <option value="keyword">キーワード</option>
                <option value="postback">ポストバック</option>
                <option value="message_pattern">メッセージパターン</option>
              </select>
            </div>

            {(triggerType === 'keyword' || triggerType === 'message_pattern') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  トリガー値
                </label>
                <input
                  type="text"
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder="例: help, サポート"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                サービス
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">全サービス</option>
                <option value="YOLO_JAPAN">YOLO JAPAN</option>
                <option value="YOLO_DISCOVER">YOLO DISCOVER</option>
                <option value="YOLO_HOME">YOLO HOME</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                優先度
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                数値が大きいほど優先されます
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URLトラッキング種別
              </label>
              <select
                value={urlSourceType}
                onChange={(e) => setUrlSourceType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="flow">フロー（汎用）</option>
                <option value="support">サポート</option>
                <option value="support_yolo_japan">サポート - YOLO JAPAN</option>
                <option value="support_yolo_discover">サポート - YOLO DISCOVER</option>
                <option value="support_yolo_home">サポート - YOLO HOME</option>
                <option value="faq">FAQ</option>
                <option value="diagnosis">診断</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                URL自動変換時のUTMキャンペーン名に使われます
              </p>
            </div>

            <hr className="my-4" />

            <div>
              <h3 className="font-medium text-sm mb-2">ノードを追加</h3>
              <div className="space-y-2">
                <button
                  onClick={() => addNode('send_message')}
                  className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100 transition"
                >
                  + メッセージ送信
                </button>
                <button
                  onClick={() => addNode('quick_reply')}
                  className="w-full px-3 py-2 bg-yellow-50 text-yellow-700 rounded-md text-sm hover:bg-yellow-100 transition"
                >
                  + クイックリプライ
                </button>
                <button
                  onClick={() => addNode('wait_user_input')}
                  className="w-full px-3 py-2 bg-purple-50 text-purple-700 rounded-md text-sm hover:bg-purple-100 transition"
                >
                  + ユーザー入力待機
                </button>
                <button
                  onClick={() => addNode('faq_search')}
                  className="w-full px-3 py-2 bg-green-50 text-green-700 rounded-md text-sm hover:bg-green-100 transition"
                >
                  + FAQ検索
                </button>
                <button
                  onClick={() => addNode('end')}
                  className="w-full px-3 py-2 bg-gray-50 text-gray-700 rounded-md text-sm hover:bg-gray-100 transition"
                >
                  + 終了
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            minZoom={0.05}
            maxZoom={2}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </main>

        {/* Right Sidebar - Node Settings */}
        {selectedNode && (
          <aside className="w-80 bg-white border-l p-4 overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">ノード設定</h2>

            <div className="mb-4 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">ノードID</div>
              <div className="text-sm font-mono">{selectedNode.id}</div>
            </div>

            {getSelectedNodeType() === 'trigger' && (
              <div className="text-sm text-gray-600">
                トリガーノードは設定不要です。フローの開始点として機能します。
              </div>
            )}

            {getSelectedNodeType() === 'send_message' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージタイプ
                  </label>
                  <select
                    value={selectedNode.data.config.messageType || 'text'}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        messageType: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="text">テキスト</option>
                    <option value="flex">Flex Message</option>
                    <option value="template">Template</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージ内容 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1 mb-2">
                    {LANGS.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setActiveLang(lang.code)}
                        className={`px-2 py-1 text-xs rounded transition ${
                          activeLang === lang.code
                            ? 'bg-blue-600 text-white'
                            : getContentForLang(selectedNode.data.config.content, lang.code)
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={getContentForLang(selectedNode.data.config.content, activeLang)}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        content: setContentForLang(selectedNode.data.config.content, activeLang, e.target.value),
                      })
                    }
                    placeholder={activeLang === 'ja' ? 'メッセージを入力...' : `${activeLang}の翻訳を入力...`}
                    rows={6}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    変数を使用できます: {'{{user.name}}'}, {'{{userMessage}}'}
                  </p>
                </div>
              </div>
            )}

            {getSelectedNodeType() === 'quick_reply' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージ <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1 mb-2">
                    {LANGS.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setActiveLang(lang.code)}
                        className={`px-2 py-1 text-xs rounded transition ${
                          activeLang === lang.code
                            ? 'bg-blue-600 text-white'
                            : getContentForLang(selectedNode.data.config.message, lang.code)
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={getContentForLang(selectedNode.data.config.message, activeLang)}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        message: setContentForLang(selectedNode.data.config.message, activeLang, e.target.value),
                      })
                    }
                    placeholder={activeLang === 'ja' ? '選択肢と一緒に送るメッセージを入力...' : `${activeLang}の翻訳を入力...`}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    変数を使用できます: {'{{user.name}}'}, {'{{userMessage}}'}
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    使い方:
                  </p>
                  <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                    <li>このノードから複数のノードにエッジで接続</li>
                    <li>各エッジのラベルを入力欄で編集</li>
                    <li>ラベルがLINEのボタンテキストになります</li>
                    <li>ユーザーがボタンを押すと対応するノードへ進みます</li>
                  </ol>
                </div>

                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">接続されたエッジ (表示順序):</p>
                    <button
                      onClick={() => setShowFaqImportModal(true)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded flex items-center gap-1 transition-colors"
                      title="FAQから質問をインポート"
                    >
                      <span className="text-lg leading-none">+</span>
                      FAQから追加
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(edges as CustomEdge[])
                      .filter((edge) => edge.source === selectedNode.id)
                      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                      .map((edge, index, array) => (
                        <div key={edge.id} className="bg-gray-50 px-2 py-2 rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <input
                              type="text"
                              value={getEdgeLabelForLang(edge, activeLang)}
                              onChange={(e) => updateEdgeLabelForLang(edge.id, e.target.value, activeLang)}
                              placeholder={activeLang === 'ja' ? 'ボタンのラベル' : `${activeLang}のラベル`}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => moveEdgeOrder(edge.id, 'up')}
                                disabled={index === 0}
                                className="px-1.5 py-0.5 text-xs bg-white border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="上に移動"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveEdgeOrder(edge.id, 'down')}
                                disabled={index === array.length - 1}
                                className="px-1.5 py-0.5 text-xs bg-white border rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="下に移動"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 pl-2">
                            → {edge.target || '(未接続)'}
                          </div>
                        </div>
                      ))}
                    {edges.filter((edge) => edge.source === selectedNode.id).length === 0 && (
                      <div className="text-xs text-gray-400">
                        エッジが接続されていません
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {getSelectedNodeType() === 'wait_user_input' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    変数名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.config.variableName || ''}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        variableName: e.target.value,
                      })
                    }
                    placeholder="例: userInput"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ユーザー入力を保存する変数名
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    次のノードID
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.config.nextNodeId || ''}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        nextNodeId: e.target.value,
                      })
                    }
                    placeholder="自動: エッジで接続"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    通常はエッジで接続します
                  </p>
                </div>
              </div>
            )}

            {getSelectedNodeType() === 'faq_search' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    スコア閾値
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={selectedNode.data.config.threshold || 0.7}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        threshold: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    0.0〜1.0（推奨: 0.7）
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大結果数
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={selectedNode.data.config.maxResults || 3}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        maxResults: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">分岐設定:</p>
                  <ul className="text-xs space-y-1">
                    <li>• found: FAQ見つかった場合</li>
                    <li>• notFound: 見つからなかった場合</li>
                  </ul>
                  <p className="mt-2 text-xs">エッジで次のノードに接続してください</p>
                </div>
              </div>
            )}

            {getSelectedNodeType() === 'end' && (
              <div className="text-sm text-gray-600">
                終了ノードは設定不要です。フローを終了します。
              </div>
            )}
          </aside>
        )}
      </div>

      {/* FAQ Import Modal */}
      <FaqImportModal
        isOpen={showFaqImportModal}
        onClose={() => setShowFaqImportModal(false)}
        currentService={service as any}
        onImport={handleFaqImport}
      />
    </div>
  );
}
