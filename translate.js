import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';

// --- config loading ---
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const cfg = pkg['i18next-ai-translate'];

let engineUsedIndex = 0;
const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];

if (!cfg) {
throw new Error('Missing i18next-ai-translate config in package.json');
}


const {
rootFile,
targetLanguages,
targetFolder,
options = {},
} = cfg;

// ---- sanity ------------------------------------------------

const apiKey = process.env.OPEN_AI_KEY;

if (!apiKey) {
  console.error('❌ OPEN_AI_KEY missing in .env');
  process.exit(1);
}

// ---- paths -------------------------------------------------

const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT, 'public/locales/translation.json');
const TARGET_FILE = path.join(ROOT, 'public/locales/fr/translation.json');

// ---- helpers -----------------------------------------------

const readJSON = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf-8'));

const writeJSON = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// ---- OpenAI call -------------------------------------------

async function translate(language, messages) {
  const model = models[engineUsedIndex];

  engineUsedIndex >= models.length - 1 ? engineUsedIndex = 0 : engineUsedIndex++;
  console.log('Translating with model:', model, 'to', language);

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

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

async function doTranslate(source, language) {
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

async function doReviewTranslation(source, language) {
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

function traverseAndCompare(src, translated, reviewed, out) {
  for (const key of Object.keys(src)) {
    if (typeof src[key] === 'object' && src[key] !== null) {
      out[key] = {};
      traverseAndCompare(src[key], translated[key], reviewed[key], out[key]);
    } else {
      if (translated[key] === reviewed[key]) {
        out[key] = translated[key];
      } else {
        console.log(`Mismatch at key: ${key} | Source: ${src[key]} | ${translated[key]} vs ${reviewed[key]}`);
        out[key] = { yourAnswer: translated[key], otherAnswer: reviewed[key] }; // or handle mismatch as needed
      }
    }
  }
}

async function entropyEliminator(source, language) {
  const version1 = await doTranslate(source, language);
  const version2 = await doTranslate(source, language);

  const cleaned = {};
  traverseAndCompare(source, version1, version2, cleaned);

  console.log('🧼 Cleaned translations with entropy eliminator', JSON.stringify(cleaned, null, 2));

  const versionCleaned1 = await doReviewTranslation(cleaned, language);
  const versionCleaned2 = await doReviewTranslation(cleaned, language);

  const cleaned2 = {};
  traverseAndCompare(source, versionCleaned1, versionCleaned2, cleaned2);

  console.log('🧼 Cleaned translations with entropy eliminator second pass', JSON.stringify(cleaned2, null, 2));
  // return cleaned;
}

// ---- run ---------------------------------------------------

(async () => {
  console.log('🌍 Translating EN → FR');

  // console.log(targetLanguages);

  const source = readJSON(SOURCE_FILE);

  entropyEliminator(source, 'fr');

  return;

  for (const lang of targetLanguages) {
    console.log(`➡️  Language: ${lang}`);
    const translated = await translate(source, lang);
    const targetFile = path.join(ROOT, `public/locales/${lang}/translation.json`);

    if (!fs.existsSync(targetFile)) {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, '{}');
    }

    writeJSON(targetFile, translated);
    console.log('✅ Done:', targetFile);
  }
})();
