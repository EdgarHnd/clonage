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
import { ArrowLeftIcon, CommitIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Database } from '@/lib/database.types';
import NewTranslationButton from '@/app/translate/newTranslationButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { Separator } from '@/components/ui/separator';
import { inngest } from '@/lib/inngest/client';

type Translation = Database['public']['Tables']['translations']['Row'];

export default function Generation({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [finalOutputStatus, setFinalOutputStatus] = useState<string | null>(
    'created'
  );
  const [finalVideoId, setFinalVideoId] = useState<string | null>('');
  const [videoFile, setVideoFile] = useState<File | null>();
  const [transcript, setTranscript] = useState<string | null>('');
  const [targetLanguage, setTargetLanguage] = useState<string | null>('');
  const [translation, setTranslation] = useState<string | null>('');
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { data, error } = useSWR<Translation>(
    `/api/translation/${params.id}`,
    async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('id', params.id)
        .single();
      if (error) throw error;
      return data;
    }
  );

  useEffect(() => {
    if (!data) return;
    setTranscript(data.transcription);
    setTargetLanguage(data.target_language);
    setTranslation(data.translation);
    setOutput(data.output_video);
    setFinalVideoId(data.output_video_id);
    setFinalOutputStatus(data.status);
  }, [data]);

  const handleVideoFileChange = (newFile: File | null) => {
    setVideoFile(newFile);
    // store the video file in the generation item
    uploadVideoFile(newFile);
  };

  const uploadVideoFile = async (file: File | null) => {
    if (!file) return;
    console.log('uploading video file');
    setLoading(true);
    setErrorMessage('');
    try {
      // Upload the video file to Supabase storage
      const path = `translations/${params.id}/${
        'input_video' + randomString(10) + '.mp4'
      }`;
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(path, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the URL of the uploaded video file
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(path);

      // Update the generation item with the URL
      const { error: updateError } = await supabase
        .from('translations')
        .update({
          original_video: urlData?.publicUrl
        })
        .eq('id', params.id);

      if (updateError) {
        throw updateError;
      }

      const response = await fetch(`/api/transcribe/${params.id}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'an error occurred during transcription'
        );
      }

      const transcription = await response.json();
      console.log(transcription);
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      setLoading(false);
      mutate(`/api/translation/${params.id}`);
    }
  };

  const translate = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (!transcript) throw new Error('No script provided');
      if (!targetLanguage) throw new Error('No target language provided');
      // update the translation item with the target language
      const { error: updateError } = await supabase
        .from('translations')
        .update({
          target_language: targetLanguage,
          status: 'translating'
        })
        .eq('id', params.id);

      const response = await fetch(`/api/translate-text/${params.id}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'an error occurred during video generation'
        );
      }

      const translation = await response.json();
      console.log(translation);
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      setLoading(false);
      mutate(`/api/translation/${params.id}`);
    }
  };

  const runModel = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (!data?.translation) throw new Error('No script provided');
      if (!data?.original_video) throw new Error('No video provided');

      // Update the generation item with the URL and text input
      const { error: updateError } = await supabase
        .from('translations')
        .update({
          status: 'processing'
        })
        .eq('id', params.id);

      if (updateError) {
        throw updateError;
      }

      // Call the generate route with just the translation id
      const response = await fetch(`/api/translate/${params.id}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'an error occurred during video translation'
        );
      }

      // Get the generation id from the response
      const finalId = await response.json();
      setFinalVideoId(finalId);

      //update the generation item with the generation id
      const { error: updateError2 } = await supabase
        .from('translations')
        .update({
          output_video_id: finalId
        })
        .eq('id', params.id);

      if (updateError2) {
        throw updateError2;
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      setLoading(false);
      mutate(`/api/translation/${params.id}`);
    }
  };

  const handleClick = () => {
    setOutput(null);
    runModel();
  };

  const handleDelete = async () => {
    const { error: updateError } = await supabase
      .from('translations')
      .update({ status: 'deleted' })
      .eq('id', params.id);
    if (updateError) {
      throw updateError;
    } else {
      router.push('/translate');
    }
  };

  const removeVideo = async () => {
    try {
      const { error: updateError } = await supabase
        .from('translations')
        .update({ original_video: null })
        .eq('id', params.id);
      if (updateError) {
        throw updateError;
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      setVideoFile(null);
      mutate(`/api/translation/${params.id}`);
    }
  };

  const renderOutput = () => {
    if (!output)
      return (
        <div className="flex flex-col space-y-4 md:w-1/2 w-full text-white">
          <Label htmlFor="output">generated video</Label>
          <div className="rounded border border-dashed h-[270px] p-4">
            <p className="text-gray-700 text-sm">
              the generated video will show here
            </p>
          </div>
        </div>
      );
    if (output) {
      return (
        <div className="flex flex-col space-y-4 md:w-1/2 w-full text-white">
          <Label htmlFor="output">generated video</Label>
          <video className="rounded h-[280px]" src={output} controls />
        </div>
      );
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex md:flex-row flex-col md:space-x-6 w-full items-start justify-center">
          <div className="md:w-1/2 w-full flex flex-col space-y-4 items-start">
            <Label>original video</Label>
            <InputVideo
              disabled={data?.status == 'completed'}
              onFileChange={handleVideoFileChange}
              existingUrl={data?.original_video || ''}
              removeVideo={removeVideo}
            />
          </div>
          <div className="flex flex-col items-start md:w-1/2 w-full text-white">
            <div className="flex flex-col w-full h-[300px] space-y-4 md:mt-0 mt-4">
              <Label htmlFor="script">transcript</Label>
              <Textarea
                disabled
                id="script"
                value={transcript || ''}
                onChange={(e) => setTranscript(e.target.value)}
                className=" w-full h-full p-4"
                placeholder="the original video transcript will show here"
              />
            </div>
            <div className="flex mt-4 flex-row space-x-4">
              <Select
                disabled={
                  data?.status == 'completed' ||
                  loading ||
                  !transcript ||
                  data?.status == 'translating'
                }
                value={targetLanguage || ''}
                onValueChange={(e) => setTargetLanguage(e)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="select language" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-72">
                    <SelectItem value="english">🇬🇧 english</SelectItem>
                    <SelectItem value="japanese">🇯🇵 japanese</SelectItem>
                    <SelectItem value="chinese">🇨🇳 chinese</SelectItem>
                    <SelectItem value="german">🇩🇪 german</SelectItem>
                    <SelectItem value="hindi">🇮🇳 hindi</SelectItem>
                    <SelectItem value="french">🇫🇷 french</SelectItem>
                    <SelectItem value="korean">🇰🇷 korean</SelectItem>
                    <SelectItem value="portuguese">🇵🇹 portuguese</SelectItem>
                    <SelectItem value="italian">🇮🇹 italian</SelectItem>
                    <SelectItem value="spanish">🇪🇸 spanish</SelectItem>
                    <SelectItem value="indonesian">🇮🇩 indonesian</SelectItem>
                    <SelectItem value="dutch">🇳🇱 dutch</SelectItem>
                    <SelectItem value="turkish">🇹🇷 turkish</SelectItem>
                    <SelectItem value="filipino">🇵🇭 filipino</SelectItem>
                    <SelectItem value="polish">🇵🇱 polish</SelectItem>
                    <SelectItem value="swedish">🇸🇪 swedish</SelectItem>
                    <SelectItem value="bulgarian">🇧🇬 bulgarian</SelectItem>
                    <SelectItem value="romanian">🇷🇴 romanian</SelectItem>
                    <SelectItem value="arabic">🇸🇦 arabic</SelectItem>
                    <SelectItem value="czech">🇨🇿 czech</SelectItem>
                    <SelectItem value="greek">🇬🇷 greek</SelectItem>
                    <SelectItem value="finnish">🇫🇮 finnish</SelectItem>
                    <SelectItem value="croatian">🇭🇷 croatian</SelectItem>
                    <SelectItem value="malay">🇲🇾 malay</SelectItem>
                    <SelectItem value="slovak">🇸🇰 slovak</SelectItem>
                    <SelectItem value="danish">🇩🇰 danish</SelectItem>
                    <SelectItem value="tamil">🇮🇳 tamil</SelectItem>
                    <SelectItem value="ukrainian">🇺🇦 ukrainian</SelectItem>
                    <SelectItem value="russian">🇷🇺 russian</SelectItem>
                  </ScrollArea>
                </SelectContent>
              </Select>
              <Button
                disabled={
                  !targetLanguage ||
                  !transcript ||
                  data?.status == 'completed' ||
                  data?.status == 'translating' ||
                  loading
                }
                onClick={translate}
              >
                {data?.status === 'translating' ? (
                  <>
                    translating <CommitIcon className="animate-spin ml-1" />
                  </>
                ) : (
                  'translate'
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex md:flex-row flex-col md:space-x-6 w-full items-start justify-center pt-4">
          <div className="w-full md:w-1/2 flex flex-col space-y-4 h-[300px] md:mb-0 mb-4">
            <Label htmlFor="script">translation</Label>
            <Textarea
              maxLength={800}
              disabled={data?.status != 'created'}
              id="script"
              value={translation || ''}
              onChange={(e) => setTranslation(e.target.value)}
              className=" w-full h-full p-4"
              placeholder="the generated translation will show here"
            />
          </div>
          {renderOutput()}
        </div>
        <div className="flex flex-col w-full items-center space-y-2">
          <div className="flex flex-row space-x-4 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-xs hover:bg-red-500"
              onClick={handleDelete}
            >
              <TrashIcon />
            </Button>
            <Link href="/translate">
              <Button variant="ghost" size="icon" className="text-xs">
                <ArrowLeftIcon />
              </Button>
            </Link>
            {data?.status === 'completed' || data?.status === 'failed' ? (
              <div className="flex flex-row items-center space-x-2">
                {data?.status === 'failed' && (
                  <p className="text-red-800">failed</p>
                )}
                <NewTranslationButton />
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Button
                  disabled={loading || finalOutputStatus != 'translated'}
                  variant="secondary"
                  onClick={handleClick}
                >
                  {loading ? (
                    <>
                      starting (keep tab open){' '}
                      <CommitIcon className="animate-spin ml-1" />
                    </>
                  ) : finalOutputStatus === 'processing' ? (
                    <>
                      processing (you can come back later){' '}
                      <CommitIcon className="animate-spin ml-1" />
                    </>
                  ) : (
                    'generate'
                  )}
                </Button>
              </div>
            )}
          </div>
          {data?.status != 'completed' && (
            <>
              <p className="text-sm text-gray-500">
                generation takes arround 1 minute (if you don't see the output,{' '}
                <Link
                  href="https://x.com/edgarhnd"
                  className="hover:text-white"
                  target="blank"
                >
                  let me know on twitter @edgarhnd
                </Link>
                )
              </p>
              <p className="text-xs text-red-800">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
