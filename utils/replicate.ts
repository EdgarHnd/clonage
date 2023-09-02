import Replicate from 'replicate';

if (!process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN) {
  throw new Error(
    'NEXT_PUBLIC_REPLICATE_API_TOKEN is not defined in the environment variables.'
  );
}

export const replicate = new Replicate({
  auth: process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN
});