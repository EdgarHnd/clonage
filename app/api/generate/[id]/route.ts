// app/api/generate/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { replicate } from '@/utils/replicate';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { randomString } from '@/lib/utils';

export const maxDuration = 300; 
export const dynamic = 'force-dynamic';
//exit if no API token
if (!process.env.ELEVENLABS_API_TOKEN) {
  throw new Error('No API token found');
}

if (!process.env.SYNCHRONIZER_API_TOKEN) {
  throw new Error('No API token found');
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (req.method === 'POST') {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !user.id) {
      throw new Error('User or user ID is undefined');
    }

    const { data: creditData, error: creditError } = await supabase
      .from('credits')
      .select('*')
      .eq('id', user.id);

    if (creditError) {
      throw new Error(creditError.message);
    }

    if (creditData) {
      console.log('creditData', creditData);
    }

    // Fetch the generation item
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!generation) {
      throw new Error('No generation item found');
    }

    // Fetch the video file from the URL
    if (!generation.input_video) {
      throw new Error('No input video provided');
    }

    if (!generation.input_text) {
      throw new Error('No input text provided');
    }

    if (!generation.voice) {
      throw new Error('No voice provided');
    }

    /*     const videoResponse = await fetch(generation.input_video);
    const video: Blob = await videoResponse.blob(); */

    const uploadFileToStorage = async (
      bucket: string,
      path: string,
      file: File | Blob,
      contentType: string
    ): Promise<string> => {
      try {
        await supabase.storage.from(bucket).upload(path, file, { contentType });
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl;
      } catch (error) {
        console.error(error);
        throw error;
      }
    };

    try {
      const { data, error } = await supabase
        .from('voices')
        .select('id')
        .eq('user', user?.id)
        .neq('status', 'deleted');

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        throw new Error('No voice_id returned from Supabase');
      }

      const { id } = data[0];
      console.log('voice_id', id);

      const elevenUrl = 'https://api.elevenlabs.io/v1/text-to-speech/' + id;
      console.log('elevenUrl', elevenUrl);

      const response = await fetch(elevenUrl, {
        method: 'POST',
        headers: {
          accept: 'audio/mpeg',
          'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: generation.input_text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        console.log(await response.text());
        throw new Error('Server responded with status ' + response.status);
      }
      const genAudio = await response.blob();
      // Upload the result to Supabase Storage
      const path = `generations/${params.id}/${
        'output_audio' + randomString(10) + '.mp3'
      }`;
      const audioUrl = await uploadFileToStorage(
        'public',
        path,
        genAudio,
        'audio/mp3'
      );
      // update the generation item
      await supabase
        .from('generations')
        .update({ output_audio: audioUrl })
        .eq('id', params.id);

      console.log('audioUrl' + audioUrl);
      const output = await fetch('https://api.synclabs.so/video', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'x-api-key': process.env.SYNCHRONIZER_API_TOKEN as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioUrl: audioUrl,
          videoUrl: generation.input_video,
          synergize: true
        })
      });

      const responseBody = await output.json();
      console.log('output', JSON.stringify(responseBody));
      const finalVideoId = responseBody.id;
      // Update the generation item
      await supabase
        .from('generations')
        .update({ output_video_id: finalVideoId, status: 'processing' })
        .eq('id', params.id);

      // Update the credits item
      if (!creditData || creditData.length === 0) {
        console.log('No credits item found');
      } else if (
        creditData[0].credits_remaining &&
        creditData[0].credits_used !== null
      ) {
        console.log('updating credits', creditData);
        const newCreditsRemaining = creditData[0].credits_remaining - 1;
        const newCreditsUsed = creditData[0].credits_used + 1;
        console.log('credits_remaining', newCreditsRemaining);
        console.log('credits_used', newCreditsUsed);
        await supabase
          .from('credits')
          .update({
            credits_remaining: newCreditsRemaining,
            credits_used: newCreditsUsed
          })
          .eq('id', user?.id);
      }

      return new Response(JSON.stringify(finalVideoId), {
        status: 200
      });
    } catch (err: any) {
      console.log(err);
      await supabase
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', params.id);
      return new Response(JSON.stringify({ message: err.message }), {
        status: 400
      });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
