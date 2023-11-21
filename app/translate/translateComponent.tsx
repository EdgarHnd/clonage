'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';
import { UpdateIcon } from '@radix-ui/react-icons';
import NewTranslationButton from './newTranslationButton';
import { Separator } from '@/components/ui/separator';
import TranslationCard from './translationCard';

type Translation = Database['public']['Tables']['translations']['Row'];

export default function TranslateComponent() {
  const [translations, setTranslations] = useState<Translation[]>([]);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

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
  }, []);

  const router = useRouter();

  const handleGenerationClick = (id: string) => () => {
    router.push(`/translation/${id}`);
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-row w-full justify-between">
          {' '}
          <h1 className="dark:text-white text-2xl font-bold">
            translate videos
          </h1>
          <NewTranslationButton />
        </div>
        <Separator className="bg-gray-600" />
        {loading ? (
          <UpdateIcon className="animate-spin ml-1" />
        ) : (
          <>
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
