import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onDelete?: () => void;
  onEscape?: () => void;
  onTransformModeToggle?: (mode: string) => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  disabled?: boolean;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutsOptions) => {
  useEffect(() => {
    if (options.disabled) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora input durante l'editing di testo
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ignora eventi se il componente è smontato o la navigazione è in corso
      if (document.hidden) {
        return;
      }
      
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (options.onDelete) {
            e.preventDefault();
            options.onDelete();
          }
          break;
          
        case 'Escape':
          if (options.onEscape) {
            e.preventDefault();
            options.onEscape();
          }
          break;
          
        case 'g':
        case 'G':
          if (options.onTransformModeToggle) {
            e.preventDefault();
            options.onTransformModeToggle('translate');
          }
          break;
          
        case 'r':
        case 'R':
          if (options.onTransformModeToggle) {
            e.preventDefault();
            options.onTransformModeToggle('rotate');
          }
          break;
          
        case 's':
        case 'S':
          if (options.onTransformModeToggle) {
            e.preventDefault();
            options.onTransformModeToggle('scale');
          }
          break;
          
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+Z (Redo)
              if (options.onRedo) options.onRedo();
            } else {
              // Ctrl+Z (Undo)
              if (options.onUndo) options.onUndo();
            }
          }
          break;
          
        case 'y':
        case 'Y':
          if ((e.ctrlKey || e.metaKey) && options.onRedo) {
            e.preventDefault();
            options.onRedo();
          }
          break;
          
        case 'c':
        case 'C':
          if ((e.ctrlKey || e.metaKey) && options.onCopy) {
            e.preventDefault();
            options.onCopy();
          }
          break;
          
        case 'v':
        case 'V':
          if ((e.ctrlKey || e.metaKey) && options.onPaste) {
            e.preventDefault();
            options.onPaste();
          }
          break;
          
        case 'x':
        case 'X':
          if ((e.ctrlKey || e.metaKey) && options.onCut) {
            e.preventDefault();
            options.onCut();
          }
          break;
          
        case '+':
        case '=':
          if (options.onZoomIn) {
            e.preventDefault();
            options.onZoomIn();
          }
          break;
          
        case '-':
        case '_':
          if (options.onZoomOut) {
            e.preventDefault();
            options.onZoomOut();
          }
          break;
          
        case 's':
        case 'S':
          if ((e.ctrlKey || e.metaKey) && options.onSave) {
            e.preventDefault();
            options.onSave();
          }
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    options.disabled,
    options.onDelete,
    options.onEscape,
    options.onTransformModeToggle,
    options.onSave,
    options.onUndo,
    options.onRedo,
    options.onCopy,
    options.onPaste,
    options.onCut,
    options.onZoomIn,
    options.onZoomOut
  ]);
};