import cv2
import numpy as np
from ultralytics import YOLO
import logging
from pathlib import Path
import argparse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SheetMusicEvaluator:
    def __init__(self, model_path='runs/detect/sheet_music_detector_v12/weights/best.pt'):
        """Initialize the evaluator with a trained YOLOv12 model"""
        self.model = YOLO(model_path)
        logger.info(f"Loaded YOLOv12 model from {model_path}")

    def predict(self, image_path):
        """Run prediction on a single image"""
        logger.info(f"Processing image: {image_path}")

        # Run inference with YOLOv12-specific settings
        results = self.model(image_path, conf=0.25, iou=0.45, agnostic_nms=True)

        # Process and visualize results
        img = cv2.imread(str(image_path))
        annotated_img = self._draw_predictions(img, results[0])

        # Save annotated image
        output_path = Path(str(image_path).replace('.png', '_annotated.png'))
        cv2.imwrite(str(output_path), annotated_img)
        logger.info(f"Saved annotated image to {output_path}")

        return results[0]

    def _draw_predictions(self, img, result):
        """Draw bounding boxes and labels on the image"""
        for box in result.boxes:
            # Get box coordinates
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # Get class and confidence
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            # Draw box
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Add label
            label = f"{result.names[cls]} {conf:.2f}"
            cv2.putText(img, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        return img

    def evaluate_directory(self, test_dir):
        """Evaluate all images in a directory"""
        test_dir = Path(test_dir)
        image_files = list(test_dir.glob("*.png"))

        logger.info(f"Found {len(image_files)} images to evaluate")

        for image_path in image_files:
            self.predict(image_path)

def main():
    parser = argparse.ArgumentParser(description='Evaluate sheet music detection using YOLOv12 model')
    parser.add_argument('--model', type=str,
                       default='runs/detect/sheet_music_detector_v12/weights/best.pt',
                       help='Path to model weights')
    parser.add_argument('--test_dir', type=str, required=True,
                       help='Directory containing test images')

    args = parser.parse_args()

    evaluator = SheetMusicEvaluator(args.model)
    evaluator.evaluate_directory(args.test_dir)

if __name__ == "__main__":
    main()
