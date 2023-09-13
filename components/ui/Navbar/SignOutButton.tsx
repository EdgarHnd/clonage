'use client';

import { useSupabase } from '@/app/supabase-provider';
import { useRouter } from 'next/navigation';

import s from './Navbar.module.css';
import { Button } from '../button';

export default function SignOutButton() {
  const router = useRouter();
  const { supabase } = useSupabase();
  return (
    <Button
      variant="ghost"
      onClick={async () => {
        await supabase.auth.signOut();
        router.push('/signin');
        router.refresh();
      }}
    >
      sign out
    </Button>
  );
}
