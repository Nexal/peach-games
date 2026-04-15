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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playerSession?.klan_id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`klan_id.eq.${playerSession.klan_id},sender.eq.god`)
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
          if (newMsg.klan_id === playerSession.klan_id || newMsg.sender === 'god') {
            setMessages((prev) => [...prev, newMsg]);
          }
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
        <div className="chat-container">
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
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="chat-input">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Wiadomość od ${playerSession.name}...`}
              className="chat-input__field"
            />
            <button type="submit" className="button-glow chat-input__submit">
              Wyślij
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
