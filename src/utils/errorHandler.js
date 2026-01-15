/**
 * Error Handler Utilities
 * Provides retry logic, error classification, and user-friendly error messages
 * Optimized for performance with exponential backoff and retry limits
 */

/**
 * Classify error type for better error handling
 */
export function classifyError(error) {
    if (!error) return { type: 'unknown', retryable: false };

    // Network errors (retryable)
    if (error.message?.includes('fetch') || 
        error.message?.includes('network') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND') {
        return { type: 'network', retryable: true };
    }

    // Timeout errors (retryable)
    if (error.message?.includes('timeout') || 
        error.message?.includes('TIMEOUT') ||
        error.name === 'AbortError') {
        return { type: 'timeout', retryable: true };
    }

    // Authentication errors (not retryable without fixing credentials)
    if (error.message?.includes('auth') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('401') ||
        error.status === 401) {
        return { type: 'authentication', retryable: false };
    }

    // Permission errors (not retryable)
    if (error.message?.includes('permission') ||
        error.message?.includes('forbidden') ||
        error.message?.includes('403') ||
        error.status === 403) {
        return { type: 'permission', retryable: false };
    }

    // Not found errors (not retryable)
    if (error.message?.includes('not found') ||
        error.message?.includes('404') ||
        error.status === 404 ||
        error.code === 'PGRST116') {
        return { type: 'not_found', retryable: false };
    }

    // Server errors (retryable)
    if (error.status >= 500 || error.code?.startsWith('PGRST')) {
        return { type: 'server', retryable: true };
    }

    // Rate limiting (retryable with longer delay)
    if (error.status === 429 || error.message?.includes('rate limit')) {
        return { type: 'rate_limit', retryable: true, backoffMultiplier: 2 };
    }

    return { type: 'unknown', retryable: false };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error, context = '') {
    const classification = classifyError(error);
    const contextStr = context ? ` (${context})` : '';

    switch (classification.type) {
        case 'network':
            return `네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.${contextStr}`;
        case 'timeout':
            return `요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.${contextStr}`;
        case 'authentication':
            return `인증 오류가 발생했습니다. 로그인을 다시 시도해주세요.${contextStr}`;
        case 'permission':
            return `권한이 없습니다. 관리자에게 문의해주세요.${contextStr}`;
        case 'not_found':
            return `요청한 데이터를 찾을 수 없습니다.${contextStr}`;
        case 'server':
            return `서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.${contextStr}`;
        case 'rate_limit':
            return `요청이 너무 많습니다. 잠시 후 다시 시도해주세요.${contextStr}`;
        default:
            return error.message || `알 수 없는 오류가 발생했습니다.${contextStr}`;
    }
}

/**
 * Retry function with exponential backoff
 * Optimized for performance: prevents infinite retries, uses efficient timing
 * 
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {number} options.backoffMultiplier - Backoff multiplier (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @returns {Promise} Result of the function or throws last error
 */
export async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        shouldRetry = (error) => classifyError(error).retryable
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            if (!shouldRetry(error)) {
                throw error;
            }

            // Don't retry on last attempt
            if (attempt >= maxRetries) {
                break;
            }

            // Calculate delay with exponential backoff
            const classification = classifyError(error);
            const multiplier = classification.backoffMultiplier || backoffMultiplier;
            delay = Math.min(delay * multiplier, maxDelay);

            // Wait before retry (non-blocking, doesn't affect other operations)
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Safe async operation wrapper
 * Catches errors and returns them in a consistent format
 * 
 * @param {Function} fn - Async function to execute
 * @param {string} context - Context for error messages
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function safeAsync(fn, context = '') {
    try {
        const data = await fn();
        return { success: true, data };
    } catch (error) {
        const message = getUserFriendlyMessage(error, context);
        console.error(`Error in ${context}:`, error);
        return { success: false, error: message, originalError: error };
    }
}

/**
 * Safe async operation with retry
 * Combines safeAsync and retryWithBackoff
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Options for retry and context
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function safeAsyncWithRetry(fn, options = {}) {
    const { context = '', retryOptions = {} } = options;
    
    try {
        const data = await retryWithBackoff(fn, retryOptions);
        return { success: true, data };
    } catch (error) {
        const message = getUserFriendlyMessage(error, context);
        console.error(`Error in ${context} after retries:`, error);
        return { success: false, error: message, originalError: error };
    }
}
