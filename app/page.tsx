import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getSession } from '@/app/supabase-server';

import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getSession();
  if (session) {
    return redirect('/generate');
  } else {
    return redirect('/signin');
  }
}
