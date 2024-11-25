import React, { useEffect, useRef, useState } from 'react';
import { Score, ScoreSelection, Note } from '../lib/score/types';
import { ScoreEditor as ScoreEditorClass } from '../lib/score/editor';
import { ThemeAnalyzer, Theme } from '../lib/score/theme-analysis';

interface ScoreEditorProps {
  initialScore?: Score;
  onScoreChange?: (score: Score) => void;
  onSelectionChange?: (selection: ScoreSelection | undefined) => void;
}

export const ScoreEditor: React.FC<ScoreEditorProps> = ({
  initialScore,
  onScoreChange,
  onSelectionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ScoreEditorClass | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');
  const [themeAnalyzer, setThemeAnalyzer] = useState<ThemeAnalyzer | null>(null);
  const [activeThemes, setActiveThemes] = useState<Theme[]>([]);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const editor = new ScoreEditorClass(containerRef.current, initialScore);
      
      editor.on('scoreChanged', (score: Score) => {
        onScoreChange?.(score);
        // Update theme analyzer when score changes
        const analyzer = new ThemeAnalyzer(score);
        setThemeAnalyzer(analyzer);
      });

      editor.on('selectionChanged', (selection: ScoreSelection | undefined) => {
        onSelectionChange?.(selection);
      });

      editorRef.current = editor;
      
      // Initialize theme analyzer
      if (initialScore) {
        const analyzer = new ThemeAnalyzer(initialScore);
        setThemeAnalyzer(analyzer);
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeAllListeners();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && editorRef.current) {
        editorRef.current.render();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    if (editorRef.current) {
      const state = editorRef.current.getState();
      state.activeTool = tool;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!editorRef.current) return;

    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'z':
          if (event.shiftKey) {
            editorRef.current.redo();
          } else {
            editorRef.current.undo();
          }
          event.preventDefault();
          break;
        case 'y':
          editorRef.current.redo();
          event.preventDefault();
          break;
      }
    }

    // Handle note input shortcuts
    if (activeTool === 'note' && editorRef.current.getState().currentSelection) {
      const selection = editorRef.current.getState().currentSelection;
      switch (event.key.toLowerCase()) {
        case 'a':
        case 'b':
        case 'c':
        case 'd':
        case 'e':
        case 'f':
        case 'g':
          const note: Note = {
            pitch: `${event.key.toLowerCase()}/${4}`, // Default to octave 4
            duration: '4', // Default to quarter note
            dots: 0
          };
          editorRef.current.addNote(note, selection);
          event.preventDefault();
          break;
      }
    }
  };

  const handleRegisterTheme = () => {
    if (!editorRef.current || !themeAnalyzer) return;

    const selection = editorRef.current.getState().currentSelection;
    if (!selection) {
      alert('Please select a musical phrase first');
      return;
    }

    const score = editorRef.current.getScore();
    const measure = score.systems[selection.systemIndex]
      ?.staves[selection.staffIndex]
      ?.measures[selection.measureIndex];

    if (!measure) return;

    // Get the selected notes
    const selectedNotes = measure.elements.slice(
      selection.elementIndex || 0,
      (selection.elementIndex || 0) + 4 // Default to 4 notes, adjust as needed
    );

    // Register the theme
    const theme = themeAnalyzer.registerTheme(selectedNotes, selection);
    
    // Find similar patterns
    const occurrences = themeAnalyzer.findSimilarPatterns(theme.id);
    theme.occurrences.push(...occurrences);

    // Update UI
    setActiveThemes(prev => [...prev, theme]);
    editorRef.current?.getRenderer().highlightTheme(theme);
  };

  const handleClearThemes = () => {
    if (!editorRef.current) return;
    editorRef.current.getRenderer().clearAllThemeHighlights();
    setActiveThemes([]);
  };

  return (
    <div className="score-editor" style={{ width: '100%', height: '100%' }}>
      <div className="toolbar">
        <button
          className={activeTool === 'select' ? 'active' : ''}
          onClick={() => handleToolChange('select')}
        >
          Select
        </button>
        <button
          className={activeTool === 'note' ? 'active' : ''}
          onClick={() => handleToolChange('note')}
        >
          Note
        </button>
        <button onClick={() => editorRef.current?.addSystem()}>
          Add System
        </button>
        <button onClick={() => editorRef.current?.addStaff()}>
          Add Staff
        </button>
        <div className="theme-tools">
          <button onClick={handleRegisterTheme}>
            Register Theme
          </button>
          <button onClick={handleClearThemes}>
            Clear Themes
          </button>
        </div>
        <div className="active-themes">
          {activeThemes.map(theme => (
            <div key={theme.id} className="theme-item">
              <span>Theme {theme.id}</span>
              <span>{theme.occurrences.length} occurrences</span>
              <button
                onClick={() => {
                  editorRef.current?.getRenderer().clearThemeHighlight(theme.id);
                  setActiveThemes(prev => prev.filter(t => t.id !== theme.id));
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        className="score-container"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: 'calc(100% - 40px)', // Subtract toolbar height
          outline: 'none',
          overflow: 'auto'
        }}
      />
    </div>
  );
};
