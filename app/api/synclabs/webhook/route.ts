import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { randomString } from '@/lib/utils';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { getURL } from '@/utils/helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const supabase = createRouteHandlerClient<Database>({ cookies });
  try {
    const payload = JSON.parse(body);
    console.log('body', payload);

    if (payload.result.status === 'COMPLETED') {
      const { data: generation, error } = await supabase
        .from('generations')
        .select('id')
        .eq('output_video_id', payload.result.id)
        .single();

      if (error) {
        throw error;
      }

      const path = `generations/${generation.id}/${
        'output_video' + randomString(10) + '.mp4'
      }`;

      const downloadUrl = getURL() + '/api/download-video';
      console.log('downloadUrl', downloadUrl);

      const downloadResponse = await fetch(downloadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoUrl: payload.result.url, path })
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json();
        throw new Error(
          errorData.message || 'an error occurred during video downloading'
        );
      }

      const urlData = await downloadResponse.json();

      const { error: updateError } = await supabase
        .from('generations')
        .update({
          output_video: urlData.url,
          status: 'completed'
        })
        .eq('id', payload.result.id);

      if (updateError) {
        throw updateError;
      }
    } else if (payload.result.status === 'FAILED') {
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          status: 'failed'
        })
        .eq('id', payload.result.id);

      if (updateError) {
        throw updateError;
      }
    }
  } catch (error) {
    console.log(error);
    return new Response(
      'Webhook handler failed. View your nextjs function logs.',
      {
        status: 400
      }
    );
  }
  return new Response(JSON.stringify({ received: true }));
}
