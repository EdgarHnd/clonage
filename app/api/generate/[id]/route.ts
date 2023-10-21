// app/api/generate/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { inngest } from '@/lib/inngest/client';

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

    const finalVideoId = await inngest.send({
      name: 'generation/requested',
      data: {
        params: {
          id: params.id
        },
        user: {
          id: user.id
        },
        generation: {
          input_text: generation.input_text,
          input_video: generation.input_video
        }
      }
    });
    console.log('finalVideoId', finalVideoId);
    return new Response(JSON.stringify(finalVideoId), {
      status: 200
    });
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
