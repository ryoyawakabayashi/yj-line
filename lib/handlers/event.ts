import { LineEvent } from '@/types/line';
import { saveUserLang, getUserLang, getConversationState, clearConversationState, recordFollowEvent, fetchAndSaveUserProfile } from '../database/queries';
import { replyMessage, linkRichMenu } from '../line/client';
import { config } from '../config';
import { CONSTANTS } from '../constants';
import { handleConversation } from './conversation';
import { startDiagnosisMode } from './diagnosis';
import {
  handleSupportButton,
  handleSupportPostback,
  handleSupportMessage,
  isSupportMode,
  exitSupportMode,
} from './support';

export async function handleEvent(event: LineEvent): Promise<void> {
  const { type, source } = event;
  const userId = source.userId;

  if (!userId) {
    console.log('❌ userId が見つかりません');
    return;
  }

  try {
    if (type === 'follow') {
      await handleFollow(userId);
      return;
    }

    // Postbackイベントの処理（サポート関連）
    if (type === 'postback') {
      const postbackData = event.postback?.data || '';
      console.log('📮 Postback受信:', postbackData);

      // サポート関連のPostback処理
      const handled = await handleSupportPostback(userId, event.replyToken, postbackData);
      if (handled) {
        return;
      }

      // 他のPostback処理があればここに追加
      console.log('⚠️ 未処理のPostback:', postbackData);
      return;
    }

    if (type === 'message' && event.message.type === 'text') {
      const messageText = event.message.text.trim();
      console.log(`💬 メッセージ受信: ${messageText}`);

      // 現在の会話状態を取得
      const currentState = await getConversationState(userId);

      // 言語選択の処理(絵文字付きのみ)
      const langMap: Record<string, string> = {
        '🇯🇵 日本語': 'ja',
        '🇬🇧 English': 'en',
        '🇰🇷 한국어': 'ko',
        '🇨🇳 中文': 'zh',
        '🇻🇳 Tiếng Việt': 'vi'
      };

      if (langMap[messageText]) {
        console.log('🌐 言語選択を検出:', messageText);
        
        // 診断モード中なら診断をリセット
        if (currentState?.mode === CONSTANTS.MODE.DIAGNOSIS) {
          console.log('🔄 診断モード中 → 言語変更 → 診断リセット');
          await clearConversationState(userId);
        }
        
        await handleLanguageSelection(userId, event.replyToken, messageText, langMap[messageText]);
        return;
      }

      // サポートモード発動トリガー
      const supportTriggers = [
        'SEOさん',
      ];

      if (supportTriggers.some(t => messageText.toLowerCase() === t.toLowerCase())) {
        console.log('📞 サポートモード発動:', messageText);

        // 診断モード中ならリセット
        if (currentState?.mode === CONSTANTS.MODE.DIAGNOSIS) {
          console.log('🔄 診断モード中 → サポートモード → 診断リセット');
          await clearConversationState(userId);
        }

        await handleSupportButton(userId, event.replyToken);
        return;
      }

      // リッチメニューボタンの処理
      const richMenuButtons = [
        'AI_MODE',
        'SITE_MODE',
        'SITE_MODE_AUTOCHAT', // AIトーク経由のサイト誘導
        'VIEW_FEATURES',
        'CONTACT',
        'LANG_CHANGE',
        'YOLO_DISCOVER',
      ];

      if (richMenuButtons.includes(messageText)) {
        console.log('🔘 リッチメニューボタン検出:', messageText);

        // 診断モード中に任意のリッチメニューボタンを押したら診断リセット
        if (currentState?.mode === CONSTANTS.MODE.DIAGNOSIS) {
          console.log('🔄 診断モード中 → リッチメニューボタン → 診断リセット');
          await clearConversationState(userId);
        }

        // AI_MODE: 診断開始
        if (messageText === 'AI_MODE') {
          await startDiagnosisMode(userId, event.replyToken, await getUserLang(userId));
          return;
        }

        // LANG_CHANGE: 言語選択画面表示
        if (messageText === 'LANG_CHANGE') {
          await handleChangeLanguage(event.replyToken);
          return;
        }

        // その他のボタン処理
        const { handleButtonAction } = await import('./buttons');
        const dbLang = await getUserLang(userId);
        await handleButtonAction(event, currentState, messageText, dbLang);
        return;
      }

      // サポートモード中のメッセージ処理
      if (await isSupportMode(userId)) {
        const handled = await handleSupportMessage(userId, event.replyToken, messageText);
        if (handled) {
          return;
        }
      }

      // 通常の会話処理
      await handleConversation(userId, event.replyToken, messageText);
    }
  } catch (error) {
    console.error('❌ イベント処理エラー:', error);
    throw error;
  }
}

async function handleFollow(userId: string): Promise<void> {
  console.log('👋 新規フォロー:', userId);

  // 友だち追加イベントをDBに記録
  await recordFollowEvent(userId, 'follow');

  await linkRichMenu(userId, config.richMenu.init);

  const { pushMessage } = await import('../line/client');
  
  const welcomeMessage = {
    type: 'text' as const,
    text: 'Welcome to YOLO JAPAN! 🎉\n\nPlease select your language:\n言語を選択してください',
    quickReply: {
      items: [
        { type: 'action' as const, action: { type: 'message' as const, label: '🇯🇵 日本語', text: '🇯🇵 日本語' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇬🇧 English', text: '🇬🇧 English' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇰🇷 한국어', text: '🇰🇷 한국어' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇨�� 中文', text: '🇨🇳 中文' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇻🇳 Tiếng Việt', text: '🇻🇳 Tiếng Việt' } }
      ]
    }
  };

  await pushMessage(userId, [welcomeMessage]);
}

async function handleLanguageSelection(
  userId: string,
  replyToken: string,
  text: string,
  selectedLang: string
): Promise<void> {
  console.log(`🌐 言語選択処理開始: ${selectedLang}`);

  try {
    await saveUserLang(userId, selectedLang);
    console.log('✅ 言語保存成功:', selectedLang);

    // LINEプロフィールを取得して保存（非同期でバックグラウンド実行）
    fetchAndSaveUserProfile(userId).catch(err =>
      console.error('⚠️ プロフィール取得失敗:', err)
    );

    const richMenuMap: Record<string, string> = {
      ja: config.richMenu.ja,
      en: config.richMenu.en,
      ko: config.richMenu.ko,
      zh: config.richMenu.zh,
      vi: config.richMenu.vi,
    };

    const richMenuId = richMenuMap[selectedLang];

    if (richMenuId) {
      console.log('🔄 リッチメニュー切り替え中:', richMenuId);
      await linkRichMenu(userId, richMenuId);
      console.log('✅ リッチメニュー切り替え成功');
    }

    const confirmMessages: Record<string, string> = {
      ja: '言語を日本語に設定しました ✅\n\n「しごとをさがす」から求人検索を始められます。',
      en: 'Language set to English ✅\n\nYou can start job search from "Find Job".',
      ko: '언어를 한국어로 設정했습니다 ✅\n\n"일자리 찾기"에서 구직 검색을 시작할 수 있습니다.',
      zh: '语言已设置为中文 ✅\n\n您可以从"找工作"开始求职搜索。',
      vi: 'Đã đặt ngôn ngữ thành Tiếng Việt ✅\n\nBạn có thể bắt đầu tìm việc từ "Tìm việc".',
    };

    await replyMessage(replyToken, [
      {
        type: 'text',
        text: confirmMessages[selectedLang] || confirmMessages.en
      }
    ]);

    console.log('✅ 言語選択処理完了');
  } catch (error) {
    console.error('❌ 言語選択エラー:', error);
    throw error;
  }
}

async function handleChangeLanguage(replyToken: string): Promise<void> {
  const message = {
    type: 'text' as const,
    text: 'Please select your language / 言語を選択してください:',
    quickReply: {
      items: [
        { type: 'action' as const, action: { type: 'message' as const, label: '🇯🇵 日本語', text: '🇯🇵 日本語' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇬🇧 English', text: '🇬🇧 English' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇰🇷 한국어', text: '🇰🇷 한국어' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇨🇳 中文', text: '🇨🇳 中文' } },
        { type: 'action' as const, action: { type: 'message' as const, label: '🇻🇳 Tiếng Việt', text: '🇻🇳 Tiếng Việt' } }
      ]
    }
  };

  await replyMessage(replyToken, [message]);
}
