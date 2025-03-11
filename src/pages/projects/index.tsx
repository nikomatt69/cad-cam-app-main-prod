// src/pages/projects/index.tsx (integrazione migliorata)
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from 'src/components/layout/Layout';
import { Plus, Folder, Clock, Users } from 'react-feather';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Project } from 'src/types/models';
import { fetchProjects } from 'src/lib/api/projects';
import { useApi } from 'src/hooks/useApi';
import Loading from 'src/components/ui/Loading';
import ErrorMessage from 'src/components/ui/ErrorMessage';
import ErrorBoundary from '@/src/components/ui/ErrorBonduary';
import Metatags from '@/src/components/layout/Metatags';


export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Utilizziamo il nostro hook personalizzato
  const { 
    data: projects, 
    isLoading, 
    error, 
    execute: loadProjects 
  } = useApi<Project[]>();

  useEffect(() => {
    // Carica i progetti solo se l'utente è autenticato
     {
      loadProjects(() => fetchProjects());
    }
  }, [status, searchTerm, loadProjects]);

  // Funzione per gestire la ricerca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProjects(() => fetchProjects());
  };

  // Gestione degli stati di autenticazione e caricamento
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <ErrorBoundary>
     <Metatags title={'Projects'} />
      <Layout>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <Link href={'/projects/create'}>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center">
                <Plus size={20} className="mr-2" />
                New Project
              </button>
            </Link>
          </div>

          {/* Form di ricerca */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects..."
                className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-r-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Search
              </button>
            </div>
          </form>

          {/* Gestione stati di caricamento ed errore */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loading />
            </div>
          ) : error ? (
            <ErrorMessage 
              message={`Error loading projects: ${error.message}`} 
              onRetry={() => loadProjects(() => fetchProjects())} 
            />
          ) : projects && projects.length === 0 ? (
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <Folder size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first project to get started with CAD/CAM designs.
              </p>
              <Link href={'/projects/create'}>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Create Project
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects && projects.map((project) => (
                <motion.div
                  key={project.id}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-white shadow-md rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{project.name}</h3>
                    {project.description && (
                      <p className="text-gray-600 mb-4 truncate">{project.description}</p>
                    )}
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Clock size={16} className="mr-2" />
                      <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users size={16} className="mr-2" />
                      <span>
                        {project.organization
                          ? `${project.organization.name} (Organization)`
                          : `${project.owner?.name || project.owner?.email || 'Unknown'} (Personal)`}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 flex justify-between">
                    <span className="text-sm text-gray-500">{project._count?.drawings || 0} drawings</span>
                    <span className="text-sm text-gray-500">{project._count?.components || 0} components</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ErrorBoundary>
  );
}