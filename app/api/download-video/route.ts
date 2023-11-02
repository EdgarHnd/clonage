import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (req.method === 'POST') {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );

    // get the video URL from the request body
    const { videoUrl, path } = await req.json();
    console.log('videoUrl', videoUrl + ' ' + path);

    try {
      // fetch the video
      const videoResponse = await fetch(videoUrl);
      const videoBuffer = await videoResponse.arrayBuffer();

      // upload the video to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public')
        .upload(path, videoBuffer);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      if (!uploadData) {
        throw new Error('No upload data found');
      }

      // return the public URL of the uploaded video
      const { data: publicUrlData } = await supabase.storage
        .from('public')
        .getPublicUrl(path);

      if (!publicUrlData) {
        throw new Error('No public URL data found');
      }
      console.log('publicUrlData', publicUrlData);

      return new Response(JSON.stringify({ url: publicUrlData.publicUrl }), {
        status: 200
      });
    } catch (error: any) {
      console.error(error);
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500
      });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
