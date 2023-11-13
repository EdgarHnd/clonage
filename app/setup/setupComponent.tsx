'use client';
import { Button } from '@/components/ui/button';
import { InputAudio } from '@/app/generate/inputs/inputAudio'; // Renamed component
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UpdateIcon } from '@radix-ui/react-icons';
import { randomString } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function SetupComponent({ hasPaid }: { hasPaid: boolean }) {
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voice, setVoice] = useState<string>(''); // Renamed state variable
  const [audioFile, setAudioFile] = useState<File>();
  const [voiceDescription, setVoiceDescription] = useState<string>('');
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fetchVoice = async () => {
    setVoiceLoading(true);
    try {
      const supabase = createClientComponentClient();
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
        .neq('status', 'deleted');

      if (error) throw error;

      if (data.length > 0) {
        setVoice(data[0].id);
      } else {
        setVoice('');
      }
      return data[0];
    } catch (error: any) {
      console.error('Error in fetchVoice: ', error);
      setErrorMessage(error.message);
      throw error;
    } finally {
      setVoiceLoading(false);
    }
  };

  useEffect(() => {
    fetchVoice();
  }, []);

  const handleAudioFileChange = (newFile: File | null) => {
    if (newFile) {
      setAudioFile(newFile);
      setAudioUrl(URL.createObjectURL(newFile));
    }
  };

  const handleClick = async () => {
    setErrorMessage(''); // Reset the error message before each operation
    if (!audioFile) {
      setErrorMessage('Audio file is missing. Please upload an audio file.');
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      data.set('audioFile', audioFile);
      data.set('voiceName', randomString(8));
      data.set('voiceDescription', voiceDescription);
      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        body: data
      });
      if (response) {
        console.log('response' + JSON.stringify(response));
      }
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
      fetchVoice();
    }
  };

  const deleteVoice = async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      // Call the DELETE route
      const response = await fetch(`/api/delete-voice`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voiceId: voice })
      });

      if (!response.ok) {
        throw new Error('Failed to delete voice');
      }
    } catch (error) {
      console.error('Error in deleteVoice: ', error);
      throw error;
    } finally {
      setLoading(false);
      fetchVoice();
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
      <div className="flex flex-col items-start space-y-4">
        <h1 className="text-white text-2xl font-bold">voice cloning</h1>
        <Separator className="bg-gray-600" />
        {voiceLoading ? (
          <div>
            {' '}
            <UpdateIcon className="animate-spin" />
          </div> // Replace this with your loading UI
        ) : (
          <>
            {voice ? (
              <Card className="flex flex-col items-start bg-black border-gray-600">
                <CardHeader>
                  <h2 className="text-white text-lg font-bold">
                    personal voice
                  </h2>
                </CardHeader>
                <CardContent>
                  <p className="text-white">your voice is setup</p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="flex flex-row space-x-6 w-full items-center justify-center">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={deleteVoice}
                    >
                      {loading ? (
                        <>
                          deleting voice{' '}
                          <UpdateIcon className="animate-spin ml-1" />
                        </>
                      ) : (
                        'delete voice'
                      )}
                    </Button>
                    <Link href="/generate">
                      <Button variant="secondary">generate videos</Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : (
              <div className="flex flex-col md:items-start items-center space-y-4">
                <div className="flex flex-col md:flex-row w-full items-start justify-between">
                  <div className="md:w-1/2 w-full flex flex-col space-y-8 items-start">
                    <p className="text-sm text-gray-600 text-start">
                      upload an audio or video of yourself talking clearly
                      without background noise (max size 11MB)
                    </p>
                    <InputAudio
                      setErrorMessage={setErrorMessage}
                      label="original voice"
                      onFileChange={handleAudioFileChange}
                    />
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="mt-8"
                  onClick={handleClick}
                >
                  {loading ? (
                    <>
                      cloning voice <UpdateIcon className="animate-spin ml-1" />
                    </>
                  ) : (
                    'clone voice'
                  )}
                </Button>
                <p className="text-xs text-red-800">{errorMessage}</p>
              </div>
            )}
          </>
        )}
        {hasPaid ? (
          <p className="text-white text-sm">
            thanks for subscribing, only 1 voice can be saved for now
          </p>
        ) : (
          <p className="text-white text-sm">
            on free plan, all voices are deleted after 1h
            <Link
              href="/pricing"
              className="text-orange-500 hover:text-orange-300 ml-1"
            >
              (upgrade)
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
