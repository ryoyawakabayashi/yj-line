import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('richmenu_configs')
      .select('*')
      .order('lang');

    if (error) {
      console.error('❌ richmenu_configs 取得エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, configs: data || [] });
  } catch (error: any) {
    console.error('❌ richmenu API エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
