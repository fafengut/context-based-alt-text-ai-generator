chrome.commands.onCommand.addListener((command) => {
  if (command === 'generate-alt') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        message: 'normal-mode-triggered',
      })
    })
  } else if (command === 'authormode') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        message: 'author-mode-triggered',
      })
    })
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'create-author-tab') {
    getApiKey().then((apiKey) => {
      const imagesData = request.imagesData
      const metaInformation = request.metaInformation

      chrome.tabs.create(
        { url: 'author-page/author-page.html' },
        function (tab) {
          const resultsTabId = tab.id
          generateAltTexts(imagesData, metaInformation, apiKey).then(
            (images) => {
              chrome.tabs.sendMessage(resultsTabId, {
                message: 'display_results',
                images: images,
                metaInformation: metaInformation,
              })
            }
          )
        }
      )
    })
  } else if (request.message === 'create-alt-texts') {
    getApiKey()
      .then((apiKey) => {
        const imagesData = request.imagesData
        const metaInformation = request.metaInformation
        generateAltTexts(imagesData, metaInformation, apiKey)
          .then((images) => {
            sendResponse(images)
          })
          .catch((error) => {
            console.error('Error in generateAltTexts:', error)
          })
      })
      .catch((error) => {
        console.error('Error in getApiKey:', error)
      })
    return true // keeps the message channel open to the sender until sendResponse is called
  }
})

async function generateAltTexts(imagesData, metaInformation, apiKey) {
  const finishedImages = await Promise.all(
    imagesData.map(async (imageData) => {
      return {
        src: imageData.src,
        alt_old: imageData.alt,
        alt_new: await getAlternativeTexts(imageData, apiKey, null, null),
        alt_new_context:
          imageData.area === 'header' ||
          imageData.area === 'footer' ||
          imageData.area === 'nav'
            ? false
            : await getAlternativeTexts(
                imageData,
                apiKey,
                imageData.context,
                metaInformation
              ),
        context: imageData.context,
        identifier: imageData.identifier,
      }
    })
  )
  return finishedImages
}

async function getAlternativeTexts(image, apiKey, context, metaInformation) {
  if (image.isLogo || image.isIcon) {
    return 'Wird für Logos und Icons nicht generiert.'
  } else if (
    image.area === 'header' ||
    image.area === 'footer' ||
    image.area === 'nav'
  ) {
    context = null
    metaInformation = null
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content:
              'Du bist der Autor einer Webseite und möchtest ein Bild mit passendem Alternativtext. Du weißt, dass Barrierefreiheit wichtig ist und möchtest, dass alle Nutzer deine Webseite verstehen können. Daher gestaltest du deine Webseite WCAG-konform. Du möchtest, dass der Alternativtext des Bildes eine präzise Beschreibung des Bildes ist. Der Alternativtext sollte nicht mehr als 150 Zeichen haben.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Generiere mir einen Alternativtext für dieses Bild, der nicht mehr als 150 Zeichen hat.' +
                  ` ${
                    context
                      ? `Beziehe den folgenden Kontext, welcher in der Nähe des Bildes sich befindet, mit ein: ${context}.`
                      : ''
                  } ` +
                  ` ${
                    image && image.alt && image.area
                      ? `Beziehe den bestehenden Alternativtext des Bildes mit ein: ${image.alt}.`
                      : ''
                  }` +
                  ` ${
                    metaInformation && metaInformation.title
                      ? `Beziehe den folgenden Titel der Webseite mit ein: ${metaInformation.title}.`
                      : ''
                  }` +
                  `${
                    metaInformation && metaInformation.description
                      ? `Beziehe die Beschreibung der Webseite mit ein: ${metaInformation.description}.`
                      : ''
                  }` +
                  `${
                    metaInformation && metaInformation.keywords
                      ? `Beziehe die folgenden Keywords der Webseite mit ein: ${metaInformation.keywords}.`
                      : ''
                  } ` +
                  'Antworte nur mit dem Alternativtext.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: image.src,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error('API Key Limit erreicht')
      } else if (response.status === 401) {
        throw new Error('API Key ungültig')
      } else {
        throw new Error(
          `Fehler bei der Anfrage an die OpenAI-API: ${response.status}`
        )
      }
    }
    const result = await response.json()
    let altText = result.choices[0].message.content
    if (altText.startsWith('Alternativtext:')) {
      altText = altText.substring('Alternativtext:'.length).trim()
    }

    return altText
  } catch (error) {
    console.error(error)
  }
}

function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey'], function (result) {
      if (result.apiKey) {
        resolve(result.apiKey)
      }
    })
  }).catch((error) => {
    console.error(error)
  })
}
