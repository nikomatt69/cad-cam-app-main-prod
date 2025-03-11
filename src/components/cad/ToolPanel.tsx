
// src/components/cad/ToolPanel.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Square, Circle, Box, Scissors, Type, 
  Move, RotateCcw, ZoomIn, Grid, Crosshair,
  Minus, Plus, Triangle, ArrowUpCircle, 
  Disc, Layout, Layers
} from 'react-feather';
import { useCADStore } from 'src/store/cadStore';
import { useElementsStore } from 'src/store/elementsStore';
import { useLayerStore } from 'src/store/layerStore';

interface ElementFormProps {
  onAdd: (element: any) => void;
  onCancel: () => void;
  type: string;
}

const ElementForm: React.FC<ElementFormProps> = ({ onAdd, onCancel, type }) => {
  const [formData, setFormData] = useState<any>(() => {
    // Default values based on element type
    switch (type) {
      case 'line':
        return { x1: 0, y1: 0, z1: 0, x2: 100, y2: 0, z2: 0, color: '#000000', linewidth: 1 };
      case 'circle':
        return { x: 0, y: 0, z: 0, radius: 50, color: '#000000', linewidth: 1 };
      case 'rectangle':
        return { x: 0, y: 0, z: 0, width: 100, height: 100, color: '#000000', linewidth: 1 };
      case 'cube':
        return { x: 0, y: 0, z: 0, width: 100, height: 100, depth: 100, color: '#1e88e5', wireframe: false };
      case 'sphere':
        return { x: 0, y: 0, z: 0, radius: 50, color: '#1e88e5', wireframe: false };
      case 'cylinder':
        return { x: 0, y: 0, z: 0, radius: 25, height: 60, segments: 32, color: '#FFC107', wireframe: false };
      case 'cone':
        return { x: 0, y: 0, z: 0, radius: 25, height: 50, segments: 32, color: '#9C27B0', wireframe: false };
      case 'torus':
        return { x: 0, y: 0, z: 0, radius: 30, tube: 10, radialSegments: 16, tubularSegments: 100, color: '#FF9800', wireframe: false };
      case 'polygon':
        return { 
          x: 0, 
          y: 0, 
          z: 0, 
          points: [
            {x: 0, y: 0}, 
            {x: 50, y: 0}, 
            {x: 25, y: 50}
          ], 
          color: '#795548', 
          wireframe: true 
        };
      case 'extrusion':
        return { 
          x: 0, 
          y: 0, 
          z: 0, 
          shape: 'rect', 
          width: 50, 
          height: 30, 
          depth: 20, 
          bevel: false, 
          color: '#4CAF50', 
          wireframe: false 
        };
      case 'text':
        return { 
          x: 0, 
          y: 0, 
          z: 0, 
          text: 'Text', 
          size: 10, 
          depth: 2, 
          color: '#000000', 
          bevel: false 
        };
      case 'tube':
        return { 
          path: [
            {x: 0, y: 0, z: 0}, 
            {x: 50, y: 20, z: 0}, 
            {x: 100, y: 0, z: 0}
          ], 
          radius: 5, 
          tubularSegments: 64, 
          radialSegments: 8, 
          closed: false, 
          color: '#2196F3', 
          wireframe: false 
        };
      case 'lathe':
        return { 
          x: 0, 
          y: 0, 
          z: 0, 
          points: [
            {x: 0, y: 0}, 
            {x: 20, y: 0}, 
            {x: 20, y: 20}, 
            {x: 10, y: 40}
          ], 
          segments: 12, 
          phiLength: 6.28, 
          color: '#607D8B', 
          wireframe: false 
        };
      case 'grid':
        return { 
          x: 0, 
          y: 0, 
          z: 0, 
          size: 100, 
          divisions: 10, 
          colorCenterLine: '#444444', 
          colorGrid: '#888888', 
          plane: 'xy' 
        };
      case 'group':
        return { 
          x: 0, 
          y: 0, 
          z: 0, 
          elements: [] 
        };
      default:
        return {};
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ ...formData, type });
  };

  const renderFormFields = () => {
    switch (type) {
      case 'line':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X1</label>
                <input
                  type="number"
                  name="x1"
                  value={formData.x1}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y1</label>
                <input
                  type="number"
                  name="y1"
                  value={formData.y1}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z1</label>
                <input
                  type="number"
                  name="z1"
                  value={formData.z1}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">X2</label>
                <input
                  type="number"
                  name="x2"
                  value={formData.x2}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y2</label>
                <input
                  type="number"
                  name="y2"
                  value={formData.y2}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z2</label>
                <input
                  type="number"
                  name="z2"
                  value={formData.z2}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </>
        );
      case 'circle':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-500">Radius</label>
              <input
                type="number"
                name="radius"
                value={formData.radius}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </>
        );
      case 'rectangle':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Width</label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </>
        );
      case 'cube':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Width</label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Depth</label>
                <input
                  type="number"
                  name="depth"
                  value={formData.depth}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="wireframe"
                  checked={formData.wireframe}
                  onChange={handleChange}
                  className="mr-2"
                />
                Wireframe
              </label>
            </div>
          </>
        );
      case 'sphere':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-500">Radius</label>
              <input
                type="number"
                name="radius"
                value={formData.radius}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="wireframe"
                  checked={formData.wireframe}
                  onChange={handleChange}
                  className="mr-2"
                />
                Wireframe
              </label>
            </div>
          </>
        );
      
      // New element types
      case 'cylinder':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Radius</label>
                <input
                  type="number"
                  name="radius"
                  value={formData.radius}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="wireframe"
                  checked={formData.wireframe}
                  onChange={handleChange}
                  className="mr-2"
                />
                Wireframe
              </label>
            </div>
          </>
        );
        
      case 'cone':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Radius</label>
                <input
                  type="number"
                  name="radius"
                  value={formData.radius}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="wireframe"
                  checked={formData.wireframe}
                  onChange={handleChange}
                  className="mr-2"
                />
                Wireframe
              </label>
            </div>
          </>
        );

      case 'torus':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Radius</label>
                <input
                  type="number"
                  name="radius"
                  value={formData.radius}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Tube</label>
                <input
                  type="number"
                  name="tube"
                  value={formData.tube}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="wireframe"
                  checked={formData.wireframe}
                  onChange={handleChange}
                  className="mr-2"
                />
                Wireframe
              </label>
            </div>
          </>
        );

      case 'extrusion':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-500">Shape</label>
              <select
                name="shape"
                value={formData.shape}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="rect">Rectangle</option>
                <option value="circle">Circle</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Width</label>
                <input
                  type="number"
                  name="width"
                  value={formData.width}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Height</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Depth</label>
                <input
                  type="number"
                  name="depth"
                  value={formData.depth}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="bevel"
                  checked={formData.bevel}
                  onChange={handleChange}
                  className="mr-2"
                />
                Bevel
              </label>
            </div>
          </>
        );

      case 'text':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-500">Text</label>
              <input
                type="text"
                name="text"
                value={formData.text}
                onChange={handleChange}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-xs text-gray-500">Size</label>
                <input
                  type="number"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Depth</label>
                <input
                  type="number"
                  name="depth"
                  value={formData.depth}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </>
        );

      case 'polygon':
        return (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500">X</label>
                <input
                  type="number"
                  name="x"
                  value={formData.x}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Y</label>
                <input
                  type="number"
                  name="y"
                  value={formData.y}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Z</label>
                <input
                  type="number"
                  name="z"
                  value={formData.z}
                  onChange={handleChange}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-500">Points (simplified)</label>
              <input
                type="text"
                disabled
                value="Triangle (0,0), (50,0), (25,50)"
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm opacity-75"
              />
              <p className="text-xs text-gray-500 mt-1">Edit points in advanced mode</p>
            </div>
            <div className="mt-2">
              <label className="flex items-center text-xs text-gray-500">
                <input
                  type="checkbox"
                  name="wireframe"
                  checked={formData.wireframe}
                  onChange={handleChange}
                  className="mr-2"
                />
                Wireframe
              </label>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-sm rounded-md p-4 mt-4"
    >
      <h4 className="text-sm font-medium text-gray-900 mb-2">
        Add {type.charAt(0).toUpperCase() + type.slice(1)}
      </h4>
      <form onSubmit={handleSubmit}>
        {renderFormFields()}
        
        <div className="mt-3">
          <label className="block text-xs text-gray-500">Color</label>
          <input
            type="color"
            name="color"
            value={formData.color}
            onChange={handleChange}
            className="w-full h-8"
          />
        </div>
        
        {(type === 'line' || type === 'circle' || type === 'rectangle') && (
          <div className="mt-2">
            <label className="block text-xs text-gray-500">Line Width</label>
            <input
              type="number"
              name="linewidth"
              value={formData.linewidth}
              onChange={handleChange}
              min={1}
              max={10}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        )}
        
        <div className="mt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Element
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const ToolPanel: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const { addElement } = useElementsStore();
  const { layers, activeLayer } = useLayerStore();
  const CylinderIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <line x1="4" y1="6" x2="4" y2="18" />
      <line x1="20" y1="6" x2="20" y2="18" />
      <ellipse cx="12" cy="18" rx="8" ry="3" />
    </svg>
  );

  const TorusIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  // Custom Icon for Extrude
  const ExtrudeIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,5 19,12 12,19 5,12" />
      <line x1="12" y1="5" x2="12" y2="2" />
    </svg>
  );

  // Custom Icon for Polygon
  const PolygonIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,4 20,10 17,19 7,19 4,10" />
    </svg>
  );


  const activeLayerInfo = layers.find(layer => layer.id === activeLayer);

  // Updated tools array with new element types
  const tools = [
    { name: 'Line', icon: <Minus size={20} />, action: 'line' },
    { name: 'Circle', icon: <Circle size={20} />, action: 'circle' },
    { name: 'Rectangle', icon: <Square size={20} />, action: 'rectangle' },
    { name: 'Cube', icon: <Box size={20} />, action: 'cube' },
    { name: 'Sphere', icon: <Circle size={20} className="transform scale-75" />, action: 'sphere' },
    { name: 'Cylinder', icon: <CylinderIcon  />, action: 'cylinder' },
    { name: 'Cone', icon: <Triangle size={20} />, action: 'cone' },
    { name: 'Torus', icon: <TorusIcon />, action: 'torus' },
    { name: 'Extrude', icon: <ExtrudeIcon  />, action: 'extrusion' },
    { name: 'Text', icon: <Type size={20} />, action: 'text' },
    { name: 'Polygon', icon: <PolygonIcon />, action: 'polygon' }
  ];

  const handleSelectTool = (action: string) => {
    setSelectedTool(selectedTool === action ? null : action);
  };

  const handleAddElement = (element: any) => {
    addElement(element);
    setSelectedTool(null);
  };

  return (
    <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md p-4">
      <h3 className="text-md font-medium text-gray-900 mb-3">Add Elements</h3>
      
      {!activeLayerInfo && (
        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md mb-3 text-xs">
          Please select a layer first to add elements.
        </div>
      )}
      
      <div className="grid flex-cols-5 grid-cols-3 gap-2">
        {tools.map((tool) => (
          <motion.button
            key={tool.action}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelectTool(tool.action)}
            className={`p-2 rounded-md flex flex-col items-center justify-center text-xs ${
              selectedTool === tool.action
                ? 'bg-blue-500 text-white'
                : 'bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white text-gray-700 hover:bg-gray-100'
            } ${!activeLayerInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!activeLayerInfo}
          >
            <div className="mb-1">{tool.icon}</div>
            <span>{tool.name}</span>
          </motion.button>
        ))}
      </div>
      
      <AnimatePresence>
        {selectedTool && activeLayerInfo && (
          <ElementForm 
            type={selectedTool} 
            onAdd={handleAddElement} 
            onCancel={() => setSelectedTool(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolPanel;
