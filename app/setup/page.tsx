import {
  getSession,
  getUserDetails,
  getSubscription
} from '@/app/supabase-server';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import SetupComponent from './setupComponent';

export default async function Account() {
  const [session] = await Promise.all([getSession()]);

  if (!session) {
    return redirect('/signin');
  }

  return <SetupComponent />;
}
