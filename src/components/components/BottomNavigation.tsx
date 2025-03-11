

import Link from 'next/link';
import { useRouter } from 'next/router';
import { Grid, Home, Tool, User } from 'react-feather';

const BottomNavigation = () => {
  const router = useRouter();
  const isActivePath = (path: string) => router.pathname === path;

  return (
    <div className=" pb-[18px] rounded-t-md fixed inset-x-0 bottom-0 z-[5] border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-600 md:hidden">
      <div className="grid grid-cols-4">
        <Link href="/" className="mx-auto my-2">
          {isActivePath('/') ? (
            <Home className="h-6 w-6" />
          ) : (
            <Home className="h-6 w-6" />
          )}
        </Link>
        <Link href="/cad" className="mx-auto my-2">
          {isActivePath('/cad') ? (
            <Grid size={20} />
          ) : (
            <Grid size={20} />
          )}
        </Link>
        <Link href="/cam" className="mx-auto my-2">
          {isActivePath('/cam') ? (
            <Tool size={20} /> 
          ) : (
            <Tool size={20} /> )}
        </Link>

        <Link href="/profile" className="mx-auto my-2">
          {isActivePath('/profile') ? (
            <User size={20} />
          ) : (
            <User size={20} />
          )}
        </Link>
      </div>
    </div>
  );
};

export default BottomNavigation;
