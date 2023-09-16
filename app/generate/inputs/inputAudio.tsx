// components/ui/InputFile/inputfile.tsx
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
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
        setFileUrl(URL.createObjectURL(file));
        onFileChange(file); // pass the file to the parent component
      }
    } else {
      onFileChange(null); // pass null if no file is selected
    }
  };

  return (
    <div className="grid w-full space-y-4 max-w-sm items-center justify-center gap-1.5 text-white">
      <Label htmlFor="audioInput">{label}</Label>
      <Input
        ref={inputFileRef}
        id="audioInput"
        type="file"
        accept="audio/*,video/*"
        onChange={handleChange}
      />
      {fileUrl && <audio src={fileUrl} controls />}
    </div>
  );
}
