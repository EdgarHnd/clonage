'use client';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import NewGenerationButton from './newGenerationButton';
import { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { UpdateIcon } from '@radix-ui/react-icons';
import { Separator } from '@/components/ui/separator';

type Generation = Database['public']['Tables']['generations']['Row'];

export default function GenerateComponent({ hasPaid }: { hasPaid: boolean }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const subscription = supabase
      .channel('generations-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generations'
        },
        (payload) => {
          fetchGenerations();
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

  const [voice, setVoice] = useState<string>('');

  const fetchGenerations = async () => {
    try {
      const supabase = createClientComponentClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user', user.id)
        .filter('status', 'neq', 'deleted')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setGenerations(data as Generation[]);
      }
      return data;
    } catch (error) {
      console.error('Error in fetchGenerations: ', error);
      throw error;
    }
  };

  const fetchVoice = async () => {
    setLoading(true);
    try {
      const supabase = createClientComponentClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('voices')
        .select('id')
        .eq('user', user.id)
        .neq('status', 'deleted');

      if (error) throw error;
      if (data.length > 0) {
        console.log(JSON.stringify(data));
        setVoice(data[0].id);
      } else {
        setVoice('');
      }
      return data;
    } catch (error) {
      console.error('Error in fetchVoice: ', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerations();
    fetchVoice();
    fetchCreditsRemaining();
  }, []);

  const router = useRouter();
  const handleGenerationClick = (id: string) => () => {
    router.push(`/generation/${id}`);
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
        <h1 className="text-white text-2xl font-bold">generate videos</h1>
        <Separator className="bg-gray-600" />
        {loading ? (
          <UpdateIcon className="animate-spin ml-1" />
        ) : (
          <>
            {' '}
            {!voice ? (
              <div className="flex flex-row items-center justify-between space-x-4 text-white">
                <Badge variant={'secondary'}>no voice clone setup</Badge>
                <Link href="/setup">
                  <Button variant={'secondary'}>setup</Button>
                </Link>
              </div>
            ) : (
              <>
                {hasPaid ? (
                  <div className="flex flex-row justify-between space-x-4 items-center">
                    <Badge className="flex flex-col md:flex-row text-center md:text-start">
                      {' '}
                      you have {creditsRemaining} credits remaining
                      <Link
                        className="text-orange-500 hover:text-orange-400 mt-1 md:ml-1 md:mt-0"
                        href="/pricing"
                      >
                        {' '}
                        upgrade
                      </Link>
                    </Badge>
                    <div className="flex flex-row items-center space-x-4 text-white">
                      <Link href="/setup">
                        <Button className="text-white">change voice</Button>
                      </Link>
                      <NewGenerationButton />
                    </div>
                  </div>
                ) : creditsRemaining > 0 ? (
                  <div className="flex flex-row space-x-4 justify-between items-center">
                    <Badge className="flex flex-col md:flex-row text-center md:text-start">
                      {' '}
                      you have {creditsRemaining} credits remaining
                      <Link
                        className="text-orange-500 hover:text-orange-400"
                        href="/pricing"
                      >
                        {' '}
                        upgrade
                      </Link>
                    </Badge>
                    <div className="flex flex-row items-center space-x-4 text-white">
                      <Link href="/setup">
                        <Button className="text-white">change voice</Button>
                      </Link>
                      <NewGenerationButton />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-row items-center justify-between space-x-4 text-white">
                    <Badge>you don't have any credits remaining</Badge>
                    <Link href="/pricing">
                      <Button variant="secondary">
                        subscribe
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
        <div className="grid md:grid-cols-4 grid-cols-1 gap-4">
          {generations.map((generation) => (
            <Card
              onClick={handleGenerationClick(generation.id)}
              className="text-white flex flex-col items-center border-gray-600 bg-black p-4 space-y-4 cursor-pointer"
              key={generation.id}
            >
              <CardHeader>
                <Badge className={badgecolor(generation.status)}>
                  {generation.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-center w-60 truncate">
                  {generation.input_text || 'click to complete generation'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
