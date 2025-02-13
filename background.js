chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'captureScreen') {
    // Робимо знімок видимої частини вкладки
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
      // Передаємо скріншот і координати назад у content script для обрізання
      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'cropImage',
        dataUrl: dataUrl,
        rect: message.rect
      });
    });
  }
  else if (message.action === 'croppedData') {
    // Відправляємо обрізане зображення на OCR сервер
    fetch('http://127.0.0.1:5000/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: message.croppedDataUrl })
    })
    .then(response => response.json())
    .then(result => {
      // Надсилаємо OCR результат та croppedDataUrl для оновлення popup
      chrome.runtime.sendMessage({
        action: 'ocrResult',
        text: result.text,
        croppedDataUrl: message.croppedDataUrl
      });
    })
    .catch(err => console.error(err));
  }
});
