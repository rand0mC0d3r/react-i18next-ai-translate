import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { doReviewTranslation, doTranslate, traverseAndCompareNg } from './translate_utils.js';

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
const SOURCE_FILE = rootFile

// ---- helpers -----------------------------------------------

const readJSON = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf-8'));

const writeJSON = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// ---- OpenAI call -------------------------------------------


async function entropyEliminator(source, language) {
  const [version1, version2] = await Promise.all([
    doTranslate(source, language),
    doTranslate(source, language),
  ]);

  const { out: out1, mismatches: mismatches1 } = traverseAndCompareNg(source, version1, version2, {}, []);
  const modified1 = mismatches1.map(m => ({ key: m.key, originalSource: m.source, answerA: m.translated, answerB: m.reviewed, aiCommentA: '', aiCommentB: '' }))
  // console.log('🧼 Cleaned translations with entropy eliminator', JSON.stringify(out1, null, 2));

  console.log('🔍 Mismatches found:', mismatches1.length);
  console.log(modified1);

  // return

  const [versionCleaned1, versionCleaned2] = await Promise.all([
    doReviewTranslation(language, modified1, 'answerA', 'answerB', 'aiCommentA'),
    doReviewTranslation(language, modified1, 'answerB', 'answerA', 'aiCommentB'),
  ]);

console.log('-------')
console.log('-------')
console.log('-------')
console.log(versionCleaned1)
console.log('-------')
console.log('-------')
console.log('-------')
console.log(versionCleaned2)
console.log('-------')
console.log('-------')
console.log('-------')

  const { out: out2, mismatches: mismatches2 } = traverseAndCompareNg(modified1, versionCleaned1, versionCleaned2, {}, []);

  console.log('🧼 Cleaned translations with entropy eliminator second pass', JSON.stringify(out2, null, 2));

  console.log('🔍 Mismatches found in second pass:', mismatches2.length);
  console.table(mismatches2);

  // const targetFile = path.join(ROOT, `public/locales/${language}/translation.json`);
  // if (fs.existsSync(targetFile)) {
  //   const referenceFile = readJSON(targetFile);
  //   console.log('📄 Comparing with existing translation file:', targetFile);

  //   const { out: finalOut, mismatches: finalMismatches } = traverseAndCompareNg(source, out1, referenceFile, {}, []);

  //   // console.log('✅ Final cleaned translations', JSON.stringify(finalOut, null, 2));

  //   console.log('🔍 Final mismatches found:', finalMismatches.length);
  //   console.log(finalMismatches.map(m => ({ key: m.key, SOURCE: m.source, TRANSL: m.translated, REVIEW: m.reviewed })));
  // }
  // return cleaned;
}

// ---- run ---------------------------------------------------

(async () => {
  console.clear();
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
