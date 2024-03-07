// message listener to trigger appropriate mode and fetch images, information and context
chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message === 'author-mode-triggered') {
    const metaInformation = getMetaInformation()
    const imagesData = await getImagesData()
    const currentUrl = window.location.href

    chrome.runtime.sendMessage({
      message: 'create-author-tab',
      imagesData,
      metaInformation,
      currentUrl,
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
            const altText = image.alt_new_context.altText.startsWith('leer:')
              ? ''
              : image.alt_new_context.altText
            imageElement.setAttribute('alt', altText)
          }
        })
      }
    )
  }
})

// function to retrieve all images
async function getImagesData() {
  await scrollToBottom()
  const imagesData = []
  const images = document.getElementsByTagName('img')
  let identifier = 0
  for (const image of images) {
    const imageDetails = await checkImage(image)
    image.setAttribute('data-image', identifier)
    if (
      imageDetails &&
      imageDetails.isLogo === false &&
      imageDetails.isIcon === false &&
      imageDetails.area !== 'footer' &&
      imageDetails.area !== 'nav' &&
      imageDetails.area !== 'comments'
    ) {
      imagesData.push({
        src: imageDetails.src,
        alt: imageDetails.alt,
        context: imageDetails.possibleText,
        area: imageDetails.area,
        isLogo: imageDetails.isLogo,
        isIcon: imageDetails.isIcon,
        purpose: imageDetails.purpose,
        identifier: identifier,
      })
    }
    identifier++
  }

  return imagesData
}

// function to add a blur effect during the analysis of the website
function scrollToBottom() {
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

// function to get information for image like src, alt, if it's an advertisment or not and so on
async function checkImage(image) {
  let src = image.src
  let siblingSrcset = null
  let imageType = null
  let alt = image.getAttribute('alt')

  if (alt === '') {
    alt = 'leerer Alt-Text'
  }

  let isDecodedImage = src && src.startsWith('data:image/')

  // If the image is decoded, check if there is a srcset
  // If there is no srcset, check if there is a sibling with a srcset
  if (isDecodedImage) {
    const oldSrc = src

    ;({ src, siblingSrcset, imageType } = checkSrcset(image, src))

    if (oldSrc !== src) {
      isDecodedImage = false
    }
  }

  const isPixel =
    (image.naturalWidth === 1 && image.naturalHeight === 1) ||
    (image.width === 1 && image.height === 1)
  const isAdvertisement = checkIfAdvertisement(image)
  let isCorrectType = false

  if (!isDecodedImage && !isPixel && !isAdvertisement && imageType === null) {
    isCorrectType = await checkImageType(src, siblingSrcset)

    if (!isCorrectType) {
      ;({ src, siblingSrcset, imageType } = checkSrcset(image, src))

      if (imageType !== null) {
        isCorrectType = true
      } else {
        isCorrectType = await checkImageType(src, siblingSrcset)
      }
    }
  }

  if (!isDecodedImage && !isPixel && !isAdvertisement && isCorrectType) {
    try {
      const reachable = await isImageReachable(src)

      const { area, isLogo, isIcon, purpose } = checkImageDetails(image)

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
          purpose: purpose,
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

// function to check the image type since gpt4-v doesn't support all types
async function checkImageType(src, srcset) {
  const imageExtensions = ['png', 'jpeg', 'jpg', 'gif', 'webp']
  let imageType = null

  const response = await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { message: 'get-image-content-type', src, srcset },
      (response) => {
        resolve(response)
      }
    )
  })

  if (response) {
    const contentType = response.contentType
    imageType = contentType.substring(contentType.lastIndexOf('/') + 1)

    return imageExtensions.some((ext) => {
      return imageType.includes(ext)
    })
  } else {
    console.log('Image not found in loaded requests')
    return false
  }
}
