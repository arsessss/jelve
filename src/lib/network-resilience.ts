// Network resilience wrapper for API calls
// Provides retry logic and offline queue for restricted regions

// Extract JSON body from a supabase-js FunctionsHttpError (Response is on error.context)
export async function extractErrorBody(
  err: unknown
): Promise<{ error?: string; data?: unknown } | null> {
  try {
    const ctx = (err as { context?: Response })?.context;
    if (ctx && typeof ctx.clone === 'function') {
      const cloned = ctx.clone();
      const txt = await cloned.text();
      if (!txt) return null;
      try {
        return JSON.parse(txt);
      } catch {
        return { error: txt };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

const RETRY_DELAYS = [100, 500, 1000, 2000];
const MAX_RETRIES = 4;
const REQUEST_TIMEOUT = 20000;

interface NetworkError extends Error {
  isNetworkError: boolean;
  originalError?: Error;
}

// Sleep utility
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Create a network error
const createNetworkError = (message: string, originalError?: Error): NetworkError => {
  const error = new Error(message) as NetworkError;
  error.isNetworkError = true;
  error.originalError = originalError;
  return error;
};

// Check if error is network-related
const isNetworkRelatedError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('aborted')
    );
  }
  return false;
};

// Wrap any async function with retry logic
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelays?: number[];
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = MAX_RETRIES, retryDelays = RETRY_DELAYS, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on network-related errors
      if (!isNetworkRelatedError(error)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
        console.log(`Request failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
        onRetry?.(attempt + 1, lastError);
        await sleep(delay);
      }
    }
  }

  throw createNetworkError('درخواست ناموفق بود. لطفا اتصال اینترنت خود را بررسی کنید', lastError || undefined);
}

// Timeout wrapper for promises
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createNetworkError('زمان درخواست به پایان رسید'));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Online status utilities
let isOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
const onlineListeners: Array<(online: boolean) => void> = [];

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnlineStatus = true;
    onlineListeners.forEach(cb => cb(true));
    console.log('اتصال به اینترنت برقرار شد');
  });

  window.addEventListener('offline', () => {
    isOnlineStatus = false;
    onlineListeners.forEach(cb => cb(false));
    console.log('اتصال به اینترنت قطع شد');
  });
}

export const isOnline = (): boolean => isOnlineStatus;

export const onOnlineChange = (callback: (online: boolean) => void): (() => void) => {
  onlineListeners.push(callback);
  return () => {
    const index = onlineListeners.indexOf(callback);
    if (index > -1) onlineListeners.splice(index, 1);
  };
};

// Queue for offline requests
interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  timestamp: number;
}

const requestQueue: QueuedRequest<unknown>[] = [];
let processingQueue = false;

export const queueRequest = <T>(
  id: string,
  execute: () => Promise<T>
): void => {
  // Remove duplicate if exists
  const existingIndex = requestQueue.findIndex(r => r.id === id);
  if (existingIndex > -1) {
    requestQueue.splice(existingIndex, 1);
  }

  requestQueue.push({
    id,
    execute,
    timestamp: Date.now(),
  });

  // Try to process queue
  processQueue();
};

const processQueue = async (): Promise<void> => {
  if (processingQueue || !isOnlineStatus || requestQueue.length === 0) {
    return;
  }

  processingQueue = true;

  while (requestQueue.length > 0 && isOnlineStatus) {
    const request = requestQueue.shift();
    if (!request) continue;

    // Skip old requests (older than 1 hour)
    if (Date.now() - request.timestamp > 60 * 60 * 1000) {
      continue;
    }

    try {
      await withRetry(request.execute, { maxRetries: 2 });
    } catch (error) {
      console.error('Queued request failed:', error);
      // Don't re-queue, just log
    }
  }

  processingQueue = false;
};

// Process queue when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(processQueue, 1000);
  });
}