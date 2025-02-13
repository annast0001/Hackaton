// Обробка кнопки "Обрати область"
document.getElementById('selectAreaButton').addEventListener('click', function() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startSelection" });
  });
});

// Обробка кнопки "Копіювати"
document.getElementById('copyButton').addEventListener('click', function() {
  const recognizedTextElement = document.getElementById('recognizedText');
  const textToCopy = recognizedTextElement.textContent;
  navigator.clipboard.writeText(textToCopy).then(() => {
    alert('Текст скопійовано!');
  }).catch(err => {
    alert('Помилка копіювання: ' + err);
  });
});

// Слухаємо повідомлення (OCR результат та обрізане зображення) із background
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'ocrResult') {
    // Оновлюємо зону з розпізнаним текстом
    document.getElementById('recognizedText').textContent = message.text;
    // Оновлюємо прев'ю зображення, якщо надіслано croppedDataUrl
    if (message.croppedDataUrl) {
      const imagePreview = document.getElementById('imagePreview');
      imagePreview.innerHTML = ""; // очищаємо попередній вміст
      const img = document.createElement('img');
      img.src = message.croppedDataUrl;
      imagePreview.appendChild(img);
    }
  }
});
