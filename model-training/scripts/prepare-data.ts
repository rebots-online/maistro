import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Symbol {
  class: string;
  bbox: BoundingBox;
}

interface AnnotationData {
  symbols: Symbol[];
  imageWidth: number;
  imageHeight: number;
}

async function processImage(imagePath: string, outputDir: string) {
  const filename = path.basename(imagePath);
  const outputImagePath = path.join(outputDir, filename);
  const outputJsonPath = path.join(outputDir, filename.replace(/\.(png|jpg)$/, '.json'));

  // Standard height for a 5-line staff is about 32px
  // We want to fit at least 4 octaves above and below (8 additional staves worth of space)
  // Plus extra space for title, tempo markings, etc.
  // So minimum height = (32px * 9 staves) + 200px padding = 488px
  // Width should maintain typical sheet music proportions (roughly 1.4:1)
  const TARGET_HEIGHT = 1024; // Power of 2, comfortably fits our minimum
  const TARGET_WIDTH = 1448;  // Maintains roughly 1.4:1 ratio

  // Resize image while maintaining aspect ratio within constraints
  await sharp(imagePath)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile(outputImagePath);

  // Get image dimensions
  const metadata = await sharp(imagePath).metadata();
  
  // Create empty annotation file
  const annotation: AnnotationData = {
    symbols: [],
    imageWidth: metadata.width || 0,
    imageHeight: metadata.height || 0
  };

  fs.writeFileSync(outputJsonPath, JSON.stringify(annotation, null, 2));
  
  console.log(`Processed ${filename}`);
  console.log(`Created annotation file: ${path.basename(outputJsonPath)}`);
  console.log(`Image dimensions: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
}

async function prepareDataset(inputDir: string, outputDir: string) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.png') || file.endsWith('.jpg'));

  for (const file of files) {
    const imagePath = path.join(inputDir, file);
    await processImage(imagePath, outputDir);
  }
}

// Usage example
const inputDir = path.join(__dirname, '../raw-data');
const outputDir = path.join(__dirname, '../data');

prepareDataset(inputDir, outputDir).catch(console.error);
