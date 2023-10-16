// app/generate/inputs/inputAudio.tsx
import { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadIcon } from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface InputAudioProps {
  onFileChange: (file: File | null) => void;
  setErrorMessage: (message: string) => void;
  label?: string;
  existingUrl?: string;
  disabled?: boolean;
}

export function InputAudio({
  onFileChange,
  setErrorMessage,
  label,
  existingUrl,
  disabled
}: InputAudioProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const { toast } = useToast();

  if (existingUrl && !fileUrl) {
    setFileUrl(existingUrl);
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 1) {
        toast({
          title: 'too many files',
          description:
            'you can only upload one audio file at a time, please try again',
          duration: 5000
        });
        return;
      }

      const file = acceptedFiles[0];
      console.log('file' + file);

      // check that the audio file does not exceed 11MB
      if (file.size > 11 * 1024 * 1024) {
        toast({
          title: 'audio exceeds size limit',
          description: 'the size of the audio cannot exceed 11MB',
          duration: 5000
        });
        return;
      }

      setFileUrl(URL.createObjectURL(file));
      onFileChange(file); // pass the file to the parent component

      toast({
        title: 'audio selected',
        description: 'the audio was successfully selected',
        duration: 5000
      });
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.mpeg4', '.mp4', '.mpeg3']
    },
    maxFiles: 1,
    disabled: disabled
  });

  return (
    <div className="grid w-full space-y-4 max-w-sm items-center justify-center gap-1.5 text-white">
      <div
        {...getRootProps()}
        className="outline-dashed outline-2 outline-gray-100 hover:outline-yellow-400 w-full rounded-md p-4 flex justify-center align-middle"
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="self-center">drop the files here ...</p>
        ) : (
          <div className="flex justify-center flex-col items-center gap-2">
            <UploadIcon className="mx-auto mb-2 text-gray-400" />
            <p className="text-center">
              drop your audio here, or click to select file
            </p>
          </div>
        )}
      </div>
      {fileUrl && (
        <div className="flex flex-col items-center space-y-4">
          <audio className="rounded" src={fileUrl} controls />
          <Button
            variant="outline"
            size={'sm'}
            className="w-full"
            disabled={disabled}
            onClick={() => setFileUrl(null)}
          >
            remove
          </Button>
        </div>
      )}
    </div>
  );
}
