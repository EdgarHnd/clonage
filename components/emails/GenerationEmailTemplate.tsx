import * as React from 'react';

interface GenerationEmailTemplateProps {
  generationUrl: string;
}

export const GenerationEmailTemplate: React.FC<Readonly<GenerationEmailTemplateProps>> = ({
  generationUrl,
}) => (
  <div>
    <h1>your generation has completed: {generationUrl}</h1>
  </div>
);