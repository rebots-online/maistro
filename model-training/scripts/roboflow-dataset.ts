import { Roboflow } from 'roboflow-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface RoboflowConfig {
  apiKey: string;
  projectId: string;
  version: number;
  format: 'yolov5' | 'coco' | 'voc';
}

async function setupRoboflowProject() {
  const rf = new Roboflow({
    apiKey: process.env.ROBOFLOW_API_KEY
  });

  // Create a new project for sheet music annotation
  const project = await rf.project({
    name: "sheet-music-omr",
    license: "MIT",
    type: "object-detection"
  });

  // Define our classes
  const classes = [
    // Staff Elements
    { name: "staff_line", color: "#FF0000" },
    { name: "bar_line", color: "#00FF00" },
    
    // Clefs
    { name: "treble_clef", color: "#0000FF" },
    { name: "bass_clef", color: "#FF00FF" },
    { name: "alto_clef", color: "#00FFFF" },
    
    // Notes
    { name: "whole_note", color: "#FFFF00" },
    { name: "half_note", color: "#FF8000" },
    { name: "quarter_note", color: "#8000FF" },
    { name: "eighth_note", color: "#0080FF" },
    { name: "sixteenth_note", color: "#80FF00" },
    
    // Note Modifiers
    { name: "dot", color: "#FF0080" },
    { name: "sharp", color: "#00FF80" },
    { name: "flat", color: "#0080FF" },
    { name: "natural", color: "#8000FF" },
    
    // Rests
    { name: "whole_rest", color: "#FF8080" },
    { name: "half_rest", color: "#80FF80" },
    { name: "quarter_rest", color: "#8080FF" },
    { name: "eighth_rest", color: "#FF80FF" },
    
    // Time Signatures
    { name: "time_sig_number", color: "#80FFFF" },
    
    // Expression Marks
    { name: "dynamic_mark", color: "#FFFF80" },
    { name: "tempo_mark", color: "#FFA080" }
  ];

  // Add classes to project
  for (const cls of classes) {
    await project.addClass(cls);
  }

  return project;
}

async function uploadToRoboflow(imagePath: string, project: any) {
  const imageBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);

  // Upload image to Roboflow
  await project.upload(imageBuffer, {
    name: fileName,
    split: 'train' // or 'valid' or 'test'
  });

  console.log(`Uploaded ${fileName} to Roboflow`);
}

async function downloadAnnotations(config: RoboflowConfig, outputDir: string) {
  const rf = new Roboflow({
    apiKey: config.apiKey
  });

  const project = await rf.project(config.projectId);
  const dataset = await project.version(config.version).download(config.format);

  // Save dataset to disk
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save images and annotations
  for (const item of dataset.items) {
    const imagePath = path.join(outputDir, item.image);
    const annotationPath = path.join(
      outputDir, 
      item.image.replace(/\.(jpg|png)$/, '.json')
    );

    // Save image
    fs.writeFileSync(imagePath, item.imageData);

    // Convert annotations to our format
    const annotations = convertAnnotations(item.annotations, item.size);
    fs.writeFileSync(annotationPath, JSON.stringify(annotations, null, 2));
  }

  console.log(`Downloaded dataset to ${outputDir}`);
}

function convertAnnotations(roboflowAnnotations: any[], imageSize: { width: number; height: number }) {
  return {
    symbols: roboflowAnnotations.map(ann => ({
      class: ann.class,
      bbox: {
        x: ann.bbox.x * imageSize.width,
        y: ann.bbox.y * imageSize.height,
        width: ann.bbox.width * imageSize.width,
        height: ann.bbox.height * imageSize.height
      },
      confidence: ann.confidence || 1.0
    })),
    imageWidth: imageSize.width,
    imageHeight: imageSize.height
  };
}

// Example usage
async function main() {
  if (!process.env.ROBOFLOW_API_KEY) {
    console.error('Please set ROBOFLOW_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    // Setup new project (only needed once)
    const project = await setupRoboflowProject();
    console.log('Project created:', project.id);

    // Upload images (during dataset creation)
    const imagesDir = path.join(__dirname, '../raw-data');
    const images = fs.readdirSync(imagesDir)
      .filter(file => file.endsWith('.png') || file.endsWith('.jpg'));

    for (const image of images) {
      await uploadToRoboflow(path.join(imagesDir, image), project);
    }

    // After annotation in Roboflow UI, download the annotated dataset
    await downloadAnnotations({
      apiKey: process.env.ROBOFLOW_API_KEY,
      projectId: project.id,
      version: 1,
      format: 'coco'
    }, path.join(__dirname, '../data'));

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
