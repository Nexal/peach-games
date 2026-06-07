import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { compressImage, uploadMedia, VIDEO_MAX_SIZE, IMAGE_MAX_SIZE } from '../../lib/mediaCompressor';
import './MediaUploadModal.css';

const VIDEO_MAX_MB = Math.round(VIDEO_MAX_SIZE / 1024 / 1024);

interface MediaUploadModalProps {
  taskId: string;
  questActivationId: string;
  klanId: string;
  gameId: string;
  onClose: () => void;
  onSubmit: () => void;
}

type MediaType = 'photo' | 'video';

export function MediaUploadModal({ taskId, questActivationId, klanId, gameId, onClose, onSubmit }: MediaUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File, type: MediaType): string | null => {
    if (!file || file.size === 0) {
      return 'Plik jest pusty. Spróbuj ponownie.';
    }
    if (type === 'photo' && !file.type.startsWith('image/')) {
      return 'To nie jest plik obrazu.';
    }
    if (type === 'video' && !file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|avi|mkv|3gp|m4v)$/i)) {
      return 'To nie jest plik wideo.';
    }
    if (type === 'photo' && file.size > IMAGE_MAX_SIZE) {
      return `Zdjęcie jest za duże (max 5MB). Rozmiar: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }
    if (type === 'video' && file.size > VIDEO_MAX_SIZE) {
      return `Wideo jest za duże (max 150MB). Rozmiar: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }
    return null;
  };

  const handleFileSelect = async (file: File, type: MediaType) => {
    setError(null);

    const validationError = validateFile(file, type);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setMediaType(null);
      return;
    }

    setMediaType(type);
    setSelectedFile(file);

    try {
      if (type === 'photo') {
        const compressed = await compressImage(file);
        setPreview(URL.createObjectURL(compressed));
      } else {
        setPreview(null);
      }
    } catch (err) {
      console.error('File processing error:', err);
      setError('Nie udało się przetworzyć pliku. Spróbuj wybrać inny.');
      setSelectedFile(null);
      setMediaType(null);
    }
  };

  const triggerPhotoInput = () => {
    setError(null);
    photoInputRef.current?.click();
  };

  const triggerVideoInput = () => {
    setError(null);
    videoInputRef.current?.click();
  };

  const triggerGalleryInput = () => {
    setError(null);
    galleryInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file, 'photo');
    } catch (err) {
      console.error('Photo select error:', err);
      setError('Nie udało się wybrać zdjęcia. Spróbuj ponownie.');
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file, 'video');
    } catch (err) {
      console.error('Video select error:', err);
      setError('Nie udało się wybrać wideo. Spróbuj ponownie.');
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const isVideo = file.type?.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|avi|mkv|3gp|m4v)$/i);
      handleFileSelect(file, isVideo ? 'video' : 'photo');
    } catch (err) {
      console.error('Gallery select error:', err);
      setError('Nie udało się wybrać pliku. Spróbuj ponownie.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !mediaType) return;

    setUploading(true);
    setError(null);

    try {
      const { data: existingSubmission } = await (supabase as any)
        .from('submissions')
        .select('id')
        .eq('task_id', taskId)
        .eq('klan_id', klanId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingSubmission) {
        setError('⏳ To zadanie ma już oczekujące zgłoszenie. Poczekaj na weryfikację przez Boga.');
        setUploading(false);
        return;
      }

      const mediaUrl = await uploadMedia(selectedFile, gameId, klanId, taskId, mediaType);
      if (!mediaUrl) {
        setError('Nie udało się wysłać pliku. Spróbuj ponownie.');
        setUploading(false);
        return;
      }

      const { error: dbError } = await supabase.from('submissions').insert({
        quest_activation_id: questActivationId,
        task_id: taskId,
        klan_id: klanId,
        media_type: mediaType,
        media_url: mediaUrl,
        status: 'pending',
      });

      if (dbError) {
        console.error('Submission insert error:', dbError);
        setError('Błąd zapisu zgłoszenia. Spróbuj ponownie.');
        setUploading(false);
        return;
      }

      onSubmit();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-upload-modal" onClick={onClose}>
      <div className="media-upload-modal__content" onClick={(e) => e.stopPropagation()}>
        <button className="media-upload-modal__close" onClick={onClose}>✕</button>
        <h2 className="media-upload-modal__title">📷 Wyślij dowód</h2>

        <input
          type="file"
          ref={photoInputRef}
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/*"
          capture="environment"
          onChange={handleVideoChange}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          ref={galleryInputRef}
          accept="image/*,video/*"
          onChange={handleGalleryChange}
          style={{ display: 'none' }}
        />

        {!selectedFile && !error && (
          <div className="media-upload-modal__options">
            <button
              className="media-upload-modal__option"
              onClick={triggerPhotoInput}
            >
              <span className="media-upload-modal__option-icon">📸</span>
              <span>Zrób zdjęcie</span>
            </button>
            <button
              className="media-upload-modal__option"
              onClick={triggerVideoInput}
            >
              <span className="media-upload-modal__option-icon">🎥</span>
              <span>Nagraj wideo (max {VIDEO_MAX_MB}MB)</span>
            </button>
            <button
              className="media-upload-modal__option"
              onClick={triggerGalleryInput}
            >
              <span className="media-upload-modal__option-icon">📁</span>
              <span>Wybierz z galerii</span>
            </button>
          </div>
        )}

        {error && (
          <div className="media-upload-modal__error">
            ⚠️ {error}
          </div>
        )}

        {preview && mediaType === 'photo' && (
          <div className="media-upload-modal__preview">
            <img src={preview} alt="Podgląd" />
            <div className="media-upload-modal__actions">
              <button className="media-upload-modal__btn media-upload-modal__btn--cancel" onClick={() => { setSelectedFile(null); setPreview(null); setError(null); }}>
                🔄 Wybierz inny
              </button>
              <button
                className="media-upload-modal__btn media-upload-modal__btn--submit"
                onClick={handleSubmit}
                disabled={uploading}
              >
                {uploading ? '⏳ Wysyłanie...' : '📤 Wyślij'}
              </button>
            </div>
          </div>
        )}

        {selectedFile && mediaType === 'video' && (
          <div className="media-upload-modal__preview">
            <div className="media-upload-modal__video-info">
              🎥 {selectedFile.name}<br />
              📦 {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </div>
            <div className="media-upload-modal__actions">
              <button className="media-upload-modal__btn media-upload-modal__btn--cancel" onClick={() => { setSelectedFile(null); setPreview(null); setError(null); }}>
                🔄 Wybierz inny
              </button>
              <button
                className="media-upload-modal__btn media-upload-modal__btn--submit"
                onClick={handleSubmit}
                disabled={uploading}
              >
                {uploading ? '⏳ Wysyłanie...' : '📤 Wyślij'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
