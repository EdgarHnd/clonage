import { Database } from '@/lib/database.types';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

if (!process.env.ELEVENLABS_API_TOKEN) {
  throw new Error(
    'ELEVENLABS_API_TOKEN is not defined in the environment variables.'
  );
}

export async function POST(req: Request) {
  if (req.method === 'POST') {
    console.log('clone voice route');
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const inputData = await req.formData();
    console.log('inputData', inputData);
    const voiceName: string = inputData.get('voiceName') as unknown as string;
    const voiceDescription: string = inputData.get(
      'voiceDescription'
    ) as unknown as string;
    const audioFile: File = inputData.get('audioFile') as unknown as File;

    if (!voiceName || !audioFile) {
      return new Response('Missing required fields', { status: 400 });
    }
    console.log(voiceName, voiceDescription, audioFile.name);

    const data = new FormData();
    data.append('name', voiceName);
    data.append('description', voiceDescription);
    data.append('files', audioFile);

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string
        },
        body: data
      });
      const result = await response.json();
      console.log('result', result);
      const { voice_id } = result;
      console.log('voice_id', voice_id);

      if (!voice_id) {
        throw new Error('No voice_id returned from Eleven Labs API');
      }

      // Store the voice_id in Supabase
      const { error } = await supabase.from('voices').insert([
        {
          id: voice_id,
          name: voiceName,
          description: voiceDescription || '',
          user: user?.id
        }
      ]);

      if (error) {
        throw error;
      }

      return new Response(voice_id, { status: 200 });
    } catch (error: any) {
      console.log(error);
      return new Response(`Server Error: ${error.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
