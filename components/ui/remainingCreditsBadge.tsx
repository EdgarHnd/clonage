'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from './button';

export const RemainingCreditsBadge: React.FC = () => {
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  const supabase = createClientComponentClient();

  const fetchCreditsRemaining = async () => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not found');
      }

      const { data, error } = await supabase
        .from('credits')
        .select('credits_remaining')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setCreditsRemaining(data.credits_remaining);
      }
      return data;
    } catch (error) {
      console.error('Error in fetchCreditsRemaining: ', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCreditsRemaining();
  }, []);

  if (creditsRemaining > 0) {
    return (
      <div className="flex flex-row space-x-4 items-center justify-between">
        <Badge>
          {creditsRemaining} credits remaining
          <Link
            className="text-orange-500 hover:text-orange-400 ml-1"
            href="/pricing"
          >
            {' '}
            add more
          </Link>
        </Badge>
      </div>
    );
  } else {
    return (
      <div className="flex flex-row space-x-4 items-center justify-between">
        <Badge>no credits remaining</Badge>
        <Link href="/pricing">
          <Button variant="secondary">subscribe</Button>
        </Link>
      </div>
    );
  }
};
