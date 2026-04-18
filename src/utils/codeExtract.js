/**
 * Extract JSX/JavaScript code from an AI response string.
 * Strips markdown fences and performs basic sanitization.
 */
export const extractJSX = (responseString) => {
  if (!responseString) return '';

  let code = '';
  
  // 1. Try to extract from triple backtick fences (jsx, javascript, or generic)
  const fencedRegex = /```(?:jsx|javascript|js|react|tsx)?\s*([\s\S]*?)(?:```|$)/i;
  const match = responseString.match(fencedRegex);
  
  if (match && match[1]) {
    code = match[1].trim();
  } else {
    // 2. If no fences, check if the string contains a component-like structure
    if (responseString.includes('function') || responseString.includes('const') || responseString.includes('return')) {
      code = responseString.trim();
    }
  }

  if (!code) return '';

  return sanitizeRawCode(code);
};

/**
 * Basic sanitization to remove common AI artifacts.
 * The heavy sanitization (naming, exports) happens in PreviewPanel.
 */
const sanitizeRawCode = (code) => {
  return code
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/^```$/gm, '')
    .trim();
};
