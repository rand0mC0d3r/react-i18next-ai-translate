import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { extractFeatures } from './feature-extractor.js';
import { validateTranslation } from './feature-validator.js';
import { doReviewTranslation, doTranslate, traverseAndCollapseEntropy } from './translate_utils.js';
import { infoStep, separator } from './utils.js';

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


const STEP_loadAndValidateSource = (file) => {
  try {
    const source = readJSON(file);
    console.log('LOADING FILES');
    infoStep('✅ Loaded file', file);

    const sourceFeatures = extractFeatures(source);
    const sourceErrors = validateTranslation(sourceFeatures, source);

    if (sourceErrors.length > 0) {
      console.error('❌ Source validation errors found:', sourceErrors);
      process.exit(1);
    }

    separator();

    return { source, sourceFeatures };
  } catch (e) {
    console.error('❌ Error loading or validating source file:', e.message);
    process.exit(1);
  }
}


const doTranslateWithRetries = async (source, language, sourceFeatures, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await doTranslate(source, language);
      const validateResults = validateTranslation(sourceFeatures, result);

      if (validateResults.length > 0) {
        throw new Error(`Validation failed with ${validateResults.length} errors.`);
      }

      return result
    } catch (error) {
      console.error(`❌ Translation attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        throw new Error('Max translation attempts reached. Aborting.');
      }
      console.log('🔄 Retrying translation...');
    }
  }
}

const doPeerReviewWithRetries = async (mismatches, language, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await doReviewTranslation(mismatches, language);
      return result
    } catch (error) {
      console.error(`❌ Translation attempt ${attempt} failed:`, error.message);
      if (attempt === retries) {
        throw new Error('Max translation attempts reached. Aborting.');
      }
      console.log('🔄 Retrying translation...');
    }
  }
}

const STEP_performTranslation = async (source, language, sourceFeatures, counts) => {
console.log('SPAWNING TRANSLATORS');
 const combinedTranslations = await Promise.all(
    Array.from({ length: counts }).map(() => doTranslateWithRetries(source, language, sourceFeatures))
  );
  console.log('\n✅ Initial translations done.', combinedTranslations);

  const traverseResults = traverseAndCollapseEntropy(source, combinedTranslations);
  console.log('\n✅ Entropy collapse results:', traverseResults);

  separator();

  return traverseResults;
}

const STEP_performPeerCritique = async (mismatches, language, counts) => {
  console.log('PERFORM REVIEW');
 const combinedPeerReviews = await Promise.all(
   Array.from({ length: counts }).map(() => doPeerReviewWithRetries(mismatches, language))
  );

  console.log('\n✅ Peer critiques done.', combinedPeerReviews);
  return combinedPeerReviews
}

async function entropyEliminator(sourceDDD, language, file) {
  const counts = 3
  const { source, sourceFeatures } = STEP_loadAndValidateSource(file);

  const { mismatches, out: translated } = await STEP_performTranslation(source, language, sourceFeatures, counts);

  const combinedPeerReviews = await STEP_performPeerCritique(mismatches, language, counts);

  const combinedResults = combinedPeerReviews[0].map((item, idx) => ({
    ...item,
    result: combinedPeerReviews.map(review => review[idx].result).every(r => r === item.result) ? item.result : '<<EntropyDetected>>',
  }));

  // return

  const remainingTasks = combinedResults.filter(r => r.result === '<<EntropyDetected>>');
  const solvedTasks = combinedResults.filter(r => r.result !== '<<EntropyDetected>>');

  const fixedTranslations = { ...translated };
  for (const task of solvedTasks) {
    fixedTranslations[task.key] = task.result;
  }

  console.log('\n✅ Fixed translations before peer review:', translated);
  console.log('\n✅ Fixed translations after peer review:', fixedTranslations);

  console.log('✅ Combined peer review results:', combinedResults, remainingTasks.length, remainingTasks);



}

// ---- run ---------------------------------------------------

(async () => {
  console.clear();
  infoStep('🌍 Translating EN → FR', 'entropyEliminator');
  separator();

  entropyEliminator('', 'fr', SOURCE_FILE);

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
