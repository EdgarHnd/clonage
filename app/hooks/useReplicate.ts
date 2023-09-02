/* // app/demo/useReplicate.ts
import { useState } from 'react';

export default function useReplicate() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [videoFile, setVideoFile] = useState<File>()
  const [audioFile, setAudioFile] = useState<File>()


  const runModel = async (videoInput: File, audioInput: File) => {
    console.log(`running model with video: ${videoInput.name}, size: ${videoInput.size} and audio: ${audioInput.name}, size: ${audioInput.size}`);
    try {
      setLoading(true);
  
      // Create a FormData instance
      const data = new FormData();
      formData.append('videoInput', videoInput);
      formData.append('audioInput', audioInput);
  
      // Run the model
      const response = await fetch('/api/replicate', {
        method: 'POST',
        body: data
      });
      const { output, prediction } = await response.json();
  
      setOutput(output);
      setPrediction(prediction);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, output, prediction, runModel, setVideoFile, setAudioFile };
}
 */