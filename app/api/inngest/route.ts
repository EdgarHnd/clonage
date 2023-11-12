import { inngest } from '@/lib/inngest/client';
import {
  generateVideo,
  helloWorld,
  onGenerationCompletion,
  onTranslationCompletion,
  transcribeVideo,
  translateText,
  translateVideo
} from '@/lib/inngest/functions';
import { serve } from 'inngest/next';

export const maxDuration = 300;
// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    generateVideo,
    onGenerationCompletion,
    onTranslationCompletion,
    transcribeVideo,
    translateText,
    translateVideo
  ]
});
