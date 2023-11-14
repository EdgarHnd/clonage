import { Database } from '@/lib/database.types';

type Price = Database['public']['Tables']['prices']['Row'];

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
};

export const postData = async ({
  url,
  data
}: {
  url: string;
  data?: { price: Price };
}) => {
  console.log('posting,', url, data);

  const res = await fetch(url, {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    credentials: 'same-origin',
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    console.log('Error in postData', { url, data, res });

    throw Error(res.statusText);
  }

  return res.json();
};

export const toDateTime = (secs: number) => {
  var t = new Date('1970-01-01T00:30:00Z'); // Unix epoch start.
  t.setSeconds(secs);
  return t;
};

export function getFlag(language: string): string {
  const languageFlags: { [key: string]: string } = {
    english: '🇬🇧',
    japanese: '🇯🇵',
    chinese: '🇨🇳',
    german: '🇩🇪',
    hindi: '🇮🇳',
    french: '🇫🇷',
    korean: '🇰🇷',
    portuguese: '🇵🇹',
    italian: '🇮🇹',
    spanish: '🇪🇸',
    indonesian: '🇮🇩',
    dutch: '🇳🇱',
    turkish: '🇹🇷',
    filipino: '🇵🇭',
    polish: '🇵🇱',
    swedish: '🇸🇪',
    bulgarian: '🇧🇬',
    romanian: '🇷🇴',
    arabic: '🇸🇦',
    czech: '🇨🇿',
    greek: '🇬🇷',
    finnish: '🇫🇮',
    croatian: '🇭🇷',
    malay: '🇲🇾',
    slovak: '🇸🇰',
    danish: '🇩🇰',
    tamil: '🇮🇳',
    ukrainian: '🇺🇦',
    russian: '🇷🇺'
  };

  return languageFlags[language] || '';
}
