import { LineEvent } from '@/types/line';
import { saveUserLang, getUserLang, getConversationState, clearConversationState, recordFollowEvent, fetchAndSaveUserProfile, saveConversationState } from '../database/queries';
import { getActiveTicketByUserId, saveMessage } from '../database/support-queries';
import { replyMessage, pushMessage, linkRichMenu } from '../line/client';
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
import { detectUserIntentAdvanced } from './intent';
import { getActiveFlows, getFlowById, recordCardSelection } from '../database/flow-queries';
import type { FlowNode as FlowNodeType } from '../database/flow-queries';
import { flowExecutor } from '../flow-engine/executor';

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

    // Postbackイベントの処理
    if (type === 'postback') {
      const postbackData = event.postback?.data || '';
      console.log('📮 Postback受信:', postbackData);

      // カードカルーセルのボタン選択（フローエンジン）
      const params = new URLSearchParams(postbackData);
      if (params.get('action') === 'card_choice') {
        const cardId = params.get('cardId') || '';
        const displayText = decodeURIComponent(params.get('text') || '');
        console.log('🃏 カード選択:', cardId, 'テキスト:', displayText);

        const currentState = await getConversationState(userId);
        if (currentState?.mode === 'flow' && currentState.flowId) {
          // fire-and-forget: カード選択イベントを記録（awaitしない）
          recordCardSelection({
            flowId: currentState.flowId,
            cardNodeId: cardId,
            userId,
            displayText,
          });

          // カード選択はフロー状態を変えず、ノードチェーンをたどってメッセージをpushで返す
          try {
            const flow = await getFlowById(currentState.flowId);
            if (flow) {
              const lang = await getUserLang(userId);
              const { nodes, edges } = flow.flowDefinition;

              // cardIdから出ているエッジのターゲットからチェーンをたどる
              const targetEdge = edges.find((e) => e.source === cardId);
              console.log('🔗 card_choice チェーン開始:', { cardId, targetNodeId: targetEdge?.target || 'エッジなし' });
              if (targetEdge) {
                const messages: any[] = [];
                let currentNodeId: string | undefined = targetEdge.target;
                const context = {
                  userId,
                  userMessage: '',
                  lang,
                  variables: flow.flowDefinition.variables || {},
                  conversationHistory: [] as Array<{ role: string; content: string }>,
                };
                const maxSteps = 20;
                let step = 0;
                let chainPendingDelay = 0;  // 遅延送信用

                while (currentNodeId && step < maxSteps) {
                  step++;
                  const node = nodes.find((n) => n.id === currentNodeId);
                  if (!node) {
                    console.log('⚠️ チェーン: ノード見つからず:', currentNodeId);
                    break;
                  }
                  console.log(`🔗 チェーン step${step}: ${node.type} (${node.id})`);

                  if (node.type === 'send_message') {
                    const { SendMessageHandler } = await import('../flow-engine/nodes/send-message');
                    const handler = new SendMessageHandler(edges);
                    const result = await handler.execute(node, context);
                    console.log('🔗 send_message結果:', { success: result.success, nextNodeId: result.nextNodeId, msgCount: result.responseMessages?.length });
                    if (result.responseMessages) messages.push(...result.responseMessages);

                    // delayAfter処理: メッセージを先に送信し、次のノードを遅延送信予約
                    if (result.variables?._delayAfterSeconds) {
                      const delaySec = result.variables._delayAfterSeconds as number;
                      console.log(`⏱️  card_choiceチェーン send_message delay: ${delaySec}秒後に次メッセージ送信予約`);
                      if (messages.length > 0) {
                        await pushMessage(userId, [...messages]);
                        messages.length = 0;
                      }
                      chainPendingDelay = delaySec;
                    }

                    currentNodeId = result.nextNodeId;
                  } else if (node.type === 'card') {
                    // card delay処理: このノードのdelayまたは前ノードからの持ち越しdelay
                    const cardDelay = node.data?.config?.delayAfter;
                    const effectiveDelay = Math.max(
                      cardDelay && cardDelay > 0 ? Math.min(cardDelay, 30) : 0,
                      chainPendingDelay
                    );
                    if (effectiveDelay > 0 && messages.length > 0) {
                      await pushMessage(userId, [...messages]);
                      messages.length = 0;
                    }

                    const { CardHandler } = await import('../flow-engine/nodes/card');
                    // 兄弟cardノードをマージしてカルーセルを生成
                    let cardNode: FlowNodeType = node;
                    const parentEdge = edges.find((e) => e.target === node.id);
                    if (parentEdge) {
                      const siblingCardEdges = edges
                        .filter((e) => e.source === parentEdge.source)
                        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                      const siblingCards = siblingCardEdges
                        .map((e) => nodes.find((n) => n.id === e.target))
                        .filter((n): n is FlowNodeType => !!n && n.type === 'card');
                      console.log('🔗 card兄弟マージ:', { parent: parentEdge.source, siblingCount: siblingCards.length, ids: siblingCards.map(c => c.id) });
                      if (siblingCards.length > 1) {
                        const mergedColumns = siblingCards.map((card) => {
                          const cfg = card.data.config || {};
                          if (cfg.columns && cfg.columns.length > 0) return cfg.columns[0];
                          return { title: cfg.title || '', text: cfg.text || '', imageUrl: cfg.imageUrl || '', buttons: [{ label: '', text: '' }] };
                        });
                        cardNode = {
                          ...node,
                          data: {
                            ...node.data,
                            config: {
                              ...node.data.config,
                              columns: mergedColumns.slice(0, 10),
                              _siblingCardIds: siblingCards.map((c) => c.id),
                            },
                          },
                        };
                      }
                    }
                    const handler = new CardHandler(edges);
                    const result = await handler.execute(cardNode, context);
                    console.log('🔗 card結果:', { success: result.success, error: result.error, msgCount: result.responseMessages?.length });
                    if (result.responseMessages) {
                      if (effectiveDelay > 0) {
                        const { scheduleDelayedPush } = await import('../flow-engine/delayed-push');
                        scheduleDelayedPush(userId, result.responseMessages, effectiveDelay);
                        chainPendingDelay = 0;
                      } else {
                        messages.push(...result.responseMessages);
                      }
                    }
                    break; // cardは入力待ちなので停止
                  } else if (node.type === 'quick_reply') {
                    // quick_reply delay処理
                    const qrDelay = node.data?.config?.delayAfter;
                    const effectiveDelay = Math.max(
                      qrDelay && qrDelay > 0 ? Math.min(qrDelay, 30) : 0,
                      chainPendingDelay
                    );
                    if (effectiveDelay > 0 && messages.length > 0) {
                      await pushMessage(userId, [...messages]);
                      messages.length = 0;
                    }

                    const { QuickReplyHandler } = await import('../flow-engine/nodes/quick-reply');
                    const qrHandler = new QuickReplyHandler(edges);
                    const qrResult = await qrHandler.execute(node, context);
                    if (qrResult.responseMessages) {
                      if (effectiveDelay > 0) {
                        const { scheduleDelayedPush } = await import('../flow-engine/delayed-push');
                        scheduleDelayedPush(userId, qrResult.responseMessages, effectiveDelay);
                        chainPendingDelay = 0;
                      } else {
                        messages.push(...qrResult.responseMessages);
                      }
                    }
                    break; // quick_replyは入力待ちなので停止
                  } else if (node.type === 'end') {
                    break;
                  } else {
                    console.log('🔗 チェーン: 未対応ノードタイプ:', node.type, '→ 次へ');
                    const nextEdge = edges.find((e) => e.source === node.id);
                    currentNodeId = nextEdge?.target;
                  }
                }

                console.log('🔗 チェーン完了: メッセージ数:', messages.length);
                if (messages.length > 0) {
                  await pushMessage(userId, messages);
                }
              } else {
                console.log('⚠️ card_choice: cardId からのエッジが見つかりません:', cardId);
              }
            }
          } catch (error) {
            console.error('❌ カード選択push送信エラー:', error);
          }
        }
        return;
      }

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

      // === 有人対応モードのチェック（最優先） ===
      // conversation_stateに関係なく、有人対応中のチケットがあれば
      // ユーザーメッセージをDBに保存してAI応答をスキップ
      const activeTicket = await getActiveTicketByUserId(userId);
      if (activeTicket?.humanTakeover) {
        await saveMessage(activeTicket.id, 'user', messageText);
        console.log(`📝 有人対応中メッセージ保存: ${activeTicket.id} - ${messageText.slice(0, 50)}`);
        // AI応答はスキップ（ダッシュボードからオペレーターが対応）
        return;
      }

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

      // キーワードトリガー: DBに登録されたキーワードフローを動的にマッチング
      {
        const keywordFlows = await getActiveFlows('keyword');
        const matchingFlow = keywordFlows.find(f =>
          f.triggerValue?.toLowerCase() === messageText.toLowerCase()
        );

        if (matchingFlow) {
          console.log('📞 キーワードトリガー発動:', messageText, '→ フロー:', matchingFlow.name);

          // 既存モード中ならリセット（診断・フロー問わず）
          if (currentState?.mode) {
            console.log('🔄 既存モードリセット:', currentState.mode, '→ キーワードフロー開始');
            await clearConversationState(userId);
          }

          const lang = await getUserLang(userId);

          try {
            const result = await flowExecutor.execute(
              matchingFlow.id,
              userId,
              messageText,
              {
                lang,
                replyToken: event.replyToken,
                service: matchingFlow.service,
              }
            );

            // レスポンスメッセージを送信
            if (result.responseMessages && result.responseMessages.length > 0) {
              await replyMessage(event.replyToken, result.responseMessages);
            }

            // クイックリプライ待機状態の場合は会話状態を保存
            if (result.shouldWaitForInput && result.waitNodeId) {
              console.log('⏸️ ユーザー入力待機中:', result.waitNodeId);
              await saveConversationState(userId, {
                mode: 'flow',
                flowId: matchingFlow.id,
                waitingNodeId: result.waitNodeId,
                variables: result.variables || {},
              });
            }

            console.log('✅ フロー実行完了');
            return;
          } catch (error) {
            console.error('❌ フロー実行エラー:', error);
            // エラー時はフォールバック
          }
        }
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

      // === フローモード中の処理（クイックリプライへの応答） ===
      if (currentState?.mode === 'flow' && currentState.flowId && currentState.waitingNodeId) {
        // トリガー優先: フロー待機中でも別のフローのトリガーに一致すれば現在のフローを中断
        const keywordFlowsForOverride = await getActiveFlows('keyword');
        const overrideFlow = keywordFlowsForOverride.find(f =>
          f.triggerValue?.toLowerCase() === messageText.toLowerCase()
        );
        if (overrideFlow && overrideFlow.id !== currentState.flowId) {
          console.log('🔄 フロー中断 → トリガー優先:', messageText, '→', overrideFlow.name);
          await clearConversationState(userId);
          const lang = await getUserLang(userId);
          try {
            const result = await flowExecutor.execute(
              overrideFlow.id, userId, messageText,
              { lang, replyToken: event.replyToken, service: overrideFlow.service }
            );
            if (result.responseMessages && result.responseMessages.length > 0) {
              await replyMessage(event.replyToken, result.responseMessages);
            }
            if (result.shouldWaitForInput && result.waitNodeId) {
              await saveConversationState(userId, {
                mode: 'flow', flowId: overrideFlow.id,
                waitingNodeId: result.waitNodeId, variables: result.variables || {},
              });
            }
            return;
          } catch (error) {
            console.error('❌ トリガー優先フロー実行エラー:', error);
          }
        }

        console.log('🔄 フロー継続:', currentState.flowId, 'ノード:', currentState.waitingNodeId);
        const lang = await getUserLang(userId);

        try {
          const result = await flowExecutor.execute(
            currentState.flowId,
            userId,
            messageText,
            {
              lang,
              replyToken: event.replyToken,
              variables: currentState.variables || {}
            },
            currentState.waitingNodeId  // resumeFromNodeId
          );

          // レスポンスメッセージを送信
          if (result.responseMessages && result.responseMessages.length > 0) {
            await replyMessage(event.replyToken, result.responseMessages);
          }

          // まだ入力待機中の場合は状態を更新
          if (result.shouldWaitForInput && result.waitNodeId) {
            console.log('⏸️ ユーザー入力待機中:', result.waitNodeId);
            await saveConversationState(userId, {
              mode: 'flow',
              flowId: currentState.flowId,
              waitingNodeId: result.waitNodeId,
              variables: result.variables || {},
            });
          } else {
            // フロー完了、状態をクリア
            console.log('✅ フロー完了、状態クリア');
            await clearConversationState(userId);

            // ユーザーのメッセージがリッチメニューボタン（AI_MODE等）の場合、
            // 通常ハンドラーに引き継ぐ（returnしない）
            const reDispatchButtons = [
              'AI_MODE', 'SITE_MODE', 'SITE_MODE_AUTOCHAT',
              'VIEW_FEATURES', 'CONTACT', 'LANG_CHANGE', 'YOLO_DISCOVER',
            ];
            if (reDispatchButtons.includes(messageText)) {
              console.log('🔄 フロー完了後、通常ハンドラーに引き継ぎ:', messageText);
              // returnしない → 下のリッチメニューボタン処理に流れる
            } else {
              return;
            }
          }
        } catch (error) {
          console.error('❌ フロー継続エラー:', error);
          // エラー時は状態をクリアして通常処理へ
          await clearConversationState(userId);
        }
      }

      // === 診断モード中のサポート要望検出 ===
      // 診断モード中でもサポート要望を検出してサポートモードへ誘導
      if (currentState?.mode === CONSTANTS.MODE.DIAGNOSIS) {
        const dbLang = await getUserLang(userId);
        const intent = detectUserIntentAdvanced(messageText, dbLang);

        if (intent.intent === 'support_request' && intent.confidence >= 0.9) {
          console.log('🔄 診断モード中にサポート要望検出 → サポートモード誘導');

          // 確認メッセージを送信（クイックリプライ付き）
          const confirmMessages: Record<string, string> = {
            ja: 'お困りのことがあるようですね。サポートに問い合わせますか？',
            en: 'It seems you need help. Would you like to contact support?',
            ko: '도움이 필요하신 것 같습니다. 고객지원에 문의하시겠습니까?',
            zh: '您似乎需要帮助。要联系客服吗？',
            vi: 'Có vẻ bạn cần hỗ trợ. Bạn có muốn liên hệ hỗ trợ không?',
          };

          const yesLabels: Record<string, string> = {
            ja: 'はい、問い合わせる',
            en: 'Yes, contact support',
            ko: '예, 문의하기',
            zh: '是的，联系客服',
            vi: 'Có, liên hệ hỗ trợ',
          };

          const noLabels: Record<string, string> = {
            ja: 'いいえ、続ける',
            en: 'No, continue',
            ko: '아니오, 계속하기',
            zh: '否，继续',
            vi: 'Không, tiếp tục',
          };

          await replyMessage(event.replyToken, {
            type: 'text',
            text: confirmMessages[dbLang] || confirmMessages.ja,
            quickReply: {
              items: [
                {
                  type: 'action',
                  action: {
                    type: 'postback',
                    label: yesLabels[dbLang] || yesLabels.ja,
                    data: 'action=support&step=confirm_switch',
                  },
                },
                {
                  type: 'action',
                  action: {
                    type: 'message',
                    label: noLabels[dbLang] || noLabels.ja,
                    text: noLabels[dbLang] || noLabels.ja,
                  },
                },
              ],
            },
          });
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
