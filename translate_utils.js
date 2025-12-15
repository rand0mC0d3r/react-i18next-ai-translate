import 'dotenv/config';
import fs from 'fs';
import process from 'process';

// --- config loading ---
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const cfg = pkg['i18next-ai-translate'];

let engineUsedIndex = 0;
const models = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4', 'gpt-4.1-mini', 'gpt-4-turbo'];

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
  const t0 = performance.now();
  const modelsToPickFrom = Math.random() < 0.5 ? models : models.reverse();
  const model = modelsToPickFrom[engineUsedIndex];

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
  const t1 = performance.now()
  console.log('🤖 Fetch complete:', res.status, res.statusText, model, (t1 - t0).toFixed(2), 'ms');

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();
  const processedJson = json.choices[0].message.content.replace(/\n/g, ' ').replace(/```json+/g, ' ').replace(/```/g, ' ')

  try {
    JSON.parse(processedJson);
  } catch (e) {
    console.error('❌ Failed to parse JSON response from OpenAI:', model, processedJson);
    throw e;
  }

  return JSON.parse(processedJson);
}

export async function doTranslate(source, language) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a localization engine. ' +
        `Translate JSON values from developer English to ${language}. ` +
        'Do not change keys. Preserve nesting, placeholders, interpolations and HTML tags. The template syntax is i18next. ' +
        'Return ONLY valid JSON keeping the previous format unchanged. Do not wrap it in a new object.'
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

export async function doReviewTranslation(language, mismatches, answerOne, answerTwo, targetField) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a critical localization engine. ' +
        `Iterate over the array and judge how is the translation quality. Each object contains the originalSource of the text, your previous answer for translating to ${language}, at key ${answerOne}, and another AI's answer at key: ${answerTwo} for translating to same language ${language}. ` +
        `Write at key ${targetField} looking at both answers which translation you think fits best. No non-whitespace characters outside the JSON structure. ` +
        'Return ONLY valid JSON. Return the object at the same nesting level. Do not wrap it in a new object.'
    },
    {
      role: 'user',
      content: JSON.stringify(mismatches)
    }
  ]

  try {
    return await translate(language, messages);
  } catch (err) {
    console.error('Translation error:', err.message);
  }
}


export async function doFinalTranslation(language, mismatches, answerOne, answerTwo, targetField) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a critical localization engine. ' +
        `Iterate over the array and judge how is the translation quality. Each object contains the originalSource of the text, two previous answers at key answerA and answerB and two critiques at key critique and critiqueAlternative. ` +
        `Write at key result looking at both answers and critiques which translation you think fits best. Write the answer at key result as the content of the string itself. No non-whitespace characters outside the JSON structure. ` +
        'Return ONLY valid JSON. Return the object at the same nesting level. Do not wrap it in a new object.'
    },
    {
      role: 'user',
      content: JSON.stringify(mismatches)
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
