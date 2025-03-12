import React from 'react';
import { X, Search, Info } from 'react-feather';

interface ShortcutCategory {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({ isOpen, onClose }) => {
  // If dialog is not open, don't render anything
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('all');

  if (!isOpen) return null;

  const allShortcuts: ShortcutCategory[] = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["Left Click + Drag"], description: "Rotate camera (3D mode)" },
        { keys: ["Middle Click + Drag"], description: "Pan view" },
        { keys: ["Right Click + Drag"], description: "Orbit around selection" },
        { keys: ["Scroll"], description: "Zoom in/out" },
        { keys: ["+", "="], description: "Zoom in" },
        { keys: ["-", "_"], description: "Zoom out" },
        { keys: ["F"], description: "Zoom to fit/focus on selection" },
        { keys: ["Ctrl + 1"], description: "Switch to 3D view" },
        { keys: ["Ctrl + 2"], description: "Switch to top view (2D)" },
      ]
    },
    {
      title: "Selection & Editing",
      shortcuts: [
        { keys: ["Click"], description: "Select object" },
        { keys: ["Shift + Click"], description: "Add to selection" },
        { keys: ["Ctrl + Click"], description: "Remove from selection" },
        { keys: ["Escape"], description: "Deselect all / Cancel current operation" },
        { keys: ["Delete", "Backspace"], description: "Delete selected objects" },
        { keys: ["G"], description: "Move (Translate) mode" },
        { keys: ["R"], description: "Rotate mode" },
        { keys: ["S"], description: "Scale mode" },
        { keys: ["X"], description: "Constrain to X axis" },
        { keys: ["Y"], description: "Constrain to Y axis" },
        { keys: ["Z"], description: "Constrain to Z axis" },
      ]
    },
    {
      title: "Tools & Creation",
      shortcuts: [
        { keys: ["L"], description: "Line tool" },
        { keys: ["C"], description: "Circle tool" },
        { keys: ["R"], description: "Rectangle tool" },
        { keys: ["P"], description: "Polygon tool" },
        { keys: ["B"], description: "Box/Cube tool" },
        { keys: ["O"], description: "Sphere tool" },
        { keys: ["Y"], description: "Cylinder tool" },
        { keys: ["T"], description: "Text tool" },
        { keys: ["D"], description: "Dimension tool" },
        { keys: ["M"], description: "Measurement tool" },
      ]
    },
    {
      title: "View Controls",
      shortcuts: [
        { keys: ["Ctrl + G"], description: "Toggle grid visibility" },
        { keys: ["Ctrl + A"], description: "Toggle axes visibility" },
        { keys: ["F11", "Alt + F"], description: "Toggle fullscreen" },
        { keys: ["H"], description: "Hide selected objects" },
        { keys: ["Alt + H"], description: "Show all objects" },
        { keys: ["W"], description: "Toggle wireframe mode" },
        { keys: ["Alt + Z"], description: "Toggle X-ray mode" },
      ]
    },
    {
      title: "Snapping & Precision",
      shortcuts: [
        { keys: ["Ctrl + X"], description: "Toggle snap mode" },
        { keys: ["Alt + G"], description: "Toggle grid snap" },
        { keys: ["Alt + P"], description: "Toggle point snap" },
        { keys: ["Alt + M"], description: "Toggle midpoint snap" },
        { keys: ["Alt + I"], description: "Toggle intersection snap" },
        { keys: ["Alt + C"], description: "Toggle center snap" },
      ]
    },
    {
      title: "History & File Operations",
      shortcuts: [
        { keys: ["Ctrl + Z"], description: "Undo" },
        { keys: ["Ctrl + Y", "Ctrl + Shift + Z"], description: "Redo" },
        { keys: ["Ctrl + S"], description: "Save" },
        { keys: ["Ctrl + O"], description: "Open" },
        { keys: ["Ctrl + N"], description: "New" },
        { keys: ["Ctrl + E"], description: "Export" },
        { keys: ["Ctrl + I"], description: "Import" },
      ]
    },
    {
      title: "Layers & Organization",
      shortcuts: [
        { keys: ["Ctrl + L"], description: "Toggle layers panel" },
        { keys: ["Ctrl + Shift + N"], description: "New layer" },
        { keys: ["Ctrl + G"], description: "Group selected objects" },
        { keys: ["Ctrl + Shift + G"], description: "Ungroup" },
        { keys: ["Alt + L"], description: "Lock selected objects" },
        { keys: ["Alt + Shift + L"], description: "Unlock all objects" },
      ]
    },
    {
      title: "Help & UI",
      shortcuts: [
        { keys: ["?", "Shift + /"], description: "Show keyboard shortcuts (this dialog)" },
        { keys: ["F1"], description: "Help" },
        { keys: ["Ctrl + ,"], description: "Preferences" },
        { keys: ["Tab"], description: "Toggle sidebar" },
        { keys: ["Ctrl + B"], description: "Toggle properties panel" },
        { keys: ["Ctrl + Space"], description: "Command palette" },
        { keys: ["Ctrl + F"], description: "Search" },
      ]
    },
  ];

  // Filter shortcuts based on search term
  const filteredCategories = allShortcuts
    .map(category => ({
      ...category,
      shortcuts: category.shortcuts.filter(shortcut => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return (
          shortcut.description.toLowerCase().includes(lowerSearchTerm) ||
          shortcut.keys.some(key => key.toLowerCase().includes(lowerSearchTerm))
        );
      })
    }))
    .filter(category => category.shortcuts.length > 0);

  // Display categories based on active tab
  const displayedCategories = activeTab === 'all'
    ? filteredCategories
    : filteredCategories.filter(category => category.title.toLowerCase() === activeTab.toLowerCase());

  // Get unique category names for tabs
  const categoryTabs = ['all', ...allShortcuts.map(cat => cat.title.toLowerCase())];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center">
            <Info className="mr-2 text-blue-500" size={20} />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Keyboard Shortcuts</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Search & Tabs */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Category Tabs */}
          <div className="flex space-x-1 overflow-x-auto pb-1 hide-scrollbar">
            {categoryTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab === 'all' ? 'All Shortcuts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Shortcuts Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {displayedCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedCategories.map((category) => (
                <div key={category.title} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    {category.title}
                  </h3>
                  <ul className="space-y-3">
                    {category.shortcuts.map((shortcut, index) => (
                      <ShortcutItem 
                        key={`${category.title}-${index}`} 
                        keys={shortcut.keys} 
                        description={shortcut.description} 
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <Search size={48} className="mb-4 opacity-50" />
              <p className="text-lg">No shortcuts match your search.</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">?</kbd> at any time to open this dialog
        </div>
      </div>
    </div>
  );
};

interface ShortcutItemProps {
  keys: string[];
  description: string;
}

const ShortcutItem: React.FC<ShortcutItemProps> = ({ keys, description }) => {
  return (
    <li className="flex justify-between items-center text-sm">
      <span className="text-gray-700 dark:text-gray-300">{description}</span>
      <div className="flex flex-wrap justify-end gap-1 ml-2">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400 mr-1">or</span>}
            <KeyboardKey shortcut={key} />
          </React.Fragment>
        ))}
      </div>
    </li>
  );
};

interface KeyboardKeyProps {
  shortcut: string;
}

const KeyboardKey: React.FC<KeyboardKeyProps> = ({ shortcut }) => {
  // Split combined shortcuts (e.g., "Ctrl + S" into ["Ctrl", "S"])
  const parts = shortcut.split(/\s*\+\s*/);
  
  return (
    <div className="flex items-center space-x-1">
      {parts.map((part, idx) => (
        <React.Fragment key={idx}>
          <kbd className="min-w-[1.5rem] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-xs font-mono shadow-sm text-center">
            {part}
          </kbd>
          {idx < parts.length - 1 && <span className="text-gray-400">+</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ShortcutsDialog;