// components/ui/InputFile/inputfile.tsx
import { useCallback, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileIcon, UploadIcon } from '@radix-ui/react-icons';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface InputVideoProps {
  onFileChange: (file: File | null) => void;
  label?: string;
  existingUrl?: string;
  disabled?: boolean;
}

export function InputVideo({
  onFileChange,
  label,
  existingUrl,
  disabled
}: InputVideoProps) {
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
            'you can only upload one video at a time, please try again',
          duration: 5000
        });
        return;
      }

      const file = acceptedFiles[0];

      console.log('file' + file);

      // check that the video file does not exceed 4.5MB
      if (file.size > 11 * 1024 * 1024) {
        toast({
          title: 'video exceeds size limit',
          description: 'the size of the video cannot exceed 11MB',
          duration: 5000
        });
        return;
      }

      setFileUrl(URL.createObjectURL(file));
      onFileChange(file); // pass the file to the parent component

      toast({
        title: 'video selected',
        description: 'the video was successfully selected',
        duration: 5000
      });
    },
    [onFileChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.avi', '.wmv']
    },
    maxFiles: 1,
    disabled: disabled
  });

  return (
    <div className="grid w-full space-y-4 max-w-sm items-center justify-center gap-1.5 text-white">
      <div
        {...getRootProps()}
        className="outline-dashed outline-2 outline-gray-100 hover:outline-yellow-500 w-full rounded-md p-4 flex justify-center align-middle"
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="self-center">drop the files here ...</p>
        ) : (
          <div className="flex justify-center flex-col items-center gap-2">
            <UploadIcon className="mx-auto mb-2 text-gray-400" />
            <p className="text-center">
              drop your video here, or click to select file
            </p>
          </div>
        )}
      </div>
      {fileUrl && (
        <div>
          {' '}
          <video className="rounded" src={fileUrl} controls />
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
