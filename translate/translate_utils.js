import 'dotenv/config';
import fs from 'fs';
import process from 'process';

// --- config loading ---
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const cfg = pkg['i18next-ai-translate'];

let engineUsedIndex = 0;
const models = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4', 'gpt-4.1-mini', 'gpt-4-turbo'];
// const models = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4.1-mini', 'gpt-4-turbo'];

if (!cfg) {
  throw new Error('Missing i18next-ai-translate config in package.json');
}

// ---- sanity ------------------------------------------------

const apiKey = process.env.OPEN_AI_KEY;

if (!apiKey) {
  console.error('❌ OPEN_AI_KEY missing in .env');
  process.exit(1);
}

export async function translate(language, messages, index, callback = () => {}) {
  const t0 = performance.now();
  const modelsToPickFrom = Math.random() < 0.5 ? models : models.reverse();
  const model = modelsToPickFrom[engineUsedIndex];

  engineUsedIndex >= models.length - 1 ? engineUsedIndex = 0 : engineUsedIndex++;
  // infoStep('🤖 Starting translating', model, language);

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
  // infoStep('🤖 Fetch complete', model, `${res.status} ${res.statusText} in ${(t1 - t0).toFixed(2)} ms`);
  callback(model, index, `${res.status} ${res.statusText}`, (t1 - t0).toFixed(2));

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

export async function doTranslate(source, language, index = 0, callback = () => {}) {
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
    return await translate(language, messages, index, callback);
  } catch (err) {
    console.error('Translation error:', err.message);
    throw e;
  }
}

export async function doReviewTranslation(mismatches, language) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a critical localization engine. ' +
        `Iterate over the array and judge how is the translation quality. Each object contains the originalSource of the text, and an array of suggested translations for translating to ${language}. ` +
        `Write at key 'opinion' your thoughts about the translations and which is the best one. ` +
        `Write at key 'result' looking at the translations the answer that you think is the best. ` +
        'No non-whitespace characters outside the JSON structure.' +
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
    throw e;
  }
}

export async function doReviewRemainingTranslation(mismatches, language) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a critical localization engine. ' +
        `Iterate over the array and judge how is the translation quality. Each object contains the originalSource of the text, and an array of suggested translations for translating to ${language} and previous opinions given by yourself and other AI's asked. ` +
        `Write at key 'opinion' your thoughts about the translations and opinions and which is the best one. ` +
        `Write at key 'result' looking at the translations the answer that you think is the best. ` +
        'No non-whitespace characters outside the JSON structure.' +
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
    throw e;
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

export function traverseAndCollapseEntropy(
  src,
  candidates,   // array of translated objects
  out = {},
  mismatches = [],
  path = ''
) {
  for (const key of Object.keys(src)) {
    const fullPath = path ? `${path}.${key}` : key;
    const srcVal = src[key];

    // Structural check
    for (const c of candidates) {
      if (!(key in c)) {
        mismatches.push({
          key: fullPath,
          type: 'StructureMismatch',
          expectedType: typeof srcVal,
          found: 'missing'
        });
        out[key] = '<<EntropyDetected>>';
        continue;
      }
    }

    if (typeof srcVal === 'object' && srcVal !== null) {
      out[key] = {};
      traverseAndCollapseEntropy(
        srcVal,
        candidates.map(c => c[key]),
        out[key],
        mismatches,
        fullPath
      );
      continue;
    }

    // Leaf node → compare values
    const values = candidates.map(c => c[key]);
    const uniqueValues = [...new Set(values)];

    if (uniqueValues.length === 1) {
      out[key] = uniqueValues[0];
    } else {
      out[key] = '<<EntropyDetected>>';
      mismatches.push({
        key: fullPath,
        source: srcVal,
        translations: uniqueValues,
        opinion: 'Your opinion...',
        result: '',
      });
    }
  }

  return { out, mismatches };
}
