// DBのノードtype修正: "flowNode" → 実際のノードタイプ (data.nodeType)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local.bak') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FLOW_ID = '0164502f-0400-49c5-ba09-6705c7349ec2';

async function fix() {
  const { data, error } = await supabase
    .from('chat_flows')
    .select('id, flow_definition')
    .eq('id', FLOW_ID)
    .single();

  if (error) {
    console.error('DB取得エラー:', error);
    return;
  }

  const def = data.flow_definition;
  let fixed = 0;

  for (const node of def.nodes) {
    if (node.type === 'flowNode' && node.data?.nodeType) {
      console.log(`  fix: ${node.id} | flowNode -> ${node.data.nodeType}`);
      node.type = node.data.nodeType;
      fixed++;
    }
  }

  console.log(`\n修正ノード数: ${fixed}`);

  if (fixed > 0) {
    const { error: updateError } = await supabase
      .from('chat_flows')
      .update({
        flow_definition: def,
        updated_at: new Date().toISOString(),
      })
      .eq('id', FLOW_ID);

    if (updateError) {
      console.error('DB更新エラー:', updateError);
    } else {
      console.log('DB更新完了！');
    }
  } else {
    console.log('修正不要');
  }
}

fix();
