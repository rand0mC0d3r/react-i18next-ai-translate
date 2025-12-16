export const debugMode = false;
export const mocks = true;

export const debugStep = (message, action = "", detail = "") => {
  if (debugMode) {
    console.log(
      '%c%s %c%s %c%s %c%s',
      `color: yellow; font-weight:700`,
      `[${new Date().toLocaleTimeString()}]`,
      'color: #DAA520; font-weight:700',
      `[${action || 'debug'}]`,
      'color: #FF4288; font-weight:700',
      message,
      'color: inherit',
      detail,
    )
  }
}

export const infoStep = (message, action = "", detail = "") => {
    console.log(
      '%c%s %c%s %c%s %c%s',
      `color: yellow; font-weight:700`,
      `[${new Date().toLocaleTimeString()}]`,
      'color: #DAA520; font-weight:700',
      `[${action || 'debug'}]`,
      'color: #FF4288; font-weight:700',
      message,
      'color: inherit',
      detail,
    )
}

export const separator = () => {
  console.log('\n--------------------------------------------------\n\n');
}


export const combinedPeerReviewsData = [
  [
    {
      key: "about.buildnumber",
      source: "Build Number:",
      translations: [
        "Numéro de build :",
        "Numéro de version :",
        "Numéro de Build :",
      ],
      opinion: "All translations are correct, but 'Numéro de build :' is the most accurate as it directly translates the source.",
      result: "Numéro de build :",
    },
    {
      key: "about.copyright",
      source: "Copyright 2015 - {currentYear} Mattermost, Inc. All rights reserved",
      translations: [
        "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
        "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      ],
      opinion: "Both translations are correct, but 'Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés' is more commonly used in French.",
      result: "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
    },
    {
      key: "about.date",
      source: "Build Date:",
      translations: [
        "Date du build :",
        "Date de création :",
        "Date de Build :",
      ],
      opinion: "All translations are correct, but 'Date du build :' is the most accurate as it directly translates the source.",
      result: "Date du build :",
    },
    {
      key: "about.enterpriseEditionSst",
      source: "High trust messaging for the enterprise",
      translations: [
        "Messagerie de haute confiance pour l'entreprise",
        "Messagerie de confiance élevée pour l'entreprise",
      ],
      opinion: "Both translations are correct, but 'Messagerie de haute confiance pour l'entreprise' is more fluent and natural.",
      result: "Messagerie de haute confiance pour l'entreprise",
    },
    {
      key: "about.enterpriseEditionSt",
      source: "Modern communication from behind your firewall.",
      translations: [
        "Communication moderne depuis derrière votre pare-feu.",
        "Communication moderne derrière votre pare-feu.",
      ],
      opinion: "Both translations are correct, but 'Communication moderne depuis derrière votre pare-feu.' is more accurate as it directly translates the source.",
      result: "Communication moderne depuis derrière votre pare-feu.",
    },
    {
      key: "about.hash",
      source: "Build Hash:",
      translations: [
        "Hash du build :",
        "Hash de création :",
        "Hash de Build :",
      ],
      opinion: "All translations are correct, but 'Hash du build :' is the most accurate as it directly translates the source.",
      result: "Hash du build :",
    },
  ],
  [
    {
      key: "about.buildnumber",
      source: "Build Number:",
      translations: [
        "Numéro de build :",
        "Numéro de version :",
        "Numéro de Build :",
      ],
      opinion: "The first translation 'Numéro de build :' is the most accurate and commonly used in software contexts. The second option is less specific, and the third is inconsistent with capitalization. Therefore, the first option is the best.",
      result: "Numéro de build :",
    },
    {
      key: "about.copyright",
      source: "Copyright 2015 - {currentYear} Mattermost, Inc. All rights reserved",
      translations: [
        "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
        "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      ],
      opinion: "Both translations are correct, but 'Droit d'auteur' is more commonly used in legal contexts in France. The second option is also acceptable but less common. The first option is preferred.",
      result: "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
    },
    {
      key: "about.date",
      source: "Build Date:",
      translations: [
        "Date du build :",
        "Date de création :",
        "Date de Build :",
      ],
      opinion: "The first translation 'Date du build :' is the most appropriate as it directly translates the term used in software development. The second option is too generic, and the third is inconsistent with capitalization. The first option is the best.",
      result: "Date du build :",
    },
    {
      key: "about.enterpriseEditionSst",
      source: "High trust messaging for the enterprise",
      translations: [
        "Messagerie de haute confiance pour l'entreprise",
        "Messagerie de confiance élevée pour l'entreprise",
      ],
      opinion: "The first translation 'Messagerie de haute confiance pour l'entreprise' is clearer and more natural in French. The second option is less common and sounds awkward. Therefore, the first option is the best.",
      result: "Messagerie de haute confiance pour l'entreprise",
    },
    {
      key: "about.enterpriseEditionSt",
      source: "Modern communication from behind your firewall.",
      translations: [
        "Communication moderne depuis derrière votre pare-feu.",
        "Communication moderne derrière votre pare-feu.",
      ],
      opinion: "Both translations are acceptable, but the first one 'Communication moderne depuis derrière votre pare-feu.' is slightly clearer in conveying the meaning. The second option is also correct but less formal. The first option is preferred.",
      result: "Communication moderne depuis derrière votre pare-feu.",
    },
    {
      key: "about.hash",
      source: "Build Hash:",
      translations: [
        "Hash du build :",
        "Hash de création :",
        "Hash de Build :",
      ],
      opinion: "The first translation 'Hash du build :' is the most accurate and commonly used in software contexts. The second option is less specific, and the third is inconsistent with capitalization. Therefore, the first option is the best.",
      result: "Hash du build :",
    },
  ],
  [
    {
      key: "about.buildnumber",
      source: "Build Number:",
      translations: [
        "Numéro de build :",
        "Numéro de version :",
        "Numéro de Build :",
      ],
      opinion: "The first translation, 'Numéro de build :', is the most accurate and commonly used term in French for 'Build Number'. The second option, 'Numéro de version :', could be misleading as it refers more to a version number rather than a build number. The third option, 'Numéro de Build :', is less preferred due to the unnecessary capitalization of 'Build'.",
      result: "Numéro de build :",
    },
    {
      key: "about.copyright",
      source: "Copyright 2015 - {currentYear} Mattermost, Inc. All rights reserved",
      translations: [
        "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
        "Droits d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
      ],
      opinion: "Both translations are acceptable, but 'Droit d'auteur' is more commonly used in legal contexts in France. The second option, 'Droits d'auteur', is technically correct but less common in this context. Therefore, the first translation is preferred.",
      result: "Droit d'auteur 2015 - {currentYear} Mattermost, Inc. Tous droits réservés",
    },
    {
      key: "about.date",
      source: "Build Date:",
      translations: [
        "Date du build :",
        "Date de création :",
        "Date de Build :",
      ],
      opinion: "The first translation, 'Date du build :', is the most accurate and widely understood. The second option, 'Date de création :', is too vague and does not specifically refer to a build. The third option, 'Date de Build :', is not preferred due to the unnecessary capitalization of 'Build'.",
      result: "Date du build :",
    },
    {
      key: "about.enterpriseEditionSst",
      source: "High trust messaging for the enterprise",
      translations: [
        "Messagerie de haute confiance pour l'entreprise",
        "Messagerie de confiance élevée pour l'entreprise",
      ],
      opinion: "Both translations convey the intended meaning, but 'Messagerie de haute confiance pour l'entreprise' is more natural and commonly used in French. The second option, while correct, sounds less fluid. Therefore, the first translation is preferred.",
      result: "Messagerie de haute confiance pour l'entreprise",
    },
    {
      key: "about.enterpriseEditionSt",
      source: "Modern communication from behind your firewall.",
      translations: [
        "Communication moderne depuis derrière votre pare-feu.",
        "Communication moderne derrière votre pare-feu.",
      ],
      opinion: "Both translations are correct, but 'Communication moderne depuis derrière votre pare-feu.' is slightly more descriptive and emphasizes the location of the communication. The second option is also acceptable but less formal. The first translation is preferred.",
      result: "Communication moderne depuis derrière votre pare-feu.",
    },
    {
      key: "about.hash",
      source: "Build Hash:",
      translations: [
        "Hash du build :",
        "Hash de création :",
        "Hash de Build :",
      ],
      opinion: "The first translation, 'Hash du build :', is the most accurate and commonly used term. The second option, 'Hash de création :', is not specific to builds and could lead to confusion. The third option, 'Hash de Build :', is not preferred due to the unnecessary capitalization of 'Build'.",
      result: "Hash du build :",
    },
  ],
]
