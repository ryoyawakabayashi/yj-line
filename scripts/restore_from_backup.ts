// person_b_flow.json から指定ノード以降を復元（type修正込み）
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local.bak') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FLOW_ID = '0164502f-0400-49c5-ba09-6705c7349ec2';
const START_NODE_ID = 'quick_reply-1771313825564';
const INPUT_FILE = path.resolve(__dirname, 'person_b_flow.json');

// BFS で下流ノードIDを収集
function collectDownstream(startId: string, edges: any[]): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const e of edges) {
      if (e.source === id && !visited.has(e.target)) queue.push(e.target);
    }
  }
  return visited;
}

async function main() {
  // 1. person_b_flow.json 読み込み
  const backup = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`📂 バックアップ: ${backup.nodes.length} ノード, ${backup.edges.length} エッジ`);

  // 2. 下流ノードID収集
  const downstreamIds = collectDownstream(START_NODE_ID, backup.edges);
  console.log(`📊 ${START_NODE_ID} 以降: ${downstreamIds.size} ノード`);

  // 3. バックアップからサブグラフ抽出 + type修正
  const subNodes = backup.nodes
    .filter((n: any) => downstreamIds.has(n.id))
    .map((n: any) => {
      // flowNode → 実際のノードタイプに変換
      if (n.type === 'flowNode' && n.data?.nodeType) {
        return { ...n, type: n.data.nodeType };
      }
      return n;
    });

  const subEdges = backup.edges.filter(
    (e: any) => downstreamIds.has(e.source) && downstreamIds.has(e.target)
  );
  const incomingEdges = backup.edges.filter((e: any) => e.target === START_NODE_ID);

  // type修正の確認
  const typeStats: Record<string, number> = {};
  for (const n of subNodes) {
    typeStats[n.type] = (typeStats[n.type] || 0) + 1;
  }
  console.log('\n  ノードタイプ別:');
  for (const [t, c] of Object.entries(typeStats)) {
    console.log(`    ${t}: ${c}`);
  }

  // 4. DB取得
  const { data, error } = await supabase
    .from('chat_flows')
    .select('*')
    .eq('id', FLOW_ID)
    .single();

  if (error || !data) {
    console.error('DB取得エラー:', error);
    return;
  }

  const currentDef = data.flow_definition;
  console.log(`\n🎯 DB: ${data.name} | ${currentDef.nodes.length} ノード, ${currentDef.edges.length} エッジ`);

  // 5. マージ: 既存のサブグラフ部分を除去して置き換え
  const filteredNodes = currentDef.nodes.filter((n: any) => !downstreamIds.has(n.id));
  const filteredEdges = currentDef.edges.filter(
    (e: any) => !(downstreamIds.has(e.source) || downstreamIds.has(e.target))
  );

  // 入力エッジ（外部→起点）を保持
  for (const ie of incomingEdges) {
    if (!filteredEdges.find((e: any) => e.id === ie.id)) {
      filteredEdges.push(ie);
    }
  }

  const mergedNodes = [...filteredNodes, ...subNodes];
  const mergedEdges = [...filteredEdges, ...subEdges];

  console.log(`\n📊 マージ結果:`);
  console.log(`  ノード: ${currentDef.nodes.length} → ${mergedNodes.length}`);
  console.log(`  エッジ: ${currentDef.edges.length} → ${mergedEdges.length}`);

  // 6. DB更新
  const mergedDef = { ...currentDef, nodes: mergedNodes, edges: mergedEdges };
  const { error: updateError } = await supabase
    .from('chat_flows')
    .update({
      flow_definition: mergedDef,
      updated_at: new Date().toISOString(),
    })
    .eq('id', FLOW_ID);

  if (updateError) {
    console.error('DB更新エラー:', updateError);
  } else {
    console.log('\n✅ 復元完了！ブラウザで ↻ を押して確認してください。');
  }
}

main().catch(console.error);
