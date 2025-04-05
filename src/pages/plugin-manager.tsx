import React from 'react';
import { PluginManager } from '@/src/plugins/components/PluginManager';
import { ArrowLeft } from 'react-feather';
import Link from 'next/link';

export default function PluginManagerPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link 
                href="/cad" 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 mr-4"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Plugin Manager
              </h1>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <PluginManager />
        </div>
      </main>
    </div>
  );
}