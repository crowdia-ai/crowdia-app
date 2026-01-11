/**
 * Retry utility for handling transient failures in agent operations
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we're on the last attempt or if error is not retryable
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      // Log retry attempt
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed: ${errorMsg}. Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay *= opts.backoffMultiplier;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Check if an error is retryable (transient network/timeout errors)
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Retry on common transient errors
  const retryablePatterns = [
    'timeout',
    'timed out',
    'network',
    'econnreset',
    'enotfound',
    'econnrefused',
    'socket hang up',
    'protocol error',
    'navigation timeout',
    'protocol timeout',
  ];

  return retryablePatterns.some(pattern =>
    message.includes(pattern) || name.includes(pattern)
  );
}

/**
 * Retry configuration for source processing
 */
export const SOURCE_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2, // Retry once
  delayMs: 5000, // 5 second delay
  backoffMultiplier: 1, // No backoff (same delay)
  shouldRetry: isRetryableError,
};
