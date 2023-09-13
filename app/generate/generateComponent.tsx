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

type Generation = Database['public']['Tables']['generations']['Row'];

export default function GenerateComponent({ hasPaid }: { hasPaid: boolean }) {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);

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

  useEffect(() => {
    fetchCreditsRemaining();
  }, []);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('data' + JSON.stringify(data));
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
        .single();
      if (error) throw error;
      console.log('data' + JSON.stringify(data));
      if (data) {
        setVoice(data.id);
      }
      return data;
    } catch (error) {
      console.error('Error in fetchVoice: ', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchGenerations();
    fetchVoice();
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
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">generate videos</h1>
        {!voice ? (
          <div className="flex flex-col items-center space-y-4 text-white">
            <p>you don't have a voice yet</p>
            <Link href="/setup">
              <Button className="text-white">setup</Button>
            </Link>
          </div>
        ) : (
          <>
            {hasPaid ? (
              <div className="text-center flex flex-col space-y-4 items-center">
                <p>thanks for subscribing!</p>
                <p>
                  during beta paying user get unlimited credits (please be
                  mindfull with the usage though 🙏)
                </p>
                <NewGenerationButton />
              </div>
            ) : creditsRemaining > 0 ? (
              <p className="text-white text-center">
                You have {creditsRemaining} free credits remaining
                <Link
                  className="text-orange-500 hover:text-orange-400"
                  href="/pricing"
                >
                  {' '}
                  subscribe for unlimited access during the beta
                </Link>
              </p>
            ) : (
              <div className="flex flex-col items-center space-y-4 text-white">
                <p>you don't have any credits remaining</p>
                <Link href="/pricing">
                  <Button className="text-white">subscribe</Button>
                </Link>
              </div>
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
                <p className="text-center">
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
