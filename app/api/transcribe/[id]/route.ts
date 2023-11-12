// app/api/transcribe/[id]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { inngest } from '@/lib/inngest/client';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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

    // Fetch the transcription item
    const { data: translation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!translation) {
      throw new Error('No transcription item found');
    }

    // Fetch the audio file from the URL
    if (!translation.original_video) {
      throw new Error('No input audio provided');
    }

    const finalTranscriptionId = await inngest.send({
      name: 'transcription/requested',
      data: {
        params: {
          id: params.id
        },
      }
    });
    console.log('finalTranscriptionId', finalTranscriptionId);
    return new Response(JSON.stringify(finalTranscriptionId), {
      status: 200
    });
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
