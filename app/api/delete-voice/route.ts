import { Database } from '@/lib/database.types';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

if (!process.env.ELEVENLABS_API_TOKEN) {
  throw new Error(
    'ELEVENLABS_API_TOKEN is not defined in the environment variables.'
  );
}

export async function DELETE(req: Request) {
  if (req.method === 'DELETE') {
    console.log('delete voice route');
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const { voiceId } = await req.json();

    if (!voiceId) {
      return new Response('Missing voiceId', { status: 400 });
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/voices/${voiceId}`,
        {
          method: 'DELETE',
          headers: {
            accept: 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete voice from Eleven Labs API');
      }

      // Delete the voice_id in Supabase
      const { error } = await supabase
        .from('voices')
        .update({ status: 'deleted' })
        .eq('id', voiceId);

      if (error) {
        throw error;
      }
      console.log('voice deleted successfully');

      return new Response('Voice deleted successfully', { status: 200 });
    } catch (error: any) {
      console.log(error);
      return new Response(`Server Error: ${error.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
