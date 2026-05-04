import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import './QRScannerModal.css';

interface QRScannerModalProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScannerModal({ onScan, onClose }: QRScannerModalProps) {
  const [cameraFailed, setCameraFailed] = useState(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scannerIdRef = useRef(`qr-scanner-${Date.now()}`);

  const cleanupContainer = useCallback(() => {
    const el = document.getElementById(scannerIdRef.current);
    if (el) {
      const videos = el.querySelectorAll('video');
      if (videos.length > 1) {
        for (let i = 1; i < videos.length; i++) {
          videos[i].remove();
        }
      }
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          scannerRef.current.stop();
        }
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    const el = document.getElementById(scannerIdRef.current);
    if (el) {
      el.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const scannerId = scannerIdRef.current;

    const startScanner = async () => {
      try {
        const container = document.getElementById(scannerId);
        if (!container) return;
        container.innerHTML = '';

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 5,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            if (!mountedRef.current) return;

            const now = Date.now();
            if (decodedText === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
              return;
            }
            lastScannedRef.current = decodedText;
            lastScanTimeRef.current = now;

            stopScanner();
            onScan(decodedText);
          },
          () => {},
        );

        cleanupContainer();

        if (mountedRef.current) {
          setScannerReady(true);
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('NotAllowedError') || message.includes('Permission')) {
            setCameraErrorMsg('Odmowa dostępu do kamery.');
          } else {
            setCameraErrorMsg('Nie można uruchomić kamery.');
          }
          setCameraFailed(true);
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [onScan, stopScanner, cleanupContainer]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      stopScanner();
      onScan(manualCode.trim());
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="qr-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="qr-modal" ref={containerRef}>
        <button className="qr-modal__close" onClick={handleClose}>✕</button>
        <h2 className="qr-modal__title">📱 Skanuj kod QR</h2>

        {!cameraFailed && (
          <div className="qr-modal__scanner-container">
            <div id={scannerIdRef.current} className="qr-modal__reader" />
            {!scannerReady && (
              <div className="qr-modal__scanner-loading">
                <div className="qr-modal__spinner" />
                <p>Uruchamianie kamery...</p>
              </div>
            )}
          </div>
        )}

        {cameraFailed && (
          <div className="qr-modal__manual">
            {cameraErrorMsg && (
              <p className="qr-modal__error-text">{cameraErrorMsg}</p>
            )}
            <p className="qr-modal__manual-hint">
              Wpisz kod widoczny na kodzie QR:
            </p>
            <input
              type="text"
              className="qr-modal__input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="np. PERUN_KAPLA_001"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            <button
              className="qr-modal__submit"
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
            >
              ✅ Zatwierdź kod
            </button>
          </div>
        )}

        <button className="qr-modal__cancel" onClick={handleClose}>
          Anuluj
        </button>
      </div>
    </div>
  );
}