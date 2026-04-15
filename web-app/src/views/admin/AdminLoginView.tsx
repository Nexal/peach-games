import { useState } from 'react';
import { useAdminAuth } from '../../lib/admin/AdminAuth';

export function AdminLoginView() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAdminAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(password)) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="view view--admin-login">
      <div className="admin-login">
        <div className="admin-login__logo">⚔️</div>
        <h1 className="admin-login__title">Panel Mistrza Gry</h1>
        <p className="admin-login__subtitle">Wprowadź hasło aby kontynuować</p>

        <form onSubmit={handleSubmit} className="admin-login__form">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Hasło"
            className={`admin-login__input ${error ? 'admin-login__input--error' : ''}`}
            autoFocus
          />
          {error && (
            <p className="admin-login__error">Nieprawidłowe hasło</p>
          )}
          <button type="submit" className="button-glow admin-login__submit">
            Wejdź
          </button>
        </form>
      </div>
    </div>
  );
}
