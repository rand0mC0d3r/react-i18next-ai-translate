import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { extractFeatures } from './feature-extractor.js';
import { validateTranslation } from './feature-validator.js';
import { createInterface } from './translate.ui.js';
import { doReviewRemainingTranslation, doReviewTranslation, doTranslate, traverseAndCollapseEntropy } from './translate_utils.js';
import { mocks } from './utils.js';

// --- config loading ---
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const cfg = pkg['i18next-ai-translate'];

let engineUsedIndex = 0;
let candidates = 3;
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
  candidates: 0,
  rootFile,
  callsLogs: {

  },
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


const STEP_loadAndValidateSource = async () => {
  try {
    const source = readJSON(interfaceMap.rootFile);
    const sourceFeatures = extractFeatures(source);

    interfaceMap = {
      ...interfaceMap,
      originalInput: JSON.stringify(source, null, 2), //deprecate
      source,
      sourceFeatures
    };

    const sourceErrors = validateTranslation(sourceFeatures, source);

    if (sourceErrors.length > 0) {
      console.error('❌ Source validation errors found:', sourceErrors);
      process.exit(1);
    }

    return { source, sourceFeatures };
  } catch (e) {
    console.error('❌ Error loading or validating source file:', e.message);
    process.exit(1);
  }
}

const doTranslateWithRetries = async (source, language, sourceFeatures, retries = 3, index = 0) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const emitTranslationLog = (model, index, status, duration) => {
        interfaceMap = {
          ...interfaceMap,
          callsLogs: {
            ...interfaceMap.callsLogs,
            [index]: [
              ...(interfaceMap.callsLogs[index] || []),
              {
                reason: 'translation',
                model,
                status,
                duration,
              }
            ]
          }
        }
      }


      const result = await doTranslate(source, language, index, emitTranslationLog);
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

const STEP_performTranslation = async () => {
  let combinedTranslations = [
    {
      "about.buildnumber": "Numéro de build :",
      "about.cloudEdition": "Cloud",
      "about.copyright": "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      "about.database": "Base de données :",
      "about.date": "Date de build :",
      "about.dbversion": "Version du schéma de base de données :",
      "about.enterpriseEditionLearn": "En savoir plus sur Mattermost {planName} à ",
      "about.enterpriseEditionSst": "Messagerie de haute confiance pour l'entreprise",
      "about.enterpriseEditionSt": "Communication moderne derrière votre pare-feu.",
      "about.hash": "Hash de build :",
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
      "about.hash": "Hash de création :",
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

  if (!mocks) {
    combinedTranslations = await Promise.all(
      Array.from({ length: interfaceMap.candidates }).map((_, index) => doTranslateWithRetries(interfaceMap.source, interfaceMap.activeLanguage, interfaceMap.sourceFeatures, 3, index))
    );
  }

  const traverseResults = traverseAndCollapseEntropy(interfaceMap.source, combinedTranslations);

  interfaceMap = {
    ...interfaceMap,
    mismatches: traverseResults.mismatches,
    out: JSON.stringify(traverseResults.out, null, 2)
  };

  return traverseResults;
}

const STEP_performPeerCritique = async () => {
  let combinedPeerReviews = [
    [
      {
        key: "about.buildnumber",
        opinion: "Both translations are correct, but 'Numéro de build :' is more commonly used in software contexts.",
        result: "Numéro de build :",
      },
      {
        key: "about.copyright",
        opinion: "All translations are correct. The second translation 'Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés' uses a more standard phrasing in French.",
        result: "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      },
      {
        key: "about.date",
        opinion: "'Date de build :' is a more direct and appropriate translation for the context of software builds.",
        result: "Date de build :",
      },
      {
        key: "about.dbversion",
        opinion: "Both translations are correct, but 'Version du schéma de base de données :' is slightly more fluent and clear.",
        result: "Version du schéma de base de données :",
      },
      {
        key: "about.enterpriseEditionSst",
        opinion: "Both translations are acceptable, but 'Messagerie de haute confiance pour l'entreprise' sounds more natural and professional in French.",
        result: "Messagerie de haute confiance pour l'entreprise",
      },
      {
        key: "about.hash",
        opinion: "'Hash de build :' is more specific and appropriate for the context of software development.",
        result: "Hash de build :",
      },
    ],
    [
      {
        key: "about.buildnumber",
        source: "Build Number:",
        translations: [
          "Numéro de build :",
          "Numéro de version :",
        ],
        opinion: "Both translations are understandable, but 'Numéro de build :' is more literal and closer to the original technical term. 'Numéro de version :' could be misleading as it refers more to version number than build number. Therefore, the first translation is better.",
        result: "Numéro de build :",
      },
      {
        key: "about.copyright",
        source: "Copyright 2015 - {currentYear} Mattermost, Inc. All rights reserved",
        translations: [
          "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
          "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
          "Copyright 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
        ],
        opinion: "The correct French term is 'Droits d'auteur' (plural). The first translation uses the singular 'Droit d'auteur' which is less common. The third translation keeps 'Copyright' in English, which is less localized. Therefore, the second translation is the best choice.",
        result: "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      },
      {
        key: "about.date",
        source: "Build Date:",
        translations: [
          "Date de build :",
          "Date de création :",
        ],
        opinion: "'Date de build :' is a direct translation but uses the English word 'build' which might be acceptable in technical contexts. 'Date de création :' is more natural French but less precise technically. Given the context, 'Date de build :' is preferable to keep technical accuracy.",
        result: "Date de build :",
      },
      {
        key: "about.dbversion",
        source: "Database Schema Version:",
        translations: [
          "Version du schéma de base de données :",
          "Version du schéma de la base de données :",
        ],
        opinion: "Both translations are correct and natural. The second one is slightly more formal and clearer by including 'de la base de données'. It is preferable for clarity.",
        result: "Version du schéma de la base de données :",
      },
      {
        key: "about.enterpriseEditionSst",
        source: "High trust messaging for the enterprise",
        translations: [
          "Messagerie de haute confiance pour l'entreprise",
          "Messagerie de confiance élevée pour l'entreprise",
        ],
        opinion: "Both translations convey the meaning, but 'Messagerie de haute confiance' sounds more natural and idiomatic in French than 'confiance élevée'. Therefore, the first translation is better.",
        result: "Messagerie de haute confiance pour l'entreprise",
      },
      {
        key: "about.hash",
        source: "Build Hash:",
        translations: [
          "Hash de build :",
          "Hash de création :",
        ],
        opinion: "'Hash de build :' is a more direct and accurate translation of 'Build Hash'. 'Hash de création :' is less precise and could be ambiguous. The first translation is preferable.",
        result: "Hash de build :",
      },
    ],
    [
      {
        key: "about.buildnumber",
        source: "Build Number:",
        translations: [
          "Numéro de build :",
          "Numéro de version :",
        ],
        opinion: "Both translations are correct, but 'Numéro de build :' is more accurate as it directly translates to 'Build Number'.",
        result: "Numéro de build :",
      },
      {
        key: "about.copyright",
        source: "Copyright 2015 - {currentYear} Mattermost, Inc. All rights reserved",
        translations: [
          "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
          "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
          "Copyright 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
        ],
        opinion: "All translations are correct, but 'Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés' is more commonly used in French.",
        result: "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      },
      {
        key: "about.date",
        source: "Build Date:",
        translations: [
          "Date de build :",
          "Date de création :",
        ],
        opinion: "Both translations are correct, but 'Date de build :' is more accurate as it directly translates to 'Build Date'.",
        result: "Date de build :",
      },
      {
        key: "about.dbversion",
        source: "Database Schema Version:",
        translations: [
          "Version du schéma de base de données :",
          "Version du schéma de la base de données :",
        ],
        opinion: "Both translations are correct and mean the same thing.",
        result: "Version du schéma de base de données :",
      },
      {
        key: "about.enterpriseEditionSst",
        source: "High trust messaging for the enterprise",
        translations: [
          "Messagerie de haute confiance pour l'entreprise",
          "Messagerie de confiance élevée pour l'entreprise",
        ],
        opinion: "Both translations are correct, but 'Messagerie de haute confiance pour l'entreprise' is more commonly used in French.",
        result: "Messagerie de haute confiance pour l'entreprise",
      },
      {
        key: "about.hash",
        source: "Build Hash:",
        translations: [
          "Hash de build :",
          "Hash de création :",
        ],
        opinion: "Both translations are correct, but 'Hash de build :' is more accurate as it directly translates to 'Build Hash'.",
        result: "Hash de build :",
      },
    ],
  ]

  if (!mocks) {
    combinedPeerReviews = await Promise.all(
      Array.from({ length: interfaceMap.candidates }).map(() => doPeerReviewWithRetries(interfaceMap.mismatches, interfaceMap.activeLanguage))
    );
  }

  const updatedMismatches = interfaceMap.mismatches.map((item, idx) => ({
      ...item,
      translations: [...new Set(combinedPeerReviews.map(review => review[idx].result))],
      opinions: combinedPeerReviews.map(review => review[idx].opinion),
      result: [...new Set(combinedPeerReviews.map(review => review[idx].result))].length === 1 ? combinedPeerReviews[0][idx].result : '<<EntropyDetected>>',
  }));

  const fixedTranslations = { ...JSON.parse(interfaceMap.out) };
  for (const task of updatedMismatches.filter(r => r.hasEntropy !== '<<EntropyDetected>>')) {
    fixedTranslations[task.key] = task.result;
  }

  interfaceMap = {
    ...interfaceMap,
    mismatches: updatedMismatches.filter(r => r.result === '<<EntropyDetected>>'),
    out: JSON.stringify(fixedTranslations, null, 2)
  };
}

const STEP_performPeerRemainingCritique = async (mismatches, language, counts) => {
  console.log('PERFORM REVIEW');
 const combinedPeerReviews = await Promise.all(
   Array.from({ length: counts }).map(() => doPeerReviewRemainingWithRetries(mismatches, language))
  );

  console.log('\n✅ Peer critiques done.', combinedPeerReviews);
  return combinedPeerReviews
}

async function entropyEliminator(language, candidates) {
  await STEP_loadAndValidateSource();
  await STEP_performTranslation();
  await STEP_performPeerCritique();

  // const updatedMismatches = mismatches.map((item, idx) => ({
  //   ...item,
  //   translations: [...new Set(combinedPeerReviews.map(review => review[idx].result))],
  //   opinions: combinedPeerReviews.map(review => review[idx].opinion),
  //   result: [...new Set(combinedPeerReviews.map(review => review[idx].result))].length === 1 ? combinedPeerReviews[0][idx].result : '<<EntropyDetected>>',
  // }));

  // interfaceMap = { ...interfaceMap, mismatches: updatedMismatches.filter(r => r.result === '<<EntropyDetected>>') };


  // const fixedTranslations = { ...translated };
  // for (const task of updatedMismatches.filter(r => r.hasEntropy !== '<<EntropyDetected>>')) {
  //   fixedTranslations[task.key] = task.result;
  // }
  // interfaceMap = { ...interfaceMap, out: JSON.stringify(fixedTranslations, null, 2) };

  return

  if(remainingTasks.length > 0) {
    console.log('\n🔄 Remaining tasks to resolve entropy:', remainingTasks.length, remainingTasks);

    const finalResults = await STEP_performPeerRemainingCritique(remainingTasks, language, counts);
    console.log('\n✅ Final peer critiques done.', finalResults);

  }

  console.log('\n✅ Fixed translations before peer review:', translated);
  console.log('\n✅ Fixed translations after peer review:', fixedTranslations);

  console.log('✅ Combined peer review results:', combinedResults, remainingTasks.length, remainingTasks);


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

(async () => {
  interfaceMap = { ...interfaceMap, languages: targetLanguages, candidates };

  for (const lang of targetLanguages) {
    interfaceMap = { ...interfaceMap, activeLanguage: lang };
    await entropyEliminator(lang, candidates);
  }
})();

(async () => {
  setInterval(() => { createInterface(interfaceMap) }, 1000);
  createInterface(interfaceMap);
})();
