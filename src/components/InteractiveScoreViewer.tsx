import React, { useEffect, useRef, useState } from 'react';
import { PDFProcessor } from '../lib/omr/pdf-processor';
import { MusicalElement, ChordProperties } from '../lib/omr/types';
import { analyzeChordProgression } from '../lib/analysis/harmony';

interface InteractiveScoreViewerProps {
  pdfUrl: string;
  onElementHover?: (element: MusicalElement | null) => void;
  onChordAnalysis?: (analysis: string) => void;
}

export const InteractiveScoreViewer: React.FC<InteractiveScoreViewerProps> = ({
  pdfUrl,
  onElementHover,
  onChordAnalysis
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<MusicalElement[]>([]);
  const [hoveredElement, setHoveredElement] = useState<MusicalElement | null>(null);
  const [scale, setScale] = useState(1);
  const processor = useRef<PDFProcessor | null>(null);

  useEffect(() => {
    processor.current = new PDFProcessor();
    loadPDF();

    return () => {
      processor.current?.cleanup();
    };
  }, [pdfUrl]);

  const loadPDF = async () => {
    try {
      const response = await fetch(pdfUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await processor.current!.processPDF(arrayBuffer);
      setElements(result.elements);
    } catch (error) {
      console.error('Failed to load PDF:', error);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    // Find element under cursor
    const element = elements.find(el => {
      const box = el.boundingBox;
      return (
        x >= box.x &&
        x <= box.x + box.width &&
        y >= box.y &&
        y <= box.y + box.height &&
        box.page === 1 // For now, just handle first page
      );
    });

    setHoveredElement(element || null);
    onElementHover?.(element || null);

    // If it's a chord, analyze the progression
    if (element?.type === 'chord') {
      const chordProps = element.properties as ChordProperties;
      const progression = analyzeChordProgression([chordProps]);
      onChordAnalysis?.(progression);
    }
  };

  const renderTooltip = () => {
    if (!hoveredElement) return null;

    let content = '';
    switch (hoveredElement.type) {
      case 'note':
        const note = hoveredElement.properties as any;
        content = `${note.pitch} ${note.duration}`;
        if (note.ledgerLines) {
          content += ` (${Math.abs(note.ledgerLines)} ledger line${
            Math.abs(note.ledgerLines) > 1 ? 's' : ''
          } ${note.ledgerLines > 0 ? 'above' : 'below'})`;
        }
        break;
      case 'chord':
        const chord = hoveredElement.properties as ChordProperties;
        content = `${chord.root} ${chord.quality} (${
          chord.inversion === 0
            ? 'root position'
            : `${chord.inversion}${chord.inversion === 1 ? 'st' : 'nd'} inversion`
        })`;
        if (chord.function) {
          content += ` - ${chord.function}`;
        }
        break;
      // Add cases for other musical elements
    }

    return (
      <div
        className="tooltip"
        style={{
          position: 'absolute',
          left: hoveredElement.boundingBox.x * scale,
          top: (hoveredElement.boundingBox.y + hoveredElement.boundingBox.height) * scale,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '14px',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="interactive-score-viewer">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        style={{ cursor: 'pointer' }}
      />
      {renderTooltip()}
    </div>
  );
};
