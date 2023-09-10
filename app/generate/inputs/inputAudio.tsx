// components/ui/InputFile/inputfile.tsx
import { useState } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InputAudioProps {
  onFileChange: (file: File | null) => void;
  label?: string;
}

export function InputAudio({ onFileChange, label }: InputAudioProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setFileUrl(URL.createObjectURL(file));
      onFileChange(file); // pass the file to the parent component
    } else {
      onFileChange(null); // pass null if no file is selected
    }
  };

  return (
    <div className="grid w-full max-w-sm items-center justify-center gap-1.5 text-white">
      <Label htmlFor="audioInput">{label}</Label>
      <Input id="audioInput" type="file" onChange={handleChange} />
      {fileUrl && <audio src={fileUrl} controls />}
    </div>
  )
}