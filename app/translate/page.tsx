import { getSession, getSubscription } from '@/app/supabase-server';
import { redirect } from 'next/navigation';
import TranslateComponent from './translateComponent';

export default async function Account() {
  const [session] = await Promise.all([getSession()]);

  if (!session) {
    return redirect('/signin');
  }

  return <TranslateComponent />;
}
