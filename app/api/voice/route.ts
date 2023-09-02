import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types_db';
import { randomString } from '../replicate/route';
import { cookies } from 'next/headers';

if (!process.env.ELEVENLABS_API_TOKEN) {
  throw new Error(
    'ELEVENLABS_API_TOKEN is not defined in the environment variables.'
  );
}

export async function POST(req: Request) {
  if (req.method === 'POST') {
    console.log('voice route');
    // get the text from the request body
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const uploadFileToStorage = async (
      bucket: string,
      path: string,
      file: File | Blob,
      contentType: string
    ): Promise<string> => {
      try {
        await supabase.storage.from(bucket).upload(path, file, { contentType });

        // Get the URL of the uploaded file
        const { data } = await supabase.storage.from(bucket).getPublicUrl(path);

        return data?.publicUrl;
      } catch (error) {
        console.error(error);
        throw error;
      }
    };

    const { text } = await req.json();
    console.log('textVoice', text);

    try {
      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/ZXsyeDWdY91WGp3xkrqw',
        {
          method: 'POST',
          headers: {
            accept: 'audio/mpeg',
            'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        }
      );

      console.log('audio voice', JSON.stringify(response));
      const audio = await response.blob();
      // Upload the result to Supabase Storage
      const audioUrl = await uploadFileToStorage(
        'public',
        'gen_audio' + randomString(10) + '.mp3',
        audio,
        'audio/mp3'
      );

      return new Response(audioUrl, { status: 200 });
    } catch (error: any) {
      console.log(error);
      return new Response(`Server Error: ${error.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
