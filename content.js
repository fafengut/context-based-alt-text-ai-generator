chrome.runtime.onMessage.addListener(async (request) => {
  if (request.message === 'collect_images_and_context') {
    await scrollToBottom()
    const imagesData = []
    const images = document.getElementsByTagName('img')
    for (const image of images) {
      const imageDetails = await checkImage(image)
      if (imageDetails) {
        imagesData.push({
          src: imageDetails.src,
          alt: imageDetails.alt,
          context: imageDetails.possibleText,
          area: imageDetails.area,
          isLogo: imageDetails.isLogo,
          isIcon: imageDetails.isIcon,
        })
      }
    }
    chrome.runtime.sendMessage({ message: 'process_images', imagesData })
  }
})

function scrollToBottom() {
  return new Promise((resolve) => {
    const distance = 100
    const delay = 50

    let totalHeight = 0
    let timer = setInterval(() => {
      const scrollHeight = document.body.scrollHeight
      window.scrollBy(0, distance)
      totalHeight += distance

      if (totalHeight >= scrollHeight) {
        clearInterval(timer)
        resolve() // Resolve the promise after scrolling has finished
      }
    }, delay)
  })
}

async function checkImage(image) {
  let src = image.getAttribute('src')
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
    const absoluteSrc =
      src && src.startsWith('http')
        ? src
        : new URL(src, window.location.href).href

    try {
      const reachable = await isImageReachable(absoluteSrc)

      const { area, isLogo, isIcon } = checkImageDetails(image)

      let possibleText = ''
      if (isLogo || isIcon) {
        possibleText = 'Not needed for logos or icons'
      } else {
        possibleText = findTextParent(image)
      }

      if (reachable) {
        return {
          src: absoluteSrc,
          alt: alt,
          possibleText: possibleText ? possibleText : 'no Text',
          area: area,
          isLogo: isLogo,
          isIcon: isIcon,
        }
      } else {
        console.log('Image not reachable:', absoluteSrc)
      }
    } catch (error) {
      // Handle the error here
      console.error(error)
    }
  }
  return undefined
}
