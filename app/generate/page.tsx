'use client';
import { Button } from '@/components/ui/button';
import { InputVideo } from '@/app/generate/inputs/inputVideo';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File | null>();
  const [script, setScript] = useState<string>('');

  const [voice, setVoice] = useState<string>('');
/*   const supabase = createClientComponentClient();

  const [session] = await Promise.all([supabase.auth.getSession()]);

  const user = session.data.session?.user;

  useEffect(() => {
    if (!user) return;
    const fetchVoiceId = async () => {
      const { data, error } = await supabase
        .from('voices')
        .select('voice_id')
        .eq('user', user?.id)
        .single();

      if (error) {
        console.error('Error fetching voice id: ', error);
      } else if (data) {
        setVoice(data.voice_id);
      }
    };
    if (user) {
      fetchVoiceId();
    }
  }, [user]); */

  const handleVideoFileChange = (newFile: File | null) => {
    setVideoFile(newFile);
  };

  const runModel = async () => {
    if (!videoFile || !script) return;
    try {
      setLoading(true);

      // Create a FormData instance
      const data = new FormData();
      data.set('videoInput', videoFile);
      data.set('textInput', script);

      // Run the model
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: data
      });
      const { output } = await response.json();
      setOutput(output);
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

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">product demo</h1>
        {voice ? (
          <p className="text-white text-lg">
            You are using the voice model with id: {voice}
          </p>
        ) : (
          <p className="text-white text-lg">You don't have a voice model yet</p>
        )}
        <div className="flex flex-row space-x-6 w-full items-start justify-center">
          <div className="w-1/2">
            <InputVideo
              label="reference video"
              onFileChange={handleVideoFileChange}
            />
          </div>
          <div className="w-1/2 text-white h-[300px]">
            <Label htmlFor="script">script</Label>
            <Textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className=" w-full h-full"
              placeholder="type your video script here."
            />
          </div>
        </div>
        <Button className="mt-12" onClick={handleClick}>
          {loading ? 'loading...' : 'generate'}
        </Button>
        <div className="flex flex-row space-x-6 w-full items-start justify-center">
          <div className="w-1/2 text-white h-[300px]">
            <Label htmlFor="output">output</Label>
            {output && <video src={output} controls />}
          </div>
        </div>
      </div>
    </div>
  );
}
