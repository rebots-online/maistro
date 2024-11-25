import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file to disk
    const uploadDir = join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, file.name);
    await writeFile(filePath, buffer);

    // Run YOLO detection
    const modelPath = join(process.cwd(), 'runs/detect/sheet_music_detector/weights/best.pt');
    
    return new Promise((resolve) => {
      const yolo = spawn('yolo', [
        'detect',
        'predict',
        `model=${modelPath}`,
        `source=${filePath}`,
        'conf=0.25',
        'save=True',
        'save_txt=True'
      ]);

      let output = '';
      let error = '';

      yolo.stdout.on('data', (data) => {
        output += data.toString();
      });

      yolo.stderr.on('data', (data) => {
        error += data.toString();
      });

      yolo.on('close', (code) => {
        if (code !== 0) {
          resolve(NextResponse.json(
            { error: 'Error processing image', details: error },
            { status: 500 }
          ));
        } else {
          resolve(NextResponse.json({
            result: output,
            detections: {
              // Parse and return the detection results
              image: `/results/${file.name}`,
              predictions: output
            }
          }));
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error processing request' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'API is running' });
}
