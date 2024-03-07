document.addEventListener('DOMContentLoaded', function () {
  const apiKeyInput = document.getElementById('api-key-input')
  const statusText = document.getElementById('status-text')
  const changeShortcutBtn = document.getElementById('change-shortcut')
  const saveBtn = document.getElementById('save-btn')
  const authorModeBtn = document.getElementById('authormode')

  // load all needed shortcuts
  chrome.commands.getAll(function (commands) {
    commands.forEach(function (command) {
      if (command.name === 'generate-alt') {
        document.getElementById('current-shortcut').textContent =
          command.shortcut
      } else if (command.name === 'authormode') {
        document.getElementById('authormode-shortcut').textContent =
          command.shortcut
      }
    })
  })

  // load api key from storage
  chrome.storage.local.get(['apiKey'], function (result) {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey
    }
  })

  changeShortcutBtn.onclick = (event) => {
    chrome.tabs.create({ url: 'chrome://extensions/configureCommands' })
    event.preventDefault()
  }

  // save api key to storage if valid
  saveBtn.addEventListener('click', function () {
    const apiKey = apiKeyInput.value.trim()

    if (
      apiKey !== '' &&
      apiKey.length > 10 &&
      apiKey.length < 100 &&
      apiKey.includes('sk-')
    ) {
      chrome.storage.local.set({ apiKey }, function () {
        statusText.textContent = 'API Schlüssel erfolgreich gespeichert.'
        statusText.classList.add('success')
        setTimeout(function () {
          statusText.textContent = ''
          statusText.classList.remove('success')
        }, 2000)
      })
    } else {
      statusText.textContent = 'Ungültiger API Schlüssel.'
      statusText.classList.add('error')
      setTimeout(function () {
        statusText.textContent = ''
        statusText.classList.remove('error')
      }, 2000)
    }
  })

  // start author-mode by sending message to content script
  authorModeBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        message: 'author-mode-triggered',
      })
    })
  })
})
