import { extractFeatures } from './feature-extractor.js';
import { debugStep, infoStep } from './utils.js';

export function validateTranslation(sourceFeatures, translatedJson) {
  infoStep('🔍 Validating payload :', 'validateTranslation');

  const translatedFeatures = extractFeatures(translatedJson);
  const errors = [];

  for (const key of Object.keys(sourceFeatures)) {
    const src = sourceFeatures[key];
    const tgt = translatedFeatures[key];

    if (!tgt) {
      errors.push({ key, error: 'Missing key in translation' });
      continue;
    }

    compareArray(errors, key, 'interpolationsSingle', src, tgt);
    compareArray(errors, key, 'interpolationsDouble', src, tgt);
    compareArray(errors, key, 'nesting', src, tgt);
    compareArray(errors, key, 'htmlTags', src, tgt);

    if (src.hasPlural !== tgt.hasPlural) {
      errors.push({
        key,
        error: 'Plural structure mismatch'
      });
    }
  }

  debugStep('🔍 Validation errors found:', 'validateTranslation', JSON.stringify(errors, null, 2));
  infoStep('🔍 Validation errors found :', 'validateTranslation', `${errors.length} errors`);

  return errors;
}

function compareArray(errors, key, field, src, tgt) {
  if (JSON.stringify(src[field]) !== JSON.stringify(tgt[field])) {
    errors.push({
      key,
      error: `${field} mismatch`,
      expected: src[field],
      got: tgt[field]
    });
  }
}
