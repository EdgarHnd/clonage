'use client';
import { Button } from '@/components/ui/button';
import { InputVideo } from '@/app/generate/inputs/inputVideo';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useRef, useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

type Translation = Database['public']['Tables']['translations']['Row'];

export default function Generation({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false);
  const [originalVideo, setOriginalVideo] = useState<string | null>('');
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
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);

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
    const subscription = supabase
      .channel('translation-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
          filter: 'id=eq.' + params.id
        },
        (payload) => {
          mutate(`/api/translation/${params.id}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    setOriginalVideo(data.original_video);
    setTranscript(data.transcription);
    setTargetLanguage(data.target_language);
    setTranslation(data.translation);
    setOutput(data.output_video);
    setFinalVideoId(data.output_video_id);
    setFinalOutputStatus(data.status);
  }, [data]);

  const handleVideoFileChange = (newFile: File | null) => {
    setVideoFile(newFile);
    uploadVideoFile(newFile);
  };

  const uploadVideoFile = async (file: File | null) => {
    if (!file) return;
    console.log('uploading video file');
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('videoFile', file);
      formData.append('id', params.id);

      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'an error occurred during video upload'
        );
      }

      const { message } = await response.json();
      console.log(message);
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
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

  const generate = async () => {
    try {
      if (!data?.translation) throw new Error('No script provided');
      if (!data?.original_video) throw new Error('No video provided');
      if (!data?.target_language)
        throw new Error('No target language provided');
      if (!data?.original_video_duration)
        throw new Error('Could not get video length');

      const costPerMinute = 100;
      const originalVideoLength = data?.original_video_duration / 60;
      if (!originalVideoLength) throw new Error('Could not get video length');
      setEstimatedCost(Math.ceil(originalVideoLength * costPerMinute));
      setOpen(true);
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    }
  };

  const runModel2 = async () => {
    console.log('running model');
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
          translation: translation,
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
    generate();
    /* runModel(); */
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
    // Optimistically update UI
    setOriginalVideo(null);
    setTranscript(null);
    setFinalOutputStatus('created');

    try {
      const { error: updateError } = await supabase
        .from('translations')
        .update({
          original_video: null,
          transcription: null,
          status: 'created'
        })
        .eq('id', params.id);
      if (updateError) {
        throw updateError;
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      mutate(`/api/translation/${params.id}`);
    }
  };

  const handleTranslationBlur = async () => {
    try {
      // Only update if the translation has changed
      if (translation !== data?.translation) {
        const { error } = await supabase
          .from('translations')
          .update({ translation: translation })
          .eq('id', params.id);

        if (error) {
          throw error;
        }
        toast({
          title: 'translation saved',
          description: 'the translation was successfully saved',
          duration: 2000
        });
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      console.log(error.message);
    } finally {
      mutate(`/api/translation/${params.id}`);
    }
  };

  const renderOutput = () => {
    if (data?.status === 'processing') {
      return (
        <div className="flex flex-col space-y-4 md:w-1/2 w-full dark:text-white">
          <Label htmlFor="output">generated video</Label>
          <div
            role="status"
            className="flex items-center justify-center h-[270px] w-full bg-gray-300 rounded animate-pulse dark:bg-gray-700"
          >
            <svg
              className="w-10 h-10 text-gray-200 dark:text-gray-600"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 16 20"
            >
              <path d="M5 5V.13a2.96 2.96 0 0 0-1.293.749L.879 3.707A2.98 2.98 0 0 0 .13 5H5Z" />
              <path d="M14.066 0H7v5a2 2 0 0 1-2 2H0v11a1.97 1.97 0 0 0 1.934 2h12.132A1.97 1.97 0 0 0 16 18V2a1.97 1.97 0 0 0-1.934-2ZM9 13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2Zm4 .382a1 1 0 0 1-1.447.894L10 13v-2l1.553-1.276a1 1 0 0 1 1.447.894v2.764Z" />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      );
    }
    if (output) {
      return (
        <div className="flex flex-col space-y-4 md:w-1/2 w-full dark:text-white">
          <Label htmlFor="output">generated video</Label>
          <video className="rounded h-[280px]" src={output} controls />
        </div>
      );
    } else {
      return (
        <div className="flex flex-col space-y-4 md:w-1/2 w-full dark:text-white">
          <Label htmlFor="output">generated video</Label>
          <div className="rounded border border-gray-400 border-dashed h-[270px] p-4">
            <p className="text-gray-700 text-sm">
              the generated video will show here
            </p>
          </div>
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
              disabled={
                data?.status != 'created' &&
                data?.status != 'transcribed' &&
                data?.status != 'transcribing'
              }
              onFileChange={handleVideoFileChange}
              existingUrl={originalVideo || ''}
              removeVideo={removeVideo}
            />
          </div>
          <div className="flex flex-col items-start md:w-1/2 w-full dark:text-white">
            <div className="flex flex-col w-full h-[300px] space-y-4 md:mt-0 mt-4">
              <Label htmlFor="script">transcript</Label>
              {data?.status === 'transcribing' ||
              data?.status === 'uploading' ? (
                <div className="rounded border border-dashed h-[270px] p-4 animate-pulse">
                  <div className="h-4 bg-gray-400 rounded w-3/4"></div>
                  <div className="h-4 mt-2 bg-gray-400 rounded w-1/2"></div>
                  <div className="h-4 mt-2 bg-gray-400 rounded w-1/4"></div>
                </div>
              ) : (
                <Textarea
                  disabled
                  id="script"
                  value={transcript || ''}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full h-full p-4 border-gray-800"
                  placeholder="the original video transcript will show here"
                />
              )}
            </div>
            <div className="flex mt-4 flex-row space-x-4">
              <Select
                disabled={
                  (data?.status != 'transcribed' &&
                    data?.status != 'translated') ||
                  !transcript
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
                  (data?.status != 'transcribed' &&
                    data?.status != 'translated')
                }
                onClick={translate}
                variant="secondary"
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
            {data?.status === 'translating' ? (
              <div className="rounded border border-dashed h-[270px] p-4 animate-pulse">
                <div className="h-4 bg-gray-400 rounded w-3/4"></div>
                <div className="h-4 mt-2 bg-gray-400 rounded w-1/2"></div>
                <div className="h-4 mt-2 bg-gray-400 rounded w-1/4"></div>
              </div>
            ) : (
              <Textarea
                maxLength={3000}
                disabled={
                  data?.status != 'transcribed' && data?.status != 'translated'
                }
                id="script"
                value={translation || ''}
                onChange={(e) => setTranslation(e.target.value)}
                onBlur={handleTranslationBlur}
                className="w-full h-full p-4 border-gray-800"
                placeholder="the generated translation will show here"
              />
            )}
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
                  onClick={handleClick}
                >
                  {loading ? (
                    <>
                      starting (keep tab open){' '}
                      <CommitIcon className="animate-spin ml-1" />
                    </>
                  ) : finalOutputStatus === 'processing' ? (
                    <>
                      processing.. (come back later){' '}
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
                generation takes arround 10 times the original video duration
                (if you face any bug,{' '}
                <Link
                  href="https://x.com/edgarhnd"
                  className="hover:text-white"
                  target="blank"
                >
                  DM me on twitter @edgarhnd
                </Link>
                )
              </p>
              <p className="text-xs text-red-800">{errorMessage}</p>
            </>
          )}
        </div>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>generate video translation?</AlertDialogTitle>
            <AlertDialogDescription>
              this will start the generation process and use arround{' '}
              {estimatedCost} credits
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runModel2}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
