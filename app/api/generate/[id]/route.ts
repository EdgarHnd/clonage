// app/api/generate/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { replicate } from '@/utils/replicate';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { randomString } from '@/lib/utils';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (req.method === 'POST') {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

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

    const videoResponse = await fetch(generation.input_video);
    const video: Blob = await videoResponse.blob();

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
        .eq('user', user?.id);

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
      const audioResponse = await fetch(audioUrl);
      const audio: Blob = await audioResponse.blob();

      const videoBytes = await video.arrayBuffer();
      const audioBytes = await audio.arrayBuffer();

      const videoBuffer = Buffer.from(videoBytes);
      const audioBuffer = Buffer.from(audioBytes);

      // Convert to base64
      const videoBase64 = `data:video/mp4;base64,${videoBuffer.toString(
        'base64'
      )}`;
      const audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString(
        'base64'
      )}`;

      // Run the model
      if (!videoBase64 || !audioBase64) {
        throw new Error('No video or audio file provided');
      }
      const output: any = await replicate.run(
        'devxpy/cog-wav2lip:8d65e3f4f4298520e079198b493c25adfc43c058ffec924f2aefc8010ed25eef',
        {
          input: {
            face: videoBase64,
            audio: audioBase64
          }
        }
      );
      console.log('output' + output);
      // Fetch the video from the URL
      const resultUrl: string = output;
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      // Upload the video to Supabase Storage
      const videoPath = `generations/${params.id}/${
        'output_video' + randomString(10) + '.mp4'
      }`;
      const finalVideoUrl = await uploadFileToStorage(
        'public',
        videoPath,
        blob,
        'video/mp4'
      );
      console.log(finalVideoUrl);
      // Update the generation item
      await supabase
        .from('generations')
        .update({ output_video: finalVideoUrl, status: 'completed' })
        .eq('id', params.id);

      return new Response(JSON.stringify({ output: finalVideoUrl }), {
        status: 200
      });
    } catch (err: any) {
      console.log(err);
      await supabase
        .from('generations')
        .update({ status: 'failed' })
        .eq('id', params.id);
      return new Response(`Server Error: ${err.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
