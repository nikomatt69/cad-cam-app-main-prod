import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { ChevronUp, AlertTriangle } from 'react-feather';
import { Toaster } from 'react-hot-toast';
import EnhancedSidebar from './Sidebar';
import Link from 'next/link';
import Navbar from './Navbar';
import Footer from '../ui/Footer';
import useRefreshToken from '@/src/hooks/useRefreshToken';
import BottomNavigation from '../components/BottomNavigation';
import CookieConsentBanner from '../components/CookieConsentBanner';

type EnhancedLayoutProps = {
  children: ReactNode;
  hideNav?: boolean;
  hideSidebar?: boolean;
  fullWidth?: boolean;
  showBreadcrumbs?: boolean;
};

const EnhancedLayout: React.FC<EnhancedLayoutProps> = ({
  children,
  hideNav = false,
  hideSidebar = false,
  fullWidth = false,
  showBreadcrumbs = true
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [welcomeBanner, setWelcomeBanner] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  
  // Handle sidebar toggle based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useRefreshToken();

  // Gestione dello scroll per mostrare/nascondere il pulsante "torna su"
  useEffect(() => {
    const handleScroll = () => {
      const mainElement = mainRef.current;
      if (mainElement) {
        setShowScrollTop(mainElement.scrollTop > 300);
      }
    };

    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      if (mainElement) {
        mainElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Funzione per tornare all'inizio della pagina
  const scrollToTop = () => {
    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  
  // Mock breadcrumbs based on current route
  const getBreadcrumbs = () => {
    const path = router.asPath;
    const pathSegments = path.split('/').filter(Boolean);
    
    // If we're on the home page, don't show breadcrumbs
    if (pathSegments.length === 0) {
      return [];
    }
    
    // Build breadcrumbs array with paths
    const breadcrumbs = [{ name: 'Home', href: '/' }];
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Add specific breadcrumb labels based on route
      let name = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Handle dynamic routes with better names
      if (segment.match(/^[a-f0-9]{24}$/)) {
        // This is likely a MongoDB ID or similar
        if (pathSegments[index - 1] === 'projects') {
          name = 'Dettagli Progetto';
        } else if (pathSegments[index - 1] === 'users') {
          name = 'Profilo Utente';
        } else {
          name = 'Dettagli';
        }
      }
      
      breadcrumbs.push({
        name,
        href: currentPath
      });
    });
    
    return breadcrumbs;
  };
  
  // Get breadcrumbs for the current route
  const breadcrumbs = getBreadcrumbs();
  
  // Determine main content width class
  const contentWidthClass = fullWidth ? 'max-w-full' : 'max-w-7xl';

  return (
    <div className="h-screen rounded-xl   bg-gray dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      {!hideNav && <Navbar />}
      
      <div className="flex flex-1  rounded-xl overflow-hidden">
        {!hideSidebar && (
          <EnhancedSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        )}
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          !hideSidebar && sidebarOpen ? 'md:ml-64' : ''
        }`}>
          {/* Maintenance Mode Alert */}
          {maintenanceMode && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 flex-shrink-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-700 dark:text-amber-200">
                    Il sistema è in manutenzione programmata. Alcune funzionalità potrebbero non essere disponibili.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          
          
          {/* Breadcrumbs */}
          {showBreadcrumbs && breadcrumbs.length > 0 && (
            <nav className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white dark:bg-gray-600 shadow-sm px-4 py-3 flex-shrink-0">
              <ol className="flex text-sm overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pb-1">
                {breadcrumbs.map((breadcrumb, index) => (
                  <li key={breadcrumb.href} className="flex items-center whitespace-nowrap">
                    {index > 0 && (
                      <svg className="mx-2 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-gray-500 dark:text-gray-400">{breadcrumb.name}</span>
                    ) : (
                      <Link href={breadcrumb.href} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        {breadcrumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          
          {/* Main content with scrolling */}
          <main 
            ref={mainRef}
            className="flex-1 overflow-y-auto  dark:bg-gray-900 dark:text-white scrollbar-thin bg-gray-50 rounded-xl scrollbar-thumb-gray-300 scrollbar-track-transparent" 
            style={{ scrollBehavior: 'smooth' }}
          >
             <meta name="viewport" content="width=device-width, initial-scale=0.8 , maximum-scale=2" />
            <div className={`${contentWidthClass} mx-auto mb-1 rounded-xl overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-4 py-6 sm:px-6 lg:px-8`}>
              {children}
            </div>
            <Toaster
        position="bottom-right"
        containerStyle={{ wordBreak: 'break-word' }}
        
        
      />
            {/* Footer */}
            <footer className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white dark:bg-gray-600 shadow-inner mt-8">
              <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      &copy; {new Date().getFullYear()} CAD/CAM FUN. Tutti i diritti riservati.
                    </p>
                  </div>
                  <div className="flex space-x-6">
                    <Footer/>
                    <CookieConsentBanner />
                  </div>
                </div>
              </div>
            </footer>
            <BottomNavigation/>
          </main>
          
          {/* Pulsante Torna Su */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none transition-all duration-300 z-50"
              aria-label="Torna all'inizio"
            >
              <ChevronUp size={20} />
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default EnhancedLayout;