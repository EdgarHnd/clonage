// app/api/generate/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { randomString } from '../replicate/route';
import { replicate } from '@/utils/replicate';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';

export async function POST(req: Request) {
  if (req.method === 'POST') {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

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

    const inputData = await req.formData();
    const video: File = inputData.get('videoInput') as unknown as File;
    const text: string = inputData.get('textInput') as unknown as string;
    console.log('videoInput', video);
    console.log('textInput', text);

    try {
      const { data, error } = await supabase
        .from('voices')
        .select('voice_id')
        .eq('user', user?.id);

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        throw new Error('No voice_id returned from Supabase');
      }

      const { voice_id } = data[0];
      console.log('voice_id', voice_id);

      /*  const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/' + voice_id,
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
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true
            }
          })
        }
      ); */

      const elevenUrl =
        'https://api.elevenlabs.io/v1/text-to-speech/' + voice_id;
      console.log('elevenUrl', elevenUrl);

      const response = await fetch(elevenUrl, {
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
      });

      console.log('audio voice', JSON.stringify(response));
      if (!response.ok) {
        throw new Error('Error generating audio');
      }
      const genAudio = await response.blob();
      // Upload the result to Supabase Storage
      const audioUrl = await uploadFileToStorage(
        'public',
        'gen_audio' + randomString(10) + '.mp3',
        genAudio,
        'audio/mp3'
      );
      console.log('audioUrl' + audioUrl);
      const audioResponse = await fetch(audioUrl);
      const audio: Blob = await audioResponse.blob();

      // Upload the input files
      await supabase.storage
        .from('public')
        .upload('video' + randomString(10) + '.mp4', video, {
          contentType: 'video/mp4'
        });

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
      // Fetch the video from the URL
      const resultUrl: string = output;
      const res = await fetch(resultUrl);
      const blob = await res.blob();
      // Upload the video to Supabase Storage
      const finalVideoUrl = await uploadFileToStorage(
        'public',
        'final_video' + randomString(10) + '.mp4',
        blob,
        'video/mp4'
      );
      console.log(finalVideoUrl);
      return new Response(JSON.stringify({ output: finalVideoUrl }), {
        status: 200
      });
    } catch (err: any) {
      console.log(err);
      return new Response(`Server Error: ${err.message}`, { status: 400 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
