import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import * as path from 'path';

interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

interface SymbolClass {
  id: number;
  name: string;
  type: 'note' | 'rest' | 'clef' | 'timeSignature' | 'keySignature' | 'chord';
}

const SYMBOL_CLASSES: SymbolClass[] = [
  { id: 0, name: 'treble_clef', type: 'clef' },
  { id: 1, name: 'bass_clef', type: 'clef' },
  { id: 2, name: 'whole_note', type: 'note' },
  { id: 3, name: 'half_note', type: 'note' },
  { id: 4, name: 'quarter_note', type: 'note' },
  { id: 5, name: 'eighth_note', type: 'note' },
  { id: 6, name: 'whole_rest', type: 'rest' },
  { id: 7, name: 'half_rest', type: 'rest' },
  { id: 8, name: 'quarter_rest', type: 'rest' },
  { id: 9, name: 'eighth_rest', type: 'rest' },
  // Add more classes as needed
];

const config: TrainingConfig = {
  epochs: 50,
  batchSize: 8,  // Reduced batch size due to larger images
  learningRate: 0.001,
  validationSplit: 0.2
};

async function createModel() {
  const model = tf.sequential();

  // Input shape matches our new image dimensions
  const INPUT_HEIGHT = 1024;
  const INPUT_WIDTH = 1448;
  
  // Initial convolution with stride 2 to reduce dimensions
  model.add(tf.layers.conv2d({
    inputShape: [INPUT_HEIGHT, INPUT_WIDTH, 3],
    filters: 32,
    kernelSize: 7,
    strides: 2,
    padding: 'same',
    activation: 'relu'
  }));
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  
  // Feature extraction blocks with residual connections
  for (let filters of [64, 128, 256]) {
    // Regular convolution path
    model.add(tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    
    // Residual connection
    model.add(tf.layers.conv2d({
      filters,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    
    // Reduce dimensions
    model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  }

  // Feature pyramid network for multi-scale detection
  const pyramidLevels = [
    { filters: 256, size: 1 },
    { filters: 256, size: 2 },
    { filters: 256, size: 4 }
  ];

  const pyramidOutputs = [];
  for (const level of pyramidLevels) {
    const pyramid = tf.layers.conv2d({
      filters: level.filters,
      kernelSize: 3,
      padding: 'same',
      activation: 'relu'
    });
    pyramidOutputs.push(pyramid);
  }

  // Detection heads
  model.add(tf.layers.conv2d({
    filters: 256,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu'
  }));
  
  // Separate heads for classification and bounding boxes
  const numAnchors = 9;  // 3 scales x 3 aspect ratios
  
  // Classification head
  model.add(tf.layers.conv2d({
    filters: numAnchors * SYMBOL_CLASSES.length,
    kernelSize: 3,
    padding: 'same',
    activation: 'sigmoid'
  }));

  // Bounding box regression head
  model.add(tf.layers.conv2d({
    filters: numAnchors * 4,  // x, y, width, height
    kernelSize: 3,
    padding: 'same',
    activation: 'linear'
  }));

  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: {
      classification: 'binaryCrossentropy',
      bbox: 'meanSquaredError'
    },
    metrics: ['accuracy']
  });

  return model;
}

async function loadTrainingData() {
  const dataDir = path.join(__dirname, '../data');
  const imageFiles = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.png') || file.endsWith('.jpg'));

  const images: tf.Tensor4D[] = [];
  const labels: tf.Tensor2D[] = [];

  for (const file of imageFiles) {
    const imagePath = path.join(dataDir, file);
    const labelPath = path.join(dataDir, file.replace(/\.(png|jpg)$/, '.json'));

    if (!fs.existsSync(labelPath)) continue;

    // Load and preprocess image
    const imageBuffer = fs.readFileSync(imagePath);
    const imageTensor = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D;
    const normalized = imageTensor.div(255.0);
    images.push(normalized.expandDims(0) as tf.Tensor4D);

    // Load and process labels
    const labelData = JSON.parse(fs.readFileSync(labelPath, 'utf-8'));
    const label = processLabel(labelData);
    labels.push(label);

    // Clean up tensors
    imageTensor.dispose();
  }

  return {
    images: tf.concat(images, 0),
    labels: tf.concat(labels, 0)
  };
}

function processLabel(labelData: any): tf.Tensor2D {
  // Convert label data to tensor format
  // [x1, y1, x2, y2, class_id, confidence] for each detected object
  const labelArray = labelData.symbols.map((symbol: any) => [
    symbol.bbox.x / 1448,  // Normalize coordinates
    symbol.bbox.y / 1024,
    (symbol.bbox.x + symbol.bbox.width) / 1448,
    (symbol.bbox.y + symbol.bbox.height) / 1024,
    SYMBOL_CLASSES.findIndex(c => c.name === symbol.class),
    1.0 // confidence score
  ]);

  return tf.tensor2d(labelArray);
}

async function trainModel() {
  console.log('Creating model...');
  const model = await createModel();

  console.log('Loading training data...');
  const { images, labels } = await loadTrainingData();

  console.log('Starting training...');
  await model.fit(images, labels, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.accuracy.toFixed(4)}`);
      }
    }
  });

  // Save the model
  const saveDir = path.join(__dirname, '../../public/models/music-detection');
  await model.save(`file://${saveDir}`);
  console.log(`Model saved to ${saveDir}`);

  // Clean up
  images.dispose();
  labels.dispose();
  model.dispose();
}

// Run the training
trainModel().catch(console.error);
