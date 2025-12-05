export class BotError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export function handleError(error: unknown, context: string): BotError {
  console.error(`❌ [${context}] エラー発生:`, error);

  if (error instanceof BotError) {
    return error;
  }

  if (error instanceof Error) {
    return new BotError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      error
    );
  }

  return new BotError(
    'Unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    error
  );
}

export function logError(error: BotError): void {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 エラー詳細:');
  console.error('  名前:', error.name);
  console.error('  コード:', error.code);
  console.error('  メッセージ:', error.message);
  console.error('  ステータス:', error.statusCode);
  if (error.originalError) {
    console.error('  元のエラー:', error.originalError);
  }
  if (error.stack) {
    console.error('  スタックトレース:', error.stack);
  }
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
