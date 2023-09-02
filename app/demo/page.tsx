'use client';
import { Button } from '@/components/ui/button';
import { InputVideo } from '@/app/demo/inputs/inputVideo';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File | null>();
  const [script, setScript] = useState<string>('');

  const handleTextClick = () => {
    console.log('text clicked');
    try {
      const response = fetch('/api/voice', {
        method: 'POST',
        body: JSON.stringify({
          text: script
        })
      });
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  };



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
    runModel();
  };

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">product demo</h1>
        <div className="flex flex-row space-x-6 w-full items-start justify-center">
          <div className="w-1/2">
            <InputVideo onFileChange={handleVideoFileChange} />
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
        //display output
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
