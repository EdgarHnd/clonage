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
import {
  ArrowLeftIcon,
  CommitIcon,
  LightningBoltIcon,
  RocketIcon,
  SpeakerModerateIcon,
  TrashIcon
} from '@radix-ui/react-icons';
import { Badge } from '@/components/ui/badge';
import NewGenerationButton from '@/app/generate/newGenerationButton';
import Link from 'next/link';

export default function Generation({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File | null>();
  const [script, setScript] = useState<string>('');
  const [voice, setVoice] = useState<string>('');
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');

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
        router.push('/signin');
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('voices')
        .select('id')
        .eq('user', user.id)
        .single();
      if (error) throw error;
      if (data) {
        setVoice(data.id);
      }
      return data;
    } catch (error) {
      setErrorMessage(JSON.stringify(error));
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
    setLoading(true);
    setErrorMessage('');
    try {
      if (!script) throw new Error('No script provided');
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'an error occurred during video generation'
        );
      }
      // After the model run is completed, refetch the data
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      setLoading(false);
      mutate(`/api/generation/${params.id}`);
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
          <div className="flex flex-col space-y-4 md:w-1/2 w-full text-white">
            <Label htmlFor="output">output</Label>
            <video className="rounded" src={output} controls />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <div className="flex md:flex-row flex-col md:space-x-6 w-full items-start justify-center">
          <div className="md:w-1/2 w-full flex flex-col space-y-4 items-center">
            <InputVideo
              disabled={data?.status == 'completed'}
              label="reference video"
              onFileChange={handleVideoFileChange}
              existingUrl={data?.input_video}
            />
            <p className="text-sm text-gray-600">
              upload a video of you talking or standing still (max 10s)
            </p>
          </div>
          <div className="flex flex-col items-start space-y-4 md:w-1/2 w-full text-white h-[300px]">
            <Label htmlFor="script">script</Label>
            <Textarea
              maxLength={300}
              disabled={data?.status == 'completed'}
              id="script"
              value={script || ''}
              onChange={(e) => setScript(e.target.value)}
              className=" w-full h-full p-4"
              placeholder="type your video script here."
            />
            <Badge variant="secondary">
              tips: try writing in another language
              <LightningBoltIcon />
            </Badge>
          </div>
        </div>
        <>{renderOutput()}</>
        <div className="flex flex-col w-full items-center space-y-2">
          <div className="flex flex-row space-x-4 items-start mt-12">
            <Button
              variant="ghost"
              size="icon"
              className="text-xs hover:bg-red-500"
              onClick={handleDelete}
            >
              <TrashIcon />
            </Button>
            <Link href="/generate">
              <Button variant="ghost" size="icon" className="text-xs">
                <ArrowLeftIcon />
              </Button>
            </Link>
            {data?.status != 'completed' ? (
              <div className="flex flex-col items-center space-y-2">
                <Button onClick={handleClick}>
                  {loading ? (
                    <>
                      generating <CommitIcon className="animate-spin ml-1" />
                    </>
                  ) : (
                    'generate'
                  )}
                </Button>
              </div>
            ) : (
              <NewGenerationButton />
            )}
          </div>
          {data?.status != 'completed' && (
            <>
              <p className="text-xs text-gray-600">
                generation takes about 1 minute (if you don't see the outpout,
                try again with a shorter video and script)
              </p>
              <p className="text-xs text-red-800">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
