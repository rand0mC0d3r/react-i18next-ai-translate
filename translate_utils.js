import 'dotenv/config';
import fs from 'fs';
import process from 'process';

// --- config loading ---
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const cfg = pkg['i18next-ai-translate'];

let engineUsedIndex = 0;
const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];

if (!cfg) {
  throw new Error('Missing i18next-ai-translate config in package.json');
}

// ---- sanity ------------------------------------------------

const apiKey = process.env.OPEN_AI_KEY;

if (!apiKey) {
  console.error('❌ OPEN_AI_KEY missing in .env');
  process.exit(1);
}

export async function translate(language, messages) {
  const model = models[engineUsedIndex];

  engineUsedIndex >= models.length - 1 ? engineUsedIndex = 0 : engineUsedIndex++;
  console.log('🤖 Translating with model:', model, 'to', language);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      temperature: 0,
      messages: messages
    })
  });
  console.log('🤖 Fetch complete:', res.status, res.statusText, model);

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

export async function doTranslate(source, language) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a localization engine. ' +
        `Translate JSON values from developer English to ${language}. ` +
        'Do not change keys. Preserve nesting and placeholders like {{count}}. ' +
        'Return ONLY valid JSON.'
    },
    {
      role: 'user',
      content: JSON.stringify(source)
    }
  ]

  try {
    return await translate(language, messages);
  } catch (err) {
    console.error('Translation error:', err.message);
  }
}

export async function doReviewTranslation(source, language) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a critical localization engine. ' +
        `Look at the JSON values where there's an object with yourAnswer and otherAnswer. ` +
        `For each such object, pick the best translation between yourAnswer and otherAnswer for ${language}. ` +
        'Write the final JSON with the same structure, replacing those objects with the chosen translation. ' +
        'Do not change keys. Preserve nesting and placeholders like {{count}}. ' +
        'Return ONLY valid JSON.'
    },
    {
      role: 'user',
      content: JSON.stringify(source)
    }
  ]

  try {
    return await translate(language, messages);
  } catch (err) {
    console.error('Translation error:', err.message);
  }
}

export function traverseAndCompare(src, translated, reviewed, out) {
  for (const key of Object.keys(src)) {
    if (typeof src[key] === 'object' && src[key] !== null) {
      out[key] = {};
      traverseAndCompare(src[key], translated[key], reviewed[key], out[key]);
    } else {
      if (translated[key] === reviewed[key]) {
        out[key] = translated[key];
      } else {
        console.warn(`🔑 Mismatch at key: ${key} | Source: ${src[key]} | ${translated[key]} vs ${reviewed[key]}`);
        out[key] = { yourAnswer: translated[key], otherAnswer: reviewed[key] }; // or handle mismatch as needed
      }
    }
  }
}

export function traverseAndCompareNg(src, translated, reviewed, out, mismatches = []) {
  for (const key of Object.keys(src)) {
    if (typeof src[key] === 'object' && src[key] !== null) {
      out[key] = {};
      traverseAndCompareNg(src[key], translated[key], reviewed[key], out[key], mismatches);
    } else {
      if (translated[key] === reviewed[key]) {
        out[key] = translated[key];
      } else {
        mismatches.push({ key, source: src[key], translated: translated[key], reviewed: reviewed[key] });
        // console.warn(`🔑 Mismatch at key: ${key} | Source: ${src[key]} | ${translated[key]} vs ${reviewed[key]}`);
        out[key] = { yourAnswer: translated[key], otherAnswer: reviewed[key] }; // or handle mismatch as needed
      }
    }
  }

  return { out, mismatches };
}
