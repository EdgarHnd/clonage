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

export default function SetupPage() {
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
        .single();

      if (error) throw error;

      if (data) {
        setVoice(data.id);
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
      router.refresh();
    }
  };

  const deleteVoice = async () => {
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
        .delete()
        .eq('user', user.id);
      if (error) throw error;
      console.log('data' + JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('Error in deleteVoice: ', error);
      throw error;
    } finally {
      setVoice('');
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-12">
          <h1 className="text-white text-2xl font-bold">voice cloning</h1>
          <p className="text-white">loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">voice cloning</h1>
        {voice ? (
          <Card className="flex flex-col items-center bg-black">
            <CardHeader>
              <h2 className="text-white text-lg font-bold">personal voice</h2>
            </CardHeader>
            <CardContent>
              <p className="text-white">you already have a voice </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button variant="destructive" onClick={deleteVoice}>
                delete voice
              </Button>
              <p className="text-white text-sm">
                on free plan, all voices are deleted after 1h
                <Link
                  href="/pricing"
                  className="text-orange-500 hover:text-orange-300 ml-1"
                >
                  (upgrade)
                </Link>
              </p>
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
              <div className="w-1/2 text-white">
                <Label htmlFor="voiceName">voice name</Label>
                <Input
                  id="voiceName"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className=" w-full h-full"
                  placeholder="enter voice name."
                />
                <Label htmlFor="voiceDescription">voice description</Label>
                <Textarea
                  id="voiceDescription"
                  value={voiceDescription}
                  onChange={(e) => setVoiceDescription(e.target.value)}
                  className=" w-full h-full"
                  placeholder="enter voice description."
                />
              </div>
            </div>
            <Button className="mt-12" onClick={handleClick}>
              {loading ? 'loading...' : 'clone voice'}
            </Button>
            <div className="flex flex-row space-x-6 w-full items-start justify-center">
              <div className="w-1/2 text-white h-[300px]">
                <Label htmlFor="output">output</Label>
                {output && <audio src={output} controls />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
