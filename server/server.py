from flask import Flask, request, jsonify
import cv2
import numpy as np
import pytesseract
import base64

app = Flask(__name__)

# Якщо ви використовуєте Windows, вкажіть шлях до tesseract.exe:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

@app.route('/ocr', methods=['POST'])
def ocr():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400
    
    image_data = data['image']
    # Якщо дані містять префікс data URL, видаляємо його
    if image_data.startswith('data:image'):
        image_data = image_data.split(',')[1]
    
    try:
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        return jsonify({'error': f'Error processing image: {str(e)}'}), 500
    
    # Попередня обробка: перетворення у відтінки сірого та порогова бінаризація
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Виконуємо OCR з підтримкою декількох мов (англійська, українська, спрощені ієрогліфи)
    recognized_text = pytesseract.image_to_string(thresh, lang='eng+ukr+chi_sim')
    
    return jsonify({'text': recognized_text})

if __name__ == '__main__':
    app.run(debug=True)
