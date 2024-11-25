import os
from roboflow import Roboflow
from ultralytics import YOLO
from dotenv import load_dotenv
import yaml
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class ModelTrainer:
    def __init__(self):
        self.rf = Roboflow(api_key=os.getenv("ROBOFLOW_API_KEY"))
        self.project = self.rf.workspace("maistro").project("sheet-music-omr")
        
    def download_dataset(self, version=1):
        """Download dataset from Roboflow"""
        logger.info(f"Downloading dataset version {version}")
        dataset = self.project.version(version).download("yolov8")
        return dataset.location
        
    def train_model(self, data_yaml_path, epochs=100, imgsz=640):
        """Train YOLOv11 model"""
        logger.info("Starting model training with YOLOv11")
        
        # Load the YAML file and modify paths if needed
        with open(data_yaml_path, 'r') as file:
            data_config = yaml.safe_load(file)
        
        # Initialize YOLOv11 model
        model = YOLO('yolo11n.pt')  # Load pretrained YOLOv11 model
        
        # Train the model with YOLOv11-specific optimizations
        try:
            results = model.train(
                data=data_yaml_path,
                epochs=epochs,
                imgsz=imgsz,
                batch=12,  # Reduced batch size for GPU stability
                name='sheet_music_detector_v11',
                device=0,  # Use GPU
                amp=True,  # Enable mixed precision training
                cache=True,  # Cache images in RAM
                workers=8  # Number of worker threads for data loading
            )
            logger.info("Training completed successfully")
            return results
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            raise

    def validate_model(self, data_yaml_path):
        """Validate the trained model"""
        logger.info("Starting model validation")
        try:
            model = YOLO('runs/detect/sheet_music_detector_v11/weights/best.pt')
            results = model.val(data=data_yaml_path)
            logger.info("Validation completed successfully")
            return results
        except Exception as e:
            logger.error(f"Error during validation: {str(e)}")
            raise

def main():
    trainer = ModelTrainer()
    
    # Download dataset
    dataset_path = trainer.download_dataset(version=1)
    data_yaml_path = os.path.join(dataset_path, 'data.yaml')
    
    # Train model
    trainer.train_model(data_yaml_path)
    
    # Validate model
    trainer.validate_model(data_yaml_path)
    
    logger.info("Model training and validation completed")

if __name__ == "__main__":
    main()
