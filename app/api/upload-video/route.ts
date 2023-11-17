import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';
import { randomString } from '@/lib/utils';
import { uploadFileToStorage } from '@/utils/supabase-storage';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { cookies } from 'next/headers';
import { inngest } from '@/lib/inngest/client';

export const maxDuration = 300;

export async function POST(req: Request) {
  if (req.method === 'POST') {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const supabase = createRouteHandlerClient<Database>({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user || !user.id) {
      throw new Error('User or user ID is undefined');
    }

    const inputData = await req.formData();
    console.log('inputData', inputData);

    const id: string = inputData.get('id') as unknown as string;
    const videoFile: File = inputData.get('videoFile') as unknown as File;

    const { error: updateError } = await supabase
      .from('translations')
      .update({
        status: 'uploading'
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    const originalVideoUrl = await uploadFileToStorage(
      'public',
      `tempvideo/${randomString(10)}`,
      videoFile,
      videoFile.type
    );
    console.log('originalVideoUrl', originalVideoUrl);

    if (!originalVideoUrl) {
      return new Response('Error uploading video file', { status: 400 });
    }

    try {
      // Upload and convert the video file to Cloudinary
      const result = await cloudinary.uploader.upload(originalVideoUrl, {
        resource_type: 'video',
        format: 'mp4'
      });

      // The URL of the uploaded and converted video
      const convertedVideoUrl = result.secure_url;

      // Download the converted video
      const response = await fetch(convertedVideoUrl);
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      // Upload the converted video to Supabase storage
      const path = `translations/${id}/${
        'input_video' + randomString(10) + '.mp4'
      }`;
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(path, buffer);

      if (uploadError) {
        throw uploadError;
      }

      // Delete the video from Cloudinary
      const publicId = result.public_id;
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });

      // Get the URL of the uploaded video file
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(path);

      if (!urlData) {
        throw new Error('No public URL data found');
      }

      // Update the generation item with the URL
      const { error: updateError } = await supabase
        .from('translations')
        .update({
          original_video: urlData?.publicUrl,
          status: 'transcribing'
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      console.log('sending transcription request');

      const finalTranscriptionId = await inngest.send({
        name: 'transcription/requested',
        data: {
          params: {
            id: id
          }
        }
      });
      console.log('finalTranscriptionId', finalTranscriptionId);

      return new Response(JSON.stringify(finalTranscriptionId), {
        status: 200
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500
      });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
