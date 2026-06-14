import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type GameStatus = 'draft' | 'active' | 'finished';

interface UseGameStatusResult {
  status: GameStatus | null;
  isActive: boolean;
  isLoading: boolean;
}

export function useGameStatus(gameId: string | undefined): UseGameStatusResult {
  const [status, setStatus] = useState<GameStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchStatus = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select('status')
        .eq('id', gameId)
        .single();

      if (isCancelled) return;

      if (error) {
        console.error('[useGameStatus] Failed to fetch game status:', error);
        setStatus(null);
      } else if (data?.status) {
        setStatus(data.status as GameStatus);
      }

      setIsLoading(false);
    };

    fetchStatus();

    const channel = supabase
      .channel(`game_status:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status as GameStatus | undefined;
          if (newStatus) {
            setStatus(newStatus);
          }
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return {
    status,
    isActive: status === 'active',
    isLoading,
  };
}
