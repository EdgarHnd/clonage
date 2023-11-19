import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Database } from '@/lib/database.types';
import { getFlag } from '@/utils/helpers';
import {
  CheckIcon,
  Cross1Icon,
  CubeIcon,
  UpdateIcon
} from '@radix-ui/react-icons';
import { motion } from 'framer-motion';

type Translation = Database['public']['Tables']['translations']['Row'];

type TranslationCardProps = {
  translation: Translation;
  onClick: (id: string) => void;
};

const TranslationCard: React.FC<TranslationCardProps> = ({
  translation,
  onClick
}) => {
  const badgecolor = (status: string | null) => {
    switch (status) {
      case 'created':
        return 'bg-yellow-500 hover:bg-yellow-500';
      case 'processing':
        return 'bg-yellow-500 hover:bg-yellow-500';
      case 'completed':
        return 'bg-green-500 hover:bg-green-500';
      case 'failed':
        return 'bg-red-500 hover:bg-red-500';
      default:
        return 'bg-yellow-500 hover:bg-yellow-500';
    }
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case 'created':
        return <CubeIcon />;
      case 'processing':
        return <UpdateIcon className="animate-spin" />;
      case 'completed':
        return <CheckIcon />;
      case 'failed':
        return <Cross1Icon />;
      default:
        return <CubeIcon />;
    }
  };
  return (
    <motion.div
      onClick={() => onClick(translation.id)}
      className="text-white flex flex-col items-center border rounded border-gray-800 dark:bg-black cursor-pointer hover:border-orange-400"
      key={translation.id}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <div className="flex flex-row items-center justify-between w-full px-4 pt-4 pb-2">
        <Badge className={badgecolor(translation.status)}>
          {statusIcon(translation.status)}
        </Badge>
        {translation.target_language && (
          <Badge>{getFlag(translation.target_language || '')}</Badge>
        )}
      </div>
      <div className="flex flex-col pb-4 h-32">
        {translation.original_video && (
          <video
            src={translation.original_video || ''}
            className="w-full h-full rounded"
          />
        )}
        {!translation.original_video && (
          <div className="flex flex-col justify-center items-center h-full w-full">
            <p className="text-gray-400 text-xs">no video uploaded</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TranslationCard;
