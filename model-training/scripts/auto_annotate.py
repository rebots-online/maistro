import cv2
import numpy as np
from pathlib import Path
import json
from roboflow import Roboflow
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AutoAnnotator:
    def __init__(self):
        self.rf = Roboflow(api_key=os.getenv("ROBOFLOW_API_KEY"))
        self.project = self.rf.workspace("maistro").project("sheet-music-omr")
        
    def detect_staff_lines(self, image):
        """Detect staff lines using horizontal line detection"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        
        # Use HoughLinesP to detect lines
        lines = cv2.HoughLinesP(
            edges, 1, np.pi/180, 
            threshold=100, 
            minLineLength=100, 
            maxLineGap=10
        )
        
        staff_lines = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                # Filter for nearly horizontal lines
                if abs(y2 - y1) < 10:  # Allow small slope
                    staff_lines.append({
                        'x1': int(x1),
                        'y1': int(y1),
                        'x2': int(x2),
                        'y2': int(y2)
                    })
        
        return staff_lines

    def detect_notes(self, image):
        """Detect musical notes using blob detection"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Set up the blob detector parameters
        params = cv2.SimpleBlobDetector_Params()
        params.filterByArea = True
        params.minArea = 100
        params.maxArea = 500
        params.filterByCircularity = True
        params.minCircularity = 0.1
        params.filterByConvexity = True
        params.minConvexity = 0.5
        
        # Create blob detector
        detector = cv2.SimpleBlobDetector_create(params)
        keypoints = detector.detect(255 - gray)  # Invert image for black blob detection
        
        notes = []
        for kp in keypoints:
            x, y = kp.pt
            r = kp.size / 2
            notes.append({
                'x': int(x),
                'y': int(y),
                'radius': int(r)
            })
        
        return notes

    def generate_roboflow_annotations(self, image_path, staff_lines, notes):
        """Generate annotations in Roboflow format"""
        image = cv2.imread(str(image_path))
        height, width = image.shape[:2]
        
        annotations = []
        
        # Add staff lines
        for line in staff_lines:
            # Convert to normalized coordinates
            x_center = (line['x1'] + line['x2']) / 2 / width
            y_center = (line['y1'] + line['y2']) / 2 / height
            w = abs(line['x2'] - line['x1']) / width
            h = max(abs(line['y2'] - line['y1']), 1) / height  # Minimum height of 1 pixel
            
            annotations.append({
                "class": "staff_line",
                "x": x_center,
                "y": y_center,
                "width": w,
                "height": h
            })
        
        # Add notes
        for note in notes:
            # Convert to normalized coordinates
            x_center = note['x'] / width
            y_center = note['y'] / height
            w = (note['radius'] * 2) / width
            h = (note['radius'] * 2) / height
            
            annotations.append({
                "class": "note",
                "x": x_center,
                "y": y_center,
                "width": w,
                "height": h
            })
        
        return annotations

    def process_image(self, image_path):
        """Process a single image and generate annotations"""
        image = cv2.imread(str(image_path))
        if image is None:
            print(f"Error loading image: {image_path}")
            return None
        
        staff_lines = self.detect_staff_lines(image)
        notes = self.detect_notes(image)
        
        return self.generate_roboflow_annotations(image_path, staff_lines, notes)

    def upload_annotations(self, image_path, annotations):
        """Upload annotations to Roboflow"""
        try:
            # Convert annotations to Roboflow format
            annotation_data = {
                "name": Path(image_path).name,
                "annotations": annotations
            }
            
            # Upload annotations
            self.project.upload(
                image_path=str(image_path),
                annotation_data=annotation_data
            )
            print(f"Successfully uploaded annotations for {Path(image_path).name}")
            
        except Exception as e:
            print(f"Error uploading annotations for {Path(image_path).name}: {str(e)}")

def main():
    # Initialize auto annotator
    annotator = AutoAnnotator()
    
    # Get all images in the raw-data directory
    raw_data_path = Path("/home/robin/CascadeProjects/maistro/model-training/raw-data")
    image_files = list(raw_data_path.glob("*.png"))
    
    print(f"Found {len(image_files)} images to process")
    
    # Process each image
    for image_path in image_files:
        print(f"\nProcessing {image_path.name}...")
        
        # Generate annotations
        annotations = annotator.process_image(image_path)
        if annotations:
            # Upload annotations to Roboflow
            annotator.upload_annotations(image_path, annotations)

if __name__ == "__main__":
    main()
