function findTextParent(element) {
  let parent = element.parentElement
  const minWordCount = 3
  let siblingText = ''
  let level = 0

  while (parent && parent.tagName.toUpperCase() !== 'BODY' && level < 5) {
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

function checkSibling(element) {
  let prevSibling = element.previousElementSibling
  let nextSibling = element.nextElementSibling

  while (
    prevSibling &&
    (prevSibling.tagName.toUpperCase() === 'SCRIPT' ||
      prevSibling.tagName.toUpperCase() === 'STYLE')
  ) {
    prevSibling = prevSibling.previousElementSibling
  }

  while (
    nextSibling &&
    (nextSibling.tagName.toUpperCase() === 'SCRIPT' ||
      nextSibling.tagName.toUpperCase() === 'STYLE')
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

function checkChildText(element, processedTexts) {
  if (element.getAttribute('data-checked') === 'true') {
    // If the element has data-checked attribute set to true, return an empty string
    return ''
  }

  // If the element is a script or style element, return an empty string
  if (
    element.tagName.toUpperCase() === 'SCRIPT' ||
    element.tagName.toUpperCase() === 'STYLE' ||
    element.tagName.toUpperCase() === 'FORM'
  ) {
    element.setAttribute('data-checked', 'true') // Mark the element as checked
    return ''
  }

  let childText = ''
  const children = element.children
  let allChildrenChecked = true // Set allChildrenChecked to false if there are no children

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

  const elementText = element.textContent.trim()
  if (
    elementText.split(' ').length > 2 &&
    !checkIfSourceText(elementText) &&
    !checkIfHtmlString(elementText) &&
    !processedTexts.has(elementText) // Check if the text has already been processed
  ) {
    // element.style.border = '3px solid blue'
    childText += elementText + '\n'
    processedTexts.add(elementText) // Add the text to the set of processed texts
  }

  element.setAttribute('data-checked', 'true') // Mark the element as checked

  return childText
}

function checkIfSourceText(textContent) {
  const sourceKeywords = ['Foto:', 'Bild:', 'Quelle:', 'Credits:', '\u00A9']
  return sourceKeywords.some((keyword) => textContent.includes(keyword))
}

// Check if the text contains HTML tags
function checkIfHtmlString(textContent) {
  const htmlTagsRegex =
    /<(?!\/?\s*\d+\s*<\s*\d+\s*&&\s*\d+\s*>\s*\d+\s*\/?\s*>)[^>]+>/g
  return htmlTagsRegex.test(textContent)
}

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
