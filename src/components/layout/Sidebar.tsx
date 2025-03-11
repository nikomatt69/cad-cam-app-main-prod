import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { 
  Home, Grid, Tool, Package, Users, Settings, 
  FileText, Server, Database, HelpCircle, BookOpen,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  PlusSquare,
  DollarSign,
  User,
  BarChart2,
  Activity,
  Airplay
} from 'react-feather';
import { fetchOrganizationById } from '@/src/lib/api/organizations';
import Image from 'next/image';
interface EnhancedSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  disable?: boolean
  current?: boolean;
  children?: NavItem[];
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({ isOpen, setIsOpen }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    projects: true,
    resources: false,
    settings: false
  });
  
  // Generate navigation items with current route indicated
  const getNavigation = (): NavItem[] => {
    return [
      { 
        name: 'Dashboard', 
        href: '/', 
        icon: <Home size={20} />, 
        current: router.pathname === '/' 
      },
      {
        name: 'Progetti',
        href: '#',
        icon: <FileText size={20} />,
        current: router.pathname.startsWith('/projects/index'),
        children: [
          { 
            name: 'Tutti i progetti', 
            href: '/projects', 
            icon: <FileText size={16} />, 
            current: router.pathname === '/projects' 
          },
          { 
            name: 'Nuovi Progetti', 
            href: '/projects/index', 
            icon: <PlusSquare size={16} />, 
            current: router.pathname === '/projects/index' 
          }
        ]
      },
      { 
        name: 'CAD Editor', 
        href: '/cad', 
        icon: <Grid size={20} />, 
        current: router.pathname === '/cad' 
      },
      { 
        name: 'CAM Editor', 
        href: '/cam', 
        icon: <Tool size={20} />, 
        current: router.pathname === '/cam' 
      },
      {
        name: 'Risorse',
        href: '#',
        icon: <Package size={20} />,
        current: ['/components', '/materials', '/machine','/tools','/drawing-instruments','/library'].some(path => 
          router.pathname.startsWith(path)
        ),
        children: [
          { 
            name: 'Libreria', 
            href: '/library', 
            icon: <BookOpen size={16} />, 
            current: router.pathname.startsWith('/library') 
          },
          { 
            name: 'Componenti', 
            href: '/components', 
            icon: <Package size={16} />, 
            current: router.pathname.startsWith('/components'), 
            children:[
            {
            name: 'Crea', 
            href: '/components/create', 
            icon: <Package size={16} />, 
            current: router.pathname.startsWith('/components/create')},
            {
            name: 'Componenti', 
            href: '/components/[id]', 
            icon: <Package size={16} />, 
            current: router.pathname.startsWith('/components/[id]')},


            ]
          },
          { 
            name: 'Materiali', 
            href: '/materials', 
            icon: <Database size={16} />, 
            current: router.pathname.startsWith('/materials') 
          },
          { 
            name: 'Configurazioni', 
            href: '/machine', 
            icon: <Server size={16} />, 
            current: router.pathname.startsWith('/machine') 
          },
          { 
            name: 'Tools', 
            href: '/tools', 
            icon: <Server size={16} />, 
            current: router.pathname.startsWith('/tools') 
          },
          { 
            name: 'DrawingTools', 
            href: '/drawing-instruments', 
            icon: <Server size={16} />, 
            current: router.pathname.startsWith('/drawing-instruments') 
          }
        ]
      },
      { 
        name: 'Organization', 
        href: '/organizations', 
        icon: <Users size={20} />, 
        current: router.pathname === `/organizations/${fetchOrganizationById}` 
      },
      { 
        name: 'Pricing', 
        href: '#', 
        icon: <DollarSign size={20} />, 
        current: router.pathname.startsWith('#') ,
        disable: true
      },
      { 
        name: 'AI', 
        href: '/ai', 
        icon: <Airplay size={20} />, 
        current: router.pathname.startsWith('/ai'),
        
      },
      {
        name: 'Analytics',
        href: '#',
        icon: <BarChart2 size={20} />,
        current: router.pathname.startsWith('/analytics'),
        children: [
          { 
            name: 'Dashboard', 
            href: '/analytics', 
            icon: <BarChart2 size={16} />, 
            current: router.pathname === '/analytics' 
          },
          { 
            name: 'Activity History', 
            href: '/analytics/history', 
            icon: <Activity size={16} />, 
            current: router.pathname === '/analytics/history' 
          },
          // Admin-only item (will need to be conditionally rendered)
          { 
            name: 'Admin Analytics', 
            href: '/admin/analytics', 
            icon: <Users size={16} />, 
            current: router.pathname === '/admin/analytics' 
          }
        ]
      },
      {
        name: 'Impostazioni',
        href: '#',
        icon: <Settings size={20} />,
        current: router.pathname.startsWith('/settings'),
        children: [
          { 
            name: 'Profilo', 
            href: '/profile', 
            icon: <User size={16} />, 
            current: router.pathname === ('/profile' )
          },
          { 
            name: 'Preferenze', 
            href: '/settings', 
            icon: <Settings size={16} />, 
            current: router.pathname === ('/settings' )
          },
          
          { 
            name: 'Subscription', 
            href: '#', 
            icon: <DollarSign size={20} />, 
            current: router.pathname === ('#' ),
            disable: true
          }
        ]
      },
      { 
        name: 'Terms', 
        href: '/terms', 
        icon: <HelpCircle size={20} />, 
        current: router.pathname.startsWith('/terms') 
      },
      { 
        name: 'Privacy', 
        href: '/privacy', 
        icon: <BookOpen size={20} />, 
        current: router.pathname.startsWith('/privacy') 
      }
    ];
  };
  
  const navigation = getNavigation();
  
  // Toggle expanded items
  const toggleExpanded = (key: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  // Render a nav item with potential children
  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = hasChildren && expandedItems[item.name.toLowerCase()];
    const textColor = item.current 
      ? 'text-blue-700 dark:text-blue-400' 
      : 'text-gray-700 dark:text-gray-300';
    const bgColor = item.current 
      ? 'bg-gray dark:bg-blue-900/20' 
      : 'hover:bg-gray-100 dark:hover:bg-gray-800/60';
      const disabled = item.disable ? 'opacity-50 cursor-not-allowed' : '';
    return (
      <div key={item.name} className="">
        <div
          className={`group flex items-center  justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${textColor} ${bgColor}${disabled}`}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.name.toLowerCase());
            } else if (item.href !== '#') {
              router.push(item.href);
            }
          }}
        >
          <div className="flex items-center">
            <span className={`${item.current ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} mr-3`}>
              {item.icon}
            </span>
            {isOpen && <span>{item.name}</span>}
          </div>
          {isOpen && hasChildren && (
            <div className="ml-2">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          )}
        </div>
        
        {isOpen && hasChildren && isExpanded && (
          <div className="mt-1 ml-4 space-y-1">
            {item.children?.map(child => (
              <Link
                key={child.name}
                href={child.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  child.current
                    ? 'text-blue-700 dark:text-blue-400 bg-gray dark:bg-blue-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
              >
                <span className="mr-3 text-gray-500 dark:text-gray-400">{child.icon}</span>
                <span>{child.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 rounded-xl z-20 bg-black bg-opacity-50 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 border-2 border-r left-0 z-30 w-64 rounded-xl m-1 h-screen bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white dark:bg-gray-600 transition-transform duration-300 ease-in-out transform border-r border-gray-200 dark:border-gray-700 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        {/* Toggle button for desktop */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-0 top-20 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white dark:bg-gray-600 border border-gray-200 dark:border-gray-700 rounded-r-md h-8 w-5 flex items-center justify-center transition-transform text-gray-500 transform translate-x-full"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        
        {/* Sidebar header */}
        <div className="flex items-center rounded-xl justify-between h-16 px-4  border-gray-200 dark:border-gray-700">
          {isOpen ? (
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 relative">
                <div className="absolute inset-0 rounded-lg"></div>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold"><img src='/icon.png' className='h-10 w-10' alt={''}/></div>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                MENU
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="flex-shrink-0 w-10 h-10 relative">
                <div className="absolute inset-0 rounded-lg"></div>
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold"><img src='/icon.png' className='h-10 w-10' alt={''}/></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar content */}
        <div className="flex flex-col rounded-xl overflow-y-auto pt-5 pb-4">
          <div>
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map(item => renderNavItem(item))}
          </nav>
          </div>
          
        </div>
        {/* User info at bottom */}
        {isOpen && session && (
            <div className="px-3 pb-0 mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {session.user?.image ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={session.user.image}
                      alt="Profile"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {session.user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {session.user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
    </>
  );
};

export default EnhancedSidebar;