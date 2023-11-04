import { inngest } from './client';
import { randomString } from '../utils';
import { uploadFileToStorage } from '@/utils/supabase-storage';
import { createClient } from '@supabase/supabase-js';
import { getURL } from '@/utils/helpers';

export const helloWorld = inngest.createFunction(
  { id: 'hello-world' },
  { event: 'test/hello.world' },
  async ({ event, step }) => {
    await step.sleep('wait-a-moment', '1s');
    return { event, body: 'Hello, World!' };
  }
);

export const generateVideo = inngest.createFunction(
  { id: 'generate-video' },
  { event: 'generation/requested' },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    const params = event.data.params;
    const user = event.data.user;
    const generation = event.data.generation;

    // Fetch voice id
    const voiceId = await step.run('fetch-voice-id', async () => {
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

      return id;
    });

    // Generate audio
    const generatedAudioUrl = await step.run('generate-audio', async () => {
      const elevenUrl =
        'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId;
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

      return audioUrl;
    });

    // Generate video
    const startVideoGeneration = await step.run('generate-video', async () => {
      try {
        const output = await fetch('https://api.synclabs.so/video', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'x-api-key': process.env.SYNCHRONIZER_API_TOKEN as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audioUrl: generatedAudioUrl,
            videoUrl: generation.input_video,
            synergize: true,
            maxCredits: 100,
            webhookUrl: getURL() + 'api/synclabs/webhook'
          })
        });

        console.log('output', output);

        const responseBody = await output.json();
        console.log('output', JSON.stringify(responseBody));
        const finalVideoId = responseBody.id;
        // Update the generation item
        await supabase
          .from('generations')
          .update({ output_video_id: finalVideoId, status: 'processing' })
          .eq('id', params.id);

        return finalVideoId;
      } catch (e) {
        console.log('error', e);
      }
    });

    return startVideoGeneration;
  }
);

export const onGenerationCompletion = inngest.createFunction(
  { id: 'on-generation-completion' },
  { event: 'generation/completed' },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    const generationId = event.data.params.id;

    // Fetch the generation item
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generationId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!generation) {
      throw new Error('No generation item found');
    }
    console.log('generation', generation);
    // fetch the user
    const { data: user, error } = await supabase.auth.admin.getUserById(
      generation.user
    );
    if (error) {
      throw new Error(error.message);
    }
    if (!user) {
      throw new Error('No user found');
    }
    const email = user.user.email;
    // Update credits
    await step.run('update-credits', async () => {
      const { data: creditData, error: creditError } = await supabase
        .from('credits')
        .select('*')
        .eq('id', generation.user);

      if (creditError) {
        throw new Error(creditError.message);
      }
      console.log('creditData', creditData);
      
      if (!creditData || creditData.length === 0) {
        console.log('No credits item found');
      } else if (
        creditData[0].credits_remaining &&
        creditData[0].credits_used !== null
      ) {
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
          .eq('id', generation.user);
      }
      return 'credits updated';
    });

    //send email with Resend api
    await step.run('send-email', async () => {
      const generationUrl = getURL() + 'generation/' + generationId;
      const url = getURL() + 'api/send';
      const body = JSON.stringify({
        generationUrl,
        email
      });
      console.log('body', body);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body
      });
      if (!response.ok) {
        console.log(await response.text());
        throw new Error('Server responded with status ' + response.status);
      }
      console.log('email sent to ' + email);
      return 'email sent';
    });

    return generation;
  }
);
