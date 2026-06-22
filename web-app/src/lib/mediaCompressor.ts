import { supabaseUrl } from './supabase';

export const IMAGE_MAX_SIZE = 20 * 1024 * 1024; // 20MB
export const VIDEO_MAX_SIZE = 50 * 1024 * 1024; // 50MB (reduced for mobile stability)
export const VIDEO_MAX_DURATION = 180; // 180 seconds

export function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not compress image'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image'));
    };
    img.src = objectUrl;
  });
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error('Could not load video'));
    video.src = URL.createObjectURL(file);
  });
}

export async function compressVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const duration = await getVideoDuration(file);

  if (duration > VIDEO_MAX_DURATION) {
    throw new Error(`Wideo jest za długie (max ${VIDEO_MAX_DURATION}s). Twoje: ${Math.round(duration)}s`);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      const targetWidth = Math.min(video.videoWidth, 1280);
      const scale = targetWidth / video.videoWidth;
      canvas.width = targetWidth;
      canvas.height = Math.round(video.videoHeight * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1_000_000, // 1Mbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size > VIDEO_MAX_SIZE) {
          reject(new Error(`Wideo jest za du\u017Ce po kompresji (max ${VIDEO_MAX_SIZE / 1024 / 1024}MB)`));
          return;
        }
        onProgress?.(100);
        resolve(blob);
      };

      recorder.start(100);

      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const progress = (video.currentTime / duration) * 100;
        onProgress?.(Math.round(progress));
        requestAnimationFrame(drawFrame);
      };

      video.play().then(() => {
        drawFrame();
      }).catch(reject);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Could not load video'));
    };
  });
}

export async function uploadMedia(
  file: File,
  gameId: string,
  klanId: string,
  taskId: string,
  mediaType: 'photo' | 'video'
): Promise<string | null> {
  const ext = mediaType === 'photo' ? 'jpg' : file.name.split('.').pop() || 'mp4';
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const filePath = `${gameId}/${klanId}/${taskId}/${fileName}`;

  let uploadBlob: Blob;
  let contentType: string;

  if (mediaType === 'photo') {
    uploadBlob = await compressImage(file);
    contentType = 'image/jpeg';
  } else {
    uploadBlob = file;
    contentType = file.type || 'video/mp4';
  }

  console.log('[uploadMedia] Uploading:', filePath, 'Size:', (uploadBlob.size / 1024 / 1024).toFixed(1), 'MB', 'Type:', contentType);

  try {
    // Direct fetch to Supabase Storage API — avoids loading entire file into memory via JS client
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const url = `${supabaseUrl}/storage/v1/object/quest-submissions/${encodeURIComponent(filePath)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'x-upsert': 'false',
        'Content-Type': contentType,
      },
      body: uploadBlob,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[uploadMedia] HTTP error:', response.status, errorText);
      return null;
    }

    console.log('[uploadMedia] Upload success');

    return `${supabaseUrl}/storage/v1/object/public/quest-submissions/${filePath}`;
  } catch (err) {
    console.error('[uploadMedia] Exception:', err);
    return null;
  }
}
