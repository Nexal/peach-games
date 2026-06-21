import { useState, useRef, useEffect, useCallback } from 'react';
import { getPlayerSession } from '../../lib/playerSession';
import { getClanIntro, getClanIntroIcon, getClanIntroColor, resolveClanShortName } from '../../lib/clanIntros';
import './IntroVideoView.css';

type Phase = 'idle' | 'playing' | 'ended';

interface IntroConfig {
  klanName: string;
  klanColor: string;
  video: string;
  poster: string;
  iconSrc: string | null;
}

function readIntroConfig(): IntroConfig | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const klanParam = params.get('klan');

  if (klanParam) {
    const fullKlanName = resolveClanShortName(klanParam);
    if (!fullKlanName) {
      console.warn(`[IntroVideo] Nieznany klan w parametrze: "${klanParam}"`);
      return null;
    }
    if (!getPlayerSession()?.game_id) return null;

    const found = getClanIntro(fullKlanName);
    if (!found) return null;

    return {
      klanName: fullKlanName,
      klanColor: getClanIntroColor(fullKlanName) || '#FFD700',
      video: found.video,
      poster: found.poster,
      iconSrc: getClanIntroIcon(fullKlanName),
    };
  }

  const session = getPlayerSession();
  if (!session?.klan_name || !session?.game_id) return null;

  const found = getClanIntro(session.klan_name);
  if (!found) {
    console.warn(`[IntroVideo] Brak mapowania wideo dla klanu: "${session.klan_name}"`);
    return null;
  }

  const introKey = `peachgames_intro_seen_${session.game_id}`;
  if (localStorage.getItem(introKey) === 'true') return null;
  localStorage.setItem(introKey, 'true');

  return {
    klanName: session.klan_name,
    klanColor: session.klan_color || '#FFD700',
    video: found.video,
    poster: found.poster,
    iconSrc: getClanIntroIcon(session.klan_name),
  };
}

export function IntroVideoView() {
  const [config] = useState<IntroConfig | null>(readIntroConfig);
  const [phase, setPhase] = useState<Phase>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config) {
      window.location.href = '/';
    }
  }, [config]);

  const goHome = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (screen.orientation && 'unlock' in screen.orientation) {
      try { (screen.orientation as ScreenOrientation).unlock(); } catch { /* noop */ }
    }
    window.location.href = '/';
  }, []);

  const handlePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      video.volume = 1;
      await video.play();
    } catch {
      try {
        video.muted = true;
        await video.play();
      } catch {
        goHome();
        return;
      }
    }

    setPhase('playing');

    if (containerRef.current?.requestFullscreen) {
      try { await containerRef.current.requestFullscreen(); } catch { /* fallback inline */ }
    }
    if (screen.orientation && 'lock' in screen.orientation) {
      try { await (screen.orientation as ScreenOrientation).lock('landscape'); } catch { /* noop */ }
    }
  }, [goHome]);

  const handleEnded = useCallback(() => {
    setPhase('ended');
    goHome();
  }, [goHome]);

  const handleError = useCallback(() => {
    console.warn('[IntroVideo] Błąd ładowania wideo — przekierowanie na /');
    goHome();
  }, [goHome]);

  if (!config) {
    return <div className="intro-video intro-video--loading" />;
  }

  return (
    <div
      ref={containerRef}
      className={`intro-video intro-video--${phase}`}
      style={{ '--klan-color': config.klanColor } as React.CSSProperties}
    >
      <video
        ref={videoRef}
        className="intro-video__player"
        src={config.video}
        poster={config.poster}
        preload="auto"
        playsInline
        onEnded={handleEnded}
        onError={handleError}
        onClick={phase === 'playing' ? undefined : handlePlay}
      />

      {phase === 'idle' && (
        <button
          type="button"
          className="intro-video__tap-overlay"
          onClick={handlePlay}
          aria-label={`Odtwórz intro klanu ${config.klanName}`}
        >
          {config.iconSrc ? (
            <img
              src={config.iconSrc}
              alt=""
              className="intro-video__clan-icon"
              style={{ '--klan-color': config.klanColor } as React.CSSProperties}
            />
          ) : (
            <span className="intro-video__clan-icon-fallback" style={{ color: config.klanColor }}>
              ⚔
            </span>
          )}
          <span className="intro-video__play-triangle" aria-hidden="true">▶</span>
          <span className="intro-video__hint">Dotknij, aby rozpocząć</span>
        </button>
      )}
    </div>
  );
}
