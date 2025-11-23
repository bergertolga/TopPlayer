export type LoggerContext = {
  requestId?: string;
  source: 'request' | 'cron' | 'worker';
  path?: string;
  userId?: string | null;
};

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return {
    message: String(error),
  };
}

export function generateRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function createLogger(context: LoggerContext) {
  const base = {
    requestId: context.requestId,
    source: context.source,
    path: context.path,
    userId: context.userId,
  };

  return {
    info(event: string, data: Record<string, unknown> = {}): void {
      console.log(
        JSON.stringify({
          level: 'info',
          event,
          ...base,
          ...data,
          timestamp: new Date().toISOString(),
        })
      );
    },
    warn(event: string, data: Record<string, unknown> = {}): void {
      console.warn(
        JSON.stringify({
          level: 'warn',
          event,
          ...base,
          ...data,
          timestamp: new Date().toISOString(),
        })
      );
    },
    error(event: string, error: unknown, data: Record<string, unknown> = {}): void {
      console.error(
        JSON.stringify({
          level: 'error',
          event,
          ...base,
          ...data,
          ...serializeError(error),
          timestamp: new Date().toISOString(),
        })
      );
    },
  };
}

