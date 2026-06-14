import { useEffect, useRef } from 'react';

export function useScreenWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !navigator.wakeLock) return;

    const requestLock = () => {
      navigator.wakeLock.request('screen').then(lock => {
        lockRef.current = lock;
      }).catch(() => {});
    };

    requestLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}
