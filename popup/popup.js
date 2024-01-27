document.addEventListener('DOMContentLoaded', function () {
  chrome.commands.getAll(function (commands) {
    commands.forEach(function (command) {
      if (command.name === 'generate-alt') {
        document.getElementById('current-shortcut').textContent =
          command.shortcut
      }
    })
  })
})

// Öffnen der Seite zum Zuweisen von Tastenkürzeln in einem neuen Tab
document.getElementById('change-shortcut').onclick = (event) => {
  chrome.tabs.create({ url: 'chrome://extensions/configureCommands' })
  event.preventDefault()
}

// Speichern des API-Keys in Speicher des Browsers
document.getElementById('save-btn').addEventListener('click', function () {
  const apiKey = document.getElementById('api-key-input').value
  // Hier Code, um den API-Key zu speichern
})
