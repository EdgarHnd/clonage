import { Database } from '@/lib/database.types';
import { replicate } from '@/utils/replicate';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

//function to generate a random string of length n
export function randomString(n: number) {
  return [...Array(n)].map(() => Math.random().toString(36)[2]).join('');
}

export async function POST(req: Request) {
  if (req.method === 'POST') {
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

    try {
      const inputData = await req.formData();
      const video: File = inputData.get('videoInput') as unknown as File;
      const audio: File = inputData.get('audioInput') as unknown as File;

      // Upload the input files
      await supabase.storage
        .from('public')
        .upload('video' + randomString(10) + '.mp4', video, {
          contentType: 'video/mp4'
        });
      await supabase.storage
        .from('public')
        .upload('audio' + randomString(10) + '.mp3', audio, {
          contentType: 'audio/mp3'
        });

      console.log('videoInput', video);
      console.log('audioInput', audio);

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
      console.log(resultUrl);
      const response = await fetch(resultUrl);
      const blob = await response.blob();
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
