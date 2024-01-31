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
  const minWordCount = 10 // Set the minimum word count

  // Check next siblings and their children until minimum word count is reached
  while (nextSibling && nextSiblingText.split(' ').length < minWordCount) {
    if (
      nextSibling.textContent.trim().length > 0 &&
      nextSibling.tagName !== 'NOSCRIPT'
    ) {
      nextSiblingText = nextSibling.textContent.trim()
    } else {
      const children = nextSibling.children
      for (let i = 0; i < children.length; i++) {
        const childText = children[i].textContent.trim()
        if (childText.length > 0 && children[i].tagName !== 'NOSCRIPT') {
          nextSiblingText = childText
          break
        }
      }
    }
    nextSibling = nextSibling.nextElementSibling
    counter++ // Increment the counter
  }

  counter = 0 // Reset the counter

  // Check previous siblings and their children until minimum word count is reached
  while (prevSibling && prevSiblingText.split(' ').length < minWordCount) {
    if (
      prevSibling.textContent.trim().length > 0 &&
      prevSibling.tagName !== 'NOSCRIPT'
    ) {
      prevSiblingText = prevSibling.textContent.trim()
    } else {
      const children = prevSibling.children
      for (let i = 0; i < children.length; i++) {
        const childText = children[i].textContent.trim()
        if (childText.length > 0 && children[i].tagName !== 'NOSCRIPT') {
          prevSiblingText = childText
          break
        }
      }
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
  let counter = 0
  const minWordCount = 10

  while (
    parent &&
    parent.tagName !== 'BODY' &&
    parent.textContent.trim().split(' ').length < minWordCount
  ) {
    const parentText = parent.textContent.trim()
    const siblingText = checkSiblingText(parent)

    if (
      parentText.length > 0 &&
      !parentText.startsWith('<') &&
      parent.tagName !== 'NOSCRIPT' &&
      parent.children[0].tagName !== 'NOSCRIPT'
    ) {
      return parentText
    }
    if (siblingText) {
      return siblingText
    }
    parent = parent.parentElement
    counter++
  }
  return false
}
