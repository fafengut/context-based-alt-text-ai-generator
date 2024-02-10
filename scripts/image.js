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

  while (currentElement && currentElement.tagName !== 'BODY') {
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

    if (area && (isLogo || isIcon)) {
      break
    }

    currentElement = currentElement.parentElement
  }

  return { area, isLogo, isIcon }
}
