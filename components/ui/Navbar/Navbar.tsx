import Link from 'next/link';
import { createServerSupabaseClient } from '@/app/supabase-server';

import Logo from '@/components/icons/Logo';
import SignOutButton from './SignOutButton';

import s from './Navbar.module.css';
import CollapsibleMenu from './CollapsibleMenu';

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
      <div className="max-w-6xl md:px-6 px-4 mx-auto">
        <div className="relative flex flex-row justify-between py-4 align-center md:py-6">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex flex-row items-center"
              aria-label="Logo"
            >
              <Logo />
              <p className="text-2xl font-bold text-white ml-3">clonage</p>
              <p className="relative -top-3 -left-2 text-xs text-red-500">beta</p>
            </Link>
            <nav className="hidden ml-6 space-x-2 md:block">
              {user ? (
                <>
                  <Link href="/setup" className={s.link}>
                    setup
                  </Link>
                  <Link href="/generate" className={s.link}>
                    generate
                  </Link>
                </>
              ) : (
                <>
                 {/*  <Link href="/" className={s.link}>
                    roadmap
                  </Link> */}
                  <Link href="/pricing" className={s.link}>
                    pricing
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex justify-end flex-1">
            <CollapsibleMenu user={user} />
          </div>
          <div className=" justify-end flex-1 space-x-8 md:flex hidden">
            {user ? (
              <>
                <Link href="/account" className={s.link}>
                  account
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link href="/signin" className={s.link}>
                sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
