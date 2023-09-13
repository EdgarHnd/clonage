// components/ui/InputFile/inputfile.tsx
import { useState } from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InputVideoProps {
  onFileChange: (file: File | null) => void;
  label?: string;
  existingUrl?: string;
  disabled?: boolean;
}

export function InputVideo({ onFileChange, label, existingUrl, disabled }: InputVideoProps) {
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

  return (
    <div className="flex flex-col w-full space-y-4 max-w-sm items-start justify-center text-white">
      <Label htmlFor="videoInput">{label}</Label>
      <Input disabled={disabled} id="videoInput" type="file" onChange={handleChange} />
      {fileUrl && <video className="rounded" src={fileUrl} controls />}
    </div>
  )
}