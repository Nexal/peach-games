import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { getPlayerSession } from '../lib/playerSession';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];
type Klan = Database['public']['Tables']['klans']['Row'];

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return '255, 0, 0';
}

export function ChatView() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (playerSession?.game_id) {
      supabase.from('klans').select('*').eq('game_id', playerSession.game_id)
        .then(({ data }) => data && setKlans(data));
    }
  }, [playerSession?.game_id]);

  useEffect(() => {
    if (!playerSession?.klan_id) return;

    const fetchMessages = async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (chatMode === 'klan') {
        query = query.or(`klan_id.eq.${playerSession.klan_id},and(sender.eq.god,klan_id.is.null)`);
      } else {
        query = query.is('klan_id', null);
      }

      const { data } = await query;
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:${chatMode}:${playerSession.klan_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (chatMode === 'klan') {
            if (newMsg.klan_id === playerSession.klan_id || (newMsg.sender === 'god' && newMsg.klan_id === null)) {
              setMessages((prev) => [...prev, newMsg]);
            }
          } else {
            if (newMsg.klan_id === null) {
              setMessages((prev) => [...prev, newMsg]);
            }
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
      const img = new Image();
      img.onload = () => {
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
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!playerSession?.game_id) return null;

    try {
      const compressed = await compressImage(file);
      const fileName = `${crypto.randomUUID()}.jpg`;
      const filePath = `${playerSession.game_id}/${fileName}`;

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
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !playerSession) return;

    setUploading(true);

    let imageUrl: string | null = null;
    if (selectedImage) {
      imageUrl = await uploadImage(selectedImage);
    }

    await supabase.from('messages').insert({
      content: inputText.trim() || (imageUrl ? '📷' : ''),
      sender: playerSession.name,
      klan_id: chatMode === 'global' ? null : playerSession.klan_id,
      sender_klan_id: playerSession.klan_id,
      game_id: playerSession.game_id,
      image_url: imageUrl,
      tts_requested: false,
    });

    setInputText('');
    clearImage();
    setUploading(false);
  };

  if (!playerSession) {
    return (
      <div className="view view--chat">
        <header className="view__header">
          <img src="/icons/glos-bogow.png" alt="Głos Bogów" className="view__icon" />
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
        <img src="/icons/glos-bogow.png" alt="Głos Bogów" className="view__icon" />
        <h1 className="view__title view__title--small">
          {chatMode === 'global' ? 'Modlitwa Wspólna' : `Modlitwa ${playerSession.klan_name}`}
        </h1>
        <p className="view__subtitle">Przesłanie od Bogów</p>
        <div className="chat-mode-toggle">
          <button
            className={`chat-mode-toggle__btn ${chatMode === 'klan' ? 'chat-mode-toggle__btn--active' : ''}`}
            onClick={() => setChatMode('klan')}
          >
            💬 Klan
          </button>
          <button
            className={`chat-mode-toggle__btn ${chatMode === 'global' ? 'chat-mode-toggle__btn--active' : ''}`}
            onClick={() => setChatMode('global')}
          >
            🌍 Wspólna
          </button>
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
              const isGod = msg.sender === 'god';
              const isGlobal = msg.klan_id === null;
              const clan = klans.find(k => k.id === (msg.sender_klan_id || msg.klan_id));
              const clanColor = clan?.theme_color || '#888888';
              const clanColorRgb = hexToRgb(clanColor);
              return (
                <div
                  key={msg.id}
                  className={`chat-message ${isGod ? 'chat-message--god' : isOwnMessage ? 'chat-message--own' : 'chat-message--klan'} ${isGlobal && !isOwnMessage && !isGod ? 'chat-message--global' : ''}`}
                  style={{
                    '--msg-klan-color': clanColor,
                    '--msg-klan-color-rgb': clanColorRgb,
                  } as React.CSSProperties}
                >
                  <span className="chat-message__sender" style={isGlobal ? (isOwnMessage ? { color: '#ffffff' } : { color: clanColor, filter: 'brightness(1.4)' }) : undefined}>
                    {isGod ? '👁️ Bogowie' : `👤 ${msg.sender}${clan ? ` (${clan.name})` : ''}`}
                  </span>
                  <span className="chat-message__content" style={isGlobal ? (isOwnMessage ? { color: '#ffffff' } : { color: clanColor, filter: 'brightness(1.4)' }) : undefined}>{msg.content}</span>
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
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="chat-input-bar__camera"
            disabled={uploading}
            title="Zrób zdjęcie"
          >
            📷
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Modlitwa od ${playerSession.name}...`}
            className="chat-input-bar__field"
          />
          <button type="submit" className="button-glow chat-input-bar__submit" disabled={uploading}>
            {uploading ? '...' : 'Wyślij'}
          </button>
        </form>
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
