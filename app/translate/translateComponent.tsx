'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { UpdateIcon } from '@radix-ui/react-icons';
import NewTranslationButton from './newTranslationButton';
import { Separator } from '@/components/ui/separator';
import TranslationCard from './translationCard';

type Translation = Database['public']['Tables']['translations']['Row'];

export default function TranslateComponent({ hasPaid }: { hasPaid: boolean }) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const subscription = supabase
      .channel('translations-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations'
        },
        (payload) => {
          fetchTranslations();
          fetchCreditsRemaining();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCreditsRemaining = async () => {
    try {
      const supabase = createClientComponentClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('credits')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setCreditsRemaining(data.credits_remaining);
      }
      return data;
    } catch (error) {
      console.error('Error in fetchCreditsRemaining: ', error);
      throw error;
    }
  };

  const fetchTranslations = async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('user', user.id)
        .filter('status', 'neq', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        console.log(data);
        setTranslations(data as Translation[]);
      }
      return data;
    } catch (error) {
      console.error('Error in fetchGenerations: ', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTranslations();
    fetchCreditsRemaining();
  }, []);

  const router = useRouter();

  const handleGenerationClick = (id: string) => () => {
    router.push(`/translation/${id}`);
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4">
        <h1 className="dark:text-white text-2xl font-bold">translate videos</h1>
        <Separator className="bg-gray-600" />
        {loading ? (
          <UpdateIcon className="animate-spin ml-1" />
        ) : (
          <>
            {hasPaid ? (
              <div className="flex flex-row space-x-4 items-center justify-between">
                {/* <Badge>
                  you have {creditsRemaining} credits remaining
                  <Link
                    className="text-orange-500 hover:text-orange-400 ml-1"
                    href="/pricing"
                  >
                    {' '}
                    upgrade
                  </Link>
                </Badge> */}
                <div></div>
                <div className="flex flex-row items-center space-x-4 dark:text-white">
                  <NewTranslationButton />
                </div>
              </div>
            ) : creditsRemaining > 0 ? (
              <div className="flex flex-row space-x-4 items-center justify-between">
                {/* <Badge>
                  you have {creditsRemaining} credits remaining
                  <Link
                    className="text-orange-500 hover:text-orange-400 ml-1"
                    href="/pricing"
                  >
                    {' '}
                    upgrade
                  </Link>
                </Badge> */}
                <div></div>
                <div className="flex flex-row items-center space-x-4 dark:text-white">
                  <NewTranslationButton />
                </div>
              </div>
            ) : (
              <div className="flex flex-row space-x-4 items-center justify-between">
                <Badge>you don't have any credits remaining</Badge>
                <Link href="/pricing">
                  <Button variant="secondary">subscribe</Button>
                </Link>
              </div>
            )}
            <div className="grid md:grid-cols-3 lg:grid-cols-4 grid-cols-2 gap-4">
              {translations.map((translation) => (
                <TranslationCard
                  translation={translation}
                  onClick={handleGenerationClick(translation.id)}
                  key={translation.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
