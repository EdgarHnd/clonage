import { getSession } from '@/app/supabase-server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getSession();
  if (session) {
    return redirect('/translate');
  } else {
    return redirect('/signin');
  }
}
