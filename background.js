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
        // alt_new: await getAlternativeTexts(imageData, apiKey, null, null),
        alt_new_context:
          imageData.area === 'footer' ||
          imageData.area === 'nav' ||
          imageData.area === 'comments'
            ? {
                altText: null,
                reason: 'Wird für Footer, Kommentare und Nav nicht generiert.',
              }
            : await getAlternativeTexts(
                imageData,
                apiKey,
                imageData.context,
                metaInformation
              ),
        context: imageData.context,
        isFunctional: imageData.isFunctional,
        identifier: imageData.identifier,
      }
    })
  ).then((images) => {
    const requests = images
      .filter(
        (image) =>
          image.alt_new_context !== null &&
          image.alt_new_context.limitRequests !== null &&
          image.alt_new_context.limitTokens !== null &&
          image.alt_new_context.remainingRequests !== null &&
          image.alt_new_context.remainingTokens !== null
      )
      .map((image) => image.alt_new_context)
    const limitRequests = requests[0].limitRequests
    const limitTokens = requests[0].limitTokens
    const remainingRequests = Math.min(
      ...requests.map((image) => image.remainingRequests)
    )
    const remainingTokens = Math.min(
      ...requests.map((image) => image.remainingTokens)
    )
    chrome.runtime.sendMessage({
      message: 'update-limits',
      limits: [limitRequests, limitTokens, remainingRequests, remainingTokens],
    })
    return images
  })
  return finishedImages
}

async function getAlternativeTexts(image, apiKey, context, metaInformation) {
  if (image.isLogo || image.isIcon) {
    return {
      altText: null,
      limitRequests: null,
      limitTokens: null,
      remainingRequests: null,
      remainingTokens: null,
      reason: 'Wird für Logos und Icons nicht generiert.',
    }
  } else if (image.area === 'footer' || image.area === 'nav') {
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
              'Du bist ein hilfreicher Assistant und Profi im Bereich Web-Barrierefreiheit. Daher hältst du dich an die Vorgaben des WCAG. Du hilfst Nutzern beim Erstellen von Alternativtexten für Bilder. Der Alternativtext sollte nicht mehr als 150 Zeichen haben.',
          },
          {
            role: 'system',
            content:
              'Du weißt, dass Alternativtexte Informationen über den Inhalt eines Bildes liefern. Du berücksichtigst den Kontext, in dem das Bild erscheint, und die Beschreibung der Webseite. Du berücksichtigst auch den bestehenden Alternativtext des Bildes, falls vorhanden. Du antwortest nur mit dem Alternativtext und in der Sprache der Webseite.',
          },
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: ` ${
                  image && image.alt
                    ? `Nutze die folgenden Informationen, um den Inhalt des Bildes besser zu verstehen: "${image.alt}"`
                    : ''
                }`,
              },
            ],
          },
          {
            role: 'system',
            content: [
              {
                type: 'text',
                text: ` ${
                  metaInformation
                    ? `Nutze die Informationen aus dem Meta-Tags der Webseiten, um den groben Kontext der Webseite zu verstehen: Titel (${metaInformation.title}), Beschreibung (${metaInformation.description}) und Keywords (${metaInformation.keywords})`
                    : ''
                }`,
              },
            ],
          },
          {
            role: 'system',
            content: `Beziehe den folgenden Kontext, welcher in der Nähe des Bildes sich befindet, mit ein: "${context}". Der Alternativtext darf allerdings den Kontext nicht wiederholen, da es sonst zu Redundanz führt. Du musst unabhängig von den vorherigen Informationen entscheiden, ob der Kontext das Bild bereits ausreichend beschreibt, dann antworte in diesem Fall mit "leer: ", gefolgt von deiner Begründung, oder ob das Bild einen Alternativtext benötigt, dann genriere mir einen passenden Alternativtext.`,
          },
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
                  url: image.src,
                  detail: 'low',
                },
              },
            ],
          },
          image.isFunctional
            ? {
                role: 'system',
                content:
                  'Das Bild ist funktional und du weißt, dass Textalternativen für funktionale Bilder die Aktion vermitteln, die eingeleitet wird (den Zweck des Bildes), und nicht das Bild beschreiben sollen.',
              }
            : {
                role: 'system',
                content:
                  'Das Bild könnte informativ oder dekorativ sein. Du musst entscheiden, welches anhand des Tutorials der Web Accessibility Initiative eher zutrifft und das entsprechende Verfahren für die Erstellung des Alternativentext wählen.',
              },
          // {
          //   role: 'user',
          //   content: [
          //     {
          //       type: 'text',
          //       text: ` ${
          //         context
          //           ? `Beziehe den folgenden Kontext, welcher in der Nähe des Bildes sich befindet, mit ein: "${context}". Der Alternativtext darf allerdings den Kontext nicht wiederholen, da es sonst zu Redundanz führt. Entscheide, ob der Kontext das Bild bereits ausreichend beschreibt, dann antworte in diesem Fall mit "leer: ", gefolgt von deiner Begründung, oder ob das Bild einen Alternativtext benötigt, dann genriere mir einen passenden Alternativtext.`
          //           : ''
          //       } `,
          //     },
          //   ],
          // },
        ],
        seed: 123,
        temperature: 0, // 0.0 to 2.0 - Low Value = More conservative, High Value = More creative
        max_tokens: 100,
      }),
    })
    const limitRequests = response.headers.get('x-ratelimit-limit-requests')
    const limitTokens = response.headers.get('x-ratelimit-limit-tokens')
    const remainingRequests = response.headers.get(
      'x-ratelimit-remaining-requests'
    )
    const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens')
    const result = await response.json()
    if (result.error) {
      throw new Error(
        `Fehler bei der Anfrage an die OpenAI-API: ${result.error.message}`
      )
      // return `Fehler bei der Anfrage an die OpenAI-API: ${result.error.message}`
    }
    let altText = result.choices[0].message.content
    if (altText.startsWith('Alternativtext:')) {
      altText = altText.substring('Alternativtext:'.length).trim()
    }

    return {
      altText,
      limitRequests: parseInt(limitRequests),
      limitTokens: parseInt(limitTokens),
      remainingRequests: parseInt(remainingRequests),
      remainingTokens: parseInt(remainingTokens),
    }
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
