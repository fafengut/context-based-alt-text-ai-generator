chrome.commands.onCommand.addListener((command) => {
  console.log(`Command: "${command}" triggered`)

  if (command.name === 'generate-alt') {
    // Bilder und Kontext vom Contontscript abfragen
    chrome.runtime.sendMessage('get-images-and-context', (response) => {})
  }
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.message === 'process_images') {
    const apiKey = await getApiKey()

    console.log('apiKey: ' + apiKey)

    const imagesData = request.imagesData
    generateAltTexts(imagesData, apiKey).then((images) => {
      // Öffne einen neuen Tab und zeige die Ergebnisse an
      chrome.tabs.create(
        { url: 'author-page/author-page.html' },
        function (tab) {
          // Senden der Ergebnisse an den neuen Tab
          const resultsTabId = tab.id
          setTimeout(() => {
            // Gib dem Tab etwas Zeit, um zu laden
            chrome.tabs.sendMessage(resultsTabId, {
              message: 'display_results',
              images: images,
              metaInformation: request.metaInformation,
            })
          }, 1000)
        }
      )
    })
  }
})

async function generateAltTexts(imagesData, apiKey) {
  const finishedImages = await Promise.all(
    imagesData.map(async (imageData) => {
      return {
        src: imageData.src,
        alt_old: imageData.alt,
        alt_new: await getAlternativeTexts(imageData.src, apiKey),
        context: imageData.context,
        area: imageData.area,
        isLogo: imageData.isLogo,
        isIcon: imageData.isIcon,
      }
    })
  )
  return finishedImages // Array von Objekten der vorherigen Bilderdaten mit den neuen Alternativtexten
}

async function getAlternativeTexts(src, apiKey) {
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Generiere mir einen Alternativtext für dieses Bild.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: src,
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
    console.log('result', result)
    let altText = result.choices[0].message.content
    console.log('altText', altText)
    if (altText.startsWith('Alternativtext:')) {
      altText = altText.substring('Alternativtext:'.length).trim()
    }

    return altText
  } catch (error) {
    console.error(error)
  }
}

// API Key aus dem Storage abrufen
function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiKey'], function (result) {
      if (result.apiKey) {
        resolve(result.apiKey)
      }
    })
  })
}
