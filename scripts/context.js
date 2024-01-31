function findTextParent(element) {
  let parent = element.parentElement
  const minWordCount = 10
  let parentText = ''
  let siblingText = ''

  while (parent && parent.tagName !== 'BODY') {
    let parentTextContent = parent.textContent.trim()
    const children = parent.children
    for (let i = 0; i < children.length; i++) {
      parentTextContent = parentTextContent.replace(children[i].textContent, '') // Subtract the child text content
    }
    if (
      parentTextContent.length < minWordCount &&
      !checkIfHtmlString(parentTextContent)
    ) {
      parent.style.border = '3px solid red'
      parentText = parentText + ' ' + parentTextContent
    }

    siblingText = checkSibling(parent)

    if (parentText.trim().split(' ').length > minWordCount) {
      return parentText
    }

    if (siblingText && siblingText.trim().split(' ').length > minWordCount) {
      return siblingText
    }
    parent = parent.parentElement
  }
  return false
}

function checkSibling(element) {
  let prevSibling = element.previousElementSibling
  let nextSibling = element.nextElementSibling

  const prevSiblingText = checkSiblingText(prevSibling, 'prev')
  const nextSiblingText = checkSiblingText(nextSibling, 'next')

  let combinedText = ''
  if (prevSiblingText) combinedText += prevSiblingText + '\n'
  if (nextSiblingText) combinedText += nextSiblingText + '\n'

  return combinedText.trim() || false
}

function checkSiblingText(element, direction) {
  const minWordCount = 10
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

    siblingText += checkChildText(sibling, processedTexts) // Check the child text

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
    element.style.border = '3px solid blue'
    childText += ' ' + elementText
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
