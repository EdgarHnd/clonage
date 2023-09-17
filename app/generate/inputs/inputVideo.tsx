// components/ui/InputFile/inputfile.tsx
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadIcon } from '@radix-ui/react-icons';

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
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  if (existingUrl && !fileUrl) {
    setFileUrl(existingUrl);
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileUrl(URL.createObjectURL(file));
      onFileChange(file); // pass the file to the parent component
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
          disabled={disabled}
          ref={inputFileRef}
          id="videoInput"
          type="file"
          accept="video/*,image/*"
          onChange={handleChange}
          className="hidden" // hide the default input
        />
        <Label htmlFor="videoInput" className="text-gray-400 cursor-pointer">
          {inputFileRef.current && inputFileRef.current.files?.length
            ? inputFileRef.current.files[0].name
            : 'click to upload your video'}
        </Label>
      </div>
      {fileUrl && <video className="rounded" src={fileUrl} controls />}
    </div>
  );
}