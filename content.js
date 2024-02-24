chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message === 'author-mode-triggered') {
    const metaInformation = getMetaInformation()
    const imagesData = await getImagesData()

    chrome.runtime.sendMessage({
      message: 'create-author-tab',
      imagesData,
      metaInformation,
    })
  } else if (request.message === 'normal-mode-triggered') {
    const metaInformation = getMetaInformation()
    const imagesData = await getImagesData()

    chrome.runtime.sendMessage(
      {
        message: 'create-alt-texts',
        imagesData,
        metaInformation,
      },
      (response) => {
        response.forEach((image) => {
          const imageElement = document.querySelector(
            `[data-image="${image.identifier}"]`
          )
          if (imageElement && image.alt_new_context.altText !== null) {
            imageElement.setAttribute('alt', image.alt_new_context.altText)
          }
        })
      }
    )
  }
})

async function getImagesData() {
  await scrollToBottom()
  const imagesData = []
  const images = document.getElementsByTagName('img')
  let identifier = 0
  for (const image of images) {
    const imageDetails = await checkImage(image)
    image.setAttribute('data-image', identifier)
    if (imageDetails) {
      imagesData.push({
        src: imageDetails.src,
        alt: imageDetails.alt,
        context: imageDetails.possibleText,
        area: imageDetails.area,
        isLogo: imageDetails.isLogo,
        isIcon: imageDetails.isIcon,
        isFunctional: imageDetails.isFunctional,
        identifier: identifier,
      })
    }
    identifier++
  }

  return imagesData
}

function scrollToBottom() {
  // Add blur and message
  const blurOverlay = document.createElement('div')
  blurOverlay.style.position = 'fixed'
  blurOverlay.style.top = '0'
  blurOverlay.style.left = '0'
  blurOverlay.style.width = '100%'
  blurOverlay.style.height = '100%'
  blurOverlay.style.background = 'rgba(0,0,0,0.5)'
  blurOverlay.style.backdropFilter = 'blur(5px)'
  blurOverlay.style.zIndex = '9999'
  blurOverlay.style.display = 'flex'
  blurOverlay.style.justifyContent = 'center'
  blurOverlay.style.alignItems = 'center'
  blurOverlay.style.color = '#fff'
  blurOverlay.style.fontSize = '24px'
  blurOverlay.innerText = 'Analysiere Webseite...'
  document.body.appendChild(blurOverlay)

  return new Promise((resolve) => {
    const distance = 100
    const delay = 50

    let totalHeight = 0
    let originalScrollY = window.scrollY
    let timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight
      window.scrollBy(0, distance)
      totalHeight += distance

      if (totalHeight >= scrollHeight) {
        clearInterval(timer)
        // Remove blur and message
        window.scrollTo(0, originalScrollY) // Scroll back to the original point
        blurOverlay.remove()
        resolve() // Resolve the promise after scrolling has finished
      }
    }, delay)
  })
}

async function checkImage(image) {
  const src = image.src
  const alt = image.getAttribute('alt')
  let isDecodedImage = src && src.startsWith('data:image/')

  // If the image is decoded, check if there is a srcset
  // If there is no srcset, check if there is a sibling with a srcset
  if (isDecodedImage) {
    ;({ src, isDecodedImage } = checkSrcset(image, src, isDecodedImage))
  }

  const isPixel = image.naturalWidth === 1 && image.naturalHeight === 1
  const isAdvertisement = checkIfAdvertisement(image)

  if (!isDecodedImage && !isPixel && !isAdvertisement) {
    try {
      const reachable = await isImageReachable(src)

      const { area, isLogo, isIcon, isFunctional } = checkImageDetails(image)

      let possibleText = ''
      let metaInformation = {}
      if (isLogo || isIcon) {
        possibleText = false
      } else {
        possibleText = findTextParent(image)
      }

      if (reachable) {
        return {
          src: src,
          alt: alt ? alt : null,
          possibleText: possibleText ? possibleText : null,
          area: area,
          isLogo: isLogo,
          isIcon: isIcon,
          isFunctional: isFunctional,
          metaInformation: metaInformation,
        }
      }
    } catch (error) {
      // Handle the error here
      console.error(error)
    }
  }
  return undefined
}
