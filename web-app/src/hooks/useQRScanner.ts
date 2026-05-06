import { useState, useCallback } from 'react';
import { usePlayerSession } from '../App';
import { scanQRCode, type QRScanResult } from '../lib/qrScanner';

export function useQRScanner(onSuccess?: () => void) {
  const { session } = usePlayerSession();
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const scan = useCallback(async (questId: string, scannedCode: string): Promise<QRScanResult | null> => {
    if (!session?.game_id || !session?.klan_id || !session?.id) return null;

    setScanning(true);
    setFeedback(null);

    const result = await scanQRCode(questId, scannedCode, session.game_id, session.klan_id, session.id);

    setScanning(false);
    setFeedback(result.success
      ? { type: 'success', text: result.message || '' }
      : { type: 'error', text: result.error || 'Nieznany błąd' },
    );

    if (result.success) {
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setTimeout(() => setFeedback(null), 3000);
    }

    if (result.success && onSuccess) {
      onSuccess();
    }

    return result;
  }, [session, onSuccess]);

  return { scanning, feedback, clearFeedback, scan };
}
