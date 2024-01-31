chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'display_results') {
    document.getElementById('loading').style.display = 'none'
    const images = request.images
    displayResults(images)
  }
})

function displayResults(images) {
  const container = document.getElementById('results-container')
  images.forEach((image) => {
    const div = document.createElement('div')
    div.className = 'image-container'

    createElement('img', { src: image.src }, null, div)

    const imageData = document.createElement('div')
    imageData.className = 'image-data-container'
    div.appendChild(imageData)

    createElement('p', null, 'Alt Text: ', imageData)

    const altText = document.createElement('p')
    altText.id = 'altText'
    if (image.alt_old === null) {
      altText.innerText = 'No Alt-Text'
    } else if (image.alt_old.trim() === '') {
      altText.innerText = 'Empty Alt-Text'
    } else {
      altText.innerText = image.alt_old
    }
    imageData.appendChild(altText)

    createElement('p', null, 'Context: ', imageData)

    createElement(
      'p',
      { id: 'context' },
      image.context,
      imageData,
      'No context available'
    )

    createElement('p', null, 'Area: ', imageData)

    createElement(
      'p',
      { id: 'area' },
      image.area,
      imageData,
      'No area available'
    )

    createElement('p', null, 'Is Logo: ', imageData)

    createElement(
      'p',
      { id: 'isLogo' },
      image.isLogo,
      imageData,
      'Is not a logo'
    )

    createElement('p', null, 'Is Icon: ', imageData)

    createElement(
      'p',
      { id: 'isIcon' },
      image.isIcon,
      imageData,
      'Is not an icon'
    )

    container.appendChild(div)
  })
}

function createElement(type, attributes, text, parent, fallbackText) {
  const element = document.createElement(type)
  for (const key in attributes) {
    element.setAttribute(key, attributes[key])
  }
  if (text) {
    element.innerText = text ? text : fallbackText
  }
  parent.appendChild(element)
}
