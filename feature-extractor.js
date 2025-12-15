import { debugStep } from './utils.js';

export function extractFeatures(obj, path = '', acc = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      acc[fullKey] = extractStringFeatures(value);
    } else if (value && typeof value === 'object') {
      extractFeatures(value, fullKey, acc);
    }
  }

  debugStep('🔍 Features extracted:', 'extractFeatures', JSON.stringify(acc, null, 2));
  // infoStep('🔍 Features extracted:', 'extractFeatures', `${Object.keys(acc).length} keys`);

  return acc;
}

function extractStringFeatures(str) {
  return {
    interpolationsSingle: uniq(
      matchAll(str, /\{([\w.-]+)\}/g)
        .filter(v => !str.includes(`{{${v}}}`)) // prevent double counting
    ),

    interpolationsDouble: uniq(
      matchAll(str, /\{\{\s*([\w.-]+)\s*\}\}/g)
    ),
    nesting: uniq(matchAll(str, /\$t\(\s*([^)]+)\s*\)/g)),
    transTags: uniq(matchAll(str, /<\/?([A-Za-z][\w-]*)>/g)),
    hasPlural: /_one\b|_other\b|_zero\b/.test(str),
    rawLength: str.length
  };
}

function matchAll(str, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(str))) out.push(m[1]);
  return out;
}

function uniq(arr) {
  return [...new Set(arr)].sort();
}
