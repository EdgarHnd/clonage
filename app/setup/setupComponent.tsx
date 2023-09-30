'use client';
import { Button } from '@/components/ui/button';
import { InputAudio } from '@/app/generate/inputs/inputAudio'; // Renamed component
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
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
import { AudioRecorder } from 'react-audio-voice-recorder';

export default function SetupComponent({ hasPaid }: { hasPaid: boolean }) {
  const [loading, setLoading] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false)
  const [output, setOutput] = useState<any>(null);
  const [voice, setVoice] = useState<string>(''); // Renamed state variable
  const [audioFile, setAudioFile] = useState<File>();
  const [voiceName, setVoiceName] = useState<string>('');
  const [voiceDescription, setVoiceDescription] = useState<string>('');
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fetchVoice = async () => {
    setVoiceLoading(true)
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
      setVoiceLoading(false)
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
    if (!voiceName) {
      setErrorMessage('Voice name is missing. Please enter a voice name.');
      return;
    }
    try {
      setLoading(true);
      const data = new FormData();
      data.set('audioFile', audioFile);
      data.set('voiceName', voiceName);
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

  const handleAudioRecorded = (newBlob: Blob | null) => {
    if (newBlob) {
      console.log('newBlob' + JSON.stringify(newBlob));
      const newFile = new File([newBlob], 'recorded_audio.webm', {
        type: 'audio/webm'
      });
      handleAudioFileChange(newFile);
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">voice cloning</h1>
        {voiceLoading ? (
          <div>
            {' '}
            <UpdateIcon className="animate-spin" />
          </div> // Replace this with your loading UI
        ) : (
          <>
            {voice ? (
              <Card className="flex flex-col items-center bg-black border-gray-600">
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
                      <Button variant="secondary">generate video</Button>
                    </Link>
                  </div>
                  {hasPaid ? (
                    <p className="text-white text-sm">
                      thanks for subscribing, during beta only one voice can be
                      saved
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
                </CardFooter>
              </Card>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:space-x-6 w-full items-start justify-center">
                  <div className="md:w-1/2 w-full flex flex-col space-y-4 items-center text-center">
                    <p className="text-sm text-gray-600 md:w-1/2">
                      record a voice sample (30s)
                    </p>
                    <div className="">
                      <p>
                        "Hello everyone! Have you heard about Clonage? It's this
                        cool app that lets you create unlimited videos from just
                        one sample of yourself!
                      </p>
                      <p>
                        And that’s not all; it supports various languages!
                        Imagine the possibilities – reaching out and connecting,
                        no matter the language.
                      </p>
                      <p>
                        Since you're here at Buildspace, you know it’s the spot
                        where ideas turn into reality. Whether it’s apps,
                        YouTube channels, games, art, AI, or music, there’s
                        space for every idea!
                      </p>
                      <p>
                        So, why not explore Clonage while you’re working on
                        projects in Buildspace? It could be a fun way to see
                        your ideas come to life!"
                      </p>
                    </div>
                    <AudioRecorder
                      onRecordingComplete={handleAudioRecorded}
                      audioTrackConstraints={{
                        noiseSuppression: true,
                        echoCancellation: true
                      }}
                      showVisualizer={true}
                      downloadFileExtension="webm"
                    />
                    <p className="text-sm text-gray-600 md:w-1/2">
                      or upload an audio or video of yourself talking clearly
                      without background noise (max size 11MB)
                    </p>
                    <InputAudio
                      setErrorMessage={setErrorMessage}
                      label="original voice"
                      onFileChange={handleAudioFileChange}
                    />
                    {audioUrl && <audio src={audioUrl} controls />}
                  </div>
                  <div className="w-full md:w-1/2 text-white flex flex-col space-y-4 md:mt-0 mt-4">
                    <Label htmlFor="voiceName">voice name</Label>
                    <Input
                      id="voiceName"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      className=" w-full h-full p-4"
                      placeholder="enter voice name."
                    />
                    {/* <Label htmlFor="voiceDescription">voice description</Label>
                <Textarea
                  id="voiceDescription"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  className=" w-full h-full p-4"
                  placeholder="enter voice description."
                /> */}
                  </div>
                </div>
                <Button className="mt-12" onClick={handleClick}>
                  {loading ? (
                    <>
                      cloning voice <UpdateIcon className="animate-spin ml-1" />
                    </>
                  ) : (
                    'clone voice'
                  )}
                </Button>
                <p className="text-xs text-red-800">{errorMessage}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
