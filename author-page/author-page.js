chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'display_results') {
    const images = request.images
    displayResults(images)
  }
})

function displayResults(images) {
  const container = document.getElementById('results-container')
  images.forEach((image) => {
    const imageContainer = document.createElement('div')
    imageContainer.classList.add('image-container')

    const imageElement = document.createElement('img')
    imageElement.src = image.src
    imageElement.alt = image.alt_old
    imageElement.classList.add('image')

    const altTextElement = document.createElement('p')
    altTextElement.textContent = image.alt_new
    altTextElement.classList.add('alt-text')

    const oldTextElement = document.createElement('p')
    oldTextElement.textContent = image.alt_old
    oldTextElement.classList.add('alt-text')

    const contextElement = document.createElement('p')
    contextElement.textContent = image.context
    contextElement.classList.add('context')

    imageContainer.appendChild(imageElement)
    imageContainer.appendChild(altTextElement)
    imageContainer.appendChild(contextElement)
    container.appendChild(imageContainer)
  })
}
