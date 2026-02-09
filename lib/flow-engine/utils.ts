// =====================================================
// Flow Engine Utilities
// フロー実行エンジンのユーティリティ関数
// =====================================================

import { ExecutionContext } from './types';

/**
 * 変数展開
 * テンプレート文字列内の {{変数名}} を実際の値に置き換える
 *
 * 例: "Hello {{user.name}}, your service is {{variables.service}}"
 *     → "Hello Taro, your service is YOLO_JAPAN"
 */
export function expandVariables(
  template: string,
  context: ExecutionContext
): string {
  // user.XXX の展開
  let result = template.replace(/\{\{user\.(\w+)\}\}/g, (match, key) => {
    return context.variables[key] || match;
  });

  // variables.XXX の展開
  result = result.replace(/\{\{variables\.(\w+)\}\}/g, (match, key) => {
    return context.variables[key] || match;
  });

  // service の展開
  result = result.replace(/\{\{service\}\}/g, context.service || '');

  // lang の展開
  result = result.replace(/\{\{lang\}\}/g, context.lang || 'ja');

  // userMessage の展開
  result = result.replace(/\{\{userMessage\}\}/g, context.userMessage || '');

  return result;
}

/**
 * ネストされたオブジェクトから値を取得
 *
 * 例: getNestedValue({ user: { name: 'Taro' } }, 'user.name') → 'Taro'
 */
export function getNestedValue(
  obj: Record<string, any>,
  path: string
): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * 条件評価
 */
export function evaluateCondition(
  value: any,
  operator: string,
  compareValue: any
): boolean {
  switch (operator) {
    case 'equals':
      return value === compareValue;

    case 'contains':
      if (typeof value === 'string' && typeof compareValue === 'string') {
        return value.includes(compareValue);
      }
      return false;

    case 'regex':
      if (typeof value === 'string' && typeof compareValue === 'string') {
        try {
          const regex = new RegExp(compareValue);
          return regex.test(value);
        } catch (e) {
          console.error('Invalid regex:', compareValue, e);
          return false;
        }
      }
      return false;

    case 'gt':
      return Number(value) > Number(compareValue);

    case 'lt':
      return Number(value) < Number(compareValue);

    default:
      console.warn('Unknown operator:', operator);
      return false;
  }
}

/**
 * LINEメッセージオブジェクトを作成
 */
export function createTextMessage(text: string, quickReply?: any): any {
  const message: any = {
    type: 'text',
    text,
  };

  if (quickReply) {
    message.quickReply = quickReply;
  }

  return message;
}
