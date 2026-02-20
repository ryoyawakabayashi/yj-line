import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';

function buildLineApiJson(config: any) {
  const areas = (config.areas || []).map((area: any) => ({
    bounds: area.bounds,
    action: area.action_type === 'message'
      ? { type: 'message', text: area.action_text, label: area.label }
      : { type: 'uri', uri: area.action_text, label: area.label },
  }));

  return {
    size: { width: config.size_width || 2500, height: config.size_height || 1686 },
    selected: true,
    name: config.menu_name,
    chatBarText: config.chat_bar_text,
    areas,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;

    const { data, error } = await supabase
      .from('richmenu_configs')
      .select('*')
      .eq('lang', lang)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }

    const lineApiJson = buildLineApiJson(data);

    return NextResponse.json({
      success: true,
      config: data,
      lineApiJson,
    });
  } catch (error: any) {
    console.error('❌ richmenu GET エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
  try {
    const { lang } = await params;
    const body = await request.json();
    const { menuName, chatBarText, areas, richMenuId } = body;

    const updateData: any = {};
    if (menuName !== undefined) updateData.menu_name = menuName;
    if (chatBarText !== undefined) updateData.chat_bar_text = chatBarText;
    if (areas !== undefined) updateData.areas = areas;
    if (richMenuId !== undefined) updateData.rich_menu_id = richMenuId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('richmenu_configs')
      .update(updateData)
      .eq('lang', lang);

    if (error) {
      console.error('❌ richmenu PATCH エラー:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ richmenu PATCH エラー:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
