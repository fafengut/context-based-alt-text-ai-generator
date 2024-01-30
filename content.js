chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message === 'collect_images_and_context') {
    await scrollToBottom()
    const imagesData = []
    const images = document.getElementsByTagName('img')
    for (const image of images) {
      const imageDetails = await checkImage(image)
      if (imageDetails) {
        imagesData.push({
          src: imageDetails.src,
          alt: imageDetails.alt,
          context: imageDetails.possibleText,
          area: imageDetails.area,
          isLogo: imageDetails.isLogo,
          isIcon: imageDetails.isIcon,
        })
      }
    }
    chrome.runtime.sendMessage({ message: 'process_images', imagesData })
  }
})

function scrollToBottom() {
  return new Promise((resolve) => {
    // Replace the following line with your actual scrolling logic
    const distance = 100
    const delay = 50

    let totalHeight = 0
    let timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight
      window.scrollBy(0, distance)
      totalHeight += distance

      if (totalHeight >= scrollHeight) {
        clearInterval(timer)
        resolve() // Resolve the promise after scrolling has finished
      }
    }, delay)
    // Simulate a delay of 1 second for demonstration purposes
    // setTimeout(resolve, 1000)
  })
}

// Hilfsfunktion, um den Kontext eines Bildes zu extrahieren
// Geht davon aus, dass der Kontext in einem Element vor oder nach dem Bild steht
// oder in einem Elternelement des Bildes
// Gibt den Kontext als String zurück
async function checkImage(image) {
  let src = image.getAttribute('src')
  const alt = image.getAttribute('alt')
  let isDecodedImage = src && src.startsWith('data:image/')

  if (isDecodedImage) {
    ;({ src, isDecodedImage } = checkSrcset(image, src, isDecodedImage))
  }
  const isPixel = image.naturalWidth === 1 && image.naturalHeight === 1
  const isAdvertisement = checkIfAdvertisement(image)

  if (!isDecodedImage && !isPixel && !isAdvertisement) {
    const absoluteSrc =
      src && src.startsWith('http')
        ? src
        : new URL(src, window.location.href).href

    try {
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
      } else {
        console.log('Image not reachable:', absoluteSrc)
      }
    } catch (error) {
      // Handle the error here
      console.error(error)
    }
  }
  return undefined
}

function checkSrcset(image, src, isDecodedImage) {
  const srcset = image.getAttribute('srcset')

  const hasSrcset = srcset !== null
  const siblingWithSrcset = Array.from(image.parentNode.children)
    .filter(
      (sibling) =>
        sibling.tagName === 'SOURCE' && sibling.getAttribute('srcset') !== null
    )
    .reduce((prev, curr) => {
      const prevMedia = prev?.getAttribute('media')
      const currMedia = curr?.getAttribute('media')
      if (!prev) {
        return curr
      }
      if (!prevMedia || !currMedia) {
        return prev
      }
      const prevMediaSize = parseMediaSize(prevMedia)
      const currMediaSize = parseMediaSize(currMedia)
      return prevMediaSize > currMediaSize ? prev : curr
    }, null)

  if (hasSrcset) {
    isDecodedImage = false
    src = srcset.split(' ').filter((e) => e.startsWith('http'))
    return { src: src[src.length - 1], isDecodedImage }
  } else if (siblingWithSrcset) {
    isDecodedImage = false
    src = siblingWithSrcset
      .getAttribute('srcset')
      .split(' ')
      .filter((e) => e.startsWith('http'))
    return { src: src[src.length - 1], isDecodedImage }
  }
  return { src, isDecodedImage }
}

function parseMediaSize(media) {
  const match = media.match(/\((.*?)\)/)
  if (match) {
    const size = match[1].split(':')
    if (size.length === 2) {
      const width = parseInt(size[1])
      if (!isNaN(width)) {
        return width
      }
    }
  }
  return 0
}

// Hilfsfunktion, um zu prüfen, ob ein Bild erreichbar ist
// Gibt ein Promise zurück, das true oder false resolved
async function isImageReachable(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  }).catch((error) => {
    console.error(error)
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
  let counter = 0 // Add a counter variable
  const maxDepth = 2 // Set a depth limit

  // Check next siblings within a depth limit
  while (nextSibling && !nextSiblingText && counter < maxDepth) {
    if (nextSibling.textContent.trim().length > 0) {
      nextSiblingText = nextSibling.textContent.trim()
    }
    nextSibling = nextSibling.nextElementSibling
    counter++ // Increment the counter
  }

  counter = 0 // Reset the counter

  // Check previous siblings within a depth limit
  while (prevSibling && !prevSiblingText && counter < maxDepth) {
    if (prevSibling.textContent.trim().length > 0) {
      prevSiblingText = prevSibling.textContent.trim()
    }
    prevSibling = prevSibling.previousElementSibling
    counter++ // Increment the counter
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
  let counter = 0 // Add a counter variable
  const maxDepth = 2 // Set a depth limit

  while (parent && parent.tagName !== 'BODY' && counter < maxDepth) {
    const parentText = parent.textContent.trim()
    const siblingText = checkSiblingText(parent)

    if (parentText.length > 0) {
      return parentText
    }
    if (siblingText) {
      return siblingText
    }
    parent = parent.parentElement
    counter++ // Increment the counter
  }
  return false
}

function checkImageDetails(element) {
  const src = element.getAttribute('src')
  let currentElement = element
  let area = false
  let isLogo = src && src.toLowerCase().includes('logo')
  let isIcon = src && src.toLowerCase().includes('icon')
  const isSmall =
    element.naturalWidth <= 50 &&
    element.naturalWidth > 1 &&
    element.naturalHeight <= 50 &&
    element.naturalHeight > 1

  let counter = 0 // Add a counter variable
  const maxDepth = 2 // Set a depth limit

  while (
    currentElement &&
    currentElement.tagName !== 'BODY' &&
    counter < maxDepth
  ) {
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
        Array.from(classList).some((cls) =>
          cls.toLowerCase().includes('logo')
        ) ||
        (src && src.toLowerCase().includes('logo')))
    ) {
      isLogo = true
    }

    if (
      !isIcon &&
      (isSmall ||
        id.includes('icon') ||
        Array.from(classList).some((cls) =>
          cls.toLowerCase().includes('icon')
        ) ||
        (src && src.toLowerCase().includes('icon')))
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
