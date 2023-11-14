import * as React from 'react';

interface TranslationEmailTemplateProps {
  translationUrl: string;
}

export const TranslationEmailTemplate: React.FC<Readonly<TranslationEmailTemplateProps>> = ({
  translationUrl,
}) => (
  <div>
    <h1>your video translation has completed: {translationUrl}</h1>
  </div>
);