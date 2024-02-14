chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'display_results') {
    document.getElementById('loading').style.display = 'none'
    displayResults(request.images, request.metaInformation)
  } else if (request.message === 'update-limits') {
    const limits = document.getElementById('limits')
    const children = limits.children
    for (i = 0; i < children.length; i++) {
      children[i].querySelector('div').innerText = request.limits[i]
    }
    limits.style.display = 'flex'
  }
})

function displayResults(images, metaInformation) {
  const container = document.getElementById('results-container')

  const div = document.createElement('div')
  div.className = 'meta-container'

  createElement('p', null, 'Meta Title: ', div)
  createElement(
    'p',
    null,
    metaInformation.title,
    div,
    'No meta title available'
  )

  createElement('p', null, 'Meta Description: ', div)
  createElement(
    'p',
    null,
    metaInformation.description,
    div,
    'No meta description available'
  )

  createElement('p', null, 'Meta Keywords: ', div)
  createElement(
    'p',
    null,
    metaInformation.keywords,
    div,
    'No meta keywords available'
  )

  container.appendChild(div)

  images.forEach((image) => {
    const div = document.createElement('div')
    div.className = 'image-container'

    createElement('img', { src: image.src }, null, div)

    const imageData = document.createElement('div')
    imageData.className = 'image-data-container'
    div.appendChild(imageData)

    createElement('p', null, 'Alt Text: ', imageData)

    const altText = document.createElement('p')
    if (image.alt_old === null) {
      altText.innerText = 'No Alt-Text'
    } else if (image.alt_old.trim() === '') {
      altText.innerText = 'Empty Alt-Text'
    } else {
      altText.innerText = image.alt_old
    }
    imageData.appendChild(altText)

    if (image.alt_new) {
      createElement('p', null, 'Neuer Alt Text: ', imageData)

      createElement(
        'p',
        null,
        image.alt_new.altText,
        imageData,
        'No new alt text available'
      )
    }

    createElement('p', null, 'Neuer Alt Text(Kontext): ', imageData)
    createElement(
      'p',
      null,
      image.alt_new_context.altText,
      imageData,
      'Kein Kontext notwendig für Bilder in Navigation oder Footer.'
    )

    if (image.context) {
      createElement('p', null, 'Context: ', imageData)
      createElement('p', null, image.context, imageData, 'No context available')
    }

    container.appendChild(div)
  })
}

function createElement(type, attributes, text, parent, fallbackText) {
  const element = document.createElement(type)
  for (const key in attributes) {
    element.setAttribute(key, attributes[key])
  }
  element.innerText = text ? text : fallbackText
  parent.appendChild(element)
}
