import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { extractFeatures } from '../feature-extractor.js';
import { validateTranslation } from '../feature-validator.js';
import { appendErrorLog, appendSuccessLog, appendWarningLog } from '../translate.js';

const ROOT = process.cwd();

const readJSON = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf-8'));

export const STEP_loadAndValidateSource = async (interfaceMap) => {
  try {
    const source = readJSON(interfaceMap.rootFile);
    const sourceFeatures = extractFeatures(source);
    appendSuccessLog(`Source file loaded: ${interfaceMap.rootFile}`);

    const targetFile = path.join(ROOT, `public/locales/${interfaceMap.activeLanguage}/translation.json`);
    if(!fs.existsSync(targetFile)) {
      appendWarningLog(`No reference file found for language ${interfaceMap.activeLanguage} at ${targetFile}`);
    } else {
      appendSuccessLog(`Reference file found for language ${interfaceMap.activeLanguage}`);
    }

    interfaceMap = {
      ...interfaceMap,
      originalInput: JSON.stringify(source, null, 2), //deprecate
      source,
      reference: fs.existsSync(targetFile) ? JSON.stringify(readJSON(targetFile), null, 2) : '...no reference file found',
      sourceFeatures
    };

    const sourceErrors = validateTranslation(sourceFeatures, source);

    if (sourceErrors.length > 0) {
      appendErrorLog(`Source validation errors found: ${sourceErrors}`);
      process.exit(1);
    }


    return { source, sourceFeatures };
  } catch (e) {
    appendErrorLog(`❌ Error loading or validating source file: ${e.message}`);
    process.exit(1);
  }
}
