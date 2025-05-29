from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import json

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)

# Initialize YOLO model
print("Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')  # This will download the model if not present
print("YOLOv8 model loaded successfully!")

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/detect', methods=['POST'])
def detect_objects():
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64, prefix
        image_bytes = base64.b64decode(image_data)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Run YOLO detection
        results = model(opencv_image)
        
        # Process results
        detections = []
        image_height, image_width = opencv_image.shape[:2]
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    # Get confidence and class
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = model.names[class_id]
                    
                    # Convert to relative coordinates (0-1)
                    detection = {
                        'class': class_name,
                        'confidence': round(confidence, 3),
                        'bbox': {
                            'x1': float(x1) / image_width,
                            'y1': float(y1) / image_height,
                            'x2': float(x2) / image_width,
                            'y2': float(y2) / image_height
                        }
                    }
                    
                    # Only include detections with confidence > 0.3
                    if confidence > 0.3:
                        detections.append(detection)
        
        response = {
            'detections': detections,
            'image_dimensions': {
                'width': image_width,
                'height': image_height
            },
            'total_objects': len(detections)
        }
        
        return jsonify(response)
    
    except Exception as e:
        print(f"Error in detection: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model': 'YOLOv8n',
        'version': '1.0.0'
    })

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    print("Make sure to run the React build first!")
    app.run(host='0.0.0.0', port=5000, debug=True)