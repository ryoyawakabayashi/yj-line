import { createHmac } from 'crypto';
import { config } from '../config';

export function validateSignature(body: string, signature: string): boolean {
  if (!signature) {
    console.error('❌ 署名が存在しません');
    return false;
  }

  const channelSecret = config.line.channelSecret;
  
  if (!channelSecret) {
    console.error('❌ LINE_CHANNEL_SECRET が設定されていません');
    return false;
  }

  const hash = createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');

  const isValid = hash === signature;
  
  if (!isValid) {
    console.error('❌ 署名検証失敗');
    console.error('期待値:', hash);
    console.error('実際値:', signature);
  }

  return isValid;
}
