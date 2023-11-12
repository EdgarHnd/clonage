import { randomString } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { getURL } from '@/utils/helpers';
import { inngest } from '@/lib/inngest/client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );

  try {
    const payload = JSON.parse(body);
    console.log('body', payload);

    if (payload.result.status === 'COMPLETED') {
      let { data: items, error } = await supabase
        .from('generations')
        .select('id')
        .eq('output_video_id', payload.result.id);

      let table = 'generations';

      if (error) {
        throw error;
      }

      if (!items || items.length === 0) {
        const { data: translations, error: translationsError } = await supabase
          .from('translations')
          .select('id')
          .eq('output_video_id', payload.result.id);

        if (translationsError) {
          throw translationsError;
        }

        if (!translations || translations.length === 0) {
          throw new Error(
            'No generation found with the provided output_video_id in both generations and translations tables'
          );
        }

        items = translations;
        table = 'translations';
      }

      const item = items[0];
      const path = `${table}/${item.id}/${
        'output_video' + randomString(10) + '.mp4'
      }`;

      const downloadUrl = getURL() + 'api/download-video';
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

      console.log('urlData', urlData);

      const { error: updateError } = await supabase
        .from(table)
        .update({
          output_video: urlData.url,
          status: 'completed'
        })
        .eq('id', item.id);

      console.log('updateComplete');

      await inngest.send({
        name: `${table}/completed`,
        data: {
          params: {
            id: item.id
          }
        }
      });

      console.log('inngestComplete');

      if (updateError) {
        throw updateError;
      }
    } else if (payload.result.status === 'FAILED') {
      let { data: items, error } = await supabase
        .from('generations')
        .select('id')
        .eq('output_video_id', payload.result.id);

      let table = 'generations';

      if (error) {
        throw error;
      }

      if (!items || items.length === 0) {
        const { data: translations, error: translationsError } = await supabase
          .from('translations')
          .select('id')
          .eq('output_video_id', payload.result.id);

        if (translationsError) {
          throw translationsError;
        }

        if (!translations || translations.length === 0) {
          throw new Error(
            'No generation found with the provided output_video_id in both generations and translations tables'
          );
        }

        items = translations;
        table = 'translations';
      }

      const item = items[0];

      const { error: updateError } = await supabase
        .from(table)
        .update({
          status: 'failed'
        })
        .eq('id', item.id);

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