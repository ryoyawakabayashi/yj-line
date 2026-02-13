'use client';

import { useState, useCallback, useEffect, use, useRef, useMemo } from 'react';
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

// サービス別カラー定義
const SERVICE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  YOLO_JAPAN: { bg: '#fde8ea', border: '#d10a1c', text: '#8a0712' },
  YOLO_DISCOVER: { bg: '#fef9e7', border: '#f9c83d', text: '#7a6100' },
  YOLO_HOME: { bg: '#e6f0fa', border: '#036ed9', text: '#024a91' },
};

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
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ id: string; name: string; message: string; quickReplies: { label: string; text: string }[] }>>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const isInitializedRef = useRef(false);

  const DRAFT_KEY = `flow-editor-draft-${id}`;

  // 下書きデータの型
  interface DraftData {
    flowName: string;
    flowDescription: string;
    triggerType: string;
    triggerValue: string;
    service: string;
    priority: number;
    urlSourceType: string;
    nodes: any[];
    edges: any[];
    savedAt: string;
  }

  // 下書き保存
  const saveDraft = useCallback(() => {
    try {
      const draft: DraftData = {
        flowName,
        flowDescription,
        triggerType,
        triggerValue,
        service,
        priority,
        urlSourceType,
        nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
        edges: (edges as CustomEdge[]).map((e) => ({
          id: e.id, source: e.source, target: e.target,
          sourceHandle: e.sourceHandle, label: e.label, labels: (e as any).labels,
          text: (e as any).text, texts: (e as any).texts, order: e.order,
        })),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch (e) {
      console.error('下書き保存エラー:', e);
    }
  }, [flowName, flowDescription, triggerType, triggerValue, service, priority, urlSourceType, nodes, edges, DRAFT_KEY]);

  // 下書き復元
  const restoreDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return false;
      const draft: DraftData = JSON.parse(saved);

      setFlowName(draft.flowName || '');
      setFlowDescription(draft.flowDescription || '');
      setTriggerType(draft.triggerType || 'support_button');
      setTriggerValue(draft.triggerValue || '');
      setService(draft.service || '');
      setPriority(draft.priority || 0);
      setUrlSourceType(draft.urlSourceType || 'flow');

      if (draft.nodes && draft.nodes.length > 0) {
        setNodes(draft.nodes);
      }
      if (draft.edges) {
        setEdges(draft.edges);
      }
      setDraftSavedAt(draft.savedAt);
      return true;
    } catch (e) {
      console.error('下書き復元エラー:', e);
      return false;
    }
  }, [setNodes, setEdges, DRAFT_KEY]);

  // 下書き削除
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftSavedAt(null);
  }, [DRAFT_KEY]);

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

        // 下書きチェック: サーバーデータより新しい下書きがあれば復元を提案
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          try {
            const draft: DraftData = JSON.parse(saved);
            const draftTime = new Date(draft.savedAt);
            const serverTime = new Date(flow.updatedAt);
            if (draftTime > serverTime) {
              const savedTimeStr = draftTime.toLocaleString('ja-JP');
              if (confirm(`未保存の下書きが見つかりました（${savedTimeStr}）\n復元しますか？（「キャンセル」でサーバーのデータを使用）`)) {
                restoreDraft();
                isInitializedRef.current = true;
                return;
              }
            }
            clearDraft();
          } catch {
            clearDraft();
          }
        }

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
          text: edge.text,
          texts: edge.texts,
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
      isInitializedRef.current = true;
    }
  };

  // 自動一時保存（変更時にdebounce）
  useEffect(() => {
    if (!isInitializedRef.current) return;
    const timer = setTimeout(() => {
      const hasContent = flowName || nodes.length > 0 || edges.length > 0;
      if (hasContent) {
        saveDraft();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [flowName, flowDescription, triggerType, triggerValue, service, priority, urlSourceType, nodes, edges, saveDraft]);

  // エッジ接続時のハンドラー
  const onConnect = useCallback(
    (params: Connection) => {
      // ターゲットがquick_replyノードの場合、エッジの向きを反転
      // （子→親へドラッグした場合に親→子に補正）
      const targetNode = nodes.find((n) => n.id === params.target);
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetType = targetNode?.data?.nodeType || targetNode?.id?.split('-')[0];
      const sourceType = sourceNode?.data?.nodeType || sourceNode?.id?.split('-')[0];

      let finalParams = params;
      if (targetType === 'quick_reply' && sourceType !== 'trigger') {
        finalParams = { ...params, source: params.target, target: params.source };
      }

      // 子ノードのノード名をエッジラベルに自動セット
      const childNode = nodes.find((n) => n.id === finalParams.target);
      const childLabel = childNode?.data?.label || '';

      setEdges((eds) => {
        const sameSourceEdges = eds.filter((e) => e.source === finalParams.source);
        const newOrder = sameSourceEdges.length;
        const newEdges = addEdge({ ...finalParams, order: newOrder } as any, eds);
        // addEdge がlabelを保持しない場合があるため、新規エッジに明示的にセット
        return newEdges.map((e) => {
          if (e.source === finalParams.source && e.target === finalParams.target && !e.label && childLabel) {
            return { ...e, label: childLabel };
          }
          return e;
        });
      });

      // 親ノードのサービス（色）を子ノードに引き継ぐ
      if (finalParams.source && finalParams.target) {
        const parentNode = nodes.find((n) => n.id === finalParams.source);
        const parentService = parentNode?.data?.service;
        if (parentService) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === finalParams.target
                ? { ...n, data: { ...n.data, service: parentService } }
                : n
            )
          );
        }
      }
    },
    [setEdges, setNodes, nodes]
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
  const reactFlowInstance = useRef<any>(null);
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

  // ノード追加（ビューポート中央に配置）
  const addNode = (nodeType: string) => {
    let position = { x: 250, y: 150 }; // デフォルト位置

    // ReactFlowインスタンスがある場合、現在のビューポート中央に配置
    if (reactFlowInstance.current) {
      const rfBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (rfBounds) {
        position = reactFlowInstance.current.screenToFlowPosition({
          x: rfBounds.x + rfBounds.width / 2,
          y: rfBounds.y + rfBounds.height / 2,
        });
      }
    }

    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: getNodeLabel(nodeType),
        config: getDefaultConfig(nodeType),
        nodeType: nodeType, // ノードタイプを保存
        ...(service ? { service } : {}),
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // エッジ削除（接続先ノードも削除）
  const deleteEdgeAndTarget = (edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const targetId = edge.target;
    // 他のエッジからも接続されているか確認（他からも繋がってたらノードは残す）
    const otherEdgesToTarget = edges.filter((e) => e.id !== edgeId && e.target === targetId);
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    if (otherEdgesToTarget.length === 0) {
      setNodes((nds) => nds.filter((n) => n.id !== targetId));
    }
  };

  // クイックリプライの選択肢追加（ノード+エッジを同時作成）
  const addQuickReplyChoice = () => {
    if (!selectedNode) return;
    const parentId = selectedNode.id;
    const parentService = selectedNode.data?.service || '';

    // 親ノードの位置から右下にオフセットして配置
    const existingEdges = edges.filter((e) => e.source === parentId);
    const offsetIndex = existingEdges.length;
    const newNodeId = `send_message-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'default',
      position: {
        x: selectedNode.position.x + 250,
        y: selectedNode.position.y + offsetIndex * 120,
      },
      data: {
        label: `選択肢${offsetIndex + 1}`,
        config: getDefaultConfig('send_message'),
        nodeType: 'send_message',
        ...(parentService ? { service: parentService } : {}),
      },
    };

    const newEdge = {
      id: `e-${parentId}-${newNodeId}`,
      source: parentId,
      target: newNodeId,
      label: `選択肢${offsetIndex + 1}`,
      order: offsetIndex,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
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

  // ノードラベル更新（親ノードのエッジラベルにも同期）
  const updateNodeLabel = (nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newLabel,
            },
          };
        }
        return node;
      })
    );

    // このノードをターゲットとするエッジのラベルも同期
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.target === nodeId) {
          return { ...edge, label: newLabel };
        }
        return edge;
      })
    );

    if (selectedNode?.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          label: newLabel,
        },
      });
    }
  };

  // ノードのサービスを更新（子孫ノードにも伝播）
  const updateNodeService = (nodeId: string, newService: string) => {
    // 子孫ノードIDを全て取得（BFS）
    const descendantIds = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const childEdges = edges.filter((e) => e.source === current);
      for (const edge of childEdges) {
        if (!descendantIds.has(edge.target)) {
          descendantIds.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId || descendantIds.has(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              service: newService || undefined,
            },
          };
        }
        return node;
      })
    );

    if (selectedNode?.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          service: newService || undefined,
        },
      });
    }
  };

  // コンテンツからラベルプレビューを生成
  const generateLabelFromConfig = (nodeType: string, config: any): string | null => {
    let text = '';
    if (nodeType === 'send_message' && config.content) {
      text = typeof config.content === 'object' ? (config.content.ja || '') : config.content;
    } else if (nodeType === 'quick_reply' && config.message) {
      text = typeof config.message === 'object' ? (config.message.ja || '') : config.message;
    }
    if (!text) return null;
    return text.length > 25 ? text.substring(0, 25) + '...' : text;
  };

  // テンプレート読み込み
  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/dashboard/templates');
      if (res.ok) {
        const data = await res.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('テンプレート読み込みエラー:', error);
    }
  };

  // テンプレートをsend_messageノードに適用
  const applyTemplate = (template: { name: string; message: string; quickReplies: { label: string; text: string }[] }) => {
    if (!selectedNode) return;
    const items = template.quickReplies.map((qr) => ({
      type: 'action' as const,
      action: { type: 'message' as const, label: qr.label, text: qr.text },
    }));
    const newConfig = {
      ...selectedNode.data.config,
      content: template.message,
      quickReply: items.length > 0 ? { items } : undefined,
    };
    updateNodeConfig(selectedNode.id, newConfig);
    setShowTemplateDropdown(false);
  };

  // クイックリプライアイテム追加
  const addQuickReplyItem = () => {
    if (!selectedNode) return;
    const current = selectedNode.data.config.quickReply?.items || [];
    const newItems = [
      ...current,
      { type: 'action' as const, action: { type: 'message' as const, label: '', text: '' } },
    ];
    updateNodeConfig(selectedNode.id, {
      ...selectedNode.data.config,
      quickReply: { items: newItems },
    });
  };

  // クイックリプライアイテム削除
  const removeQuickReplyItem = (index: number) => {
    if (!selectedNode) return;
    const current = selectedNode.data.config.quickReply?.items || [];
    const newItems = current.filter((_: any, i: number) => i !== index);
    updateNodeConfig(selectedNode.id, {
      ...selectedNode.data.config,
      quickReply: newItems.length > 0 ? { items: newItems } : undefined,
    });
  };

  // クイックリプライアイテム更新
  const updateQuickReplyItem = (index: number, field: 'label' | 'text', value: string) => {
    if (!selectedNode) return;
    const current = selectedNode.data.config.quickReply?.items || [];
    const newItems = current.map((item: any, i: number) => {
      if (i !== index) return item;
      return {
        ...item,
        action: { ...item.action, [field]: value },
      };
    });
    updateNodeConfig(selectedNode.id, {
      ...selectedNode.data.config,
      quickReply: { items: newItems },
    });
  };

  // ノード設定更新
  const updateNodeConfig = (nodeId: string, newConfig: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const nodeType = node.data.nodeType || (node.id.startsWith('trigger') ? 'trigger' : node.id.split('-')[0]);
          const autoLabel = generateLabelFromConfig(nodeType, newConfig);
          return {
            ...node,
            data: {
              ...node.data,
              config: newConfig,
              ...(autoLabel ? { label: autoLabel } : {}),
            },
          };
        }
        return node;
      })
    );

    // selectedNodeも更新
    if (selectedNode?.id === nodeId) {
      const nodeType = selectedNode.data.nodeType || (selectedNode.id.startsWith('trigger') ? 'trigger' : selectedNode.id.split('-')[0]);
      const autoLabel = generateLabelFromConfig(nodeType, newConfig);
      setSelectedNode({
        ...selectedNode,
        data: {
          ...selectedNode.data,
          config: newConfig,
          ...(autoLabel ? { label: autoLabel } : {}),
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
    if (lang === 'ja') {
      const label = (edge.label as string) || '';
      if (!label) {
        // フォールバック: エッジラベルが空なら子ノード名を表示
        const targetNode = nodes.find((n: Node) => n.id === edge.target);
        return targetNode?.data?.label || '';
      }
      return label;
    }
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

  // エッジラベル変更時に接続先（子）ノードの名前も同期する
  const syncTargetNodeLabelFromEdge = (edgeId: string, newLabel: string) => {
    const targetEdge = edges.find((e) => e.id === edgeId);
    if (!targetEdge || !newLabel) return;
    const targetId = targetEdge.target;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === targetId ? { ...n, data: { ...n.data, label: newLabel } } : n
      )
    );
    if (selectedNode?.id === targetId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: newLabel } });
    }
  };

  // エッジの送信テキスト取得・更新
  const getEdgeTextForLang = (edge: any, lang: string): string => {
    if (lang === 'ja') return (edge as any).text || '';
    return (edge as any).texts?.[lang] || '';
  };

  const updateEdgeTextForLang = (edgeId: string, newText: string, lang: string) => {
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        if (edge.id !== edgeId) return edge;
        if (lang === 'ja') {
          return { ...edge, text: newText || undefined };
        }
        const currentTexts = (edge as any).texts || {};
        return { ...edge, texts: { ...currentTexts, [lang]: newText } };
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
            ...(node.data.service ? { service: node.data.service } : {}),
            config: node.data.config,
          },
        })),
        edges: (edges as CustomEdge[]).map((edge) => {
          // ラベルが空なら子ノード名をフォールバック
          let label = edge.label;
          if (!label) {
            const targetNode = nodes.find((n) => n.id === edge.target);
            label = targetNode?.data?.label || '';
          }
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            label,
            labels: (edge as any).labels,
            text: (edge as any).text,
            texts: (edge as any).texts,
            order: edge.order,
          };
        }),
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
        clearDraft();
        alert('フローを更新しました');
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

  // サービス別カラーをノードに適用
  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      const svc = node.data.service;
      if (!svc || !SERVICE_COLORS[svc]) return node;
      const colors = SERVICE_COLORS[svc];
      return {
        ...node,
        style: {
          ...node.style,
          background: colors.bg,
          borderColor: colors.border,
          borderWidth: 2,
          color: colors.text,
        },
      };
    });
  }, [nodes]);

  // サービス別カラーをエッジに適用（キャンバス上のラベルは非表示）
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      const svc = sourceNode?.data.service || targetNode?.data.service;
      const baseStyle = {
        ...edge,
        label: undefined, // キャンバス上のエッジラベルを非表示
      };
      if (!svc || !SERVICE_COLORS[svc]) return baseStyle;
      const colors = SERVICE_COLORS[svc];
      return {
        ...baseStyle,
        style: {
          ...edge.style,
          stroke: colors.border,
          strokeWidth: 2,
        },
      };
    });
  }, [edges, nodes]);

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
            {draftSavedAt && (
              <span className="text-xs text-gray-400">
                下書き保存: {new Date(draftSavedAt).toLocaleTimeString('ja-JP')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { saveDraft(); alert('一時保存しました'); }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm"
            >
              一時保存
            </button>
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
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onInit={(instance) => { reactFlowInstance.current = instance; }}
            minZoom={0.05}
            maxZoom={2}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                const svc = node.data?.service;
                if (svc && SERVICE_COLORS[svc]) return SERVICE_COLORS[svc].border;
                return '#e2e8f0';
              }}
            />
          </ReactFlow>
        </main>

        {/* Right Sidebar - Node Settings */}
        {selectedNode && (
          <aside className="w-80 bg-white border-l p-4 overflow-y-auto relative flex flex-col">
            <h2 className="font-bold text-lg mb-4">ノード設定</h2>

            <div className="mb-4 p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">ノードID</div>
              <div className="text-sm font-mono">{selectedNode.id}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ノード名
              </label>
              <input
                type="text"
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                placeholder="ノードの表示名"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            {getSelectedNodeType() !== 'trigger' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  サービス
                </label>
                <select
                  value={selectedNode.data.service || ''}
                  onChange={(e) => updateNodeService(selectedNode.id, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  style={
                    selectedNode.data.service && SERVICE_COLORS[selectedNode.data.service]
                      ? { borderColor: SERVICE_COLORS[selectedNode.data.service].border, borderWidth: 2 }
                      : {}
                  }
                >
                  <option value="">なし</option>
                  <option value="YOLO_JAPAN">YOLO JAPAN</option>
                  <option value="YOLO_DISCOVER">YOLO DISCOVER</option>
                  <option value="YOLO_HOME">YOLO HOME</option>
                </select>
              </div>
            )}

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

                {/* クイックリプライ設定 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      クイックリプライ
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (!showTemplateDropdown) loadTemplates();
                          setShowTemplateDropdown(!showTemplateDropdown);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        テンプレートから追加
                      </button>
                      {showTemplateDropdown && (
                        <div className="absolute right-0 top-6 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {availableTemplates.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400">
                              テンプレートがありません
                            </div>
                          ) : (
                            availableTemplates.map((tpl) => (
                              <button
                                key={tpl.id}
                                onClick={() => applyTemplate(tpl)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 border-b last:border-b-0"
                              >
                                <div className="font-medium text-gray-800">{tpl.name}</div>
                                <div className="text-gray-500 truncate">{tpl.message}</div>
                                {tpl.quickReplies.length > 0 && (
                                  <div className="text-indigo-500 mt-0.5">
                                    {tpl.quickReplies.map((q) => q.label).join(' / ')}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedNode.data.config.quickReply?.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-1 mb-2 items-center">
                      <input
                        type="text"
                        value={item.action?.label || ''}
                        onChange={(e) => updateQuickReplyItem(idx, 'label', e.target.value)}
                        placeholder="ラベル"
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={item.action?.text || ''}
                        onChange={(e) => updateQuickReplyItem(idx, 'text', e.target.value)}
                        placeholder="送信テキスト"
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => removeQuickReplyItem(idx)}
                        className="text-red-400 hover:text-red-600 text-sm px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addQuickReplyItem}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + アイテム追加
                  </button>

                  {(selectedNode.data.config.quickReply?.items || []).length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      フロー終了後、ユーザーがボタンを押すとテキスト（AI_MODEなど）が送信され、通常のハンドラーで処理されます。
                    </div>
                  )}
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
                    <div className="flex gap-1">
                      <button
                        onClick={addQuickReplyChoice}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded flex items-center gap-1 transition-colors"
                        title="選択肢を追加"
                      >
                        + 追加
                      </button>
                      <button
                        onClick={() => setShowFaqImportModal(true)}
                        className="px-2 py-1 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1 transition-colors"
                        title="FAQから質問をインポート"
                      >
                        + FAQ
                      </button>
                    </div>
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
                              onChange={(e) => {
                                updateEdgeLabelForLang(edge.id, e.target.value, activeLang);
                                if (activeLang === 'ja') syncTargetNodeLabelFromEdge(edge.id, e.target.value);
                              }}
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
                              <button
                                onClick={() => deleteEdgeAndTarget(edge.id)}
                                className="px-1.5 py-0.5 text-xs bg-white border border-red-200 rounded hover:bg-red-50 text-red-500"
                                title="削除"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={getEdgeTextForLang(edge, activeLang)}
                            onChange={(e) => updateEdgeTextForLang(edge.id, e.target.value, activeLang)}
                            placeholder="送信テキスト（例: AI_MODE）未入力=ラベルと同じ"
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white mb-1"
                          />
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

            {/* 一時保存ボタン */}
            <div className="sticky bottom-0 pt-3 mt-auto -mx-4 px-4 pb-1 bg-white border-t">
              <button
                onClick={() => { saveDraft(); alert('一時保存しました'); }}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                保存
              </button>
            </div>
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
