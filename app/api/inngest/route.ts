import { inngest } from '@/lib/inngest/client';
import { generateVideo, helloWorld } from '@/lib/inngest/functions';
import { serve } from 'inngest/next';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    generateVideo,
  ],
});

