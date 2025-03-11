// src/components/cad/PropertyPanel.tsx
import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';
import { useElementsStore } from 'src/store/elementsStore';
import { useLayerStore } from 'src/store/layerStore';
import { Trash2, Copy, Lock } from 'react-feather';
import SaveElementToLibrary from './SaveElementToLibrary';

const PropertyPanel: React.FC = () => {
  const { selectedElement, updateElement, deleteElement, duplicateElement } = useElementsStore();
  const { layers } = useLayerStore();
  const [properties, setProperties] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (selectedElement) {
      setProperties({ ...selectedElement });
      setIsEditing(false);
    } else {
      setProperties({});
    }
  }, [selectedElement]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    let newValue: any = value;
    if (type === 'number') {
      newValue = value === '' ? '' : parseFloat(value);
    } else if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }
    
    setProperties((prev: any) => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedElement) {
      updateElement(selectedElement.id, properties);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (selectedElement && window.confirm('Are you sure you want to delete this element?')) {
      deleteElement(selectedElement.id);
    }
  };

  const handleDuplicate = () => {
    if (selectedElement) {
      duplicateElement(selectedElement.id);
    }
  };

  const getActiveLayer = () => {
    if (!selectedElement) return null;
    return layers.find(layer => layer.id === selectedElement.layerId);
  };

  const activeLayer = getActiveLayer();
  const isLayerLocked = activeLayer?.locked || false;

  // Define fields to render based on element type
  const getFieldsForElementType = (type: string) => {
    switch (type) {
      case 'line':
        return [
          { name: 'x1', label: 'X1', type: 'number', step: 0.1 },
          { name: 'y1', label: 'Y1', type: 'number', step: 0.1 },
          { name: 'z1', label: 'Z1', type: 'number', step: 0.1 },
          { name: 'x2', label: 'X2', type: 'number', step: 0.1 },
          { name: 'y2', label: 'Y2', type: 'number', step: 0.1 },
          { name: 'z2', label: 'Z2', type: 'number', step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'linewidth', label: 'Line Width', type: 'number', min: 1, max: 10, step: 1 }
        ];
        
      case 'circle':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'radius', label: 'Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'linewidth', label: 'Line Width', type: 'number', min: 1, max: 10, step: 1 }
        ];
        
      case 'rectangle':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'width', label: 'Width', type: 'number', min: 0.1, step: 0.1 },
          { name: 'height', label: 'Height', type: 'number', min: 0.1, step: 0.1 },
          { name: 'angle', label: 'Angle (°)', type: 'number', step: 1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'linewidth', label: 'Line Width', type: 'number', min: 1, max: 10, step: 1 }
        ];
        
      case 'cube':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'width', label: 'Width', type: 'number', min: 0.1, step: 0.1 },
          { name: 'height', label: 'Height', type: 'number', min: 0.1, step: 0.1 },
          { name: 'depth', label: 'Depth', type: 'number', min: 0.1, step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'sphere':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'radius', label: 'Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'cylinder':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'radius', label: 'Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'height', label: 'Height', type: 'number', min: 0.1, step: 0.1 },
          { name: 'segments', label: 'Segments', type: 'number', min: 3, step: 1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'cone':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'radius', label: 'Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'height', label: 'Height', type: 'number', min: 0.1, step: 0.1 },
          { name: 'segments', label: 'Segments', type: 'number', min: 3, step: 1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'torus':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'radius', label: 'Outer Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'tube', label: 'Tube Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'radialSegments', label: 'Radial Segments', type: 'number', min: 3, step: 1 },
          { name: 'tubularSegments', label: 'Tubular Segments', type: 'number', min: 3, step: 1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'polygon':
        // For polygon, we'll provide fields for center coordinates and radius
        // Complex point editing would need a custom editor component
        return [
          { name: 'x', label: 'X (Center)', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y (Center)', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'radius', label: 'Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'sides', label: 'Number of Sides', type: 'number', min: 3, step: 1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'extrusion':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'shape', label: 'Shape Type', type: 'select', options: [
            { value: 'rect', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' }
          ]},
          { name: 'width', label: 'Width', type: 'number', min: 0.1, step: 0.1, showIf: (props: { shape: string; }) => props.shape === 'rect' },
          { name: 'height', label: 'Height', type: 'number', min: 0.1, step: 0.1, showIf: (props: { shape: string; }) => props.shape === 'rect' },
          { name: 'radius', label: 'Radius', type: 'number', min: 0.1, step: 0.1, showIf: (props: { shape: string; }) => props.shape === 'circle' },
          { name: 'depth', label: 'Depth', type: 'number', min: 0.1, step: 0.1 },
          { name: 'bevel', label: 'Bevel', type: 'checkbox' },
          { name: 'bevelThickness', label: 'Bevel Thickness', type: 'number', min: 0.1, step: 0.1, showIf: (props: { bevel: any; }) => props.bevel },
          { name: 'bevelSize', label: 'Bevel Size', type: 'number', min: 0.1, step: 0.1, showIf: (props: { bevel: any; }) => props.bevel },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'tube':
        // For tube, we need a more complex editor for path points
        // Here we provide basic properties
        return [
          { name: 'radius', label: 'Tube Radius', type: 'number', min: 0.1, step: 0.1 },
          { name: 'tubularSegments', label: 'Segments Along Path', type: 'number', min: 1, step: 1 },
          { name: 'radialSegments', label: 'Segments Around Tube', type: 'number', min: 3, step: 1 },
          { name: 'closed', label: 'Closed Path', type: 'checkbox' },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'lathe':
        // For lathe, we need a complex editor for profile points
        return [
          { name: 'x', label: 'X (Center)', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y (Center)', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z (Center)', type: 'number', step: 0.1 },
          { name: 'segments', label: 'Segments', type: 'number', min: 3, step: 1 },
          { name: 'phiStart', label: 'Start Angle (rad)', type: 'number', step: 0.1 },
          { name: 'phiLength', label: 'Arc Length (rad)', type: 'number', min: 0, max: 6.28, step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'text':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'text', label: 'Text Content', type: 'text' },
          { name: 'size', label: 'Font Size', type: 'number', min: 1, step: 0.5 },
          { name: 'depth', label: 'Extrusion Depth', type: 'number', min: 0, step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'bevel', label: 'Bevel', type: 'checkbox' }
        ];
        
      case 'grid':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'size', label: 'Grid Size', type: 'number', min: 1, step: 1 },
          { name: 'divisions', label: 'Division Count', type: 'number', min: 1, step: 1 },
          { name: 'colorCenterLine', label: 'Center Line Color', type: 'color' },
          { name: 'colorGrid', label: 'Grid Color', type: 'color' },
          { name: 'plane', label: 'Grid Plane', type: 'select', options: [
            { value: 'xy', label: 'XY Plane' },
            { value: 'xz', label: 'XZ Plane' },
            { value: 'yz', label: 'YZ Plane' }
          ]}
        ];
        
      case 'workpiece':
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'width', label: 'Width', type: 'number', min: 0.1, step: 0.1 },
          { name: 'height', label: 'Height', type: 'number', min: 0.1, step: 0.1 },
          { name: 'depth', label: 'Depth', type: 'number', min: 0.1, step: 0.1 },
          { name: 'material', label: 'Material', type: 'select', options: [
            { value: 'aluminum', label: 'Aluminum' },
            { value: 'steel', label: 'Steel' },
            { value: 'wood', label: 'Wood' },
            { value: 'plastic', label: 'Plastic' },
            { value: 'brass', label: 'Brass' }
          ]},
          { name: 'color', label: 'Color', type: 'color' },
          { name: 'wireframe', label: 'Wireframe', type: 'checkbox' }
        ];
        
      case 'group':
        // For group elements, we only provide position properties
        // Individual elements within the group need separate editing
        return [
          { name: 'x', label: 'X (Group Center)', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y (Group Center)', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z (Group Center)', type: 'number', step: 0.1 }
        ];
        
      default:
        // Fallback for any unhandled element type
        return [
          { name: 'x', label: 'X', type: 'number', step: 0.1 },
          { name: 'y', label: 'Y', type: 'number', step: 0.1 },
          { name: 'z', label: 'Z', type: 'number', step: 0.1 },
          { name: 'color', label: 'Color', type: 'color' }
        ];
    }
  };

  if (!selectedElement) {
    return (
      <motion.div 
        className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-medium text-gray-900 mb-2">Properties</h3>
        <p className="text-gray-500 text-sm">No element selected</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-xl rounded-md p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="flex justify-between items-center mb-4">
        <motion.h3 
          className="text-lg font-medium text-gray-900"
          layoutId="property-title"
        >
          Element Properties
        </motion.h3>
        <div className="flex space-x-2">
          {/* Save to Library Button */}
          <SaveElementToLibrary />
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDuplicate}
            className="p-1 rounded-full text-blue-600 hover:bg-blue-100 focus:outline-none"
            title="Duplicate Element"
            disabled={isLayerLocked}
          >
            <Copy size={18} className={isLayerLocked ? "text-gray-400" : ""} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className="p-1 rounded-full text-red-600 hover:bg-red-100 focus:outline-none"
            title="Delete Element"
            disabled={isLayerLocked}
          >
            <Trash2 size={18} className={isLayerLocked ? "text-gray-400" : ""} />
          </motion.button>
        </div>
      </div>
      {isLayerLocked && (
        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md mb-4 text-sm flex items-center">
          <Lock size={16} className="mr-2" />
          <span>This element is on a locked layer and cannot be edited</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <motion.div 
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {/* Element Type */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input
              type="text"
              id="type"
              name="type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-100"
              value={properties.type || ''}
              disabled
            />
          </motion.div>
          
          {/* Layer Info */}
          <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layer
            </label>
            <div className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2" 
                style={{ backgroundColor: activeLayer?.color || '#cccccc' }}
              />
              <span className="text-sm text-gray-700">
                {activeLayer?.name || 'Unknown Layer'}
                {activeLayer?.locked && <span className="ml-2 text-xs text-gray-500">(locked)</span>}
              </span>
            </div>
          </motion.div>
          
          {/* Element-specific properties */}
          {getFieldsForElementType(properties.type).map((field: any) => {
  // Skip fields that should be conditionally hidden
  if (field.showIf && !field.showIf(properties)) {
    return null;
  }
  
  return (
    <motion.div 
      key={field.name}
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
    >
      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
      </label>
      
      {field.type === 'checkbox' ? (
        <div className="flex items-center">
          <input
            type="checkbox"
            id={field.name}
            name={field.name}
            checked={!!properties[field.name]}
            onChange={handleChange}
            disabled={!isEditing || isLayerLocked}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={field.name} className="ml-2 block text-sm text-gray-900">
            {field.label}
          </label>
        </div>
      ) : field.type === 'color' ? (
        <div className="flex items-center space-x-2">
          <input
            type="color"
            id={field.name}
            name={field.name}
            value={properties[field.name] || '#000000'}
            onChange={handleChange}
            disabled={!isEditing || isLayerLocked}
            className="h-8 w-8 p-0 border-0"
          />
          <input
            type="text"
            value={properties[field.name] || '#000000'}
            onChange={handleChange}
            name={field.name}
            disabled={!isEditing || isLayerLocked}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      ) : field.type === 'select' ? (
        <select
          id={field.name}
          name={field.name}
          value={properties[field.name] || ''}
          onChange={handleChange}
          disabled={!isEditing || isLayerLocked}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          {field.options && field.options.map((option: { value: React.Key | readonly string[] | null | undefined; label: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined; }) => (
            <option key={option.value as string} value={option.value as string}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'text' ? (
        <input
          type="text"
          id={field.name}
          name={field.name}
          value={properties[field.name] || ''}
          onChange={handleChange}
          disabled={!isEditing || isLayerLocked}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      ) : (
        <input
          type={field.type}
          id={field.name}
          name={field.name}
          value={properties[field.name] !== undefined ? properties[field.name] : ''}
          onChange={handleChange}
          min={field.min}
          max={field.max}
          step={field.step}
          disabled={!isEditing || isLayerLocked}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      )}
    </motion.div>
  );
})}
          
          {/* Action buttons */}
          <motion.div 
            className="mt-6 flex justify-end space-x-3"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 }}}
          >
            {isEditing ? (
              <>
                <motion.button
                  type="button"
                  onClick={() => {
                    setProperties({ ...selectedElement });
                    setIsEditing(false);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLayerLocked}
                >
                  Apply
                </motion.button>
              </>
            ) : (
              <motion.button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isLayerLocked}
              >
                Edit Properties
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default PropertyPanel;