import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { DASHBOARD_ANALYST_SYSTEM_PROMPT, MTG_REPORT_TEMPLATE } from '@/lib/ai/dashboard-analyst-prompt';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AIコンテキストを取得するヘルパー
async function fetchAIContext(period: string, baseUrl: string) {
  const res = await fetch(`${baseUrl}/api/dashboard/ai-context?period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch AI context');
  return res.json();
}

// コンテキストデータをテキストに整形
function formatContextForReport(data: any): string {
  const kpi = data.kpi;

  // 日別トレンド
  const trendSummary = data.trends?.conversions?.length > 0
    ? data.trends.conversions.map((d: any) =>
        `${d.date}: セッション${d.sessions}, YJ登録${d.yjRegistrations}, YJ応募${d.yjApplications}`
      ).join('\n')
    : 'データなし';

  // 前週比を計算するヘルパー
  const formatChange = (item: any) => {
    if (!item) return '（データなし）';
    const sign = item.direction === 'up' ? '↑' : item.direction === 'down' ? '↓' : '→';
    return `${sign}${item.changePercent || 0}%`;
  };

  return `
=== ダッシュボード分析データ ===

【重要】今日の日付: ${new Date().toISOString().split('T')[0]}
【今週の期間】${data.period.startDate} 〜 ${data.period.endDate}（${data.period.label}）
※ 比較対象は「前週」（同じ曜日数での比較）

## 今週の主要KPI（前週比）
- アクティブユーザー: ${kpi.activeUsers?.value || 0}人
　→ 前週比: ${formatChange(kpi.activeUsers)}
- 診断実施数: ${kpi.diagnosisCount?.value || 0}回
　→ 前週比: ${formatChange(kpi.diagnosisCount)}
- セッション数: ${kpi.sessions?.value || 0}
　→ 前週比: ${formatChange(kpi.sessions)}
- YJ登録数: ${kpi.yjRegistrations?.value || 0}件
- YJ応募数: ${kpi.yjApplications?.value || 0}件
- リピート率: ${kpi.repeatRate?.value || 0}%

## 診断ファネル歩留まり表（診断経由: line/chatbotのみ）
- アクティブユーザー: ${data.funnel?.activeUsers || 0}人（100%）
- 診断実施: ${data.funnel?.diagnosisUsers || 0}人（${data.funnel?.diagnosisRate || 0}%）
- サイト遷移:
  - セッション数（クリック数）: ${data.funnel?.siteTransitionSessions || 0}回
  - ユニークユーザー数: ${data.funnel?.siteTransitionUsers || 0}人（${data.funnel?.siteTransitionRate || 0}%）
- CV（登録+応募）: ${data.funnel?.totalCV || 0}件（サイト遷移からのCV率: ${data.funnel?.siteTransitionCVRate || 0}%）
  - 内訳: YJ登録${data.funnel?.yjRegistrations || 0} / YJ応募${data.funnel?.yjApplications || 0} / YD登録${data.funnel?.ydRegistrations || 0} / YD応募${data.funnel?.ydApplications || 0}
- 全体転換率（アクティブ→CV）: ${data.funnel?.overallCVRate || 0}%

## 日別推移（今週）
${trendSummary}

## 累計データ
- 総ユーザー数: ${data.totals?.totalUsers?.toLocaleString() || 0}人
- 累計診断数: ${data.totals?.totalDiagnosis?.toLocaleString() || 0}回
`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    const actions = searchParams.get('actions'); // JSON形式の「やったこと」リスト

    // ベースURLを取得
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // AIコンテキストを取得
    const contextData = await fetchAIContext(period, baseUrl);
    const contextText = formatContextForReport(contextData);

    // レポートタイプに応じたプロンプト
    const reportType = period === 'month' ? '月次' : '週次';

    // やったことをパース
    let actionsContext = '';
    if (actions) {
      try {
        const actionList = JSON.parse(actions);
        if (Array.isArray(actionList) && actionList.length > 0) {
          const formattedActions = actionList
            .map((a: { date: string; title: string; description?: string }) =>
              `- ${a.date}: ${a.title}${a.description ? `（${a.description}）` : ''}`
            )
            .join('\n');
          actionsContext = `\n\n## 📝 今週やったこと（実施済みアクション）\n${formattedActions}\n\n※ 上記のアクションを「対策」セクションの「実施済み」として反映し、効果があったかどうかも言及してください。`;
        }
      } catch (e) {
        console.error('Failed to parse actions:', e);
      }
    }

    const systemPrompt = DASHBOARD_ANALYST_SYSTEM_PROMPT + '\n\n' + contextText;

    const userPrompt = `${reportType}MTGレポートを生成してください。「現状・課題・対策」形式で、以下のテンプレートに従って出力してください。

${MTG_REPORT_TEMPLATE}${actionsContext}

【重要】
- 提供されたデータのみを使用し、数値を正確に引用してください
- 前期間比のデータがある場合は必ず記載してください
- 課題は具体的な数値を根拠として挙げてください
- 対策は実行可能で具体的なものを提案してください
- 「やったこと」が登録されている場合は、その施策の効果を数値で評価してください`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const report = completion.choices[0]?.message?.content;

    if (!report) {
      throw new Error('Empty response from OpenAI');
    }

    return NextResponse.json({
      report,
      period: contextData.period,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('MTG Report API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
