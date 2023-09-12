'use client';
import { Button } from '@/components/ui/button';
import { InputVideo } from '@/app/generate/inputs/inputVideo';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import useSWR, { mutate } from 'swr';
import { randomString } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { TrashIcon } from '@radix-ui/react-icons';

export default function Generation({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File | null>();
  const [script, setScript] = useState<string>('');
  const [voice, setVoice] = useState<string>('');
  const supabase = createClientComponentClient();
  const router = useRouter();

  const { data, error } = useSWR(`/api/generation/${params.id}`, async () => {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', params.id)
      .single();
    if (error) throw error;
    return data;
  });

  useEffect(() => {
    if (!data) return;
    console.log('data' + JSON.stringify(data));
    setVoice(data.voice);
    setScript(data.input_text);
    setOutput(data.output_video);
  }, [data]);

  const fetchVoice = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('voices')
        .select('id')
        .eq('user', user.id)
        .single();
      if (error) throw error;
      console.log('data' + JSON.stringify(data));
      if (data) {
        setVoice(data.id);
      }
      return data;
    } catch (error) {
      console.error('Error in fetchVoice: ', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchVoice();
  });

  const handleVideoFileChange = (newFile: File | null) => {
    setVideoFile(newFile);
  };

  const runModel = async () => {
    if (!script) return;
    setLoading(true);
    try {
      let inputVideoUrl = data?.input_video;
      if (videoFile) {
        // Upload the video file to Supabase storage
        const path = `generations/${params.id}/${
          'input_video' + randomString(10) + '.mp4'
        }`;
        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(path, videoFile);

        if (uploadError) {
          throw uploadError;
        }

        // Get the URL of the uploaded video file
        const { data: urlData } = supabase.storage
          .from('public')
          .getPublicUrl(path);

        inputVideoUrl = urlData?.publicUrl;
      }
      if (!inputVideoUrl) {
        throw new Error('Error getting input video URL');
      }

      // Update the generation item with the URL and text input
      const { error: updateError } = await supabase
        .from('generations')
        .update({
          input_video: inputVideoUrl,
          input_text: script,
          status: 'processing',
          voice: voice
        })
        .eq('id', params.id);

      if (updateError) {
        throw updateError;
      }

      // Call the generate route with just the generation id
      const response = await fetch(`/api/generate/${params.id}`, {
        method: 'POST'
      });
      const responseText = await response.text();
      console.log(responseText);
      const { output } = await response.json();
      // After the model run is completed, refetch the data
      mutate(`/api/generation/${params.id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    setOutput(null);
    runModel();
  };

  const handleDelete = async () => {
    const { error: deleteError } = await supabase
      .from('generations')
      .delete()
      .eq('id', params.id);
    if (deleteError) {
      throw deleteError;
    } else {
      router.push('/generate');
    }
  };

  const renderOutput = () => {
    if (!output) return null;
    if (output) {
      return (
        <div className="flex flex-row space-x-6 w-full items-start justify-center">
          <div className="flex flex-col space-y-4 w-1/2 text-white">
            <Label htmlFor="output">output</Label>
            <video src={output} controls />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <div className="flex flex-row space-x-6 w-full items-start justify-center">
          <div className="w-1/2">
            <InputVideo
              disabled={data?.status == 'completed'}
              label="reference video"
              onFileChange={handleVideoFileChange}
              existingUrl={data?.input_video}
            />
          </div>
          <div className="flex flex-col space-y-4 w-1/2 text-white h-[300px]">
            <Label htmlFor="script">script</Label>
            <Textarea
              disabled={data?.status == 'completed'}
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className=" w-full h-full p-4"
              placeholder="type your video script here."
            />
          </div>
        </div>
        <>{renderOutput()}</>
        <div className="flex flex-row space-x-4 items-center mt-12">
          <Button
            variant="destructive"
            size="icon"
            className="text-xs"
            onClick={handleDelete}
          >
            <TrashIcon />
          </Button>
          {data?.status != 'completed' && (
            <Button onClick={handleClick}>
              {loading ? 'loading...' : 'generate'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
