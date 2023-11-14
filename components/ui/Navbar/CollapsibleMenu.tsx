'use client';
import { useState } from 'react';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

import { Cross1Icon, HamburgerMenuIcon } from '@radix-ui/react-icons';

interface CollapsibleMenuProps {
  user: any; // Replace 'any' with the actual type of 'user'
}

export default function CollapsibleMenu({ user }: CollapsibleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button onClick={toggleMenu} className="md:hidden">
        {isOpen ? <Cross1Icon /> : <HamburgerMenuIcon />}
      </button>
      <nav
        className={`flex flex-col space-y-4 w-full lg:hidden absolute top-14 items-center justify-start mt-2 bg-black rounded-b-lg p-4 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        {user ? (
          <>
            <Link onClick={toggleMenu} href="/translate" className="">
              translate
            </Link>
            {/*  <Link onClick={toggleMenu} href="/generate" className="">
              generate
            </Link> */}
            <Link onClick={toggleMenu} href="/account" className="">
              account
            </Link>
            <SignOutButton />
          </>
        ) : (
          <>
            {/* <Link onClick={toggleMenu} href="/" className="">
              roadmap
            </Link> */}
            <Link onClick={toggleMenu} href="/pricing" className="">
              pricing
            </Link>
            <Link onClick={toggleMenu} href="/signin" className="">
              sign in
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
