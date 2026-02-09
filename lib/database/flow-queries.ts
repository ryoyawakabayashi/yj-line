// =====================================================
// Chat Flow Database Queries
// チャットフローのCRUD操作
// =====================================================

import { supabase } from './supabase';

// =====================================================
// 型定義
// =====================================================

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables?: Record<string, any>;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export type NodeType =
  | 'trigger'
  | 'send_message'
  | 'quick_reply'
  | 'wait_user_input'
  | 'condition'
  | 'faq_search'
  | 'ai_classification'
  | 'escalation'
  | 'set_variable'
  | 'api_call'
  | 'end';

export interface NodeData {
  label?: string;
  config: Record<string, any>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  order?: number;  // クイックリプライの表示順序（数値が小さいほど先に表示）
}

export interface ChatFlow {
  id: string;
  name: string;
  description?: string;
  triggerType: 'support_button' | 'keyword' | 'postback' | 'message_pattern';
  triggerValue?: string;
  service?: 'YOLO_HOME' | 'YOLO_DISCOVER' | 'YOLO_JAPAN';
  isActive: boolean;
  priority: number;
  flowDefinition: FlowDefinition;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowParams {
  name: string;
  description?: string;
  triggerType: ChatFlow['triggerType'];
  triggerValue?: string;
  service?: ChatFlow['service'];
  priority?: number;
  flowDefinition: FlowDefinition;
  createdBy?: string;
}

export interface UpdateFlowParams {
  name?: string;
  description?: string;
  triggerType?: ChatFlow['triggerType'];
  triggerValue?: string;
  service?: ChatFlow['service'];
  isActive?: boolean;
  priority?: number;
  flowDefinition?: FlowDefinition;
}

// =====================================================
// CRUD関数
// =====================================================

/**
 * フロー一覧を取得
 */
export async function getFlows(options?: {
  service?: string;
  isActive?: boolean;
  triggerType?: string;
}): Promise<ChatFlow[]> {
  let query = supabase
    .from('chat_flows')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.service) {
    query = query.eq('service', options.service);
  }

  if (options?.isActive !== undefined) {
    query = query.eq('is_active', options.isActive);
  }

  if (options?.triggerType) {
    query = query.eq('trigger_type', options.triggerType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ getFlows error:', error);
    throw error;
  }

  return (data || []).map(mapDbRowToFlow);
}

/**
 * フローIDで取得
 */
export async function getFlowById(id: string): Promise<ChatFlow | null> {
  const { data, error } = await supabase
    .from('chat_flows')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('❌ getFlowById error:', error);
    throw error;
  }

  return data ? mapDbRowToFlow(data) : null;
}

/**
 * アクティブなフローを取得（トリガータイプとサービスでフィルタ）
 */
export async function getActiveFlows(
  triggerType: ChatFlow['triggerType'],
  service?: ChatFlow['service']
): Promise<ChatFlow[]> {
  let query = supabase
    .from('chat_flows')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', triggerType)
    .order('priority', { ascending: false });

  if (service) {
    query = query.or(`service.eq.${service},service.is.null`);
  } else {
    query = query.is('service', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ getActiveFlows error:', error);
    throw error;
  }

  return (data || []).map(mapDbRowToFlow);
}

/**
 * フロー作成
 */
export async function createFlow(params: CreateFlowParams): Promise<string> {
  const { data, error } = await supabase
    .from('chat_flows')
    .insert({
      name: params.name,
      description: params.description,
      trigger_type: params.triggerType,
      trigger_value: params.triggerValue,
      service: params.service,
      priority: params.priority ?? 0,
      flow_definition: params.flowDefinition as any,
      created_by: params.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ createFlow error:', error);
    throw error;
  }

  console.log(`✅ Flow created: ${data.id}`);
  return data.id;
}

/**
 * フロー更新
 */
export async function updateFlow(
  id: string,
  params: UpdateFlowParams
): Promise<void> {
  const updateData: any = {};

  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.triggerType !== undefined) updateData.trigger_type = params.triggerType;
  if (params.triggerValue !== undefined) updateData.trigger_value = params.triggerValue;
  if (params.service !== undefined) updateData.service = params.service;
  if (params.isActive !== undefined) updateData.is_active = params.isActive;
  if (params.priority !== undefined) updateData.priority = params.priority;
  if (params.flowDefinition !== undefined) {
    updateData.flow_definition = params.flowDefinition as any;
    // バージョン番号をインクリメント
    updateData.version = await getNextVersion(id);
  }

  const { error } = await supabase
    .from('chat_flows')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('❌ updateFlow error:', error);
    throw error;
  }

  console.log(`✅ Flow updated: ${id}`);
}

/**
 * フロー削除（論理削除）
 */
export async function deleteFlow(id: string): Promise<void> {
  const { error } = await supabase
    .from('chat_flows')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('❌ deleteFlow error:', error);
    throw error;
  }

  console.log(`✅ Flow deleted (soft): ${id}`);
}

/**
 * フロー物理削除（管理者用）
 */
export async function permanentDeleteFlow(id: string): Promise<void> {
  const { error } = await supabase
    .from('chat_flows')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('❌ permanentDeleteFlow error:', error);
    throw error;
  }

  console.log(`✅ Flow permanently deleted: ${id}`);
}

/**
 * フロー複製
 */
export async function duplicateFlow(
  id: string,
  newName: string
): Promise<string> {
  const original = await getFlowById(id);
  if (!original) {
    throw new Error(`Flow not found: ${id}`);
  }

  return await createFlow({
    name: newName,
    description: original.description,
    triggerType: original.triggerType,
    triggerValue: original.triggerValue,
    service: original.service,
    priority: original.priority,
    flowDefinition: original.flowDefinition,
  });
}

// =====================================================
// ヘルパー関数
// =====================================================

/**
 * DBレコードをChatFlow型に変換
 */
function mapDbRowToFlow(row: any): ChatFlow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type,
    triggerValue: row.trigger_value,
    service: row.service,
    isActive: row.is_active,
    priority: row.priority,
    flowDefinition: row.flow_definition,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 次のバージョン番号を取得
 */
async function getNextVersion(id: string): Promise<number> {
  const { data, error } = await supabase
    .from('chat_flows')
    .select('version')
    .eq('id', id)
    .single();

  if (error || !data) {
    return 1;
  }

  return (data.version || 0) + 1;
}

// =====================================================
// フロー実行履歴（デバッグ・モニタリング用）
// =====================================================

export interface FlowExecution {
  id: string;
  flowId: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  currentNodeId?: string;
  executionLog: ExecutionLogEntry[];
  errorMessage?: string;
}

export interface ExecutionLogEntry {
  nodeId: string;
  nodeType: string;
  timestamp: string;
  input?: any;
  output?: any;
  error?: string;
}

/**
 * フロー実行を記録
 */
export async function createFlowExecution(
  flowId: string,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('chat_flow_executions')
    .insert({
      flow_id: flowId,
      user_id: userId,
      status: 'running',
      execution_log: [],
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ createFlowExecution error:', error);
    throw error;
  }

  return data.id;
}

/**
 * フロー実行を更新
 */
export async function updateFlowExecution(
  id: string,
  params: {
    status?: FlowExecution['status'];
    currentNodeId?: string;
    executionLog?: ExecutionLogEntry[];
    errorMessage?: string;
  }
): Promise<void> {
  const updateData: any = {};

  if (params.status !== undefined) {
    updateData.status = params.status;
    if (params.status === 'completed' || params.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }
  }

  if (params.currentNodeId !== undefined) {
    updateData.current_node_id = params.currentNodeId;
  }

  if (params.executionLog !== undefined) {
    updateData.execution_log = params.executionLog as any;
  }

  if (params.errorMessage !== undefined) {
    updateData.error_message = params.errorMessage;
  }

  const { error } = await supabase
    .from('chat_flow_executions')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('❌ updateFlowExecution error:', error);
    throw error;
  }
}

/**
 * フロー実行履歴を取得
 */
export async function getFlowExecutions(
  flowId: string,
  limit: number = 50
): Promise<FlowExecution[]> {
  const { data, error } = await supabase
    .from('chat_flow_executions')
    .select('*')
    .eq('flow_id', flowId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ getFlowExecutions error:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    flowId: row.flow_id,
    userId: row.user_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    status: row.status,
    currentNodeId: row.current_node_id,
    executionLog: row.execution_log || [],
    errorMessage: row.error_message,
  }));
}
