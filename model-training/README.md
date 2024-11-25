# Music Symbol Detection Model Training

This directory contains scripts and tools for training a custom Optical Music Recognition (OMR) model using TensorFlow.js. The model is designed to detect and classify musical symbols in sheet music PDFs.

## Directory Structure

```
model-training/
├── data/           # Processed training data
├── raw-data/       # Raw training images
├── scripts/        # Training scripts
└── README.md       # This file
```

## Training Data Format

### Images
- Place your training images in the `raw-data/` directory
- Supported formats: PNG, JPG
- Images will be automatically resized to 224x224 pixels

### Annotations
For each image, create a JSON file with the same name (e.g., `score1.png` → `score1.json`) containing symbol annotations:

```json
{
  "symbols": [
    {
      "class": "treble_clef",
      "bbox": {
        "x": 10,
        "y": 20,
        "width": 30,
        "height": 60
      }
    },
    {
      "class": "quarter_note",
      "bbox": {
        "x": 50,
        "y": 30,
        "width": 15,
        "height": 25
      }
    }
  ],
  "imageWidth": 224,
  "imageHeight": 224
}
```

## Supported Symbol Classes

- Clefs: treble_clef, bass_clef
- Notes: whole_note, half_note, quarter_note, eighth_note
- Rests: whole_rest, half_rest, quarter_rest, eighth_rest
- More classes can be added in `train-omr-model.ts`

## Training Steps

1. **Prepare Your Data**
   ```bash
   # Install dependencies
   npm install

   # Process training data
   npx ts-node scripts/prepare-data.ts
   ```

2. **Train the Model**
   ```bash
   npx ts-node scripts/train-omr-model.ts
   ```

   The model will be saved to `public/models/music-detection/`.

## Training Configuration

You can adjust training parameters in `train-omr-model.ts`:

```typescript
const config = {
  epochs: 50,        // Number of training epochs
  batchSize: 32,     // Batch size for training
  learningRate: 0.001,
  validationSplit: 0.2  // 20% of data used for validation
};
```

## Model Architecture

The model uses a simplified MobileNetV2-style architecture:
- Input: 224x224x3 RGB image
- Feature extraction: 3 convolutional blocks
- Detection head: Dense layers for bounding box and class prediction
- Output: [x1, y1, x2, y2, class_id, confidence] for each detected symbol

## Annotation Tips

1. **Bounding Boxes**
   - Make boxes as tight as possible around symbols
   - Include ledger lines with notes
   - For beamed notes, annotate each note separately

2. **Class Labels**
   - Use exact class names from the supported list
   - Be consistent with annotations
   - Mark unclear symbols as 'unknown' (they will be skipped)

3. **Quality Control**
   - Ensure images are clear and well-scanned
   - Verify annotations before training
   - Use a diverse set of training examples

## Using the Trained Model

The trained model will be automatically used by the PDF import system. The model performs:
- Symbol detection and classification
- Pitch and duration recognition
- Staff line detection
- Musical element relationship analysis
