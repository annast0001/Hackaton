console.log("Content script loaded");

// Слухаємо повідомлення з фону та від popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "startSelection") {
    // Користувач натиснув кнопку "Виділити область" у popup
    console.log("Starting selection mode...");
    startSelection();
  }
  else if (message.action === "cropImage") {
    // Фоновий скрипт надіслав скріншот і координати
    console.log("Received screenshot for cropping", message.rect);
    cropImageInDOM(message.dataUrl, message.rect);
  }
  else if (message.action === "ocrResult") {
    // Результат OCR із фону (за бажанням можна обробити тут)
    console.log("OCR Result in content script:", message.text);
    // Наприклад, показати alert:
    // alert("Розпізнаний текст: " + message.text);
  }
});

/**
 * Запускає режим виділення області на сторінці (оверлей + прямокутник).
 */
function startSelection() {
  // Створюємо напівпрозорий оверлей
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.2)';
  overlay.style.zIndex = '999999';
  document.body.appendChild(overlay);

  let startX, startY, endX, endY;
  let selectionBox = document.createElement('div');
  selectionBox.style.border = '2px dashed #fff';
  selectionBox.style.position = 'absolute';
  overlay.appendChild(selectionBox);

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);

  function onMouseDown(e) {
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  }

  function onMouseMove(e) {
    if (startX === undefined || startY === undefined) return;
    endX = e.clientX;
    endY = e.clientY;
    selectionBox.style.left = Math.min(startX, endX) + 'px';
    selectionBox.style.top = Math.min(startY, endY) + 'px';
    selectionBox.style.width = Math.abs(endX - startX) + 'px';
    selectionBox.style.height = Math.abs(endY - startY) + 'px';
  }

  function onMouseUp(e) {
    overlay.removeEventListener('mousedown', onMouseDown);
    overlay.removeEventListener('mousemove', onMouseMove);
    overlay.removeEventListener('mouseup', onMouseUp);
    document.body.removeChild(overlay);

    const rect = selectionBox.getBoundingClientRect();
    console.log("Selected area:", rect);

    // Надсилаємо координати області у фоновий скрипт для знімку екрана
    chrome.runtime.sendMessage({ action: 'captureScreen', rect: rect });
  }
}

/**
 * Обрізає скриншот із урахуванням devicePixelRatio, щоб уникнути порожньої ділянки.
 * @param {string} dataUrl – скриншот у форматі base64
 * @param {DOMRect} rect – координати області (у CSS‑пікселях)
 */
function cropImageInDOM(dataUrl, rect) {
  // Масштаб для HiDPI
  const scale = window.devicePixelRatio || 1;
  console.log("Cropping with scale =", scale);

  const img = new Image();
  img.onload = function() {
    // Перевіримо реальні розміри скриншота
    console.log("Screenshot dimensions:", img.naturalWidth, "x", img.naturalHeight);

    // Створюємо canvas (у фізичних пікселях)
    const canvas = document.createElement('canvas');
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext('2d');

    // Обрізаємо потрібну частину зображення з урахуванням масштабу
    ctx.drawImage(
      img,
      rect.left * scale,
      rect.top * scale,
      rect.width * scale,
      rect.height * scale,
      0,
      0,
      rect.width * scale,
      rect.height * scale
    );

    // Отримуємо base64 обрізаного зображення
    const croppedDataUrl = canvas.toDataURL('image/png');
    console.log("Cropped image length:", croppedDataUrl.length);

    // Відправляємо обрізане зображення у фоновий скрипт
    chrome.runtime.sendMessage({
      action: 'croppedData',
      croppedDataUrl: croppedDataUrl
    });
  };
  img.onerror = function(e) {
    console.error("Failed to load screenshot image:", e);
  };
  img.src = dataUrl;
}
