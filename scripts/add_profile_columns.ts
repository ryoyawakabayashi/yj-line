import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addProfileColumns() {
  try {
    console.log('Adding display_name and picture_url columns to user_status table...');

    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_status
        ADD COLUMN IF NOT EXISTS display_name TEXT,
        ADD COLUMN IF NOT EXISTS picture_url TEXT;
      `,
    });

    if (error) {
      // rpc関数が存在しない場合は直接SQLを実行できないため、手動実行が必要
      console.error('RPC error (expected - run SQL manually):', error.message);
      console.log('\nPlease run this SQL in Supabase dashboard:');
      console.log('---------------------------------------');
      console.log('ALTER TABLE user_status');
      console.log('ADD COLUMN IF NOT EXISTS display_name TEXT,');
      console.log('ADD COLUMN IF NOT EXISTS picture_url TEXT;');
      console.log('---------------------------------------');
      return;
    }

    console.log('✅ Columns added successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

addProfileColumns();
