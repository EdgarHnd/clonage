'use client';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@radix-ui/react-icons';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NewTranslationButton = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateGeneration = async () => {
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
        .from('translations')
        .insert([
          {
            user: user.id,
            status: 'created'
          }
        ])
        .select();

      if (error) {
        throw new Error(`Error creating new translation: ${error.message}`);
      }
      console.log('data' + JSON.stringify(data));
      if (data) {
        router.push(`/translation/${data[0].id}`);
      }

      return data;
    } catch (error) {
      console.error('Error in handleCreateTranslation: ', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      disabled={loading}
      variant="secondary"
      onClick={handleCreateGeneration}
      className="flex items-center md:space-x-2"
    >
      <PlusIcon className="h-5 w-5" />
      <div className="hidden sm:block">
        {loading ? 'loading...' : 'create new'}
      </div>
    </Button>
  );
};

export default NewTranslationButton;
