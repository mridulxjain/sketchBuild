import { useState } from 'react';
import { extractJSX } from '../utils/codeExtract';

let isRequestInProgress = false;
let rateLimitCooldownUntil = 0;
let releaseLockTimer = null;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

async function safeApiCall(fn, onRetry, retries = 2) {
  try {
    return await fn();
  } catch (error) {
    if (error?.status === 429 && retries > 0) {
      onRetry?.();
      console.log('Retrying due to 429');
      await wait(2000);
      return safeApiCall(fn, onRetry, retries - 1);
    }
    throw error;
  }
}

export function useVisionAPI() {
  const [error, setError] = useState(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const scheduleLockRelease = (ms = 3000) => {
    const nextCooldown = Date.now() + ms;
    rateLimitCooldownUntil = nextCooldown;
    setIsRateLimited(true);
    if (releaseLockTimer) clearTimeout(releaseLockTimer);
    releaseLockTimer = setTimeout(() => {
      isRequestInProgress = false;
      rateLimitCooldownUntil = 0;
      setIsRateLimited(false);
    }, ms);
  };

  const getApiDetails = () => {
    const apiUrl = (import.meta.env.VITE_API_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
    const model = import.meta.env.VITE_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) throw new Error('API key missing. Add VITE_API_KEY to your .env file.');
    return { apiUrl, model, apiKey };
  };

  const rawApiCall = async (messages, maxTokens = 4096) => {
    const { apiUrl, model, apiKey } = getApiDetails();
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      if (response.status === 429) throw createError('Rate limited. Please wait and retry.', 429);
      throw createError(`API error ${response.status}: ${errorBody.slice(0, 100)}`, response.status);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from API.');
    return content;
  };

  const runApiCall = async (messages, maxTokens = 4096) => {
    if (Date.now() < rateLimitCooldownUntil) {
      setIsRateLimited(true);
      throw createError('Please wait a few seconds and try again.', 429);
    }
    if (isRequestInProgress) {
      throw createError('A request is already in progress. Please wait.', 409);
    }

    isRequestInProgress = true;
    console.log('API call started');

    try {
      const content = await safeApiCall(
        () => rawApiCall(messages, maxTokens),
        () => setError('⚠️ Rate limit reached. Retrying...'),
        2
      );
      return content;
    } catch (apiError) {
      if (apiError?.status === 429) {
        setError('Please wait a few seconds and try again.');
        scheduleLockRelease(3000);
      }
      throw apiError;
    } finally {
      if (Date.now() >= rateLimitCooldownUntil) {
        isRequestInProgress = false;
      }
      console.log('API call completed');
    }
  };

  const toDataUrl = (value, mimeType = 'image/png') => {
    if (!value) return '';
    return value.startsWith('data:') ? value : `data:${mimeType};base64,${value}`;
  };

  const generateFast = async (base64Image, textPrompt) => {
    setError(null);
    const prompt = `You are a React UI generator. Generate a precise React component that mirrors this UI exactly.
${textPrompt ? `Instructions: ${textPrompt}\n` : ''}
STRICT RULES:
* Use Tailwind CSS for all styling.
* You MUST wrap your output in a single React component function.
* Function name MUST be exactly: GeneratedComponent
* Infer structure ONLY from the provided image.
* Never use generic starter templates unless they are clearly present in the image.
* Return ONLY the raw code inside a \`\`\`jsx block. No exports. No imports. No explanations.`;

    const messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: toDataUrl(base64Image, 'image/png') } },
        { type: 'text', text: prompt }
      ]
    }];
    
    try {
      const raw = await runApiCall(messages, 3000);
      const jsx = extractJSX(raw);
      if (!jsx) throw new Error('Failed to generate JSX');
      return jsx;
    } catch (e) {
      console.warn('generateFast failed', e);
      if (e?.status === 429) {
        setError('Please wait a few seconds and try again.');
      } else if (e?.status === 409) {
        setError('Another request is already running. Please wait for it to finish.');
      } else {
        setError('Generation failed. Please retry with a clearer sketch/image or check API settings.');
      }
      return '';
    }
  };

  return { generateFast, error, setError, isRateLimited };
}
