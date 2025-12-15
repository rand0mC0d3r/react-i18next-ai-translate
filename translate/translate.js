import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { extractFeatures } from './feature-extractor.js';
import { validateTranslation } from './feature-validator.js';
import { createInterface } from './translate.ui.js';
import { doReviewRemainingTranslation, doReviewTranslation, doTranslate, traverseAndCollapseEntropy } from './translate_utils.js';
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

let interfaceMap = {
  originalInput: '...no data yet',
  mismatches: [],
  logs: [],
  languages: 'fr,dfsd',
  activeLanguage: '',
}

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

const appendLog = (msg) => {
  const timestamp = new Date().toISOString();
  interfaceMap = { ...interfaceMap, logs: [...interfaceMap.logs, `[${timestamp}] ${msg}`] };
}

const readJSON = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf-8'));

const writeJSON = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};


const STEP_loadAndValidateSource = (file) => {
  try {
    const source = readJSON(file);
    interfaceMap = { ...interfaceMap, originalInput: JSON.stringify(source, null, 2) };
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

const doPeerReviewRemainingWithRetries = async (mismatches, language, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await doReviewRemainingTranslation(mismatches, language);
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

  const combinedTranslations = [
  {
    "about.buildnumber": "Numéro de build :",
    "about.cloudEdition": "Cloud",
    "about.copyright": "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
    "about.database": "Base de données :",
    "about.date": "Date du build :",
    "about.dbversion": "Version du schéma de la base de données :",
    "about.enterpriseEditionLearn": "En savoir plus sur Mattermost {planName} à ",
    "about.enterpriseEditionSst": "Messagerie de haute confiance pour l'entreprise",
    "about.enterpriseEditionSt": "Communication moderne depuis votre pare-feu.",
    "about.hash": "Hash du build :",
  },
  {
    "about.buildnumber": "Numéro de version :",
    "about.cloudEdition": "Cloud",
    "about.copyright": "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
    "about.database": "Base de données :",
    "about.date": "Date de création :",
    "about.dbversion": "Version du schéma de la base de données :",
    "about.enterpriseEditionLearn": "En savoir plus sur Mattermost {planName} à ",
    "about.enterpriseEditionSst": "Messagerie de confiance élevée pour l'entreprise",
    "about.enterpriseEditionSt": "Communication moderne derrière votre pare-feu.",
    "about.hash": "Hachage de création :",
  },
  {
    "about.buildnumber": "Numéro de build :",
    "about.cloudEdition": "Cloud",
    "about.copyright": "Copyright 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
    "about.database": "Base de données :",
    "about.date": "Date de build :",
    "about.dbversion": "Version du schéma de base de données :",
    "about.enterpriseEditionLearn": "En savoir plus sur Mattermost {planName} à ",
    "about.enterpriseEditionSst": "Messagerie de haute confiance pour l'entreprise",
    "about.enterpriseEditionSt": "Communication moderne derrière votre pare-feu.",
    "about.hash": "Hash de build :",
  },
]
//  const combinedTranslations = await Promise.all(
//     Array.from({ length: counts }).map(() => doTranslateWithRetries(source, language, sourceFeatures))
//   );
  console.log('\n✅ Initial translations done.', combinedTranslations);

  const traverseResults = traverseAndCollapseEntropy(source, combinedTranslations);
  console.log('\n✅ Entropy collapse results:', traverseResults);
  interfaceMap = { ...interfaceMap, mismatches: traverseResults.mismatches };
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

const STEP_performPeerRemainingCritique = async (mismatches, language, counts) => {
  console.log('PERFORM REVIEW');
 const combinedPeerReviews = await Promise.all(
   Array.from({ length: counts }).map(() => doPeerReviewRemainingWithRetries(mismatches, language))
  );

  console.log('\n✅ Peer critiques done.', combinedPeerReviews);
  return combinedPeerReviews
}

async function entropyEliminator(language, file) {
  const counts = 3
  const { source, sourceFeatures } = STEP_loadAndValidateSource(file);




  const { mismatches, out: translated } = await STEP_performTranslation(source, language, sourceFeatures, counts);

  return
  const combinedPeerReviews = await STEP_performPeerCritique(mismatches, language, counts);

  const combinedResults = combinedPeerReviews[0].map((item, idx) => ({
    ...item,
    translations: [...new Set(combinedPeerReviews.map(review => review[idx].result))],
    opinions: combinedPeerReviews.map(review => review[idx].opinion),
    hasEntropy: [...new Set(combinedPeerReviews.map(review => review[idx].result))].length === 1 ? '' : '<<EntropyDetected>>',
  }));

  const remainingTasks = combinedResults.filter(r => r.hasEntropy === '<<EntropyDetected>>')
    .map(r => ({ ...r, opinion: 'Your opinion...', result: '' }))
    .map(r => {
      delete r.hasEntropy;
      return r;
    })

  const fixedTranslations = { ...translated };
  for (const task of combinedResults.filter(r => r.hasEntropy === '')) {
    fixedTranslations[task.key] = task.result;
  }

  if(remainingTasks.length > 0) {
    console.log('\n🔄 Remaining tasks to resolve entropy:', remainingTasks.length, remainingTasks);

    const finalResults = await STEP_performPeerRemainingCritique(remainingTasks, language, counts);
    console.log('\n✅ Final peer critiques done.', finalResults);

  }

  console.log('\n✅ Fixed translations before peer review:', translated);
  console.log('\n✅ Fixed translations after peer review:', fixedTranslations);

  console.log('✅ Combined peer review results:', combinedResults, remainingTasks.length, remainingTasks);



}

(async () => {
  interfaceMap = { ...interfaceMap, languages: targetLanguages };
  appendLog(`Starting application with target languages: ${targetLanguages.join(', ')}`);

  for (const lang of targetLanguages) {
    interfaceMap = { ...interfaceMap, activeLanguage: lang };
    await entropyEliminator(lang, SOURCE_FILE);
    // console.log(`➡️  Language: ${lang}`);
    // const translated = await translate(source, lang);
    // const targetFile = path.join(ROOT, `public/locales/${lang}/translation.json`);

    // if (!fs.existsSync(targetFile)) {
    //   fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    //   fs.writeFileSync(targetFile, '{}');
    // }

    // writeJSON(targetFile, translated);
    // console.log('✅ Done:', targetFile);
  }
})();

(async () => {
  setInterval(() => { createInterface(interfaceMap) }, 1000);
  createInterface(interfaceMap);
})();
