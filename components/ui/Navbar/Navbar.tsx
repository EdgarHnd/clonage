import Link from 'next/link';
import { createServerSupabaseClient } from '@/app/supabase-server';

import Logo from '@/components/icons/Logo';

import s from './Navbar.module.css';
import CollapsibleMenu from './CollapsibleMenu';
import { ModeToggle } from '@/components/theme-toggle';
import { PersonIcon } from '@radix-ui/react-icons';
import { Button } from '../button';
import { RemainingCreditsBadge } from '../remainingCreditsBadge';

export default async function Navbar() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <nav className={s.root}>
      <a href="#skip" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <div className="max-w-6xl md:px-6 px-4 mx-auto bg-zinc-200 dark:bg-black">
        <div className="relative flex flex-row justify-between py-4 align-center">
          <div className="flex items-center">
            <Link
              href="https://www.clonage.app"
              target="_blank"
              className="flex flex-row items-center"
              aria-label="Logo"
            >
              <Logo />
              <p className="text-2xl font-bold text-black dark:text-white ml-3">
                clonage
              </p>
            </Link>
            <nav className="hidden ml-12 space-x-6 md:flex">
              {user ? (
                <div className="flex flex-row items-center">
                  <Link href="/translate">
                    <p className="hover:text-orange-400">translate</p>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-row items-center">
                  <Link href="/pricing">pricing</Link>
                </div>
              )}
            </nav>
          </div>
          <div className="flex justify-end flex-1">
            <CollapsibleMenu user={user} />
          </div>
          <div className="justify-end flex-1 space-x-4 md:flex hidden">
            {user ? (
              <>
                <RemainingCreditsBadge />
                <Link href="/account">
                  <Button variant={'outline'}>
                    <PersonIcon className="w-5 h-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/signin">
                <Button>sign in</Button>
              </Link>
            )}
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
