// =====================================================
// フローのサブグラフ抽出 & マージスクリプト
// Usage:
//   1. BさんのJSONを person_b_flow.json として保存
//   2. npx tsx scripts/extract_subflow.ts extract   # サブグラフ抽出
//   3. npx tsx scripts/extract_subflow.ts merge      # 現在のDBフローにマージ
// =====================================================

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local.bak') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 設定 ---
const START_NODE_ID = 'quick_reply-1771313825564';
const INPUT_FILE = path.resolve(__dirname, 'person_b_flow.json');
const OUTPUT_FILE = path.resolve(__dirname, 'extracted_subflow.json');

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  [key: string]: any;
}

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  [key: string]: any;
}

/**
 * 指定ノードから下流の全ノードIDを収集 (BFS)
 */
function collectDownstreamNodeIds(startNodeId: string, edges: FlowEdge[]): Set<string> {
  const visited = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    // このノードから出ていくエッジを探す
    for (const edge of edges) {
      if (edge.source === nodeId && !visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return visited;
}

/**
 * サブグラフを抽出
 */
function extractSubflow(flow: FlowDefinition, startNodeId: string) {
  const downstreamIds = collectDownstreamNodeIds(startNodeId, flow.edges);

  console.log(`\n📊 抽出結果:`);
  console.log(`  起点ノード: ${startNodeId}`);
  console.log(`  下流ノード数: ${downstreamIds.size}`);

  // ノードをフィルタ
  const subNodes = flow.nodes.filter((n) => downstreamIds.has(n.id));
  // エッジをフィルタ（sourceとtargetの両方がサブグラフ内にあるもの）
  const subEdges = flow.edges.filter(
    (e) => downstreamIds.has(e.source) && downstreamIds.has(e.target)
  );

  // さらに、起点ノードへの入力エッジも含める（親からの接続を維持）
  const incomingEdges = flow.edges.filter((e) => e.target === startNodeId);

  console.log(`  抽出ノード数: ${subNodes.length}`);
  console.log(`  抽出エッジ数: ${subEdges.length}`);
  console.log(`  入力エッジ数: ${incomingEdges.length}`);

  // ノードタイプ別の内訳
  const typeCounts: Record<string, number> = {};
  for (const node of subNodes) {
    const nodeType = node.data?.nodeType || node.type || 'unknown';
    typeCounts[nodeType] = (typeCounts[nodeType] || 0) + 1;
  }
  console.log(`\n  ノードタイプ別:`);
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }

  return {
    startNodeId,
    nodes: subNodes,
    edges: subEdges,
    incomingEdges,
    nodeIds: Array.from(downstreamIds),
  };
}

/**
 * 抽出コマンド: BさんのJSONからサブグラフを抽出してファイルに保存
 */
async function cmdExtract() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ 入力ファイルが見つかりません: ${INPUT_FILE}`);
    console.log(`\nBさんのブラウザからフローJSONを保存してください:`);
    console.log(`  保存先: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  const flow: FlowDefinition = JSON.parse(raw);

  console.log(`📂 入力ファイル: ${INPUT_FILE}`);
  console.log(`  全ノード数: ${flow.nodes.length}`);
  console.log(`  全エッジ数: ${flow.edges.length}`);

  // 起点ノードの存在確認
  const startNode = flow.nodes.find((n) => n.id === START_NODE_ID);
  if (!startNode) {
    console.error(`❌ 起点ノードが見つかりません: ${START_NODE_ID}`);
    process.exit(1);
  }
  console.log(`\n✅ 起点ノード: ${startNode.data?.label || startNode.id}`);

  const subflow = extractSubflow(flow, START_NODE_ID);

  // 保存
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(subflow, null, 2));
  console.log(`\n💾 サブグラフを保存: ${OUTPUT_FILE}`);
}

/**
 * マージコマンド: 抽出したサブグラフを現在のDBフローにマージ
 */
async function cmdMerge() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    console.error(`❌ 抽出ファイルが見つかりません: ${OUTPUT_FILE}`);
    console.log(`先に extract を実行してください`);
    process.exit(1);
  }

  const subflow = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  console.log(`📂 サブグラフ: ${subflow.nodes.length} ノード, ${subflow.edges.length} エッジ`);

  // DBから現在のフローを取得
  const { data: flows, error } = await supabase
    .from('chat_flows')
    .select('*')
    .eq('trigger_value', 'テスト')
    .limit(5);

  if (error) {
    console.error('❌ DB取得エラー:', error);
    process.exit(1);
  }

  if (!flows || flows.length === 0) {
    console.error('❌ フローが見つかりません');
    process.exit(1);
  }

  console.log(`\n📋 見つかったフロー:`);
  flows.forEach((f, i) => {
    const def = f.flow_definition;
    console.log(`  [${i}] ID: ${f.id} | ${f.name} | ノード: ${def?.nodes?.length || '?'} | 更新: ${f.updated_at}`);
  });

  const targetFlow = flows[0];
  const currentDef: FlowDefinition = targetFlow.flow_definition;

  console.log(`\n🎯 マージ先: ${targetFlow.name} (ID: ${targetFlow.id})`);
  console.log(`  現在のノード数: ${currentDef.nodes.length}`);
  console.log(`  現在のエッジ数: ${currentDef.edges.length}`);

  // サブグラフのノードIDセット
  const subNodeIds = new Set(subflow.nodeIds as string[]);

  // 現在のフローから、サブグラフに含まれるノードを除去して新しいものに置き換え
  const filteredNodes = currentDef.nodes.filter((n) => !subNodeIds.has(n.id));
  const filteredEdges = currentDef.edges.filter(
    (e) => !subNodeIds.has(e.source) || !subNodeIds.has(e.target)
  );

  // ただし、サブグラフの入力エッジ（外部→起点）は保持
  // filteredEdges にはすでに含まれているはず（sourceがサブグラフ外のため）

  // マージ
  const mergedNodes = [...filteredNodes, ...subflow.nodes];
  const mergedEdges = [...filteredEdges, ...subflow.edges];

  // 入力エッジも追加（重複除去）
  const edgeIds = new Set(mergedEdges.map((e) => e.id));
  for (const inEdge of subflow.incomingEdges) {
    if (!edgeIds.has(inEdge.id)) {
      mergedEdges.push(inEdge);
    }
  }

  console.log(`\n📊 マージ結果:`);
  console.log(`  ノード数: ${currentDef.nodes.length} → ${mergedNodes.length}`);
  console.log(`  エッジ数: ${currentDef.edges.length} → ${mergedEdges.length}`);

  // 確認プロンプト
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question('\n⚠️  DBを更新しますか？ (yes/no): ', resolve);
  });
  rl.close();

  if (answer !== 'yes') {
    console.log('キャンセルしました');

    // プレビュー用にファイルに保存
    const previewFile = path.resolve(__dirname, 'merged_preview.json');
    const mergedDef = { ...currentDef, nodes: mergedNodes, edges: mergedEdges };
    fs.writeFileSync(previewFile, JSON.stringify(mergedDef, null, 2));
    console.log(`プレビュー保存: ${previewFile}`);
    return;
  }

  // DB更新
  const mergedDef = { ...currentDef, nodes: mergedNodes, edges: mergedEdges };
  const { error: updateError } = await supabase
    .from('chat_flows')
    .update({
      flow_definition: mergedDef,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetFlow.id);

  if (updateError) {
    console.error('❌ DB更新エラー:', updateError);
    process.exit(1);
  }

  console.log('✅ マージ完了！ブラウザをリロードして確認してください。');
}

// --- メイン ---
async function main() {
  const mode = process.argv[2];

  if (!mode || !['extract', 'merge', 'info'].includes(mode)) {
    console.log('Usage:');
    console.log('  npx tsx scripts/extract_subflow.ts extract  # BさんのJSONからサブグラフ抽出');
    console.log('  npx tsx scripts/extract_subflow.ts merge    # 現在のDBフローにマージ');
    console.log('  npx tsx scripts/extract_subflow.ts info     # 現在のDBフロー情報表示');
    process.exit(1);
  }

  if (mode === 'extract') {
    await cmdExtract();
  } else if (mode === 'merge') {
    await cmdMerge();
  } else if (mode === 'info') {
    // DB情報表示
    const { data: flows, error } = await supabase
      .from('chat_flows')
      .select('id, name, trigger_value, updated_at, flow_definition')
      .eq('trigger_value', 'テスト')
      .limit(5);

    if (error) {
      console.error('❌', error);
      return;
    }

    console.log('📋 DBフロー情報:');
    flows?.forEach((f) => {
      const def = f.flow_definition;
      console.log(`  ID: ${f.id}`);
      console.log(`  名前: ${f.name}`);
      console.log(`  ノード数: ${def?.nodes?.length || '?'}`);
      console.log(`  エッジ数: ${def?.edges?.length || '?'}`);
      console.log(`  更新日: ${f.updated_at}`);

      // quick_reply-1771313825564 が存在するか確認
      const targetNode = def?.nodes?.find((n: any) => n.id === START_NODE_ID);
      if (targetNode) {
        console.log(`  ✅ ${START_NODE_ID} 存在`);
      } else {
        console.log(`  ❌ ${START_NODE_ID} 不在`);
      }
    });
  }
}

main().catch((err) => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
