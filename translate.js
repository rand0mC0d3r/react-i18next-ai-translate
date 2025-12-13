import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';

// --- config loading ---
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const cfg = pkg['i18next-ai-translate'];


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

async function translate(sourceJson, language) {
  const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];
  const model = models[Math.floor(Math.random() * models.length)];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      temperature: 0,
      messages: [
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
          content: JSON.stringify(sourceJson)
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

async function entropyEliminator(source, language) {
  const version1 = await translate(source, language);
  console.log('Getting first', version1);
  const version2 = await translate(source, language);
  console.log('Getting second', version2);

  const cleaned = {};

  // traverse both versions and pick matching entries
  function traverse(src, v1, v2, out) {
    for (const key of Object.keys(src)) {
      if (typeof src[key] === 'object' && src[key] !== null) {
        out[key] = {};
        traverse(src[key], v1[key], v2[key], out[key]);
      } else {
        if (v1[key] === v2[key]) {
          out[key] = v1[key];
        } else {
          console.warn(`⚠️  Mismatch at key: ${key}. Skipping entry.`);
        }
      }
    }
  }

  traverse(source, version1, version2, cleaned);

  console.log('🧼 Cleaned translations with entropy eliminator', cleaned);
  return cleaned;
}

// ---- run ---------------------------------------------------

(async () => {
  console.log('🌍 Translating EN → FR');

  console.log(targetLanguages);

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
