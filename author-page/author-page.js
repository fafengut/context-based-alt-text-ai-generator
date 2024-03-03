const loading = document.getElementById('loading')
const progress = document.getElementById('progress')
const progressBar = document.getElementById('progressBar')
const progressText = document.getElementById('progressText')
const maxImages = document.getElementById('maxImages')
const websiteURL = document.getElementById('website')
const currentUrl = document.querySelector('#website span')
const resultContainer = document.getElementById('results-container')
const limits = document.getElementById('limits')

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === 'display_results') {
    if (request.images.length === 0) {
      loading.style.display = 'none'
      alert('Es konnte keine Bilder verarbeitet werden')
    }
    progress.style.display = 'none'
    currentUrl.innerHTML = request.currentUrl
    websiteURL.style.display = 'block'
    displayResults(request.images, request.metaInformation)
  } else if (request.message === 'update-limits') {
    const limits = document.getElementById('limits')
    const children = limits.children
    for (i = 0; i < children.length; i++) {
      children[i].querySelector('div').innerText = request.limits[i]
    }
    limits.style.display = 'flex'
  } else if (request.message === 'update-progress') {
    loading.style.display = 'none'
    progress.style.display = 'flex'
    progressBar.value = request.progress.current
    progressText.innerText = request.progress.current
    progressBar.max = request.progress.total
    maxImages.innerText = request.progress.total
  } else if (request.message === 'limit-reached') {
    const limitReached = document.getElementById('limit-reached')
    const time = document.getElementById('time')
    limitReached.style.display = 'block'
    for (i = 60; i >= 0; i--) {
      setTimeout(() => {
        time.innerText = i
      }, 1000)

      if (i === 0) {
        limitReached.style.display = 'none'
      }
    }
  }
})

function displayResults(images, metaInformation) {
  // const div = document.createElement('div')
  // div.className = 'meta-container'

  // createElement('p', null, 'Meta Title: ', div)
  // createElement(
  //   'p',
  //   null,
  //   metaInformation.title,
  //   div,
  //   'No meta title available'
  // )

  // createElement('p', null, 'Meta Description: ', div)
  // createElement(
  //   'p',
  //   null,
  //   metaInformation.description,
  //   div,
  //   'No meta description available'
  // )

  // createElement('p', null, 'Meta Keywords: ', div)
  // createElement(
  //   'p',
  //   null,
  //   metaInformation.keywords,
  //   div,
  //   'No meta keywords available'
  // )

  // resultContainer.appendChild(div)

  images.forEach((image) => {
    const div = document.createElement('div')
    div.className = 'image-container'

    createElement('img', { src: image.src }, null, div)

    const imageData = document.createElement('div')
    imageData.className = 'image-data-container'
    div.appendChild(imageData)

    if (image.purpose) {
      createElement('p', null, 'Funktionales Bild: ', imageData)

      createElement('p', null, image.purpose, imageData)
    }

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

    createElement('p', null, 'Neuer Alt Text (ohne Kontext): ', imageData)
    createElement(
      'p',
      null,
      image.alt_new_no_context.altText
        ? image.alt_new_no_context.altText
        : null,
      imageData,
      image.alt_new_no_context.reason
    )

    console.log(image.context)
    if (image.context) {
      createElement('p', null, 'Context: ', imageData)
      createElement('p', null, image.context, imageData, 'No context available')
    }

    resultContainer.appendChild(div)
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
