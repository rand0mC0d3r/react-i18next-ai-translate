import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { extractFeatures } from './feature-extractor.js';
import { validateTranslation } from './feature-validator.js';
import { doFinalTranslation, doReviewTranslation, doTranslate, traverseAndCompareNg } from './translate_utils.js';
import { combinedPeerReviewsData } from './utils.js';

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
  const source = readJSON(file);
  const sourceFeatures = extractFeatures(source);
  const sourceErrors = validateTranslation(sourceFeatures, source);

  if (sourceErrors.length > 0) {
    console.error('❌ Source validation errors found:', sourceErrors);
    process.exit(1);
  }

  return { source, sourceFeatures };
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
 const combinedTranslations = await Promise.all(
    Array.from({ length: counts }).map(() => doTranslateWithRetries(source, language, sourceFeatures))
  );

  return combinedTranslations
}

const STEP_performPeerCritique = async (mismatches, language, counts) => {
 const combinedPeerReviews = await Promise.all(
   Array.from({ length: counts }).map(() => doPeerReviewWithRetries(mismatches, language))
  );

  return combinedPeerReviews
}

async function entropyEliminator(sourceDDD, language, file) {
  const counts = 3
  const { source, sourceFeatures } = STEP_loadAndValidateSource(file);

  // const combinedTranslations = await STEP_performTranslation(source, language, sourceFeatures, counts);
  // console.log('✅ Initial translations done.', combinedTranslations);

  // const { mismatches, out: translated } = traverseAndCollapseEntropy(source, combinedTranslations);
  // console.log('✅ Entropy collapse results:', mismatches.length, translated);

  ///



  // const combinedPeerReviews = await STEP_performPeerCritique(mismatches, language, counts);
  const combinedPeerReviews = combinedPeerReviewsData
  console.log('✅ Peer critiques done.', combinedPeerReviews);

  const combinedResults = combinedPeerReviews[0].map((item, idx) => ({
    ...item,
    result: combinedPeerReviews.map(review => review[idx].result).every(r => r === item.result) ? item.result : '<<EntropyDetected>>',
  }));

  const remainingTasks = combinedResults.filter(r => r.result === '<<EntropyDetected>>');

  console.log('✅ Combined peer review results:', combinedResults, remainingTasks.length, remainingTasks);


  // const { mismatches: mismatches1, out: out1 } = traverseAndCollapseEntropy(mismatches, combinedPeerReviews);

  // const leftoverMismatches = mismatches1.filter(m => m.result !== '<<EntropyDetected>>');
  // if(leftoverMismatches.length > 0) {
  //   console.log('🔍 Remaining mismatches after peer review:', leftoverMismatches.length, leftoverMismatches);

  //     const combinedPeerReviews = await STEP_performPeerCritique(leftoverMismatches, language, counts);
  //     console.log('✅ Peer critiques done. 2', combinedPeerReviews);

  //     const { mismatches: mismatches2, out: out2 } = traverseAndCollapseEntropy(mismatches, combinedPeerReviews);
  //     console.log('✅ Final entropy collapse results after 2nd peer review:', mismatches2.length, out2, mismatches2);

  // } else {
  //   console.log('✅ All mismatches resolved after peer review.');
  // }

  // console.log('✅ Final entropy collapse results:', finalMismatches.length, finalMismatches, finalOut);
  return;

  // const { mismatches: mismatches1 } = traverseAndCompareNg(source, version1, version2, {}, []);
  // const modified1 = mismatches1.map(m => ({
  //   key: m.key,
  //   originalSource: m.source,
  //   answerA: m.translated,
  //   answerB: m.reviewed,
  //   critique: 'Answer which translation is better and why.',
  // }))

  // console.log('🔍 Mismatches found:', mismatches1.length);
  // console.log(modified1);

  // debugger;

  // return

  // Second, review translations in both directions
  const [versionCleaned1, versionCleaned2] = await Promise.all([
    doReviewTranslation(language, modified1, 'answerA', 'answerB', 'critique'),
    doReviewTranslation(language, modified1, 'answerB', 'answerA', 'critique'),
  ]);

  debugger;

  const combinedVersions = versionCleaned1.map((item, idx) => ({
    ...item,
    critiqueAlternative: versionCleaned2[idx].critique
  }));

  console.log('🔍 Mismatches found in second pass:', combinedVersions.length);
  console.log(combinedVersions);

    // Third, do final translation based on combined reviews
  const [versionFinal1, versionFinal2] = await Promise.all([
    doFinalTranslation(language, combinedVersions),
    doFinalTranslation(language, combinedVersions),
  ]);

  debugger;

  const { mismatches: mismatchesF } = traverseAndCompareNg(combinedVersions, versionFinal1, versionFinal2, {}, []);
  console.log('🔍 Mismatches found:', mismatchesF.length);
  console.log(mismatchesF);

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

  // const source = readJSON(SOURCE_FILE);

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
