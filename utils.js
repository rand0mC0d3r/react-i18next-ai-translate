export const debugMode = false;

export const debugStep = (message, action = "", detail = "") => {
  if (debugMode) {
    console.log(
      '%c%s %c%s %c%s %c%s',
      `color: yellow; font-weight:700`,
      `: ${new Date().toISOString()} `,
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
      `: ${new Date().toISOString()} `,
      'color: #DAA520; font-weight:700',
      `[${action || 'debug'}]`,
      'color: #FF4288; font-weight:700',
      message,
      'color: inherit',
      detail,
    )
}
