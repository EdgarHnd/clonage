'use client';
import { Button } from '@/components/ui/button';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const NewGenerationButton = () => {
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

      const { data, error } = await supabase.from('generations').insert([
        {
          user: user.id,
          status: 'created'
        }
      ]).select();

      if (error) {
        throw new Error(`Error creating new generation: ${error.message}`);
      }
      console.log('data' + JSON.stringify(data));
      if (data) {
        router.push(`/generation/${data[0].id}`);
      }

      return data;
    } catch (error) {
      console.error('Error in handleCreateGeneration: ', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button disabled={loading} variant="secondary" onClick={handleCreateGeneration}>
      {loading ? 'loading...' : 'create new'}
    </Button>
  );
};

export default NewGenerationButton;
