import {
  getSession,
  getUserDetails,
  getSubscription
} from '@/app/supabase-server';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import SetupComponent from './setupComponent';

export const dynamic = 'force-dynamic';

export default async function Account() {
  const [session, subscription] = await Promise.all([getSession(), getSubscription()]);

  if (!session) {
    return redirect('/signin');
  }

  const hasPaid = Boolean(subscription?.status === 'active');

  return <SetupComponent hasPaid={hasPaid} />;
}
