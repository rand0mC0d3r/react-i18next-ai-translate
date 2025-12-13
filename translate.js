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
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content:
            'You are a localization engine. ' +
            `Translate JSON values from English to ${language}. ` +
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

// ---- run ---------------------------------------------------

(async () => {
  console.log('🌍 Translating EN → FR');

  console.log(targetLanguages);

  const source = readJSON(SOURCE_FILE);

  for (const lang of targetLanguages) {
    console.log(`➡️  Language: ${lang}`);
    const translated = await translate(source, lang);
    const targetFile = path.join(ROOT, `public/locales/${lang}/translation.json`);
    writeJSON(targetFile, translated);
    console.log('✅ Done:', targetFile);
  }
})();
