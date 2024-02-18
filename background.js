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
    console.log('images', images)
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
    const examples =
      '1. Ein Datendiagramm: Ein Balkendiagramm vergleicht, wie viele Widgets im Juni, Juli und August verkauft wurden. Auf dem Kurzetikett steht: Abbildung eins – Verkäufe im Juni, Juli und August. Die längere Beschreibung identifiziert den Diagrammtyp und bietet eine allgemeine Zusammenfassung der Daten, Trends und Auswirkungen, die mit den im Diagramm verfügbaren Daten vergleichbar sind. Wo möglich und sinnvoll, werden die tatsächlichen Daten in einer Tabelle bereitgestellt.' +
      '2. Eine Audioaufnahme einer Rede: Der Link zu einem Audioclip lautet: Rede des Vorsitzenden vor der Versammlung. Direkt nach dem Link zum Audioclip wird ein Link zu einem Texttranskript bereitgestellt.' +
      '3. Eine Animation, die veranschaulicht, wie ein Automotor funktioniert: Eine Animation zeigt, wie ein Automotor funktioniert. Es gibt keinen Ton und die Animation ist Teil eines Tutorials, das beschreibt, wie eine Engine funktioniert. Da der Text des Tutorials bereits eine vollständige Erklärung enthält, ist das Bild eine Alternative für Text und die Textalternative enthält nur eine kurze Beschreibung der Animation und verweist für weitere Informationen auf den Tutorial-Text.' +
      '4. Eine Verkehrs-Webcam: Auf einer Website können Benutzer aus einer Vielzahl von Webcams auswählen, die in einer Großstadt verteilt sind. Nachdem eine Kamera ausgewählt wurde, wird das Bild alle zwei Minuten aktualisiert. Eine kurze Textalternative identifiziert die Webcam als Verkehrs-Webkamera. Die Website bietet außerdem eine Tabelle mit den Fahrzeiten für jede der von den Webcams erfassten Routen. Die Tabelle wird außerdem alle zwei Minuten aktualisiert.' +
      '5. Ein Foto eines historischen Ereignisses in einer Nachrichtenmeldung: Ein Foto von zwei führenden Politikern der Welt, die sich die Hände schütteln, begleitet eine Nachrichtenmeldung über ein internationales Gipfeltreffen. Die Textalternative besagt: Präsident X von Land X schüttelt Premierminister Y von Land Y die Hand.' +
      '6. Ein Foto eines historischen Ereignisses in Inhalten über diplomatische Beziehungen: Das gleiche Bild wird in einem anderen Kontext verwendet, um Nuancen bei diplomatischen Begegnungen zu erklären. Das Bild des Präsidenten, der dem Premierminister die Hand schüttelt, erscheint auf einer Website, auf der es um komplizierte diplomatische Beziehungen geht. Die erste Textalternative lautet: Präsident X von Land identifiziert die anderen Personen im Raum. Die zusätzliche Beschreibung kann auf derselben Seite wie das Foto oder in einer separaten Datei eingefügt werden, die über einen Link oder einen anderen standardmäßigen Programmmechanismus mit dem Bild verknüpft ist.' +
      '7. Eine Audioaufzeichnung einer Pressekonferenz: Eine Webseite enthält einen Link zu einer Audioaufzeichnung einer Pressekonferenz. Der Linktext identifiziert die Audioaufnahme. Die Seite verlinkt auch auf ein Texttranskript der Pressekonferenz. Das Transkript enthält eine wörtliche Aufzeichnung aller Aussagen der Redner. Es erkennt, wer spricht, und notiert auch andere wichtige Geräusche, die Teil der Aufnahme sind, wie Applaus, Lachen, Fragen des Publikums usw.' +
      '8. Eine E-Learning-Anwendung: Eine E-Learning-Anwendung verwendet Soundeffekte, um anzuzeigen, ob die Antworten richtig sind oder nicht. Der Glockenton zeigt an, dass die Antwort richtig ist, und der Piepton zeigt an, dass die Antwort falsch ist. Außerdem ist eine Textbeschreibung enthalten, damit Personen, die den Ton nicht hören oder verstehen können, verstehen, ob die Antwort richtig oder falsch ist.' +
      '9. Ein verlinktes Miniaturbild: Ein Miniaturbild der Titelseite einer Zeitung verweist auf die Homepage der Smallville Times . Die Textalternative lautet Smallville Times .' +
      '10. Dasselbe Bild wird auf verschiedenen Websites verwendet: Verschiedene Alternativen für ein Bild der Welt: Ein Bild der Welt, das auf einer Reisewebsite als Link zum Abschnitt „Internationale Reisen“ verwendet wird, hat die Textalternative „ Internationale Reisen“ . Das gleiche Bild wird als Link auf einer Universitätswebsite mit der Textalternative International Campuses verwendet .' +
      '11. Eine Bildkarte: Ein Bild eines Gebäudegrundrisses ist interaktiv und ermöglicht es dem Benutzer, einen bestimmten Raum auszuwählen und zu einer Seite mit Informationen zu diesem Raum zu navigieren. Die kurze Textalternative beschreibt das Bild und seinen interaktiven Zweck: Gebäudegrundriss. Wählen Sie einen Raum aus, um weitere Informationen zu erhalten.'
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
          // {
          //   role: 'system',
          //   content:
          //     'Die folgenden 11 Beispiele helfen dir zu verstehen, wie Alternativtexte richtig zu generieren sind: ' +
          //     examples,
          // },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Generiere mir einen Alternativtext für dieses Bild.' +
                  ` ${
                    context
                      ? `Beziehe den folgenden Kontext, welcher in der Nähe des Bildes sich befindet, mit ein: ${context}. Der Alternativtext darf allerdings den Kontext nicht wiederholen, da es sonst zu Redundanz führt. Wenn der Kontext das Bild bereits ausreichend beschreibt, dann kann der Alternativtext auch leer sein.`
                      : ''
                  } ` +
                  ` ${
                    image && image.alt
                      ? `Beziehe den bestehenden Alternativtext des Bildes mit ein: ${image.alt}, sofern dieser Sinn ergibt.`
                      : ''
                  }` +
                  ` ${
                    metaInformation && context
                      ? `Berücksichtige den Titel (${metaInformation.title}), die Beschreibung (${metaInformation.description}) und Keywords (${metaInformation.keywords}) der Webseite sowie den Kontext des umliegenden Bildes (${context}) bei der Entscheidung, ob das Bild informativ ist und damit einen Alternativtext benötigt oder dekorativ ist und einen leeren Alternativtext benötigt.`
                      : ''
                  }`,
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
    console.log(limitRequests, limitTokens, remainingRequests, remainingTokens)

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
