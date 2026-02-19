'use client';

import { useState, useCallback, useEffect, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  ConnectionMode,
  SelectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeMouseHandler,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FlowNode } from '@/components/flow-editor/FlowNode';
import { FaqImportModal } from '@/components/flow-editor/FaqImportModal';

// カスタムエッジ型（order プロパティを追加）
type CustomEdge = Edge & { order?: number };

// 送信テキストプリセット
const SEND_TEXT_PRESETS = [
  { label: 'AI診断', text: 'AI_MODE' },
  { label: 'サイト検索', text: 'SITE_MODE' },
  { label: 'サイト(AIトーク経由)', text: 'SITE_MODE_AUTOCHAT' },
];

// 変数挿入プリセット
const VARIABLE_PRESETS = [
  { label: 'LINE名', variable: '{{user.name}}' },
  { label: 'ユーザー入力', variable: '{{userMessage}}' },
  { label: '言語', variable: '{{lang}}' },
  { label: 'サービス', variable: '{{service}}' },
];

// カスタムノードタイプ（コンポーネント外で定義して再レンダリング防止）
const nodeTypes = { flowNode: FlowNode };

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
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showNodeName, setShowNodeName] = useState(false);
  const [compactNodeView, setCompactNodeView] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [expandedSendText, setExpandedSendText] = useState<Record<string, boolean>>({});
  const activeTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInitializedRef = useRef(false);
  const viewportKey = `flow-viewport-${id}`;
  const [savedViewport, setSavedViewport] = useState<Viewport | null>(null);
  const [remoteUpdateAvailable, setRemoteUpdateAvailable] = useState(false);
  const lastServerUpdatedAtRef = useRef<string | null>(null);
  // localStorage から保存済みビューポートを復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(viewportKey);
      if (stored) setSavedViewport(JSON.parse(stored));
    } catch {}
  }, [viewportKey]);
  const clipboardRef = useRef<Node | null>(null);

  // Undo/Redo 履歴管理
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const MAX_HISTORY = 50;

  const pushHistory = useCallback(() => {
    if (isUndoRedoRef.current) return;
    const snapshot = {
      nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
      edges: edges.map((e) => ({ ...e })),
    };
    // 現在位置より先の履歴を捨てる
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    // 初回undoの時、現在の状態を先に保存
    if (historyIndexRef.current === historyRef.current.length - 1) {
      const current = {
        nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
        edges: edges.map((e) => ({ ...e })),
      };
      // 最新と同じでなければ追加
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(current);
    }
    historyIndexRef.current -= 1;
    const prev = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setSelectedNode(null);
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const next = historyRef.current[historyIndexRef.current];
    isUndoRedoRef.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNode(null);
    setTimeout(() => { isUndoRedoRef.current = false; }, 0);
  }, [setNodes, setEdges]);

  // ========== フローバリデーション ==========
  interface FlowWarning {
    nodeId: string;
    level: 'error' | 'warning';
    message: string;
  }

  const flowWarnings = useMemo<FlowWarning[]>(() => {
    const warnings: FlowWarning[] = [];
    for (const node of nodes) {
      const outgoing = edges.filter((e) => e.source === node.id);
      const incoming = edges.filter((e) => e.target === node.id);
      const nodeType = node.data.nodeType;
      const config = node.data.config || {};

      // send_message: 複数のoutgoing edge (カード=カルーセルは例外)
      if (nodeType === 'send_message' && outgoing.length > 1) {
        const allChildrenCards = outgoing.every((e) => {
          const target = nodes.find((n) => n.id === e.target);
          return target?.data.nodeType === 'card';
        });
        if (allChildrenCards) {
          if (outgoing.length > 10) {
            warnings.push({
              nodeId: node.id, level: 'error',
              message: `カルーセルは最大10枚です（現在${outgoing.length}枚）`,
            });
          }
        } else {
          warnings.push({
            nodeId: node.id, level: 'error',
            message: 'メッセージノードから複数のエッジが出ています。最初の接続のみ実行されます。不要な接続を削除してください。',
          });
        }
      }

      // send_message: インラインquickReply + quick_replyノード子が同時設定
      if (nodeType === 'send_message' && config.quickReply?.items?.length > 0) {
        const hasQRChild = outgoing.some((e) => {
          const target = nodes.find((n) => n.id === e.target);
          return target?.data.nodeType === 'quick_reply';
        });
        if (hasQRChild) {
          warnings.push({
            nodeId: node.id, level: 'warning',
            message: 'インラインクイックリプライとクイックリプライノードが両方設定されています。どちらか一方にしてください。',
          });
        }
      }

      // quick_reply: 選択肢なし
      if (nodeType === 'quick_reply' && outgoing.length === 0) {
        warnings.push({
          nodeId: node.id, level: 'error',
          message: 'クイックリプライに選択肢がありません。エッジを追加してください。',
        });
      }

      // quick_reply: 14+ 選択肢 (LINE API上限13)
      if (nodeType === 'quick_reply' && outgoing.length > 13) {
        warnings.push({
          nodeId: node.id, level: 'error',
          message: `クイックリプライは最大13個です（現在${outgoing.length}個）`,
        });
      }

      // card (単体モード): ボタンなし
      if (nodeType === 'card' && (!config.columns || config.columns.length === 0) && outgoing.length === 0) {
        warnings.push({
          nodeId: node.id, level: 'error',
          message: 'カードにボタン（エッジ）がありません。',
        });
      }

      // card (単体モード): 5+ ボタン (LINE API上限4)
      if (nodeType === 'card' && (!config.columns || config.columns.length === 0) && outgoing.length > 4) {
        warnings.push({
          nodeId: node.id, level: 'error',
          message: `カードのボタンは最大4つです（現在${outgoing.length}個）`,
        });
      }

      // card (カルーセル): 11+ カラム (LINE API上限10)
      if (nodeType === 'card' && config.columns && config.columns.length > 10) {
        warnings.push({
          nodeId: node.id, level: 'error',
          message: `カルーセルは最大10枚です（現在${config.columns.length}枚）`,
        });
      }

      // card (カルーセル): ボタンなし
      if (nodeType === 'card' && config.columns && config.columns.length > 0) {
        const hasAnyButtons = config.columns.some((col: any) => col.buttons && col.buttons.length > 0);
        if (!hasAnyButtons) {
          warnings.push({
            nodeId: node.id, level: 'error',
            message: 'カルーセルのどのカードにもボタンがありません。',
          });
        }
        // カルーセルの各カラムで4+ボタン (実際はLINEカルーセル制限3だが、コード上はmaxButtonsで制御)
        for (let i = 0; i < config.columns.length; i++) {
          const col = config.columns[i];
          if (col.buttons && col.buttons.length > 3) {
            warnings.push({
              nodeId: node.id, level: 'warning',
              message: `カード${i + 1}のボタンは最大3つです（現在${col.buttons.length}個、3つまで表示されます）`,
            });
          }
        }
      }

      // 到達不能ノード（trigger以外で incoming なし）
      if (nodeType !== 'trigger' && incoming.length === 0) {
        warnings.push({
          nodeId: node.id, level: 'warning',
          message: 'このノードはどこからも接続されていません（到達不能）',
        });
      }
    }
    return warnings;
  }, [nodes, edges]);

  // 特定ノードの警告を取得
  const getWarningsForNode = useCallback((nodeId: string) => {
    return flowWarnings.filter((w) => w.nodeId === nodeId);
  }, [flowWarnings]);

  // 接続バリデーション: 接続可否を判定しエラーメッセージを返す (nullなら接続OK)
  const validateConnection = useCallback((sourceId: string, targetId: string, childType?: string): string | null => {
    const srcNode = nodes.find((n) => n.id === sourceId);
    if (!srcNode) return null;
    const srcType = srcNode.data.nodeType;
    const existingOutgoing = edges.filter((e) => e.source === sourceId);

    // send_message: 既に子がいる場合 (カード=カルーセルは例外)
    if (srcType === 'send_message' && existingOutgoing.length >= 1) {
      const allExistingAreCards = existingOutgoing.every((e) => {
        const target = nodes.find((n) => n.id === e.target);
        return target?.data.nodeType === 'card';
      });
      const newIsCard = childType === 'card' || (() => {
        const target = nodes.find((n) => n.id === targetId);
        return target?.data.nodeType === 'card';
      })();
      if (allExistingAreCards && newIsCard) {
        if (existingOutgoing.length >= 10) {
          return 'カルーセルは最大10枚です（LINE API制限）';
        }
        // カルーセル: OK
      } else {
        return 'メッセージノードからは1つのノードにのみ接続できます。既存の接続を削除してから再接続してください。';
      }
    }

    // quick_reply: 13個以上は接続不可
    if (srcType === 'quick_reply' && existingOutgoing.length >= 13) {
      return 'クイックリプライの選択肢は最大13個です（LINE API制限）';
    }

    // card (単体モード): 4個以上は接続不可
    if (srcType === 'card') {
      const config = srcNode.data.config || {};
      if ((!config.columns || config.columns.length === 0) && existingOutgoing.length >= 4) {
        return 'カードのボタンは最大4つです（LINE API制限）';
      }
    }

    return null;
  }, [nodes, edges]);

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
          sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
          label: e.label, labels: (e as any).labels,
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
        // 既存エッジの送信テキストを子ノードに反映
        if (draft.edges) {
          for (const edge of draft.edges) {
            if ((edge as any).text) {
              const targetNode = draft.nodes.find((n: any) => n.id === edge.target);
              if (targetNode && !targetNode.data?.sendText) {
                targetNode.data = { ...targetNode.data, sendText: (edge as any).text };
              }
            }
          }
        }
        // 旧下書きの type: 'default' を 'flowNode' に変換
        const normalizedNodes = draft.nodes.map((n: any) => ({
          ...n,
          type: n.type === 'default' ? 'flowNode' : (n.type || 'flowNode'),
        }));
        setNodes(normalizedNodes);
      }
      if (draft.edges) {
        // ハンドルIDを正規化（旧ID→新IDに変換）
        const normalizedEdges = draft.edges.map((e: any) => ({
          ...e,
          sourceHandle: (e.sourceHandle && String(e.sourceHandle).includes('bottom')) ? 'bottom' : (e.sourceHandle === 'top' || (e.sourceHandle && String(e.sourceHandle).includes('top'))) ? 'top' : 'bottom',
          targetHandle: (e.targetHandle && String(e.targetHandle).includes('top')) ? 'top' : (e.targetHandle === 'bottom' || (e.targetHandle && String(e.targetHandle).includes('bottom'))) ? 'bottom' : 'top',
        }));
        setEdges(normalizedEdges);
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
    { code: 'ja', name: 'JA' },
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

        // 下書きチェック: サーバーデータより新しい下書きがあれば自動復元
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          try {
            const draft: DraftData = JSON.parse(saved);
            const draftTime = new Date(draft.savedAt);
            const serverTime = new Date(flow.updatedAt);
            if (draftTime > serverTime) {
              restoreDraft();
              isInitializedRef.current = true;
              return;
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

        // ノードとエッジを復元（ラベルをコンテンツから自動生成）
        const loadedNodes = flow.flowDefinition.nodes.map((node: any) => {
          const config = node.data?.config || {};
          const nodeType = node.type;
          let autoLabel = '';
          if (nodeType === 'send_message' && config.content) {
            autoLabel = typeof config.content === 'object' ? (config.content.ja || '') : config.content;
          } else if (nodeType === 'quick_reply' && config.message) {
            autoLabel = typeof config.message === 'object' ? (config.message.ja || '') : config.message;
          } else if (nodeType === 'card') {
            if (config.columns?.length > 0 && config.columns[0].text) {
              const colText = config.columns[0].text;
              autoLabel = typeof colText === 'object' ? (colText.ja || '') : colText;
            } else if (config.text) {
              autoLabel = typeof config.text === 'object' ? (config.text.ja || '') : config.text;
            }
          }
          return {
            id: node.id,
            type: 'flowNode',
            position: node.position,
            data: {
              ...node.data,
              nodeType, // ノードタイプを data に保存
              label: autoLabel || node.data?.label || node.id,
            },
          };
        });


        const loadedEdges = flow.flowDefinition.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: (edge.sourceHandle && String(edge.sourceHandle).includes('bottom')) ? 'bottom' : (edge.sourceHandle && String(edge.sourceHandle).includes('top')) ? 'top' : 'bottom',
          targetHandle: (edge.targetHandle && String(edge.targetHandle).includes('top')) ? 'top' : (edge.targetHandle && String(edge.targetHandle).includes('bottom')) ? 'bottom' : 'top',
          label: edge.label,
          labels: edge.labels,
          text: edge.text,
          texts: edge.texts,
          order: edge.order,
        }));

        // 既存エッジの送信テキストを子ノードのsendTextに反映
        for (const edge of loadedEdges) {
          if (edge.text) {
            const targetNode = loadedNodes.find((n: any) => n.id === edge.target);
            if (targetNode && !targetNode.data.sendText) {
              targetNode.data.sendText = edge.text;
            }
          }
        }

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        // サーバーの更新日時を記録（リモート変更検知用）
        lastServerUpdatedAtRef.current = flow.updatedAt;
        setRemoteUpdateAvailable(false);
        // 初期状態をhistoryに保存
        historyRef.current = [{ nodes: loadedNodes, edges: loadedEdges }];
        historyIndexRef.current = 0;
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

  // サーバーから強制再読み込み（下書きを無視）
  const reloadFromServer = useCallback(async () => {
    clearDraft();
    setRemoteUpdateAvailable(false);
    isInitializedRef.current = false;
    await loadFlow();
  }, [id]);

  // リモート更新検知ポーリング（30秒ごと）
  useEffect(() => {
    if (!id || loading) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/dashboard/flows/${id}`);
        if (res.ok) {
          const data = await res.json();
          const serverUpdatedAt = data.flow.updatedAt;
          if (lastServerUpdatedAtRef.current && serverUpdatedAt !== lastServerUpdatedAtRef.current) {
            setRemoteUpdateAvailable(true);
          }
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [id, loading]);

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
      // 接続バリデーション
      if (params.source) {
        const error = validateConnection(params.source, params.target || '');
        if (error) {
          alert(error);
          return;
        }
      }

      pushHistory();

      // ノードのY座標に基づいてハンドルを正規化
      // 上のノード→下のノード = bottom→top、下→上 = top→bottom
      const srcNode = nodes.find((n) => n.id === params.source);
      const tgtNode = nodes.find((n) => n.id === params.target);
      const srcY = srcNode?.position.y ?? 0;
      const tgtY = tgtNode?.position.y ?? 0;
      const finalParams = {
        ...params,
        sourceHandle: srcY <= tgtY ? 'bottom' : 'top',
        targetHandle: srcY <= tgtY ? 'top' : 'bottom',
      };

      // 子ノードのノード名・送信テキストをエッジに自動セット
      const childNode = nodes.find((n) => n.id === finalParams.target);
      const childLabel = childNode?.data?.label || '';
      const childSendText = childNode?.data?.sendText || '';

      setEdges((eds) => {
        const sameSourceEdges = eds.filter((e) => e.source === finalParams.source);
        const newOrder = sameSourceEdges.length;
        const newEdges = addEdge({ ...finalParams, order: newOrder } as any, eds);
        // addEdge がlabel/textを保持しない場合があるため、新規エッジに明示的にセット
        return newEdges.map((e) => {
          if (e.source === finalParams.source && e.target === finalParams.target) {
            return {
              ...e,
              ...(!e.label && childLabel ? { label: childLabel } : {}),
              ...(!(e as any).text && childSendText ? { text: childSendText } : {}),
            };
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

      // カルーセルは兄弟cardノードの数で自動決定されるため、onConnectでのカラム追加は不要
    },
    [setEdges, setNodes, nodes, edges, validateConnection]
  );

  // ノードクリック時のハンドラー
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // キャンバスクリック時のハンドラー（選択解除）
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setEditingNodeId(null);
  }, []);

  // ノードダブルクリック → インライン編集開始（カードノードは質問テキストから自動生成のため除外）
  const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    const nodeType = node.data.nodeType || node.id.split('-')[0];
    if (nodeType === 'card') return;
    setEditingNodeId(node.id);
  }, []);

  // --- 親ノードドラッグで子ノードも追従（マインドマップ風） ---
  const reactFlowInstance = useRef<any>(null);
  const dragState = useRef<{
    startPos: { x: number; y: number };
    descendants: Array<{ id: string; startPos: { x: number; y: number } }>;
  } | null>(null);

  // エッジから子孫ノードIDを再帰的に取得（下方向のみ辿る）
  const getDescendants = useCallback((nodeId: string, edgeList: Edge[], nodeList: Node[]): string[] => {
    const thisNode = nodeList.find((n) => n.id === nodeId);
    if (!thisNode) return [];
    const children = edgeList
      .filter((e) => e.source === nodeId)
      .map((e) => e.target)
      .filter((targetId) => {
        // 上方向のエッジ（逆方向）は辿らない → 親が引っ張られるのを防止
        const targetNode = nodeList.find((n) => n.id === targetId);
        return targetNode && targetNode.position.y >= thisNode.position.y;
      });
    const all: string[] = [...children];
    for (const child of children) {
      all.push(...getDescendants(child, edgeList, nodeList));
    }
    return [...new Set(all)]; // 重複除去
  }, []);

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      pushHistory();
      const descendants = getDescendants(node.id, edges, nodes);
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
      type: 'flowNode',
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
    pushHistory();
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
    pushHistory();
    const parentId = selectedNode.id;
    const parentService = selectedNode.data?.service || '';

    // 親ノードの位置から右下にオフセットして配置
    const existingEdges = edges.filter((e) => e.source === parentId);
    const offsetIndex = existingEdges.length;
    const newNodeId = `send_message-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'flowNode',
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
      sourceHandle: 'bottom',
      targetHandle: 'top',
      label: `選択肢${offsetIndex + 1}`,
      order: offsetIndex,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  };

  // 選択ノードの直下に子ノードを追加（エッジ付き）
  const addChildNode = (childType: string) => {
    if (!selectedNode) return;
    // 接続バリデーション
    const error = validateConnection(selectedNode.id, '', childType);
    if (error) {
      alert(error);
      return;
    }
    pushHistory();
    const parentId = selectedNode.id;
    const existingEdges = edges.filter((e) => e.source === parentId);
    const offsetIndex = existingEdges.length;
    const newNodeId = `${childType}-${Date.now()}`;
    const label = getNodeLabel(childType);
    const newNode: Node = {
      id: newNodeId,
      type: 'flowNode',
      position: {
        x: selectedNode.position.x + 250,
        y: selectedNode.position.y + offsetIndex * 120,
      },
      data: {
        label,
        config: getDefaultConfig(childType),
        nodeType: childType,
      },
    };

    const newEdge = {
      id: `e-${parentId}-${newNodeId}`,
      source: parentId,
      target: newNodeId,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      label,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
    setSelectedNode(newNode);
  };

  // ノード複製
  const duplicateNode = useCallback((node: Node) => {
    pushHistory();
    const nodeType = node.data.nodeType || node.id.split('-')[0];
    const newId = `${nodeType}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: 'flowNode',
      position: { x: node.position.x + 50, y: node.position.y + 50 },
      data: {
        ...node.data,
        label: `${node.data.label || nodeType} (コピー)`,
        _style: undefined, // styledNodesで再計算される
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  }, [pushHistory, setNodes]);

  // コピー（クリップボードに保持）
  const copyNode = useCallback(() => {
    if (selectedNode) {
      clipboardRef.current = selectedNode;
    }
  }, [selectedNode]);

  // ペースト（クリップボードからビューポート中央に貼り付け）
  const pasteNode = useCallback(() => {
    const src = clipboardRef.current;
    if (!src) return;
    pushHistory();
    const nodeType = src.data.nodeType || src.id.split('-')[0];
    const newId = `${nodeType}-${Date.now()}`;

    let position = { x: src.position.x + 80, y: src.position.y + 80 };
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
      id: newId,
      type: 'flowNode',
      position,
      data: {
        ...src.data,
        label: `${src.data.label || nodeType} (コピー)`,
        _style: undefined,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  }, [pushHistory, setNodes]);

  // ノードタイプのラベル取得
  const getNodeLabel = (nodeType: string): string => {
    const labels: Record<string, string> = {
      send_message: 'メッセージ送信',
      quick_reply: 'クイックリプライ',
      card: 'カード',
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
      case 'card':
        return {
          text: '',
          columns: [{ title: '', text: '', imageUrl: '', buttons: [{ label: '回答を見る', text: '回答を見る' }] }],
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
          const updatedData = { ...node.data, label: newLabel };
          // カードノードの場合: 質問テキストも同期
          if (node.data.nodeType === 'card' && node.data.config) {
            const config = { ...node.data.config };
            if (config.columns && config.columns.length > 0) {
              const cols = [...config.columns];
              cols[0] = { ...cols[0], text: newLabel };
              config.columns = cols;
            } else {
              config.text = newLabel;
            }
            updatedData.config = config;
          }
          return { ...node, data: updatedData };
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
      const updatedData = { ...selectedNode.data, label: newLabel };
      if (selectedNode.data.nodeType === 'card' && selectedNode.data.config) {
        const config = { ...selectedNode.data.config };
        if (config.columns && config.columns.length > 0) {
          const cols = [...config.columns];
          cols[0] = { ...cols[0], text: newLabel };
          config.columns = cols;
        } else {
          config.text = newLabel;
        }
        updatedData.config = config;
      }
      setSelectedNode({ ...selectedNode, data: updatedData });
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
    } else if (nodeType === 'card') {
      if (config.columns && config.columns.length > 0 && config.columns[0].text) {
        const colText = config.columns[0].text;
        text = typeof colText === 'object' ? (colText.ja || '') : colText;
      } else if (config.text) {
        text = typeof config.text === 'object' ? (config.text.ja || '') : config.text;
      }
    }
    if (!text) return null;
    return text;
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

    // 全兄弟エッジに連番orderを振ってからswap
    const orderMap = new Map<string, number>();
    outgoingEdges.forEach((e, i) => orderMap.set(e.id, i));
    orderMap.set(outgoingEdges[currentIndex].id, targetIndex);
    orderMap.set(outgoingEdges[targetIndex].id, currentIndex);

    const newEdges = edges.map((edge) => {
      const newOrder = orderMap.get(edge.id);
      if (newOrder !== undefined) return { ...edge, order: newOrder };
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
      sourceHandle: 'bottom',
      targetHandle: 'top',
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

  // 文字数カウンター表示
  const CharCount = ({ current, max }: { current: number; max: number }) => (
    <span className={`text-[10px] ${current > max ? 'text-red-500 font-bold' : current > max * 0.8 ? 'text-yellow-600' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  );

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

  // エッジ送信テキスト変更時に子ノードのsendTextも同期する
  const syncTargetNodeSendTextFromEdge = (edgeId: string, newText: string) => {
    const targetEdge = edges.find((e) => e.id === edgeId);
    if (!targetEdge) return;
    const targetId = targetEdge.target;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === targetId ? { ...n, data: { ...n.data, sendText: newText } } : n
      )
    );
    if (selectedNode?.id === targetId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, sendText: newText } });
    }
  };

  // 子ノードのsendText変更時に親エッジのtextも同期する
  const updateNodeSendText = (nodeId: string, newText: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, sendText: newText } } : n
      )
    );
    // 親エッジのtextを同期
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.target === nodeId) {
          return { ...edge, text: newText || undefined };
        }
        return edge;
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, sendText: newText } });
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
        if (nodeType === 'card') {
          const cardText = typeof node.data.config.text === 'object'
            ? node.data.config.text.ja
            : node.data.config.text;
          if (cardText) {
            texts.push(cardText);
            textSources.push({ type: 'node_card_text', id: node.id });
          }
          if (node.data.config.title) {
            const cardTitle = typeof node.data.config.title === 'object'
              ? node.data.config.title.ja
              : node.data.config.title;
            if (cardTitle) {
              texts.push(cardTitle);
              textSources.push({ type: 'node_card_title', id: node.id });
            }
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
          let updatedConfig = { ...node.data.config };
          let changed = false;

          // send_message content
          const contentSource = textSources.find((s) => s.id === node.id && s.type === 'node_content');
          if (contentSource) {
            const t = translations[textSources.indexOf(contentSource)];
            if (t) { updatedConfig.content = { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi }; changed = true; }
          }
          // quick_reply message
          const msgSource = textSources.find((s) => s.id === node.id && s.type === 'node_message');
          if (msgSource) {
            const t = translations[textSources.indexOf(msgSource)];
            if (t) { updatedConfig.message = { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi }; changed = true; }
          }
          // card text
          const cardTextSource = textSources.find((s) => s.id === node.id && s.type === 'node_card_text');
          if (cardTextSource) {
            const t = translations[textSources.indexOf(cardTextSource)];
            if (t) { updatedConfig.text = { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi }; changed = true; }
          }
          // card title
          const cardTitleSource = textSources.find((s) => s.id === node.id && s.type === 'node_card_title');
          if (cardTitleSource) {
            const t = translations[textSources.indexOf(cardTitleSource)];
            if (t) { updatedConfig.title = { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi }; changed = true; }
          }

          if (!changed) return node;
          return { ...node, data: { ...node.data, config: updatedConfig } };
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
        const sources = textSources.filter((s) => s.id === selectedNode.id);
        if (sources.length > 0) {
          let updatedConfig = { ...selectedNode.data.config };
          for (const source of sources) {
            const t = translations[textSources.indexOf(source)];
            if (!t) continue;
            const val = { ja: t.ja, en: t.en, ko: t.ko, zh: t.zh, vi: t.vi };
            if (source.type === 'node_content') updatedConfig.content = val;
            else if (source.type === 'node_message') updatedConfig.message = val;
            else if (source.type === 'node_card_text') updatedConfig.text = val;
            else if (source.type === 'node_card_title') updatedConfig.title = val;
          }
          setSelectedNode({
            ...selectedNode,
            data: { ...selectedNode.data, config: updatedConfig },
          });
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
            targetHandle: edge.targetHandle,
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
        // サーバーの最新 updatedAt を取得して記録（他ユーザー検知用）
        try {
          const freshRes = await fetch(`/api/dashboard/flows/${id}`);
          if (freshRes.ok) {
            const freshData = await freshRes.json();
            lastServerUpdatedAtRef.current = freshData.flow.updatedAt;
          }
        } catch {}
        setRemoteUpdateAvailable(false);
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
      const colors = svc && SERVICE_COLORS[svc] ? SERVICE_COLORS[svc] : null;
      const isEditing = editingNodeId === node.id;

      // カスタムノード用: スタイルは data._style で渡す
      const nodeStyle = colors ? {
        background: colors.bg,
        borderColor: colors.border,
        borderWidth: 2,
        color: colors.text,
      } : undefined;

      // 警告レベル判定
      const nodeWarnings = getWarningsForNode(node.id);
      const hasError = nodeWarnings.some((w) => w.level === 'error');
      const hasWarning = nodeWarnings.some((w) => w.level === 'warning');
      const warningLevel = hasError ? 'error' : hasWarning ? 'warning' : null;

      return {
        ...node,
        data: {
          ...node.data,
          _style: nodeStyle,
          _warningLevel: warningLevel,
          label: isEditing ? (
            <input
              autoFocus
              defaultValue={node.data.label || ''}
              className="w-full bg-transparent text-center text-sm outline-none border-b border-blue-500"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                updateNodeLabel(node.id, e.target.value);
                setEditingNodeId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateNodeLabel(node.id, (e.target as HTMLInputElement).value);
                  setEditingNodeId(null);
                }
                if (e.key === 'Escape') {
                  setEditingNodeId(null);
                }
              }}
            />
          ) : compactNodeView
            ? getNodeLabel(node.data.nodeType || node.id.split('-')[0])
            : (node.data.label || node.id),
        },
      };
    });
  }, [nodes, editingNodeId, compactNodeView, getWarningsForNode]);

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

  // ノード/エッジ削除時にhistoryをpush
  const handleNodesChange = useCallback((changes: any[]) => {
    const hasRemove = changes.some((c: any) => c.type === 'remove');
    if (hasRemove) pushHistory();
    onNodesChange(changes);
  }, [onNodesChange, pushHistory]);

  const handleEdgesChange = useCallback((changes: any[]) => {
    const hasRemove = changes.some((c: any) => c.type === 'remove');
    if (hasRemove) pushHistory();
    onEdgesChange(changes);
  }, [onEdgesChange, pushHistory]);

  // キーボードショートカット: Ctrl+Z=undo, Ctrl+Shift+Z/Ctrl+Y=redo, Ctrl+C=copy, Ctrl+V=paste, Ctrl+D=duplicate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        copyNode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        pasteNode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedNode) duplicateNode(selectedNode);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, copyNode, pasteNode, duplicateNode, selectedNode]);

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
              onClick={() => setLeftSidebarOpen((v) => !v)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition"
              title={leftSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
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
              onClick={undo}
              disabled={historyIndexRef.current <= 0}
              className="px-2 py-2 text-gray-600 hover:bg-gray-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="元に戻す (Ctrl+Z)"
            >
              ↩
            </button>
            <button
              onClick={redo}
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
              className="px-2 py-2 text-gray-600 hover:bg-gray-100 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="やり直す (Ctrl+Shift+Z)"
            >
              ↪
            </button>
            <button
              onClick={() => setCompactNodeView((v) => !v)}
              className={`px-3 py-2 rounded-lg transition text-sm ${
                compactNodeView
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="ノード名表示の切り替え"
            >
              {compactNodeView ? 'ノード名' : 'メッセージ'}
            </button>
            <button
              onClick={reloadFromServer}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded transition text-sm"
              title="サーバーから再読み込み"
            >
              ↻
            </button>
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

      {/* リモート更新通知バナー */}
      {remoteUpdateAvailable && (
        <div className="bg-amber-50 border-b border-amber-300 px-6 py-2 flex items-center justify-between">
          <span className="text-sm text-amber-800">
            他のユーザーがこのフローを更新しました。最新データを読み込みますか？
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setRemoteUpdateAvailable(false)}
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition"
            >
              閉じる
            </button>
            <button
              onClick={reloadFromServer}
              className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition"
            >
              再読み込み
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Flow Settings */}
        <aside className={`bg-white border-r overflow-y-auto transition-all duration-200 ${leftSidebarOpen ? 'w-80 p-4' : 'w-0 p-0 overflow-hidden'}`}>
          {leftSidebarOpen && (
            <>
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
                  onClick={() => addNode('card')}
                  className="w-full px-3 py-2 bg-orange-50 text-orange-700 rounded-md text-sm hover:bg-orange-100 transition"
                >
                  + カード (Q&A)
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
              </div>
            </div>
          </div>
            </>
          )}
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 h-full">
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onInit={(instance) => { reactFlowInstance.current = instance; }}
            onMoveEnd={(_, viewport) => {
              try { localStorage.setItem(viewportKey, JSON.stringify(viewport)); } catch {}
            }}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            panOnDrag={[1, 2]}
            panOnScroll
            minZoom={0.05}
            maxZoom={2}
            {...(savedViewport ? { defaultViewport: savedViewport } : { defaultViewport: { x: 0, y: 0, zoom: 1 }, fitView: true })}
            zoomOnScroll={false}
            zoomOnPinch
            connectionRadius={30}
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

            <div className="mb-2 text-xs text-gray-400 select-all">ID: {selectedNode.id}</div>

            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setShowNodeName((v) => !v)}
                className={`px-2 py-1 text-xs rounded transition ${
                  showNodeName ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {showNodeName ? 'ノード名 ▲' : 'ノード名 ▼'}
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => duplicateNode(selectedNode)}
                  className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  title="複製 (Ctrl+D)"
                >
                  複製
                </button>
                {getSelectedNodeType() !== 'trigger' && (
                  <button
                    onClick={() => {
                      if (!confirm('このノードを削除しますか？')) return;
                      pushHistory();
                      const nodeId = selectedNode.id;
                      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
                      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
                      setSelectedNode(null);
                    }}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                    title="削除"
                  >
                    削除
                  </button>
                )}
              </div>
            </div>

            {showNodeName && (
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
            )}

            {/* バリデーション警告 */}
            {(() => {
              const warnings = getWarningsForNode(selectedNode.id);
              if (warnings.length === 0) return null;
              return (
                <div className="mb-4 space-y-2">
                  {warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded-md text-xs ${
                        w.level === 'error'
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                      }`}
                    >
                      {w.level === 'error' ? '⚠ ' : '⚡ '}{w.message}
                    </div>
                  ))}
                </div>
              );
            })()}

            {getSelectedNodeType() === 'trigger' && (
              <div className="text-sm text-gray-600">
                トリガーノードは設定不要です。フローの開始点として機能します。
              </div>
            )}

            {/* サービス */}
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

            {/* メッセージタイプ */}
            {getSelectedNodeType() === 'send_message' && SEND_TEXT_PRESETS.some(p => p.text === selectedNode.data.sendText) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                このノードは「{SEND_TEXT_PRESETS.find(p => p.text === selectedNode.data.sendText)?.label}」ハンドラーが処理するため、メッセージ内容の設定は不要です。
              </div>
            )}

            {getSelectedNodeType() === 'send_message' && !SEND_TEXT_PRESETS.some(p => p.text === selectedNode.data.sendText) && (
              <div className="mb-4">
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
            )}

            {/* 送信テキスト: 親ノードに応じてラベル変更、card親なら非表示 */}
            {(() => {
              if (getSelectedNodeType() === 'trigger') return null;
              if (getSelectedNodeType() === 'card') return null;
              if (!edges.some((e) => e.target === selectedNode.id)) return null;
              const incomingEdge = edges.find((e) => e.target === selectedNode.id);
              const parentNode = incomingEdge ? nodes.find((n) => n.id === incomingEdge.source) : null;
              const parentType = parentNode?.data?.nodeType || parentNode?.id?.split('-')[0] || '';
              if (parentType === 'card') return null;
              const sendTextLabel = parentType === 'quick_reply' ? '送信クイックリプライ' : '送信テキスト';
              return (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {sendTextLabel}
                  </label>
                  <input
                    type="text"
                    value={selectedNode.data.sendText || ''}
                    onChange={(e) => updateNodeSendText(selectedNode.id, e.target.value)}
                    placeholder="未入力=ラベルと同じ"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {SEND_TEXT_PRESETS.map((preset) => (
                      <button
                        key={preset.text}
                        onClick={() => updateNodeSendText(selectedNode.id, preset.text)}
                        className={`px-2 py-0.5 text-xs rounded transition ${
                          selectedNode.data.sendText === preset.text
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* メッセージ内容 */}
            {getSelectedNodeType() === 'send_message' && !SEND_TEXT_PRESETS.some(p => p.text === selectedNode.data.sendText) && (
              <div className="space-y-4">
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
                    ref={(el) => { if (el) activeTextareaRef.current = el; }}
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
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <div className="flex flex-wrap gap-1">
                      {VARIABLE_PRESETS.map((v) => (
                        <button
                          key={v.variable}
                          type="button"
                          onClick={() => {
                            const ta = activeTextareaRef.current;
                            if (!ta) return;
                            const start = ta.selectionStart ?? ta.value.length;
                            const end = ta.selectionEnd ?? start;
                            const newVal = ta.value.slice(0, start) + v.variable + ta.value.slice(end);
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.data.config,
                              content: setContentForLang(selectedNode.data.config.content, activeLang, newVal),
                            });
                            requestAnimationFrame(() => {
                              ta.focus();
                              const pos = start + v.variable.length;
                              ta.setSelectionRange(pos, pos);
                            });
                          }}
                          className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <CharCount current={getContentForLang(selectedNode.data.config.content, activeLang).length} max={5000} />
                  </div>
                </div>

                {/* クイックリプライ設定（カード接続時は非表示） */}
                {!edges.some((e) => e.source === selectedNode.id && nodes.find((n) => n.id === e.target)?.data.nodeType === 'card') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    クイックリプライ（任意）
                  </label>
                  <p className="text-[10px] text-gray-400 mb-2">メッセージ下部にボタンを表示します。押すとテキストが送信され通常のハンドラーで処理されます。</p>

                  {(selectedNode.data.config.quickReply?.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="mb-2">
                      <div className="flex gap-1 items-center min-w-0">
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.action?.label || ''}
                            onChange={(e) => updateQuickReplyItem(idx, 'label', e.target.value)}
                            placeholder="ラベル"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                          />
                          <div className="text-right"><CharCount current={(item.action?.label || '').length} max={20} /></div>
                        </div>
                        <input
                          type="text"
                          value={item.action?.text || ''}
                          onChange={(e) => updateQuickReplyItem(idx, 'text', e.target.value)}
                          placeholder="送信テキスト"
                          className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => removeQuickReplyItem(idx)}
                          className="text-red-400 hover:text-red-600 text-sm px-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addQuickReplyItem}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + アイテム追加
                  </button>
                </div>
                )}

                {/* 送信後の遅延設定 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    送信後の遅延（秒）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={selectedNode.data.config.delayAfter ?? 0}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        delayAfter: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    このメッセージ送信後、指定秒数待ってから次のノードを実行します（0で無効、最大30秒）
                  </p>
                </div>

                {/* 接続された子ノード表示 */}
                {(() => {
                  const connectedNodes = edges
                    .filter((e) => e.source === selectedNode.id)
                    .map((e) => nodes.find((n) => n.id === e.target))
                    .filter((n): n is Node => !!n);
                  if (connectedNodes.length === 0) return null;

                  const cardNodes = connectedNodes.filter((n) => n.data.nodeType === 'card');
                  const qrNodes = connectedNodes.filter((n) => n.data.nodeType === 'quick_reply');
                  const otherNodes = connectedNodes.filter((n) => n.data.nodeType !== 'card' && n.data.nodeType !== 'quick_reply');

                  return (
                    <>
                      {/* カルーセルカード */}
                      {cardNodes.length > 0 && (() => {
                        const cardEdges = (edges as CustomEdge[])
                          .filter((e) => e.source === selectedNode.id && cardNodes.some((n) => n.id === e.target))
                          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

                        const swapCardOrder = (idx: number, dir: -1 | 1) => {
                          const targetIdx = idx + dir;
                          if (targetIdx < 0 || targetIdx >= cardEdges.length) return;
                          const orderMap = new Map<string, number>();
                          cardEdges.forEach((e, i) => orderMap.set(e.id, i));
                          orderMap.set(cardEdges[idx].id, targetIdx);
                          orderMap.set(cardEdges[targetIdx].id, idx);
                          setEdges((eds) => eds.map((e) => {
                            const newOrder = orderMap.get(e.id);
                            if (newOrder !== undefined) return { ...e, order: newOrder } as CustomEdge;
                            return e;
                          }));
                        };

                        return (
                        <div className="border border-orange-200 rounded-md bg-orange-50 p-3">
                          <label className="block text-sm font-medium text-orange-800 mb-2">
                            接続カード {cardNodes.length}/10
                          </label>
                          <div className="space-y-1">
                            {cardEdges.map((edge, idx) => {
                              const cardNode = nodes.find((n) => n.id === edge.target);
                              if (!cardNode) return null;
                              const colText = cardNode.data.config?.columns?.[0]?.text;
                              const text = colText
                                ? (typeof colText === 'object' ? (colText.ja || '') : colText)
                                : (typeof cardNode.data.config?.text === 'object' ? (cardNode.data.config.text.ja || '') : (cardNode.data.config?.text || ''));
                              return (
                                <div key={cardNode.id} className="flex items-center gap-1 bg-white rounded px-2 py-1.5 border border-orange-100">
                                  <span className="text-[10px] text-orange-500 shrink-0">{idx + 1}.</span>
                                  <button
                                    onClick={() => setSelectedNode(cardNode)}
                                    className="text-xs text-gray-700 truncate flex-1 text-left hover:text-orange-700"
                                    title={`${text || cardNode.data.label || '(未設定)'} を選択`}
                                  >
                                    {text || cardNode.data.label || '(未設定)'}
                                  </button>
                                  <button
                                    onClick={() => swapCardOrder(idx, -1)}
                                    disabled={idx === 0}
                                    className="px-1 text-gray-500 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed text-xs"
                                  >↑</button>
                                  <button
                                    onClick={() => swapCardOrder(idx, 1)}
                                    disabled={idx === cardEdges.length - 1}
                                    className="px-1 text-gray-500 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed text-xs"
                                  >↓</button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })()}

                      {/* クイックリプライ */}
                      {qrNodes.map((qrNode) => {
                        const qrEdges = (edges as CustomEdge[])
                          .filter((e) => e.source === qrNode.id)
                          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                        return (
                          <div key={qrNode.id} className="border border-blue-200 rounded-md bg-blue-50 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-blue-800">
                                接続クイックリプライ
                              </label>
                              <button
                                onClick={() => setSelectedNode(qrNode)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                              >
                                編集する →
                              </button>
                            </div>
                            <p className="text-[10px] text-blue-600 mb-2">{qrNode.data.label || qrNode.id}</p>
                            {qrEdges.length > 0 ? (
                              <div className="space-y-1">
                                {qrEdges.map((edge) => {
                                  const targetNode = nodes.find((n) => n.id === edge.target);
                                  return (
                                    <div key={edge.id} className="flex items-center gap-2 bg-white rounded px-2 py-1 border border-blue-100">
                                      <span className="text-xs font-medium text-gray-700 truncate">
                                        {(typeof edge.label === 'string' ? edge.label : '') || '(未設定)'}
                                      </span>
                                      {targetNode && (
                                        <span className="text-[10px] text-gray-400 truncate ml-auto">
                                          → {targetNode.data.label || targetNode.id}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[10px] text-blue-500">選択肢がまだありません</p>
                            )}
                          </div>
                        );
                      })}

                      {/* その他のノード */}
                      {otherNodes.map((childNode) => {
                        const childType = childNode.data.nodeType || '';
                        const typeBg = childType === 'send_message' ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200';
                        return (
                          <div key={childNode.id} className={`border rounded-md p-3 ${typeBg}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{getNodeLabel(childType)}</span>
                                <span className="text-[10px] opacity-70 truncate">{childNode.data.label || childNode.id}</span>
                              </div>
                              <button
                                onClick={() => setSelectedNode(childNode)}
                                className="text-[10px] underline opacity-70 hover:opacity-100 shrink-0"
                              >
                                編集 →
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}

            {getSelectedNodeType() === 'quick_reply' && SEND_TEXT_PRESETS.some(p => p.text === selectedNode.data.sendText) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                このノードは「{SEND_TEXT_PRESETS.find(p => p.text === selectedNode.data.sendText)?.label}」ハンドラーが処理するため、メッセージ内容の設定は不要です。
              </div>
            )}

            {getSelectedNodeType() === 'quick_reply' && !SEND_TEXT_PRESETS.some(p => p.text === selectedNode.data.sendText) && (
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
                    ref={(el) => { if (el) activeTextareaRef.current = el; }}
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
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <div className="flex flex-wrap gap-1">
                      {VARIABLE_PRESETS.map((v) => (
                        <button
                          key={v.variable}
                          type="button"
                          onClick={() => {
                            const ta = activeTextareaRef.current;
                            if (!ta) return;
                            const start = ta.selectionStart ?? ta.value.length;
                            const end = ta.selectionEnd ?? start;
                            const newVal = ta.value.slice(0, start) + v.variable + ta.value.slice(end);
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.data.config,
                              message: setContentForLang(selectedNode.data.config.message, activeLang, newVal),
                            });
                            requestAnimationFrame(() => {
                              ta.focus();
                              const pos = start + v.variable.length;
                              ta.setSelectionRange(pos, pos);
                            });
                          }}
                          className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                    <CharCount current={getContentForLang(selectedNode.data.config.message, activeLang).length} max={5000} />
                  </div>
                </div>

                {/* 送信前の遅延設定 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表示前の遅延（秒）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={selectedNode.data.config.delayAfter ?? 0}
                    onChange={(e) =>
                      updateNodeConfig(selectedNode.id, {
                        ...selectedNode.data.config,
                        delayAfter: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    前のメッセージ送信後、指定秒数待ってからこのクイックリプライを表示します（0で無効、最大30秒）
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
                      .map((edge, index, array) => {
                        const targetNode = nodes.find((n) => n.id === edge.target);
                        const targetType = targetNode?.data.nodeType || '';
                        const typeLabel = getNodeLabel(targetType);
                        const typeBg = targetType === 'send_message' ? 'bg-blue-100 text-blue-700'
                          : targetType === 'card' ? 'bg-orange-100 text-orange-700'
                          : targetType === 'quick_reply' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600';
                        return (
                        <div key={edge.id} className="bg-gray-50 px-2 py-2 rounded border border-gray-200">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${typeBg}`}>
                              {typeLabel}
                            </span>
                            {targetNode && (
                              <button
                                onClick={() => setSelectedNode(targetNode)}
                                className="text-[10px] text-gray-400 hover:text-blue-600 truncate"
                                title={`${targetNode.data.label || edge.target} を選択`}
                              >
                                → {targetNode.data.label || edge.target}
                              </button>
                            )}
                          </div>
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
                            <CharCount current={getEdgeLabelForLang(edge, activeLang).length} max={20} />
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
                          {/* 送信テキスト: 値がある場合は常に表示、なければトグルで展開 */}
                          {(() => {
                            const hasText = !!getEdgeTextForLang(edge, activeLang);
                            const edgeExpandKey = `sendtext-${edge.id}`;
                            const isExpanded = hasText || expandedSendText[edge.id];
                            return isExpanded ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={getEdgeTextForLang(edge, activeLang)}
                                    onChange={(e) => {
                                      updateEdgeTextForLang(edge.id, e.target.value, activeLang);
                                      if (activeLang === 'ja') syncTargetNodeSendTextFromEdge(edge.id, e.target.value);
                                    }}
                                    placeholder="送信テキスト（例: AI_MODE）空=ラベルと同じ"
                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                  />
                                  {!hasText && (
                                    <button
                                      onClick={() => setExpandedSendText((prev) => ({ ...prev, [edge.id]: false }))}
                                      className="text-gray-400 hover:text-gray-600 text-xs px-1"
                                      title="閉じる"
                                    >×</button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {SEND_TEXT_PRESETS.map((preset) => (
                                    <button
                                      key={preset.text}
                                      onClick={() => {
                                        updateEdgeTextForLang(edge.id, preset.text, 'ja');
                                        syncTargetNodeSendTextFromEdge(edge.id, preset.text);
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] rounded transition ${
                                        getEdgeTextForLang(edge, 'ja') === preset.text
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={() => setExpandedSendText((prev) => ({ ...prev, [edge.id]: true }))}
                                className="text-[10px] text-gray-400 hover:text-blue-500 self-start"
                              >
                                + 送信テキストを設定
                              </button>
                            );
                          })()}
                        </div>
                        );
                      })}
                    {edges.filter((edge) => edge.source === selectedNode.id).length === 0 && (
                      <div className="text-xs text-gray-400">
                        エッジが接続されていません
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {getSelectedNodeType() === 'card' && (
              <div className="space-y-4">
                {/* --- カード設定（1ノード = 1カード。親に複数繋げるとカルーセルになる） --- */}
                {(() => {
                  // このカードの親ノードに繋がっている兄弟カード数を算出
                  const parentEdge = edges.find((e) => e.target === selectedNode.id);
                  const siblingCardCount = parentEdge
                    ? edges.filter((e) => e.source === parentEdge.source).filter((e) => {
                        const n = nodes.find((nd) => nd.id === e.target);
                        return (n?.data?.nodeType || n?.id?.split('-')[0]) === 'card';
                      }).length
                    : 1;
                  // columns[0] から読み書き（後方互換）
                  const col = selectedNode.data.config.columns?.[0] || { title: '', text: selectedNode.data.config.text || '', imageUrl: selectedNode.data.config.imageUrl || '', buttons: [{ label: '', text: '' }] };
                  const updateCol = (patch: any) => {
                    const newCol = { ...col, ...patch };
                    updateNodeConfig(selectedNode.id, { ...selectedNode.data.config, columns: [newCol] });
                  };
                  return (
                    <>
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <p className="text-xs text-orange-700">
                          カルーセル枚数: <span className="font-bold">{siblingCardCount}/10</span>
                          {siblingCardCount > 1 ? ` （親ノードにカード${siblingCardCount}枚接続中）` : ' （親に複数カードを繋げるとカルーセルになります）'}
                        </p>
                      </div>

                      {/* カルーセル並び順 */}
                      {siblingCardCount > 1 && parentEdge && (() => {
                        const siblingEdges = (edges as CustomEdge[])
                          .filter((e) => e.source === parentEdge.source)
                          .filter((e) => {
                            const n = nodes.find((nd) => nd.id === e.target);
                            return (n?.data?.nodeType || n?.id?.split('-')[0]) === 'card';
                          })
                          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

                        const swapOrder = (idx: number, dir: -1 | 1) => {
                          const targetIdx = idx + dir;
                          if (targetIdx < 0 || targetIdx >= siblingEdges.length) return;
                          // 全兄弟エッジに連番orderを振ってからswap
                          const orderMap = new Map<string, number>();
                          siblingEdges.forEach((e, i) => orderMap.set(e.id, i));
                          // swap
                          const edgeAId = siblingEdges[idx].id;
                          const edgeBId = siblingEdges[targetIdx].id;
                          orderMap.set(edgeAId, targetIdx);
                          orderMap.set(edgeBId, idx);
                          setEdges((eds) => eds.map((e) => {
                            const newOrder = orderMap.get(e.id);
                            if (newOrder !== undefined) return { ...e, order: newOrder } as CustomEdge;
                            return e;
                          }));
                        };

                        return (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">カルーセル順序</label>
                            <div className="space-y-1">
                              {siblingEdges.map((edge, idx) => {
                                const cardNode = nodes.find((n) => n.id === edge.target);
                                const label = cardNode?.data?.label || edge.target;
                                const isCurrent = edge.target === selectedNode.id;
                                return (
                                  <div key={edge.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${isCurrent ? 'bg-orange-100 border border-orange-300 font-bold' : 'bg-gray-50 border border-gray-200'}`}>
                                    <span className="text-gray-400 w-4 text-center">{idx + 1}</span>
                                    <span className="flex-1 min-w-0 truncate">{label}</span>
                                    <button
                                      onClick={() => swapOrder(idx, -1)}
                                      disabled={idx === 0}
                                      className="px-1 text-gray-500 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                                    >↑</button>
                                    <button
                                      onClick={() => swapOrder(idx, 1)}
                                      disabled={idx === siblingEdges.length - 1}
                                      className="px-1 text-gray-500 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                                    >↓</button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">タイトル（任意）</label>
                        <input
                          type="text"
                          value={typeof col.title === 'object' ? (col.title[activeLang] || col.title.ja || '') : (col.title || '')}
                          onChange={(e) => updateCol({ title: e.target.value })}
                          placeholder="カードのタイトル"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <div className="text-right mt-0.5">
                          <CharCount current={(typeof col.title === 'object' ? (col.title[activeLang] || col.title.ja || '') : (col.title || '')).length} max={40} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">質問テキスト <span className="text-red-500">*</span></label>
                        <textarea
                          value={typeof col.text === 'object' ? (col.text[activeLang] || col.text.ja || '') : (col.text || '')}
                          onChange={(e) => updateCol({ text: e.target.value })}
                          placeholder="カードに表示する質問テキスト"
                          rows={3}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <div className="text-right mt-0.5">
                          <CharCount
                            current={(typeof col.text === 'object' ? (col.text[activeLang] || col.text.ja || '') : (col.text || '')).length}
                            max={(col.title || col.imageUrl) ? 60 : (siblingCardCount > 1 ? 120 : 160)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">画像（任意）</label>
                        {col.imageUrl ? (
                          <div className="space-y-2">
                            <div className="relative group">
                              <img
                                src={col.imageUrl}
                                alt="カード画像"
                                className="w-full h-32 object-cover rounded-md border border-gray-200"
                              />
                              <button
                                onClick={() => updateCol({ imageUrl: '' })}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-md transition-colors ${uploadingImage ? 'border-orange-300 bg-orange-50 cursor-wait' : 'border-gray-300 cursor-pointer hover:border-orange-400 hover:bg-orange-50'}`}>
                            {uploadingImage ? (
                              <>
                                <svg className="w-6 h-6 text-orange-400 mb-1 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-xs text-orange-600">アップロード中...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-gray-500">クリックして画像をアップロード</span>
                                <span className="text-[10px] text-gray-400">JPEG, PNG, WebP, GIF（最大5MB）</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              disabled={uploadingImage}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingImage(true);
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                  const data = await res.json();
                                  if (res.ok && data.url) {
                                    updateCol({ imageUrl: data.url });
                                  } else {
                                    alert(data.error || 'アップロードに失敗しました');
                                  }
                                } catch {
                                  alert('アップロードに失敗しました');
                                } finally {
                                  setUploadingImage(false);
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* ボタン */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">ボタン（最大3つ）</label>
                          {(col.buttons || []).length < 3 && (
                            <button
                              onClick={() => updateCol({ buttons: [...(col.buttons || []), { label: '', text: '' }] })}
                              className="px-2 py-1 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 rounded"
                            >
                              + 追加
                            </button>
                          )}
                        </div>
                        {(col.buttons || []).map((btn: any, btnIdx: number) => (
                          <div key={btnIdx} className="space-y-1">
                            <div className="flex gap-1 items-center min-w-0">
                              <select
                                value={btn.type || 'postback'}
                                onChange={(e) => {
                                  const btns = [...(col.buttons || [])];
                                  btns[btnIdx] = { ...btns[btnIdx], type: e.target.value };
                                  updateCol({ buttons: btns });
                                }}
                                className="px-1 py-1 text-xs border border-gray-300 rounded bg-white"
                              >
                                <option value="postback">回答</option>
                                <option value="uri">URL</option>
                              </select>
                              <input
                                type="text"
                                value={typeof btn.label === 'object' ? (btn.label[activeLang] || btn.label.ja || '') : (btn.label || '')}
                                onChange={(e) => {
                                  const btns = [...(col.buttons || [])];
                                  const oldLabel = typeof btns[btnIdx].label === 'string' ? btns[btnIdx].label : '';
                                  const oldText = btns[btnIdx].text || '';
                                  const shouldSync = !oldText || oldText === oldLabel || oldText === 'ボタン';
                                  btns[btnIdx] = { ...btns[btnIdx], label: e.target.value, ...(shouldSync ? { text: e.target.value } : {}) };
                                  updateCol({ buttons: btns });
                                }}
                                placeholder="ラベル"
                                className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <CharCount current={(typeof btn.label === 'object' ? (btn.label[activeLang] || btn.label.ja || '') : (btn.label || '')).length} max={20} />
                              {btn.type !== 'uri' && (
                                <input
                                  type="text"
                                  value={btn.text || ''}
                                  onChange={(e) => {
                                    const btns = [...(col.buttons || [])];
                                    btns[btnIdx] = { ...btns[btnIdx], text: e.target.value };
                                    updateCol({ buttons: btns });
                                  }}
                                  placeholder="送信テキスト"
                                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                              )}
                              <button
                                onClick={() => {
                                  const btns = [...(col.buttons || [])];
                                  btns.splice(btnIdx, 1);
                                  updateCol({ buttons: btns });
                                }}
                                className="text-red-400 hover:text-red-600 text-sm px-1"
                              >
                                ×
                              </button>
                            </div>
                            {btn.type === 'uri' && (
                              <>
                                <input
                                  type="text"
                                  value={btn.url || ''}
                                  onChange={(e) => {
                                    const btns = [...(col.buttons || [])];
                                    btns[btnIdx] = { ...btns[btnIdx], url: e.target.value };
                                    updateCol({ buttons: btns });
                                  }}
                                  placeholder="https://..."
                                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                />
                                <label className="flex items-center gap-1 mt-1">
                                  <input
                                    type="checkbox"
                                    checked={!!btn.openExternal}
                                    onChange={(e) => {
                                      const btns = [...(col.buttons || [])];
                                      btns[btnIdx] = { ...btns[btnIdx], openExternal: e.target.checked };
                                      updateCol({ buttons: btns });
                                    }}
                                    className="w-3 h-3"
                                  />
                                  <span className="text-[10px] text-gray-500">外部ブラウザで開く</span>
                                </label>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 表示前の遅延設定 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          表示前の遅延（秒）
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={selectedNode.data.config.delayAfter ?? 0}
                          onChange={(e) =>
                            updateNodeConfig(selectedNode.id, {
                              ...selectedNode.data.config,
                              delayAfter: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          前のメッセージ送信後、指定秒数待ってからこのカードを表示します（0で無効、最大30秒）
                        </p>
                      </div>

                      {/* クイックリプライ設定 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-gray-700">
                            クイックリプライ
                          </label>
                          <button
                            onClick={() => {
                              const items = selectedNode.data.config.quickReplyItems || [];
                              updateNodeConfig(selectedNode.id, {
                                ...selectedNode.data.config,
                                quickReplyItems: [...items, { label: '', text: '', targetNodeId: '' }],
                              });
                            }}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            + 追加
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">
                          カードの下部に表示される小さいボタン。タップすると指定ノードへ遷移します。
                        </p>
                        <div className="space-y-2">
                          {(selectedNode.data.config.quickReplyItems || []).map((item: any, idx: number) => (
                            <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200 space-y-1">
                              <div className="flex gap-1 items-center">
                                <input
                                  type="text"
                                  value={item.label || ''}
                                  onChange={(e) => {
                                    const items = [...(selectedNode.data.config.quickReplyItems || [])];
                                    items[idx] = { ...items[idx], label: e.target.value };
                                    updateNodeConfig(selectedNode.id, { ...selectedNode.data.config, quickReplyItems: items });
                                  }}
                                  placeholder="ラベル（最大20文字）"
                                  maxLength={20}
                                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                                />
                                <button
                                  onClick={() => {
                                    const items = [...(selectedNode.data.config.quickReplyItems || [])];
                                    items.splice(idx, 1);
                                    updateNodeConfig(selectedNode.id, { ...selectedNode.data.config, quickReplyItems: items });
                                  }}
                                  className="text-red-400 hover:text-red-600 text-sm px-1"
                                >
                                  ×
                                </button>
                              </div>
                              <select
                                value={item.targetNodeId || ''}
                                onChange={(e) => {
                                  const items = [...(selectedNode.data.config.quickReplyItems || [])];
                                  items[idx] = { ...items[idx], targetNodeId: e.target.value };
                                  updateNodeConfig(selectedNode.id, { ...selectedNode.data.config, quickReplyItems: items });
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white"
                              >
                                <option value="">遷移先ノードを選択...</option>
                                {nodes
                                  .filter((n) => n.id !== selectedNode.id && (n.data?.nodeType || n.id?.split('-')[0]) !== 'trigger')
                                  .map((n) => (
                                    <option key={n.id} value={n.id}>
                                      {(n.data?.nodeType || n.id?.split('-')[0])} - {(n.data?.config?.content || n.data?.config?.text || n.data?.config?.message || n.id)?.toString().slice(0, 30)}
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 遷移先エッジ */}
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">遷移先エッジ:</p>
                          <button onClick={addQuickReplyChoice} className="px-2 py-1 text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 rounded">+ 追加</button>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">ボタンの「送信テキスト」とエッジの「送信テキスト」が一致すると、そのエッジ先のノードへ遷移します。</p>
                        <div className="space-y-1">
                          {(edges as CustomEdge[])
                            .filter((edge) => edge.source === selectedNode.id)
                            .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                            .map((edge) => (
                              <div key={edge.id} className="flex gap-1 items-center min-w-0 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                <input type="text" value={edge.label as string || ''} readOnly
                                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded bg-gray-100 text-gray-500" />
                                <input type="text" value={getEdgeTextForLang(edge, 'ja')}
                                  onChange={(e) => { updateEdgeTextForLang(edge.id, e.target.value, 'ja'); }}
                                  placeholder="送信テキスト" className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded bg-white" />
                                <button onClick={() => deleteEdgeAndTarget(edge.id)} className="text-red-400 hover:text-red-600 text-sm px-1">×</button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
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

            {/* 直下にノード追加 */}
            {getSelectedNodeType() !== 'end' && (() => {
              const childOptions = [
                { type: 'send_message', label: 'メッセージ', bg: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { type: 'quick_reply', label: 'クイックリプライ', bg: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
                { type: 'card', label: 'カード', bg: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
              ];
              const available = childOptions.filter((opt) =>
                !validateConnection(selectedNode.id, '', opt.type)
              );
              if (available.length === 0) return null;
              return (
                <div className="mt-4 pt-3 border-t">
                  <label className="block text-xs font-medium text-gray-500 mb-2">直下にノード追加</label>
                  <div className="flex flex-wrap gap-1">
                    {available.map((opt) => (
                      <button key={opt.type} onClick={() => addChildNode(opt.type)} className={`px-2 py-1 text-xs rounded transition ${opt.bg}`}>+ {opt.label}</button>
                    ))}
                  </div>
                </div>
              );
            })()}

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
