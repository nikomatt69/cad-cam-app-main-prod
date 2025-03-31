import React, { useState } from 'react';
import { Database, Tool, Box, Settings, Layers } from 'react-feather';
import BottomSheet from '../layout/BottomSheet';
import Link from 'next/link';

const ResourcesBottomSheet = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      icon: <Tool className="w-5 h-5" />,
      label: 'Toolpaths',
      description: 'Manage and create toolpaths',
      href: '/toolpaths'
    },
    {
      icon: <Box className="w-5 h-5" />,
      label: 'Components',
      description: 'Browse component library',
      href: '/components'
    },
    {
      icon: <Layers className="w-5 h-5" />,
      label: 'Materials',
      description: 'Material database and settings',
      href: '/materials'
    },
    {
      icon: <Tool className="w-5 h-5" />,
      label: 'Tools',
      description: 'Tool library and configurations',
      href: '/tools'
    },
    {
      icon: <Settings className="w-5 h-5" />,
      label: 'Machine Configs',
      description: 'Machine settings and profiles',
      href: '/machine-configs'
    }
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center justify-center p-2 rounded-lg transition-colors"
      >
        <Database className="w-5 h-5 text-gray-500 dark:text-gray-300" />
        <span className="text-xs mt-1 text-gray-500 dark:text-gray-300">Resources</span>
      </button>

      <BottomSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        height="70vh"
        className="bg-white dark:bg-gray-900"
      >
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resources</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Access CAD/CAM resources and configurations</p>
          </div>
          
          <div className="flex-1 overflow-y-auto py-2">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                  {React.cloneElement(item.icon, {
                    className: 'text-gray-600 dark:text-gray-300'
                  })}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default ResourcesBottomSheet; 