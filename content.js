chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.message === 'collect_images_and_context') {
    const imagesData = []
    const images = document.getElementsByTagName('img')
    for (const image of images) {
      const imageDetails = await checkImage(image)
      imagesData.push({
        src: imageDetails.src,
        alt: imageDetails.alt,
        context: imageDetails.possibleText,
        area: imageDetails.area,
        isLogo: imageDetails.isLogo,
        isIcon: imageDetails.isIcon,
      })
    }
    chrome.runtime.sendMessage({ message: 'process_images', imagesData })
  }
})

// Hilfsfunktion, um den Kontext eines Bildes zu extrahieren
// Geht davon aus, dass der Kontext in einem Element vor oder nach dem Bild steht
// oder in einem Elternelement des Bildes
// Gibt den Kontext als String zurück
async function checkImage(image) {
  const src = image.getAttribute('src')
  const alt = image.getAttribute('alt')
  const isDecodedImage = src && src.startsWith('data:image/')
  const isPixel = image.naturalWidth === 1 && image.naturalHeight === 1

  if (!isDecodedImage && !isPixel) {
    const absoluteSrc =
      src && src.startsWith('http')
        ? src
        : new URL(src, window.location.href).href

    const reachable = await isImageReachable(absoluteSrc)

    const { area, isLogo, isIcon } = checkImageDetails(image)

    let possibleText = ''
    if (isLogo || isIcon) {
      possibleText = 'Not needed for logos or icons'
    } else {
      possibleText = findTextParent(image)
    }

    if (reachable) {
      return {
        src: absoluteSrc,
        alt: alt,
        possibleText: possibleText ? possibleText : 'no Text',
        area: area,
        isLogo: isLogo,
        isIcon: isIcon,
      }
    }
  }
  return {
    src: src,
    alt: alt,
    possibleText: 'no Text',
    area: false,
    isLogo: false,
    isIcon: false,
  }
}

// Hilfsfunktion, um zu prüfen, ob ein Bild erreichbar ist
// Gibt ein Promise zurück, das true oder false resolved
async function isImageReachable(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

// Hilfsfunktion, um den Text der Geschwister eines Elements zu extrahieren
// Gibt den Text als String zurück
// Wenn kein Text gefunden wird, wird false zurückgegeben
// Der Text wird mit <br><br> getrennt, wenn er von mehreren Geschwistern kommt
function checkSiblingText(element) {
  let nextSibling = element.nextElementSibling
  let prevSibling = element.previousElementSibling
  let nextSiblingText = ''
  let prevSiblingText = ''

  // Check next siblings
  while (nextSibling && !nextSiblingText) {
    if (nextSibling.textContent.trim().length > 0) {
      nextSiblingText = nextSibling.textContent.trim()
    }
    nextSibling = nextSibling.nextElementSibling
  }

  // Check previous siblings
  while (prevSibling && !prevSiblingText) {
    if (prevSibling.textContent.trim().length > 0) {
      prevSiblingText = prevSibling.textContent.trim()
    }
    prevSibling = prevSibling.previousElementSibling
  }

  let combinedText = ''
  if (prevSiblingText) combinedText += prevSiblingText + '<br><br>'
  if (nextSiblingText) combinedText += nextSiblingText

  return combinedText.trim() || false
}

// Hilfsfunktion, um den Text des Elternelements eines Elements zu extrahieren
// Gibt den Text als String zurück
// Wenn kein Text gefunden wird, wird false zurückgegeben
function findTextParent(element) {
  let parent = element.parentElement
  while (parent && parent.tagName !== 'BODY') {
    if (parent.textContent.trim().length > 0) {
      return parent.textContent.trim()
    }
    if (checkSiblingText(parent)) {
      return checkSiblingText(parent)
    }
    parent = parent.parentElement
  }
  return false
}

function checkImageDetails(element) {
  const src = element.getAttribute('src')
  let currentElement = element
  let area = false
  let isLogo = src && src.toLowerCase().includes('logo')
  let isIcon = src && src.toLowerCase().includes('icon')
  const isSmall = element.naturalWidth <= 50 && element.naturalHeight <= 50

  let counter = 0 // Add a counter variable

  while (currentElement && currentElement.tagName !== 'BODY' && counter < 2) {
    // Check the counter
    const tagName = currentElement.tagName.toLowerCase()
    const id = currentElement.id.toLowerCase()
    const classList = currentElement.classList

    if (
      !area &&
      (tagName === 'header' ||
        tagName === 'main' ||
        tagName === 'footer' ||
        tagName === 'nav')
    ) {
      area = tagName
    }

    if (
      !isLogo &&
      (id.includes('logo') ||
        Array.from(classList).some((cls) => cls.toLowerCase().includes('logo')))
    ) {
      isLogo = true
    }

    if (
      !isIcon &&
      (isSmall ||
        id.includes('icon') ||
        Array.from(classList).some((cls) => cls.toLowerCase().includes('icon')))
    ) {
      isIcon = true
    }

    if (area && isLogo && isIcon) {
      break
    }

    currentElement = currentElement.parentElement
    counter++ // Increment the counter
  }

  return { area, isLogo, isIcon }
}
