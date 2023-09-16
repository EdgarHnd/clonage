// components/ui/InputFile/inputfile.tsx
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadIcon } from '@radix-ui/react-icons';

interface InputAudioProps {
  onFileChange: (file: File | null) => void;
  label?: string;
  setErrorMessage?: (message: string) => void;
}

export function InputAudio({
  onFileChange,
  label,
  setErrorMessage
}: InputAudioProps) {
  const inputFileRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const maxSize = 11 * 1024 * 1024; // 11MB in bytes

      if (file.size > maxSize) {
        if (setErrorMessage) {
          setErrorMessage('File size exceeds the maximum limit of 11MB');
        } else {
          alert('File size exceeds the maximum limit of 11MB');
        }
        if (inputFileRef.current) {
          inputFileRef.current.value = ''; // reset the input field
        }
        onFileChange(null);
        return;
      } else {
        onFileChange(file); // pass the file to the parent component
      }
    } else {
      onFileChange(null); // pass null if no file is selected
    }
  };

  const handleClick = () => {
    if (inputFileRef.current) {
      inputFileRef.current.click();
    }
  };

  return (
    <div className="grid w-full space-y-4 max-w-sm items-center justify-center gap-1.5 text-white">
      <div
        onClick={handleClick}
        className="border-dashed border-2 border-gray-400 py-6 px-4 rounded-md text-center cursor-pointer hover:border-white transition-colors duration-200"
      >
        <UploadIcon className="mx-auto mb-2 text-gray-400" />
        <Input
          ref={inputFileRef}
          id="audioInput"
          type="file"
          accept="audio/*,video/*"
          onChange={handleChange}
          className="hidden" // hide the default input
        />
        <Label htmlFor="audioInput" className="text-gray-400 cursor-pointer">
          {inputFileRef.current && inputFileRef.current.files?.length
            ? inputFileRef.current.files[0].name
            : 'click to upload your sample'}
        </Label>
      </div>
    </div>
  );
}
