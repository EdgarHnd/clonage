'use client'
import { Button } from '@/components/ui/button';
import { InputAudio } from '@/app/generate/inputs/inputAudio'; // Renamed component
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [audioFile, setAudioFile] = useState<File>();
  const [voiceName, setVoiceName] = useState<string>('');
  const [voiceDescription, setVoiceDescription] = useState<string>('');

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
    } catch (error : any) {
      console.error(error);
      console.log('error' + error.message);
    }
  };


  return (
    <div className="max-w-6xl px-4 py-8 mx-auto sm:py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-12">
        <h1 className="text-white text-2xl font-bold">voice cloning</h1>
        <div className="flex flex-row space-x-6 w-full items-start justify-center">
          <div className="w-1/2">
            <InputAudio label="original voice" onFileChange={handleAudioFileChange} />
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
      </div>
    </div>
  );
}