const colors : {
    strongBlue: string,
    mediumBlue: string,
    softBlue: string,
    blueGray: string,
    light: string,
} = {
  strongBlue: getComputedStyle(document.body).getPropertyValue("--color-gabu-900").trim(),
  mediumBlue: getComputedStyle(document.body).getPropertyValue("--color-gabu-700").trim(),
  softBlue: getComputedStyle(document.body).getPropertyValue("--color-gabu-500").trim(),
  blueGray: getComputedStyle(document.body).getPropertyValue("--color-gabu-300").trim(),
  light: getComputedStyle(document.body).getPropertyValue("--color-gabu-100").trim(),
}

export default colors;