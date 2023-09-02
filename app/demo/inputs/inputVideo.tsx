// components/ui/InputFile/inputfile.tsx
import { useState } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InputVideoProps {
  onFileChange: (file: File | null) => void;
}

export function InputVideo({ onFileChange }: InputVideoProps) {
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
      <Label htmlFor="videoInput">video</Label>
      <Input id="videoInput" type="file" onChange={handleChange} />
      {fileUrl && <video src={fileUrl} controls autoPlay />}
    </div>
  )
}