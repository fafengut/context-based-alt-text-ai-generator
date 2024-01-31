function checkIfAdvertisement(image) {
  const adKeywords = [
    'werbung',
    'rabatt',
    'angebot',
    'aktion',
    'anzeige',
    'advertisement',
    'promo',
    'discount',
    'offer',
    'sale',
    'sponsor',
    'promotion',
  ]

  // Check if the src or alt attribute contains any of the ad keywords
  const src = image.getAttribute('src')
  const alt = image.getAttribute('alt')
  if (
    adKeywords.some(
      (keyword) =>
        (src && src.toLowerCase().includes(keyword)) ||
        (alt && alt.toLowerCase().includes(keyword))
    )
  ) {
    return true
  }

  // Check if the class or id of the image or its parent elements contain any of the ad keywords
  let currentElement = image
  while (currentElement && currentElement.tagName !== 'BODY') {
    // Add condition to check if current element is the body tag
    const pseudoContent = getBeforeOrAfterContent(currentElement)
    if (
      adKeywords.some(
        (keyword) =>
          pseudoContent.before.includes(keyword) ||
          pseudoContent.after.includes(keyword)
      )
    ) {
      return true
    }

    const classList = Array.from(currentElement.classList).map((cls) =>
      cls.toLowerCase()
    )
    const id = currentElement.id.toLowerCase()
    if (
      adKeywords.some(
        (keyword) => classList.includes(keyword) || id.includes(keyword)
      )
    ) {
      return true
    }

    currentElement = currentElement.parentElement
  }

  return false
}

function getBeforeOrAfterContent(element) {
  const beforeCSS = getComputedStyle(element, '::before').content.toLowerCase()
  const afterCSS = getComputedStyle(element, '::after').content.toLowerCase()
  return {
    before: beforeCSS,
    after: afterCSS,
  }
}
