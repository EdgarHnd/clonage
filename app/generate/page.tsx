import {
  getSession,
  getUserDetails,
  getSubscription
} from '@/app/supabase-server';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import GenerateComponent from './generateComponent';

export default async function Account() {
  const [session, subscription] = await Promise.all([getSession(), getSubscription()]);

  if (!session) {
    return redirect('/signin');
  }

  const hasPaid = Boolean(subscription?.status === 'active');

  return <GenerateComponent hasPaid={hasPaid} />;
}
