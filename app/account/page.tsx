import ManageSubscriptionButton from './ManageSubscriptionButton';
import {
  getSession,
  getUserDetails,
  getSubscription
} from '@/app/supabase-server';
import SignOutButton from '@/components/ui/Navbar/SignOutButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database } from '@/lib/database.types';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function Account() {
  const [session, userDetails, subscription] = await Promise.all([
    getSession(),
    getUserDetails(),
    getSubscription()
  ]);

  const user = session?.user;

  if (!session) {
    return redirect('/signin');
  }

  const subscriptionPrice =
    subscription &&
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: subscription?.prices?.currency!,
      minimumFractionDigits: 0
    }).format((subscription?.prices?.unit_amount || 0) / 100);

  const updateName = async (formData: FormData) => {
    'use server';

    const newName = formData.get('name') as string;
    const supabase = createServerActionClient<Database>({ cookies });
    const session = await getSession();
    const user = session?.user;

    if (!user?.id) {
      throw new Error('User not found');
    }

    const { error } = await supabase
      .from('users')
      .update({ full_name: newName })
      .eq('id', user?.id);
    if (error) {
      console.log(error);
    }
    revalidatePath('/account');
  };

  const updateEmail = async (formData: FormData) => {
    'use server';

    const newEmail = formData.get('email') as string;
    const supabase = createServerActionClient<Database>({ cookies });
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      console.log(error);
    }
    revalidatePath('/account');
  };

  return (
    <section className="mb-32 bg-zinc-200 dark:bg-black">
      <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold dark:text-white sm:text-center sm:text-6xl">
            account
          </h1>
          <p className="max-w-2xl m-auto mt-5 text-xl dark:text-zinc-200 sm:text-center sm:text-2xl">
            we partnered with Stripe for a simplified billing.
          </p>
        </div>
      </div>
      <div className="p-4">
        <Card
          title="your plan"
          description={
            subscription
              ? `you are currently on the ${subscription?.prices?.products?.name} plan.`
              : 'you are not currently subscribed to any plan.'
          }
          footer={<ManageSubscriptionButton session={session} />}
        >
          <div className="mt-8 mb-4 text-xl font-semibold">
            {subscription ? (
              `${subscriptionPrice}/${subscription?.prices?.interval}`
            ) : (
              <Link href="/pricing">
                <Button size="lg" variant="secondary">
                  choose your plan
                </Button>
              </Link>
            )}
          </div>
        </Card>
        <Card
          title="your name"
          description="please enter your full name, or a display name you are comfortable with."
          footer={
            <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">64 characters maximum</p>
              <Button
                variant="secondary"
                type="submit"
                form="nameForm"
                disabled={false}
              >
                {/* WARNING - In Next.js 13.4.x server actions are in alpha and should not be used in production code! */}
                update name
              </Button>
            </div>
          }
        >
          <div className="mt-8 mb-4 text-xl font-semibold">
            <form id="nameForm" action={updateName}>
              <Input
                type="text"
                name="name"
                className="w-1/2 p-3 rounded-md"
                defaultValue={userDetails?.full_name ?? ''}
                placeholder="your name"
                maxLength={64}
              />
            </form>
          </div>
        </Card>
        <Card
          title="your email"
          description="please enter the email address you want to use to login."
          footer={
            <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
              <p className="pb-4 sm:pb-0">
                we will email you to verify the change.
              </p>
              <Button
                variant="secondary"
                type="submit"
                form="emailForm"
                disabled={true}
              >
                {/* WARNING - In Next.js 13.4.x server actions are in alpha and should not be used in production code! */}
                update Email
              </Button>
            </div>
          }
        >
          <div className="mt-8 mb-4 text-xl font-semibold">
            <form id="emailForm" action={updateEmail}>
              <Input
                type="text"
                name="email"
                className="w-1/2 p-3 rounded-md"
                defaultValue={user ? user.email : ''}
                placeholder="your email"
                maxLength={64}
                disabled={true}
              />
            </form>
          </div>
        </Card>
        <div className="p-4 w-full flex flex-col items-center">
          <SignOutButton />
        </div>
      </div>
    </section>
  );
}

interface Props {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

function Card({ title, description, footer, children }: Props) {
  return (
    <div className="w-full max-w-3xl m-auto my-8 border rounded-md p border-zinc-700">
      <div className="px-5 py-4">
        <h3 className="mb-1 text-2xl font-medium">{title}</h3>
        <p className="dark:text-zinc-300">{description}</p>
        {children}
      </div>
      <div className="p-4 border-t rounded-b-md border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
        {footer}
      </div>
    </div>
  );
}
