'use client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import NewGenerationButton from './newGenerationButton';
import { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Generation = Database['public']['Tables']['generations']['Row'];

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File | null>();
  const [script, setScript] = useState<string>('');
  const [generations, setGenerations] = useState<Generation[]>([]);

  

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
        .eq('user', user.id);
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
        .select('voice_id')
        .eq('user', user.id)
        .single();
      if (error) throw error;
      console.log('data' + JSON.stringify(data));
      if (data) {
        setVoice(data.voice_id);
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
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
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
            <NewGenerationButton />
            <div className="grid grid-cols-4 gap-4">
              {generations.map((generation) => (
                <Card
                  onClick={handleGenerationClick(generation.id)}
                  className="text-white flex flex-col items-center bg-black p-4 space-y-4 cursor-pointer"
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
          </>
        )}
      </div>
    </div>
  );
}
