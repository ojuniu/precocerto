export type AppErrorCode =
  | 'not_configured'
  | 'network'
  | 'ai_failed'
  | 'unreadable'
  | 'quota_exceeded'
  | 'premium_required'
  | 'not_authenticated'
  | 'database'
  | 'unknown';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Algo deu errado. Tente novamente.';
}
