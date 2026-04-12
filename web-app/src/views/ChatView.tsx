import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const { error } = await supabase.from('messages').insert({
      content: inputText,
      sender: 'god',
      tts_requested: false,
    });

    if (!error) {
      setInputText('');
    }
  };

  return (
    <div className="view view--chat">
      <header className="view__header">
        <img src="/icons/glos-bogow.png" alt="Głos Bogów" className="view__icon" />
        <h1 className="view__title view__title--small">Głos Bogów</h1>
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
                  {msg.sender === 'god' ? '👁️ Bogowie' : '👤 Klan'}
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
              placeholder="Wpisz słowa bogów..."
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
