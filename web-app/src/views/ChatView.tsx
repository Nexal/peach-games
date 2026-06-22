import { useEffect, useState, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { getPlayerSession } from '../lib/playerSession';
import { useGame } from '../App';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];
type Klan = Database['public']['Tables']['klans']['Row'];

const CLAN_ICONS: Record<string, string> = {
  'klan peruna': '/icons/perun_symbol-Photoroom.png',
  'klan welesa': '/icons/weles_icon_symbol-Photoroom.png',
  'klan mokoszy': '/icons/mokosz_symbol-Photoroom.png',
};

const GOD_ICONS: Record<string, string> = {
  'Perun': '/icons/perun_avatar.png',
  'Weles': '/icons/weles_avatar.jpeg',
  'Mokosz': '/icons/mokosz_avatar.jpeg',
  'Bogowie': '',
  'Bóg': '',
};

function getClanIcon(klanName: string): string {
  return CLAN_ICONS[klanName.toLowerCase()] || '';
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '255, 0, 0';
}

export function ChatView() {
  const { markClanMessagesRead, markGlobalMessagesRead, setChatOpen, unreadClanMessages, unreadGlobalMessages } = useGame();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [playerSession] = useState(getPlayerSession());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'klan' | 'global'>('klan');
  const [klans, setKlans] = useState<Klan[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [notifFlash, setNotifFlash] = useState(false);
  const [playerAvatarMap, setPlayerAvatarMap] = useState<Record<string, string | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { setChatOpen(true); markClanMessagesRead(); return () => setChatOpen(false); }, [setChatOpen, markClanMessagesRead]);

  const requestNotifyPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    await Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (playerSession?.game_id) {
      supabase.from('klans').select('*').eq('game_id', playerSession.game_id)
        .then(({ data }) => data && setKlans(data));
      supabase.from('players').select('id, avatar_url').eq('game_id', playerSession.game_id)
        .then(({ data }) => {
          if (data) {
            const map: Record<string, string | null> = {};
            data.forEach(p => { map[p.id] = p.avatar_url; });
            setPlayerAvatarMap(map);
          }
        });
    }
  }, [playerSession?.game_id]);

  useEffect(() => {
    if (!playerSession?.klan_id) return;

    const fetchMessages = async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('game_id', playerSession.game_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (chatMode === 'klan') {
        query = query.eq('klan_id', playerSession.klan_id);
      } else {
        query = query.is('klan_id', null);
      }

      const { data } = await query;
      if (data) setMessages(data.reverse());
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${chatMode}:${playerSession.klan_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${playerSession.game_id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.game_id !== playerSession.game_id) return;
          if (chatMode === 'klan') {
            if (newMsg.klan_id === playerSession.klan_id) {
              setMessages((prev) => [...prev, newMsg]);
            }
          } else {
            if (newMsg.klan_id === null) {
              setMessages((prev) => [...prev, newMsg]);
            }
          }
          if (newMsg.god_id) {
            setNotifFlash(true);
            setTimeout(() => setNotifFlash(false), 2000);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerSession?.klan_id, chatMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playAudio = (msg: Message) => {
    if (!msg.audio_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(msg.audio_url);
    audioRef.current = audio;
    setPlayingAudioId(msg.id);

    audio.onended = () => {
      setPlayingAudioId(null);
    };

    audio.onerror = () => {
      setPlayingAudioId(null);
      console.error('Error playing audio');
    };

    audio.play();
  };

  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      console.log('Compressing image:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement('canvas');
        let { width, height } = img;
        console.log('Original:', width, 'x', height);

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        console.log('Resized to:', width, 'x', height);

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
            if (blob) {
              console.log('Compressed size:', (blob.size / 1024).toFixed(1), 'KB');
              resolve(blob);
            }
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
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!playerSession?.game_id) return null;

    try {
      const compressed = await compressImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const filePath = `${playerSession.game_id}/${fileName}`;

      console.log('Uploading to:', filePath, 'Size:', (compressed.size / 1024).toFixed(1), 'KB');

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      console.log('Image selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      setSelectedImage(file);
      setImagePreview(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.onerror = (err) => {
        console.error('FileReader error:', err);
        setSelectedImage(null);
        setImagePreview(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error selecting image:', err);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerSession) return;

    if (!inputText.trim() && !selectedImage) return;

    setUploading(true);
    setUploadError(null);

    let imageUrl: string | null = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
      if (!imageUrl) {
        setUploadError(' Nie udało się wysłać zdjęcia. Spróbuj ponownie.');
        setUploading(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from('messages').insert({
      content: inputText.trim(),
      sender: playerSession.name,
      player_id: playerSession.player_id || null,
      klan_id: chatMode === 'global' ? null : playerSession.klan_id,
      sender_klan_id: playerSession.klan_id,
      game_id: playerSession.game_id,
      image_url: imageUrl,
      tts_requested: false,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      setUploadError(' Nie udało się wysłać wiadomości.');
    }

    setInputText('');
    clearImage();
    setUploading(false);
  };

  if (!playerSession) {
    return (
      <div className="view view--chat">
        <header className="view__header">
          <h1 className="view__title view__title--small">Głos Bogów</h1>
        </header>
        <main className="view__content view__content--chat">
          <div className="chat-container">
            <p className="chat-empty">Musisz najpierw dołączyć do gry przez link z aplikacji.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="view view--chat"
      style={{
        '--klan-color': playerSession.klan_color,
        '--klan-color-rgb': hexToRgb(playerSession.klan_color),
      } as React.CSSProperties}
    >
      <header className="view__header">
        <h1 className="view__title view__title--small">
          {chatMode === 'global' ? 'Modlitwa Wspólna' : `Modlitwa ${playerSession.klan_name}`}
        </h1>
        <p className="view__subtitle">Przesłanie od Bogów</p>
        <div className="chat-controls-row">
          {'Notification' in window && (
            <button
              className={`chat-notify-btn ${notifFlash ? 'chat-notify-btn--flash' : ''}`}
              onClick={requestNotifyPermission}
              title={
                Notification.permission === 'granted' ? 'Powiadomienia włączone' :
                Notification.permission === 'denied' ? 'Powiadomienia zablokowane' : 'Włącz powiadomienia'
              }
            >
              {Notification.permission === 'granted' ? '🔔' :
               Notification.permission === 'denied' ? '🔕' : '🔇'}
            </button>
          )}
          <div className="chat-mode-toggle">
          <button
            className={`chat-mode-toggle__btn ${chatMode === 'klan' ? 'chat-mode-toggle__btn--active' : ''} ${chatMode !== 'klan' && unreadClanMessages > 0 ? 'chat-mode-toggle__btn--unread' : ''}`}
            onClick={() => { setChatMode('klan'); markClanMessagesRead(); }}
          >
            {getClanIcon(playerSession.klan_name) && (
              <img src={getClanIcon(playerSession.klan_name)} alt={playerSession.klan_name} style={{ width: 36, height: 36 }} />
            )}
            Klan
            {chatMode !== 'klan' && unreadClanMessages > 0 && (
              <span className="chat-mode-toggle__badge">{unreadClanMessages > 99 ? '99+' : unreadClanMessages}</span>
            )}
          </button>
          <button
            className={`chat-mode-toggle__btn ${chatMode === 'global' ? 'chat-mode-toggle__btn--active' : ''} ${chatMode !== 'global' && unreadGlobalMessages > 0 ? 'chat-mode-toggle__btn--unread' : ''}`}
            onClick={() => { setChatMode('global'); markGlobalMessagesRead(); }}
          >
            🌍 Wspólna
            {chatMode !== 'global' && unreadGlobalMessages > 0 && (
              <span className="chat-mode-toggle__badge">{unreadGlobalMessages > 99 ? '99+' : unreadGlobalMessages}</span>
            )}
          </button>
        </div>
      </div>
      </header>

      <main className="view__content view__content--chat">
        <div className="chat-messages-scroll">
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">Cisza w eterze...</p>
            )}
            {messages.map((msg) => {
              const isOwnMessage = msg.sender === playerSession.name;
              const isGod = !!msg.god_id || msg.sender === 'Bogowie' || msg.sender === 'Bóg';
              const isGlobal = msg.klan_id === null;
              const isSystemNotification = msg.sender === 'Bogowie';
              const clan = klans.find(k => k.id === (msg.sender_klan_id || msg.klan_id));
              const clanColor = clan?.theme_color || '#888888';
              const clanColorRgb = hexToRgb(clanColor);
              const senderAvatar = !isGod ? playerAvatarMap[msg.player_id || ''] || null : null;
              const godIcon = isGod ? (GOD_ICONS[msg.sender] || '') : '';
              return (
                <div
                  key={msg.id}
                  className={`chat-message ${isGod ? 'chat-message--god' : isOwnMessage ? 'chat-message--own' : 'chat-message--klan'} ${isGlobal && !isOwnMessage && !isGod ? 'chat-message--global' : ''} ${isSystemNotification ? 'chat-message--broadcast' : ''}`}
                  style={{
                    '--msg-klan-color': isGod ? (clanColor || '#FFD700') : clanColor,
                    '--msg-klan-color-rgb': isGod ? hexToRgb(clanColor || '#FFD700') : clanColorRgb,
                    ...(isGod ? {
                      borderColor: `${clanColor || '#FFD700'}66`,
                      background: `linear-gradient(135deg, ${clanColor || '#FFD700'}22 0%, ${clanColor || '#FFD700'}08 100%)`,
                      boxShadow: `0 6px 20px ${clanColor || '#FFD700'}33`,
                    } : {}),
                  } as React.CSSProperties}
                  title={msg.created_at ? new Date(msg.created_at).toLocaleString('pl-PL') : ''}
                >
                  {isSystemNotification && (
                    <div className="chat-message__broadcast-badge">📢 Ogłoszenie</div>
                  )}
                  <span className="chat-message__sender" style={isGlobal ? (isOwnMessage ? { color: '#ffffff' } : { color: isGod ? (clanColor || '#FFD700') : clanColor, filter: isGod ? undefined : 'brightness(1.4)' }) : undefined}>
                    {senderAvatar ? (
                      <img
                        src={senderAvatar}
                        alt={msg.sender}
                        style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', marginRight: 4, verticalAlign: 'middle', cursor: 'pointer' }}
                        onClick={() => setEnlargedImage(senderAvatar)}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : null}
                    {isGod ? <>{godIcon ? <img src={godIcon} alt={msg.sender} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', marginRight: 4, verticalAlign: 'middle', cursor: 'pointer' }} onClick={() => setEnlargedImage(godIcon)} /> : <span>📢</span>} {msg.sender}</> : isGlobal ? `${msg.sender} (${clan?.name || '?'})` : `${msg.sender}`}
                  </span>
                  <span className="chat-message__content" style={isGod ? { color: clanColor || '#FFD700' } : isGlobal ? (isOwnMessage ? { color: '#ffffff' } : { color: clanColor, filter: 'brightness(1.4)' }) : undefined}>{msg.content}</span>
                  {msg.image_url && (
                    <img src={msg.image_url} alt="Załącznik" className="chat-message__image" onClick={() => setEnlargedImage(msg.image_url)} />
                  )}
                  {msg.audio_url && (
                    <div className="chat-message__footer">
                      <button
                        className={`chat-message__play-btn ${playingAudioId === msg.id ? 'chat-message__play-btn--playing' : ''}`}
                        onClick={() => playAudio(msg)}
                        title="Odtwórz wiadomość głosową"
                      >
                        {playingAudioId === msg.id ? '⏸️' : '▶'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <div className="chat-input-bar">
        {imagePreview && (
          <div className="chat-input-bar__preview">
            <img src={imagePreview} alt="Podgląd" className="chat-input-bar__preview-img" />
            <button type="button" onClick={clearImage} className="chat-input-bar__preview-remove">✕</button>
          </div>
        )}
        <form onSubmit={sendMessage} className="chat-input-bar__form">
          <div className="chat-input-bar__field-wrapper">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Modlitwa od ${playerSession.name}...`}
              className="chat-input-bar__field"
            />
            <label htmlFor="chat-image-input" className="chat-input-bar__camera" title="Zrób zdjęcie">
              📷
              <input
                type="file"
                id="chat-image-input"
                ref={fileInputRef}
                accept="image/*"
                capture="user"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <button type="submit" className="button-glow chat-input-bar__submit" disabled={uploading}>
            {uploading ? '...' : 'Wyślij'}
          </button>
        </form>
        {uploadError && <p className="chat-input-bar__error">{uploadError}</p>}
      </div>

      {enlargedImage && (
        <div className="chat-image-modal" onClick={() => setEnlargedImage(null)}>
          <div className="chat-image-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="chat-image-modal__close" onClick={() => setEnlargedImage(null)}>✕</button>
            <img src={enlargedImage} alt="Powiększenie" className="chat-image-modal__img" />
          </div>
        </div>
      )}
    </div>
  );
}
