from roboflow import Roboflow
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Initialize Roboflow
rf = Roboflow(api_key=os.getenv("ROBOFLOW_API_KEY"))

def get_project():
    """Get the existing project"""
    try:
        workspace = rf.workspace("maistro")
        project = workspace.project("sheet-music-omr")
        print("Connected to project: sheet-music-omr")
        return project
    except Exception as e:
        print("\nError:", str(e))
        print("\nTroubleshooting steps:")
        print("1. Check that your API key is correct in the .env file")
        print("2. Make sure you can see the project at: https://app.roboflow.com/maistro/sheet-music-omr")
        print("3. Try refreshing your API key in the Roboflow dashboard")
        raise

def upload_batch(project, image_paths, split):
    """Upload a batch of images to a specific split"""
    for image_path in image_paths:
        try:
            print(f"Uploading {image_path.name} to {split} set...")
            
            # Upload image to Roboflow
            project.upload(
                image_path=str(image_path),
                split=split
            )
            print(f"Successfully uploaded {image_path.name}")
            
        except Exception as e:
            print(f"Error uploading {image_path.name}: {str(e)}")
            print("Continuing with next image...")

def upload_images(project):
    """Upload images to Roboflow project"""
    
    raw_data_path = Path("/home/robin/CascadeProjects/maistro/model-training/raw-data")
    all_images = list(raw_data_path.glob("*.png"))
    total_images = len(all_images)
    
    print(f"\nFound {total_images} images to upload")
    
    # Split images into train/test/valid sets
    train_split = int(total_images * 0.7)
    test_split = int(total_images * 0.9)
    
    # Sort images for consistent splitting
    all_images.sort()
    
    # Upload each split
    print("\nUploading training set (70%)...")
    upload_batch(project, all_images[:train_split], "train")
    
    print("\nUploading test set (20%)...")
    upload_batch(project, all_images[train_split:test_split], "test")
    
    print("\nUploading validation set (10%)...")
    upload_batch(project, all_images[test_split:], "valid")

def main():
    try:
        print("Connecting to Roboflow project...")
        project = get_project()
        
        print("\nPreparing to upload images...")
        upload_images(project)
        
        print("\nUpload complete!")
        print("\nNext steps:")
        print("1. Go to https://app.roboflow.com and select your project")
        print("2. Click on 'Images' to see your uploaded images")
        print("3. Use the annotation interface to label musical elements")
        print("4. Once annotated, you can train your model")
        
    except Exception as e:
        print(f"\nError: {str(e)}")
        print("\nTroubleshooting steps:")
        print("1. Check that your API key is correct in the .env file")
        print("2. Make sure you can see the project in your Roboflow dashboard")
        print("3. Try refreshing your API key in the Roboflow dashboard")

if __name__ == "__main__":
    main()
