import Link from 'next/link';

import Logo from '@/components/icons/Logo';
import GitHub from '@/components/icons/GitHub';
import { TwitterLogoIcon } from '@radix-ui/react-icons';

export default function Footer() {
  return (
    <footer className="mx-auto max-w-[1920px] px-6 bg-zinc-200 dark:bg-black">
      <div className="grid grid-cols-1 dark:text-white transition-colors duration-150 border-b lg:grid-cols-12">
        {/* <div className="col-span-1 lg:col-span-2">
          <Link
            href="/"
            className="flex items-center flex-initial font-bold md:mr-24"
          >
            <span className="mr-2 border rounded-full border-zinc-700">
              <Logo />
            </span>
            <span>ACME</span>
          </Link>
        </div> */}
        {/* <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="dark:text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Home
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="dark:text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Pricing
              </Link>
            </li>
          </ul>
        </div> */}
        {/* <div className="col-span-1 lg:col-span-2">
          <ul className="flex flex-col flex-initial md:flex-1">
            <li className="py-3 md:py-0 md:pb-4">
              <p className="font-bold dark:text-white transition duration-150 ease-in-out hover:text-zinc-200">
                LEGAL
              </p>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="dark:text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Privacy Policy
              </Link>
            </li>
            <li className="py-3 md:py-0 md:pb-4">
              <Link
                href="/"
                className="dark:text-white transition duration-150 ease-in-out hover:text-zinc-200"
              >
                Terms of Use
              </Link>
            </li>
          </ul>
        </div> */}
      </div>
      <div className="flex flex-col items-center justify-between py-12 space-y-4 md:flex-row dark:text-white">
        <div>
          <span>
            &copy; {new Date().getFullYear()} Clonage. All rights reserved.
          </span>
        </div>
        <div className="flex items-center h-10 space-x-6">
            <Link
              className="flex flex-row items-center justify-center space-x-2 transition duration-150 ease-in-out hover:bg-white bg-slate-100 rounded-full text-black px-3 py-1 text-sm z-50"
              aria-label="Twitter"
              href="https://twitter.com/edgarhnd"
              target="_blank"
            >
              <p>follow the latest updates</p>
              <TwitterLogoIcon className='w-6 h-6' />
            </Link>
          </div>
      </div>
    </footer>
  );
}
