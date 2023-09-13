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

export default function SetupComponent({ hasPaid }: { hasPaid: boolean }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [voice, setVoice] = useState<string>(''); // Renamed state variable
  const [audioFile, setAudioFile] = useState<File>();
  const [voiceName, setVoiceName] = useState<string>('');
  const [voiceDescription, setVoiceDescription] = useState<string>('');
  const router = useRouter();

  const fetchVoice = async () => {
    setLoading(true);
    try {
      const supabase = createClientComponentClient();
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
       

      if (error) throw error;

      if (data.length > 0) {
        setVoice(data[0].id);
      } else {
        setVoice('');
      }
      return data;
    } catch (error) {
      console.error('Error in fetchVoice: ', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoice();
  }, []);

  const handleAudioFileChange = (newFile: File | null) => {
    if (newFile) {
      setAudioFile(newFile);
    }
  };

  const handleClick = async () => {
    if (!audioFile || !voiceName || !voiceDescription) return;
    try {
      setLoading(true);
      const data = new FormData();
      data.set('audioFile', audioFile);
      data.set('voiceName', voiceName);
      data.set('voiceDescription', voiceDescription);
      console.log('clicked' + audioFile.name + voiceName + voiceDescription);
      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        body: data
      });
      if (response) {
        console.log('response' + JSON.stringify(response));
      }
    } catch (error: any) {
      console.error(error);
      console.log('error' + error.message);
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

      // Delete the voice from Supabase
      const { data, error } = await supabase
        .from('voices')
        .delete()
        .eq('user', user.id);

      if (error) throw error;

      console.log('data' + JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error in deleteVoice: ', error);
      throw error;
    } finally {
      setLoading(false);
      fetchVoice();
    }
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">voice cloning</h1>
        {voice ? (
          <Card className="flex flex-col items-center bg-black border-gray-600">
            <CardHeader>
              <h2 className="text-white text-lg font-bold">personal voice</h2>
            </CardHeader>
            <CardContent>
              <p className="text-white">your voice is setup</p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <div className="flex flex-row space-x-6 w-full items-center justify-center">
                <Button size="sm" variant="destructive" onClick={deleteVoice}>
                  delete voice
                </Button>
                <Link href="/generate">
                  <Button variant="secondary" >generate video</Button>
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
            <div className="flex flex-row space-x-6 w-full items-start justify-center">
              <div className="w-1/2">
                <InputAudio
                  label="original voice"
                  onFileChange={handleAudioFileChange}
                />
              </div>
              <div className="w-1/2 text-white flex flex-col space-y-4">
                <Label htmlFor="voiceName">voice name</Label>
                <Input
                  id="voiceName"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className=" w-full h-full p-4"
                  placeholder="enter voice name."
                />
                <Label htmlFor="voiceDescription">voice description</Label>
                <Textarea
                  id="voiceDescription"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  className=" w-full h-full p-4"
                  placeholder="enter voice description."
                />
              </div>
            </div>
            <Button className="mt-12" onClick={handleClick}>
              {loading ? 'loading...' : 'clone voice'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
