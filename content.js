chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'collect_images_and_context') {
    const imagesData = []
    const images = document.getElementsByTagName('img')
    for (const image of images) {
      imagesData.push({
        src: image.src,
        alt: image.alt,
        context: extractContext(image),
      })
    }
    chrome.runtime.sendMessage({ message: 'process_images', imagesData })
  }
})

// Hilfsfunktion, um den Kontext eines Bildes zu extrahieren
// Geht davon aus, dass der Kontext in einem Element vor oder nach dem Bild steht
// oder in einem Elternelement des Bildes
// Gibt den Kontext als String zurück
function extractContext(image) {
  let contextElement = image.nextSibling
  if (
    contextElement &&
    contextElement.nodeType === Node.ELEMENT_NODE &&
    contextElement.textContent.trim() !== ''
  ) {
    return contextElement.textContent.trim()
  }

  contextElement = image.previousSibling
  if (
    contextElement &&
    contextElement.nodeType === Node.ELEMENT_NODE &&
    contextElement.textContent.trim() !== ''
  ) {
    return contextElement.textContent.trim()
  }

  let parentElement = image.parentElement
  while (parentElement) {
    let siblingElement = parentElement.nextSibling
    while (siblingElement) {
      if (
        siblingElement.nodeType === Node.ELEMENT_NODE &&
        siblingElement.textContent.trim() !== ''
      ) {
        return siblingElement.textContent.trim()
      }
      siblingElement = siblingElement.nextSibling
    }
    parentElement = parentElement.parentElement
  }

  return ''
}
