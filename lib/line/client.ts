import { config, LINE_API } from '../config';
import { LineMessage, QuickReplyItem } from '@/types/line';

// LINE Insight APIキャッシュ（5分間有効）- レート制限対策
const CACHE_TTL = 5 * 60 * 1000; // 5分間キャッシュ
const followerCache: Map<string, { count: number; timestamp: number }> = new Map();

export async function replyMessage(
  replyToken: string,
  messages: LineMessage | LineMessage[]
): Promise<boolean> {
  const messageArray = Array.isArray(messages) ? messages : [messages];

  if (messageArray.length > 5) {
    console.warn('⚠️ メッセージ数が5を超えています');
    messageArray.splice(5);
  }

  const payload = {
    replyToken,
    messages: messageArray,
  };

  try {
    const response = await fetch(LINE_API.REPLY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ LINE Reply Error: ${response.status} ${errorText}`);
      return false;
    }

    console.log('✅ Reply送信成功');
    return true;
  } catch (error) {
    console.error('❌ replyMessage エラー:', error);
    return false;
  }
}

export async function pushMessage(
  userId: string,
  messages: LineMessage | LineMessage[]
): Promise<boolean> {
  const messageArray = Array.isArray(messages) ? messages : [messages];

  const payload = {
    to: userId,
    messages: messageArray,
  };

  try {
    const response = await fetch(LINE_API.PUSH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ LINE Push Error: ${response.status} ${errorText}`);
      return false;
    }

    console.log('✅ Push送信成功');
    return true;
  } catch (error) {
    console.error('❌ pushMessage エラー:', error);
    return false;
  }
}

export async function showLoadingAnimation(
  userId: string,
  seconds: number = 3
): Promise<void> {
  const loadingSeconds = Math.max(1, Math.min(60, seconds));

  const payload = {
    chatId: userId,
    loadingSeconds,
  };

  try {
    await fetch(LINE_API.LOADING_ANIMATION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.line.channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Loading Animation Error:', error);
  }
}

export function replyWithQuickReply(
  replyToken: string,
  text: string,
  quickReplyItems: QuickReplyItem[]
): Promise<boolean> {
  return replyMessage(replyToken, {
    type: 'text',
    text,
    quickReply: {
      items: quickReplyItems,
    },
  });
}

// リッチメニューをユーザーにリンク
export async function linkRichMenu(userId: string, richMenuId: string): Promise<boolean> {
  // テンプレートURLを実際の値に置き換え
  const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.line.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ リッチメニューリンクエラー: ${response.status} ${errorText}`);
      return false;
    }

    console.log(`✅ リッチメニューをリンク: ${richMenuId} -> ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ linkRichMenu エラー:', error);
    return false;
  }
}

// LINE 友だち数を取得（制限なし）
export async function getFollowerCount(): Promise<number> {
  try {
    const response = await fetch('https://api.line.me/v2/bot/followers/ids?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.line.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      // followers/ids APIはカウントを返さないので、別の方法を試す
      console.warn('followers/ids API failed, trying insight API');
      return 0;
    }

    // このAPIはIDリストを返すため、総数の取得には向かない
    // 代わりにbot infoから取得を試みる
    return 0;
  } catch (error) {
    console.error('❌ getFollowerCount エラー:', error);
    return 0;
  }
}

// LINE フォロワー統計情報を取得
export interface LineFollowerInsight {
  followers: number;
  targetedReaches: number;
  blocks: number;
}

// フォロワー統計キャッシュ（5分間有効）
let followerStatsCache: { data: LineFollowerInsight; timestamp: number } | null = null;

export async function getFollowerStatistics(): Promise<LineFollowerInsight | null> {
  // キャッシュチェック
  if (followerStatsCache && Date.now() - followerStatsCache.timestamp < CACHE_TTL) {
    console.log('📦 フォロワー統計キャッシュヒット');
    return followerStatsCache.data;
  }

  try {
    // LINE Insight APIはdateパラメータが必須（YYYYMMDD形式、前日のデータのみ取得可能）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateString = yesterday.toISOString().split('T')[0].replace(/-/g, '');

    const response = await fetch(`https://api.line.me/v2/bot/insight/followers?date=${dateString}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.line.channelAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ LINE Insight Error: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('📊 LINE Follower Statistics:', JSON.stringify(data));

    // status が ready でない場合はデータがまだ利用できない
    if (data.status !== 'ready') {
      console.warn(`⚠️ LINE Insight status: ${data.status} (ready以外はデータなし)`);
      return {
        followers: 0,
        targetedReaches: 0,
        blocks: 0,
      };
    }

    const result = {
      followers: data.followers || 0,
      targetedReaches: data.targetedReaches || 0,
      blocks: data.blocks || 0,
    };

    // キャッシュに保存
    followerStatsCache = { data: result, timestamp: Date.now() };
    // getFollowerCountByDateのキャッシュにも追加
    followerCache.set(dateString, { count: result.followers, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error('❌ getFollowerStatistics エラー:', error);
    return null;
  }
}

// 指定日のフォロワー数を取得（内部用、キャッシュ付き）
async function getFollowerCountByDate(dateString: string): Promise<number | null> {
  // キャッシュチェック
  const cached = followerCache.get(dateString);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 キャッシュヒット: ${dateString} = ${cached.count}`);
    return cached.count;
  }

  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/insight/followers?date=${dateString}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.line.channelAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ LINE Insight Error: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    if (data.status !== 'ready') {
      console.warn(`⚠️ LINE Insight status: ${data.status} for date ${dateString}`);
      return null;
    }

    const count = data.followers || 0;
    // キャッシュに保存
    followerCache.set(dateString, { count, timestamp: Date.now() });
    console.log(`📊 フォロワー数取得: ${dateString} = ${count}`);
    return count;
  } catch (error) {
    console.error(`❌ getFollowerCountByDate error for ${dateString}:`, error);
    return null;
  }
}

// 期間内の友だち追加数を取得（差分計算、失敗時はDBからフォールバック）
export async function getFollowersAddedByDateRange(
  startDate: string,
  endDate: string
): Promise<number> {
  try {
    // startDateの前日とendDateのフォロワー数を取得して差分を計算
    const startDateObj = new Date(startDate);
    startDateObj.setDate(startDateObj.getDate() - 1);
    const startDateStr = startDateObj.toISOString().split('T')[0].replace(/-/g, '');
    const endDateStr = endDate.replace(/-/g, '');

    const [startCount, endCount] = await Promise.all([
      getFollowerCountByDate(startDateStr),
      getFollowerCountByDate(endDateStr),
    ]);

    if (startCount === null || endCount === null) {
      console.warn('⚠️ LINE API失敗、DBからフォールバック取得');
      // フォールバック: DBのfollow_eventsテーブルから取得
      return await getFollowersAddedFromDB(startDate, endDate);
    }

    const added = endCount - startCount;
    console.log(`📊 友だち追加数: ${startDateStr}(${startCount}) → ${endDateStr}(${endCount}) = +${added}`);
    return Math.max(0, added); // マイナスの場合は0を返す
  } catch (error) {
    console.error('❌ getFollowersAddedByDateRange エラー:', error);
    // フォールバック: DBから取得を試みる
    return await getFollowersAddedFromDB(startDate, endDate);
  }
}

// DBのfollow_eventsテーブルから友だち追加数を取得（フォールバック用）
async function getFollowersAddedFromDB(startDate: string, endDate: string): Promise<number> {
  try {
    const { getFollowEventCount } = await import('@/lib/database/dashboard-queries');
    const count = await getFollowEventCount(startDate, endDate);
    console.log(`📊 DB友だち追加数: ${startDate}〜${endDate} = ${count}`);
    return count;
  } catch (error) {
    console.error('❌ DBフォールバック失敗:', error);
    return 0;
  }
}

// メッセージ統計から友達追加イベント数を取得
export async function getFriendAddedCount(date?: string): Promise<number> {
  try {
    // 日付がなければ昨日
    let targetDate = date;
    if (!targetDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
    }

    const response = await fetch(
      `https://api.line.me/v2/bot/insight/message/event?requestId=${targetDate}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.line.channelAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      // 404はデータがない場合
      if (response.status === 404) {
        return 0;
      }
      const errorText = await response.text();
      console.error(`❌ LINE Message Event Error: ${response.status} ${errorText}`);
      return 0;
    }

    const data = await response.json();
    // overview.uniqueImpression などから取得可能
    return data.overview?.uniqueClick || 0;
  } catch (error) {
    console.error('❌ getFriendAddedCount エラー:', error);
    return 0;
  }
}
