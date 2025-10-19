/**
 * API Client Utility
 * Provides fetch wrapper with retry logic, timeout, and error handling
 */

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  }
}

/**
 * Exponential backoff delay
 */
function getBackoffDelay(attempt, baseDelay = 1000, maxDelay = 10000) {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error, response) {
  // Network errors
  if (error && !response) {
    return true;
  }

  // Server errors (5xx)
  if (response && response.status >= 500) {
    return true;
  }

  // Rate limiting (429)
  if (response && response.status === 429) {
    return true;
  }

  // Timeout errors
  if (error?.message?.includes("timeout")) {
    return true;
  }

  return false;
}

/**
 * Fetch with retry logic
 */
export async function fetchWithRetry(
  url,
  options = {},
  {
    maxRetries = 3,
    timeout = 30000,
    onRetry = null,
    retryableStatuses = [429, 500, 502, 503, 504],
  } = {}
) {
  let lastError;
  let lastResponse;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      // If response is ok or not retryable, return it
      if (response.ok || !retryableStatuses.includes(response.status)) {
        return response;
      }

      // Store response for retry check
      lastResponse = response;
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(lastError, lastResponse)) {
        const delay = getBackoffDelay(attempt);
        
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay, lastError);
        }

        console.warn(
          `Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`,
          url,
          lastError.message
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Max retries reached
      throw lastError;
    } catch (error) {
      lastError = error;
      lastResponse = null;

      // Check if we should retry
      if (attempt < maxRetries && isRetryableError(lastError, lastResponse)) {
        const delay = getBackoffDelay(attempt);

        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay, lastError);
        }

        console.warn(
          `Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`,
          url,
          error.message
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Max retries reached or non-retryable error
      throw error;
    }
  }

  throw lastError;
}

/**
 * Fetch JSON with retry
 */
export async function fetchJSON(url, options = {}, retryOptions = {}) {
  const response = await fetchWithRetry(url, options, retryOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }
}

/**
 * Batch fetch with concurrency limit
 */
export async function batchFetch(
  urls,
  options = {},
  { concurrency = 5, retryOptions = {} } = {}
) {
  const results = [];
  const errors = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const promises = batch.map(async (url, index) => {
      try {
        const response = await fetchWithRetry(url, options, retryOptions);
        return { success: true, url, response, index: i + index };
      } catch (error) {
        return { success: false, url, error, index: i + index };
      }
    });

    const batchResults = await Promise.all(promises);

    batchResults.forEach((result) => {
      if (result.success) {
        results.push(result);
      } else {
        errors.push(result);
      }
    });
  }

  return { results, errors };
}

export default {
  fetch: fetchWithRetry,
  fetchJSON,
  batchFetch,
};

