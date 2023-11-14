'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { UpdateIcon } from '@radix-ui/react-icons';
import NewTranslationButton from './newTranslationButton';
import { Separator } from '@/components/ui/separator';

type Translation = Database['public']['Tables']['translations']['Row'];

export default function TranslateComponent({ hasPaid }: { hasPaid: boolean }) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

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

  useEffect(() => {
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

  const badgecolor = (status: string | null) => {
    switch (status) {
      case 'created':
        return 'bg-yellow-500 hover:bg-yellow-500';
      case 'processing':
        return 'bg-yellow-500 hover:bg-yellow-500';
      case 'completed':
        return 'bg-green-500 hover:bg-green-500';
      case 'failed':
        return 'bg-red-500 hover:bg-red-500';
      default:
        return 'bg-yellow-500 hover:bg-yellow-500';
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-white text-2xl font-bold">translate videos</h1>
        <Separator className="bg-gray-600" />
        {loading ? (
          <UpdateIcon className="animate-spin ml-1" />
        ) : (
          <>
            {hasPaid ? (
              <div className="text-center flex flex-row space-x-4 items-center justify-between">
                <Badge>
                  You have {creditsRemaining} credits remaining
                  <Link
                    className="text-orange-500 hover:text-orange-400 ml-1"
                    href="/pricing"
                  >
                    {' '}
                    upgrade
                  </Link>
                </Badge>
                <div className="flex flex-row items-center space-x-4 text-white">
                  <NewTranslationButton />
                </div>
              </div>
            ) : creditsRemaining > 0 ? (
              <div className="text-center flex flex-row space-x-4 items-center justify-between">
                <Badge>
                  You have {creditsRemaining} credits remaining
                  <Link
                    className="text-orange-500 hover:text-orange-400 ml-1"
                    href="/pricing"
                  >
                    {' '}
                    upgrade
                  </Link>
                </Badge>
                <div className="flex flex-row items-center space-x-4 text-white">
                  <NewTranslationButton />
                </div>
              </div>
            ) : (
              <div className="flex flex-row space-x-4 items-center justify-between text-white">
                <Badge>you don't have any credits remaining</Badge>
                <Link href="/pricing">
                  <Button variant="outline" className="text-white">
                    subscribe
                  </Button>
                </Link>
              </div>
            )}
            <div className="grid md:grid-cols-4 grid-cols-1 gap-4">
              {translations.map((translation) => (
                <Card
                  onClick={handleGenerationClick(translation.id)}
                  className="text-white flex flex-col items-center border-gray-600 bg-black p-4 space-y-4 cursor-pointer"
                  key={translation.id}
                >
                  <CardHeader>
                    <Badge className={badgecolor(translation.status)}>
                      {translation.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center w-60 truncate">
                      {translation.transcription ||
                        'click to complete translation'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
