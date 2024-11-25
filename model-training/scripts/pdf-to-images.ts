const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

interface ConversionOptions {
  resolution: number; // DPI for conversion
  outputFormat: 'png' | 'jpg';
  targetWidth?: number;
  targetHeight?: number;
}

async function convertPDFToImages(
  pdfPath: string,
  outputDir: string,
  options: ConversionOptions = { resolution: 300, outputFormat: 'png' }
) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const pdfName = path.basename(pdfPath, '.pdf');
  const tempDir = path.join(outputDir, 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // Use pdftoppm for high-quality conversion
    const command = `pdftoppm -${options.outputFormat} -r ${options.resolution} "${pdfPath}" "${path.join(tempDir, pdfName)}"`;
    await execAsync(command);

    // Get all converted images
    const files = fs.readdirSync(tempDir)
      .filter((file: string) => file.startsWith(pdfName) && file.endsWith(`.${options.outputFormat}`))
      .sort();

    // Process each image with sharp
    for (const [index, file] of files.entries()) {
      const inputPath = path.join(tempDir, file);
      const outputPath = path.join(outputDir, `${pdfName}_page${index + 1}.${options.outputFormat}`);

      let sharpInstance = sharp(inputPath);

      // Resize if target dimensions are specified
      if (options.targetWidth && options.targetHeight) {
        sharpInstance = sharpInstance.resize(options.targetWidth, options.targetHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        });
      }

      await sharpInstance.toFile(outputPath);
      console.log(`Converted page ${index + 1}/${files.length} from ${pdfName}`);
    }

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`\nProcessed all ${files.length} pages from ${pdfName}`);

  } catch (error) {
    console.error('Error converting PDF:', error);
    throw error;
  }
}

async function processAllPDFs(
  inputDir: string,
  outputDir: string,
  options: ConversionOptions
) {
  const pdfs = fs.readdirSync(inputDir)
    .filter((file: string) => file.toLowerCase().endsWith('.pdf'));

  console.log(`Found ${pdfs.length} PDF files to process`);
  let totalPages = 0;

  for (const pdf of pdfs) {
    const pdfPath = path.join(inputDir, pdf);
    console.log(`\nProcessing ${pdf}...`);
    await convertPDFToImages(pdfPath, outputDir, options);
  }

  console.log('\nAll PDFs processed successfully');
}

async function main() {
  const inputDir = path.join(__dirname, '../sheet-music-pdfs');
  const outputDir = path.join(__dirname, '../raw-data');

  const conversionOptions: ConversionOptions = {
    resolution: 300,
    outputFormat: 'png',
    targetWidth: 1448,  // Match our OMR model's expected input size
    targetHeight: 1024
  };

  try {
    await processAllPDFs(inputDir, outputDir, conversionOptions);
  } catch (error) {
    console.error('Error processing PDFs:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convertPDFToImages, processAllPDFs };
