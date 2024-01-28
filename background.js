chrome.commands.onCommand.addListener((command) => {
  console.log(`Command: "${command}" triggered`)

  if (command.name === 'generate-alt') {
    // Bilder und Kontext vom Contontscript abfragen
    chrome.runtime.sendMessage('get-images-and-context', (response) => {})
  }
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'process_images') {
    const imagesData = request.imagesData
    generateAltTexts(imagesData).then((images) => {
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
            })
          }, 1000)
        }
      )
    })
  }
})

async function generateAltTexts(imagesData) {
  // OpenAI-API aufrufen und Alternativtexte für jedes Bild generieren

  const finishedImages = []
  imagesData.forEach((imageData) => {
    finishedImages.push({
      src: imageData.src,
      alt_old: imageData.alt,
      alt_new: 'Alt text',
      context: imageData.context,
      area: imageData.area,
      isLogo: imageData.isLogo,
      isIcon: imageData.isIcon,
    })
  })
  return finishedImages // Array von Objekten der vorherigen Bilderdaten mit den neuen Alternativtexten
}
