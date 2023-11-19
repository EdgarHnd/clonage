import { inngest } from './client';
import { randomString } from '../utils';
import { uploadFileToStorage } from '@/utils/supabase-storage';
import { createClient } from '@supabase/supabase-js';
import { getURL } from '@/utils/helpers';
import FormData from 'form-data';
import nodeFetch from 'node-fetch';

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
      const url = getURL() + 'api/send-generation';
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

export const onTranslationCompletion = inngest.createFunction(
  { id: 'on-translation-completion' },
  { event: 'translation/completed' },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    const translationId = event.data.params.id;

    // Fetch the translation item
    const { data: translation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('id', translationId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!translation) {
      throw new Error('No translation item found');
    }
    console.log('translation', translation);
    // fetch the user
    const { data: user, error } = await supabase.auth.admin.getUserById(
      translation.user
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
        .eq('id', translation.user);

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
        const cost = translation.cost;
        const newCreditsRemaining = creditData[0].credits_remaining - cost;
        const newCreditsUsed = creditData[0].credits_used + cost;
        console.log('credits_remaining', newCreditsRemaining);
        console.log('credits_used', newCreditsUsed);
        await supabase
          .from('credits')
          .update({
            credits_remaining: newCreditsRemaining,
            credits_used: newCreditsUsed
          })
          .eq('id', translation.user);
      }
      return 'credits updated';
    });

    //send email with Resend api
    await step.run('send-email', async () => {
      const translationUrl = getURL() + 'translation/' + translationId;
      const url = getURL() + 'api/send-translation';
      const body = JSON.stringify({
        translationUrl,
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

    return translation;
  }
);

export const transcribeVideo = inngest.createFunction(
  { id: 'transcribe-video' },
  { event: 'transcription/requested' },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    const translationId = event.data.params.id;

    //fetch the transcribtion item
    const { data: translation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('id', translationId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const transcribedText = await step.run('get-transcription', async () => {
      const response = await nodeFetch(translation.original_video);
      const buffer = await response.buffer();

      const form = new FormData();
      form.append('file', buffer, { filename: 'input.mp4' });
      form.append('model', 'whisper-1');
      // Transcribe audio of the video using OpenAI Whisper
      const transcriptionResponse = await nodeFetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            ...form.getHeaders()
          },
          body: form
        }
      );

      const transcripted: any = await transcriptionResponse.json();

      console.log('transcripted', transcripted);
      // Save transcription to Supabase
      try {
        const { error } = await supabase
          .from('translations')
          .update({
            transcription: transcripted.text,
            status: 'transcribed'
          })
          .eq('id', translationId);

        if (error) {
          console.error('Supabase update error:', error.message);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }

      return transcripted.text;
    });
    return transcribedText;
  }
);

export const translateText = inngest.createFunction(
  { id: 'translate-text' },
  { event: 'translation-text/requested' },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    const translationId = event.data.params.id;

    //fetch the translation item
    const { data: translation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('id', translationId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!translation) {
      throw new Error('No translation item found');
    }

    if (
      !translation.original_video ||
      !translation.transcription ||
      !translation.target_language
    ) {
      throw new Error(
        'No input video, transcription or target language provided'
      );
    }

    const translatedText = await step.run('get-translation', async () => {
      // Translate transcription using GPT prompt
      const prompt = `Translate the following text \n\n${translation.transcription}\n\n in ${translation.target_language}. The translation when speaked should match the original length of audio as we want to accuratly lipsync it to the original video. Since this is used inside an api call, return only the translation and nothing more`;

      const translationResponse = await nodeFetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content:
                  'I am a translation expert that only produce valid translations. The translated output should be correct gramatically, semantically and should sound like it could be spoken by a native speaker'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          })
        }
      );
      const translationResponseJson: any = await translationResponse.json();
      console.log('translationResponseJson', translationResponseJson);
      const translationResult =
        translationResponseJson['choices'][0]['message']['content'];
      console.log('translation', translationResult);

      // Save translation to Supabase
      try {
        const { error } = await supabase
          .from('translations')
          .update({
            translation: translationResult,
            status: 'translated'
          })
          .eq('id', translationId);

        if (error) {
          console.error('Supabase update error:', error.message);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      }
      return translationResult;
    });

    return translatedText;
  }
);

export const translateVideo = inngest.createFunction(
  { id: 'translate-video' },
  { event: 'translation/requested' },
  async ({ event, step }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    );
    const translationId = event.data.params.id;

    //fetch the translation item
    const { data: translation, error: fetchError } = await supabase
      .from('translations')
      .select('*')
      .eq('id', translationId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!translation) {
      throw new Error('No translation item found');
    }

    if (!translation.original_video || !translation.target_language) {
      throw new Error('No input video or target language provided');
    }
    if (!translation.translation) {
      throw new Error('No translation provided');
    }
    // clone voice from the original video
    const clonedVoice = await step.run('clone-voice', async () => {
      const response = await nodeFetch(translation.original_video);
      const buffer = await response.buffer();

      const data = new FormData();
      data.append('files', buffer, { filename: 'input.mp4' });
      data.append('name', 'temp voice');
      data.append('description', 'temp voice');

      console.log('data', data);
      const cloneResponse = await nodeFetch(
        'https://api.elevenlabs.io/v1/voices/add',
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string,
            ...data.getHeaders()
          },
          body: data
        }
      );

      const result: any = await cloneResponse.json();
      const { voice_id } = result;

      if (!voice_id) {
        throw new Error('No voice_id returned from ElevenLabs');
      }

      console.log('voice_id', voice_id);

      return voice_id;
    });

    const generateAudio = await step.run('generate-audio', async () => {
      const elevenUrl =
        'https://api.elevenlabs.io/v1/text-to-speech/' + clonedVoice;
      console.log('elevenUrl', elevenUrl);

      const response = await fetch(elevenUrl, {
        method: 'POST',
        headers: {
          accept: 'audio/mpeg',
          'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: translation.translation,
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
      const path = `translations/${translationId}/${
        'output_audio' + randomString(10) + '.mp3'
      }`;
      const audioUrl = await uploadFileToStorage(
        'public',
        path,
        genAudio,
        'audio/mp3'
      );
      // update the translation item
      await supabase
        .from('translations')
        .update({ output_audio: audioUrl })
        .eq('id', translationId);

      console.log('audioUrl' + audioUrl);

      return audioUrl;
    });

    await step.run('delete-voice', async () => {
      try {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/voices/${clonedVoice}`,
          {
            method: 'DELETE',
            headers: {
              accept: 'application/json',
              'xi-api-key': process.env.ELEVENLABS_API_TOKEN as string
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to delete voice from Eleven Labs API');
        }

        return 'Voice deleted successfully';
      } catch (error: any) {
        console.log(error);
        throw new Error(`Server Error: ${error.message}`);
      }
    });

    // Generate video
    const generateVideo = await step.run('generate-video', async () => {
      try {
        const output = await fetch('https://api.synclabs.so/video', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'x-api-key': process.env.SYNCHRONIZER_API_TOKEN as string,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            audioUrl: generateAudio,
            videoUrl: translation.original_video,
            synergize: true,
            maxCredits: 300,
            webhookUrl: getURL() + 'api/synclabs/webhook'
          })
        });

        console.log('output', output);

        const responseBody = await output.json();
        console.log('output', JSON.stringify(responseBody));
        const finalVideoId = responseBody.id;
        // Update the translation item
        await supabase
          .from('translations')
          .update({ output_video_id: finalVideoId, status: 'processing' })
          .eq('id', translationId);

        return finalVideoId;
      } catch (e) {
        console.log('error', e);
      }
    });

    return generateVideo;
  }
);
