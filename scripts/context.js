// function to traverse through parents and checking siblings for text nodes
function findTextParent(element) {
  let parent = element.parentElement
  const minWordCount = 3
  let siblingText = ''
  let level = 0

  while (parent && parent.tagName.toUpperCase() !== 'BODY') {
    if (
      parent.tagName.toUpperCase() !== 'STYLE' &&
      parent.tagName.toUpperCase() !== 'SCRIPT'
    ) {
      siblingText = checkSibling(parent)

      if (siblingText && siblingText.trim().split(' ').length > minWordCount) {
        parent.setAttribute('data-checked', 'true')
        return siblingText
      }
      if (parent.parentElement.getAttribute('data-checked') === 'true') {
        return siblingText
      }
    }
    parent = parent.parentElement
    level++
  }
  return false
}

// function to check for previous and next siblings
function checkSibling(element) {
  let prevSibling = element.previousElementSibling
  let nextSibling = element.nextElementSibling
  const ignoredTags = [
    'SCRIPT',
    'STYLE',
    'FORM',
    'IFRAME',
    'TIME',
    'NOSCRIPT',
    'SVG',
    'IMG',
    'A',
  ]

  while (
    prevSibling &&
    ignoredTags.includes(prevSibling.tagName.toUpperCase())
  ) {
    prevSibling = prevSibling.previousElementSibling
  }

  while (
    nextSibling &&
    ignoredTags.includes(nextSibling.tagName.toUpperCase())
  ) {
    nextSibling = nextSibling.nextElementSibling
  }

  const prevSiblingText = checkSiblingText(prevSibling, 'prev')
  const nextSiblingText = checkSiblingText(nextSibling, 'next')

  let combinedText = ''
  if (prevSiblingText) combinedText += prevSiblingText + '\n'
  if (nextSiblingText) combinedText += nextSiblingText + '\n'

  return combinedText.trim() || false
}

// function to check each sibling for child nodes
function checkSiblingText(element, direction) {
  const minWordCount = 5
  let siblingText = ''
  let sibling = element
  let processedTexts = new Set()

  while (sibling && siblingText.split(' ').length < minWordCount) {
    if (sibling.getAttribute('data-checked') === 'true') {
      // If the sibling has data-checked attribute set to true, skip it
      sibling =
        direction === 'next'
          ? sibling.nextElementSibling
          : sibling.previousElementSibling
      continue
    }

    siblingText += checkChildText(sibling, processedTexts) + '\n' // Check the child text

    // If all children are checked, mark the parent as checked
    if (
      sibling.querySelectorAll('*').length ===
      sibling.querySelectorAll('[data-checked]').length
    ) {
      sibling.setAttribute('data-checked', 'true')
    }

    sibling =
      direction === 'next'
        ? sibling.nextElementSibling
        : sibling.previousElementSibling
  }

  return siblingText.trim() || false
}

// recursive function to check for child nodes and their text
function checkChildText(element, processedTexts) {
  const ignoredTags = [
    'SCRIPT',
    'STYLE',
    'FORM',
    'IFRAME',
    'TIME',
    'NOSCRIPT',
    'SVG',
    'IMG',
    'A',
  ]

  if (element.getAttribute('data-checked') === 'true') {
    return ''
  }

  if (ignoredTags.includes(element.tagName.toUpperCase())) {
    element.setAttribute('data-checked', 'true') // Mark the element as checked
    return ''
  }

  let childText = ''
  const children = element.children
  let allChildrenChecked = true

  for (let i = 0; i < children.length; i++) {
    childText += checkChildText(children[i], processedTexts) // Recursively check the children
  }

  if (children.length === 0) {
    allChildrenChecked = false // Set allChildrenChecked to false if there are no children
  } else {
    for (let i = 0; i < children.length; i++) {
      if (children[i].getAttribute('data-checked') !== 'true') {
        allChildrenChecked = false // Set the flag to false if any child is not checked
        break
      }
    }
  }

  if (allChildrenChecked) {
    element.setAttribute('data-checked', 'true') // Mark the element as checked
    return childText
  }

  const elementText = sliceSourceText(element.textContent.trim())
  if (
    elementText.split(' ').length > 2 &&
    !checkIfHtmlString(elementText) &&
    !processedTexts.has(elementText) // Check if the text has already been processed
  ) {
    childText += elementText + '\n'
    processedTexts.add(elementText) // Add the text to the set of processed texts
  }

  element.setAttribute('data-checked', 'true') // Mark the element as checked

  return childText
}

// function to remove parts of the text, that doesn't provide context
function sliceSourceText(textContent) {
  const sourceKeywords = [
    'Foto:',
    'Bild:',
    'Bildrechte:',
    'Quelle:',
    'Credits:',
    'Rechte:',
    '\u00A9',
    'Stand:',
    'Datum:',
    'Erstellt:',
    'Zuletzt aktualisiert:',
    'Zuletzt bearbeitet:',
    'Bearbeitet:',
    'Autor:',
    'Autorin:',
  ]
  let result = textContent
  const text = textContent.toLowerCase()
  for (let i = 0; i < sourceKeywords.length; i++) {
    const keyword = sourceKeywords[i].toLowerCase()
    if (text.includes(keyword)) {
      const index = text.indexOf(keyword)
      result = textContent.slice(0, index)
      break
    }
  }
  return result
}

// function to check if the text contains HTML tags
function checkIfHtmlString(textContent) {
  const htmlTagsRegex =
    /<(?!\/?\s*\d+\s*<\s*\d+\s*&&\s*\d+\s*>\s*\d+\s*\/?\s*>)[^>]+>/g
  return htmlTagsRegex.test(textContent)
}

// function to retrieve information from meta tags
function getMetaInformation() {
  const title = document.querySelector('title').textContent
    ? document.querySelector('title').textContent
    : false
  const description = document.querySelector('meta[name="description"]')
    ? document.querySelector('meta[name="description"]').getAttribute('content')
    : false
  const keywords = document.querySelector('meta[name="keywords"]')
    ? document.querySelector('meta[name="keywords"]').getAttribute('content')
    : false

  return {
    title: title,
    description: description,
    keywords: keywords,
  }
}
