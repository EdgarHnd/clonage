import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { randomString } from '@/lib/utils';

export const dynamic = 'force-dynamic'

if (!process.env.SYNCHRONIZER_API_TOKEN) {
  throw new Error('No API token found');
}

export async function POST(req: Request) {
  if (req.method === 'POST') {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    const uploadFileToStorage = async (
      bucket: string,
      path: string,
      file: File,
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

    try {
      const data = await req.formData();
      console.log('data', data);
      const video: File = data.get('videoInput') as unknown as File;
      const audio: File = data.get('audioInput') as unknown as File;

      // Upload the input files and get the URLs
      const videoUrl = await uploadFileToStorage(
        'public',
        randomString(10) + '.mp4',
        video,
        'video/mp4'
      );
      const audioUrl = await uploadFileToStorage(
        'public',
        randomString(10) + '.mp3',
        audio,
        'audio/mp3'
      );

      // Run the model
      if (!videoUrl || !audioUrl) {
        throw new Error('No video or audio file provided');
      }

      console.log('videoUrl', videoUrl);
      console.log('audioUrl', audioUrl);

      const response = await fetch('https://api.synclabs.so/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_uri: audioUrl,
          video_uri: videoUrl,
          synergize: true
        })
      });

      const output = await response.json();
      console.log('output', JSON.stringify(output));

      return new Response(JSON.stringify({ output }));
    } catch (err: any) {
      console.log(err);
      return new Response(`Server Error: ${err.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (req.method === 'GET') {
    if (!params.id) {
      throw new Error('No id provided');
    }
    try {
      const response = await fetch(
        `https://api.synclabs.so/video/${params.id}`,
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'x-api-key': process.env.SYNCHRONIZER_API_TOKEN as string,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
      const output = await response.json();
      console.log('output', JSON.stringify(output.status));

      return new Response(JSON.stringify({ output }));
    } catch (err: any) {
      console.log(err);
      return new Response(`Server Error: ${err.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
