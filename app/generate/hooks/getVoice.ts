/* import { useSupabase } from '@/app/supabase-provider';
import { useState, useEffect } from 'react';

export const useVoiceId = (userId: string | null) => {
  const [voiceId, setVoiceId] = useState<string>("");
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchVoiceId = async () => {
      const { data, error } = await supabase
        .from('voices')
        .select('voice_id')
        .eq('user', userId)
        .single();

      if (error) {
        console.error('Error fetching voice id: ', error);
      } else if (data) {
        setVoiceId(data.voice_id);
      }
    };

    if (userId) {
      fetchVoiceId();
    }
  }, [userId]);

  return voiceId;
};
 */