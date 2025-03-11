import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { Sun, Moon, Bell, Settings, User, LogOut, Menu } from 'react-feather';
import useUserProfileStore from 'src/store/userProfileStore';

const Navbar = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { profileImage } = useUserProfileStore(); // Ottieni l'immagine dal global store
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Implementazione reale del tema dark/light
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white border-white  border-0 dark:bg-gray-600 rounded-b-xl shadow-sm">
      <div className="px-4 rounded-b-xl border-0 sm:px-6 lg:px-8">
        <div className="flex rounded-b-xl items-center border-0 justify-between h-16">
          {/* Left section */}
          <div className="flex items-center">
          <button 
              className="mr-2 inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu size={24} />
            </button>
            <Link href="/" className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img
                  className=" h-14 w-auto"
                  src="/logo.png"
                  alt="CAD/CAM FUN"
                />
                
              </div>
            </Link>
          </div>

          {/* Azioni a destra */}
          <div className="flex items-center space-x-4">
            {/* Tema dark/light */}
            <button
              onClick={toggleDarkMode}
              className="inline-flex items-center justify-center p-2 rounded-md text-yellow-500 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
            </button>

            {/* Notifiche */}
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-label="View notifications"
            >
              <Bell size={22} />
            </button>

            {/* Impostazioni */}
            <Link 
              href="/settings" 
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-label="Settings"
            >
              <Settings size={22} />
            </Link>

            {/* Avatar Utente con Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                id="user-menu"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-900">
                  {profileImage || session?.user?.image ? (
                    <img
                      src={profileImage || session?.user?.image || ''}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-blue-100 dark:bg-blue-900">
                      <span className="text-blue-800 dark:text-blue-300 font-medium text-lg">
                        {session?.user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {/* Dropdown menu */}
              {profileDropdownOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-600 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{session?.user?.name || 'Utente'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session?.user?.email || 'utente@esempio.com'}</p>
                  </div>
                  
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    role="menuitem"
                  >
                    <User size={16} className="mr-2" />
                    Il mio profilo
                  </Link>
                  
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    role="menuitem"
                  >
                    <Settings size={16} className="mr-2" />
                    Impostazioni
                  </Link>
                  
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    role="menuitem"
                  >
                    <LogOut size={16} className="mr-2" />
                    Esci
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;