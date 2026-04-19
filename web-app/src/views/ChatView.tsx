import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { getPlayerSession } from '../lib/playerSession';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [playerSession] = useState(getPlayerSession());
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!playerSession?.klan_id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`klan_id.eq.${playerSession.klan_id},and(sender.eq.god,klan_id.is.null)`)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`chat:klan:${playerSession.klan_id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.klan_id === playerSession.klan_id || (newMsg.sender === 'god' && newMsg.klan_id === null)) {
            setMessages((prev) => [...prev, newMsg]);
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
  }, [playerSession?.klan_id]);

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

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !playerSession) return;

    const { error } = await supabase.from('messages').insert({
      content: inputText,
      sender: playerSession.name,
      klan_id: playerSession.klan_id,
      game_id: playerSession.game_id,
      tts_requested: false,
    });

    if (!error) {
      setInputText('');
    }
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
    <div className="view view--chat" style={{ '--klan-color': playerSession.klan_color } as React.CSSProperties}>
      <header className="view__header">
        <img src="/icons/glos-bogow.png" alt="Głos Bogów" className="view__icon" />
        <h1 className="view__title view__title--small">Czat Klanu {playerSession.klan_name}</h1>
        <p className="view__subtitle">Komunikacja z Mistrzami Gry</p>
      </header>

      <main className="view__content view__content--chat">
        <div className="chat-messages-scroll">
          <div className="chat-messages">
            {messages.length === 0 && (
              <p className="chat-empty">Cisza w eterze...</p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.sender === 'god' ? 'chat-message--god' : 'chat-message--klan'}`}
              >
                <span className="chat-message__sender">
                  {msg.sender === 'god' ? '👁️ Bogowie' : `👤 ${msg.sender}`}
                </span>
                <span className="chat-message__content">{msg.content}</span>
                {msg.audio_url && (
                  <button
                    className={`chat-message__play-btn ${playingAudioId === msg.id ? 'chat-message__play-btn--playing' : ''}`}
                    onClick={() => playAudio(msg)}
                    title="Odtwórz wiadomość głosową"
                  >
                    {playingAudioId === msg.id ? '⏸️' : '▶'}
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      <div className="chat-input-bar">
        <form onSubmit={sendMessage} className="chat-input-bar__form">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Wiadomość od ${playerSession.name}...`}
            className="chat-input-bar__field"
          />
          <button type="submit" className="button-glow chat-input-bar__submit">
            Wyślij
          </button>
        </form>
      </div>
    </div>
  );
}
