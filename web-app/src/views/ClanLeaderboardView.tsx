import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PlayerSession } from '../lib/playerSession';
import type { Database } from '../types/database.types';
import './ClanLeaderboardView.css';

type KlanRow = Database['public']['Tables']['klans']['Row'];

const CLAN_ICONS: Record<string, { emoji: string; image?: string }> = {
  'klan peruna': { emoji: '⚡', image: '/icons/perun_symbol-Photoroom.png' },
  'klan welesa': { emoji: '🐺', image: '/icons/weles_icon_symbol-Photoroom.png' },
  'klan mokoszy': { emoji: '🌿', image: '/icons/mokosz_symbol-Photoroom.png' },
};

const GOD_AVATAR_IMAGES: Record<string, string> = {
  'Perun': '/icons/perun_avatar.png',
  'Weles': '/icons/weles_avatar.jpeg',
  'Mokosz': '/icons/mokosz_avatar.jpeg',
};

const GOD_AVATARS: Record<string, { name: string; image: string }> = {
  'klan peruna': { name: 'Perun', image: GOD_AVATAR_IMAGES['Perun'] },
  'klan welesa': { name: 'Weles', image: GOD_AVATAR_IMAGES['Weles'] },
  'klan mokoszy': { name: 'Mokosz', image: GOD_AVATAR_IMAGES['Mokosz'] },
};

function getClanKey(klanName: string): string {
  return klanName.toLowerCase();
}

interface PlayerData {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ClanWithPlayers {
  id: string;
  name: string;
  theme_color: string;
  points: number;
  players: PlayerData[];
}

interface Props {
  session: PlayerSession;
  onClose: () => void;
}

export function ClanLeaderboardView({ session, onClose }: Props) {
  const [clans, setClans] = useState<ClanWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [enlargedAvatar, setEnlargedAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [klansRes, playersRes] = await Promise.all([
        supabase.from('klans').select('*').eq('game_id', session.game_id),
        supabase
          .from('players')
          .select('id, name, avatar_url, klan_id')
          .eq('game_id', session.game_id)
          .not('joined_at', 'is', null)
          .or('is_test.eq.false,is_test.is.null'),
      ]);

      const klans = klansRes.data || [];
      const players = playersRes.data || [];

      const grouped: ClanWithPlayers[] = klans.map((k: KlanRow) => ({
        id: k.id,
        name: k.name,
        theme_color: k.theme_color,
        points: k.points || 0,
        players: players.filter((p) => p.klan_id === k.id),
      }));

      grouped.sort((a, b) => {
        if (a.id === session.klan_id) return -1;
        if (b.id === session.klan_id) return 1;
        return b.points - a.points;
      });

      setClans(grouped);
      setLoading(false);
    };

    fetchAll();
  }, [session.game_id, session.klan_id]);

  if (loading) {
    return (
      <div className="clan-leaderboard-overlay" onClick={onClose}>
        <div className="clan-leaderboard" onClick={(e) => e.stopPropagation()}>
          <button className="clan-leaderboard__close" onClick={onClose}>←</button>
          <div className="clan-leaderboard__loading">
            <p>Ładowanie...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="clan-leaderboard-overlay" onClick={onClose}>
      <div className="clan-leaderboard" onClick={(e) => e.stopPropagation()}>
        <button className="clan-leaderboard__close" onClick={onClose}>
          ←
        </button>

        <div className="clan-leaderboard__list">
          {clans.map((clan, idx) => {
            const clanKey = getClanKey(clan.name);
            const clanIcon = CLAN_ICONS[clanKey] || { emoji: '⚔️' };
            const god = GOD_AVATARS[clanKey] || { name: 'Bóg', image: '' };
            const isOwn = clan.id === session.klan_id;

            return (
              <section key={clan.id} className={`clan-leaderboard__clan-section ${isOwn ? 'clan-leaderboard__clan-section--own' : ''}`}>
                {idx > 0 && <div className="clan-leaderboard__section-divider" />}

                <header className="clan-leaderboard__clan-header">
                  <div className="clan-leaderboard__clan-header-left">
                    <div className="clan-leaderboard__god-avatar" title={god.name}>
                      {god.image ? (
                        <img src={god.image} alt={god.name} style={{ cursor: 'pointer' }} onClick={() => setEnlargedAvatar(god.image)} />
                      ) : (
                        <span>✨</span>
                      )}
                    </div>
                    <div
                      className="clan-leaderboard__clan-icon"
                      style={{ '--clan-color': clan.theme_color } as React.CSSProperties}
                    >
                      {clanIcon.image ? (
                        <img src={clanIcon.image} alt={clan.name} />
                      ) : (
                        <span>{clanIcon.emoji}</span>
                      )}
                    </div>
                    <div className="clan-leaderboard__clan-info">
                      <span className="clan-leaderboard__clan-name" style={{ color: clan.theme_color }}>
                        {clan.name}
                      </span>
                      {isOwn && (
                        <span className="clan-leaderboard__own-badge">Twój klan</span>
                      )}
                    </div>
                  </div>
                  <div className="clan-leaderboard__points">
                    <span className="clan-leaderboard__points-icon">🔥</span>
                    <span className="clan-leaderboard__points-value">{clan.points}</span>
                  </div>
                </header>

                {clan.players.length === 0 ? (
                  <p className="clan-leaderboard__empty">Brak członków</p>
                ) : (
                  <div className="clan-leaderboard__players">
                    {clan.players.map((player) => (
                      <div key={player.id} className="clan-leaderboard__player">
                        <div
                          className="clan-leaderboard__player-avatar"
                          onClick={() => player.avatar_url && setEnlargedAvatar(player.avatar_url)}
                        >
                          {player.avatar_url ? (
                            <img src={player.avatar_url} alt={player.name} />
                          ) : (
                            <div className="clan-leaderboard__player-avatar-placeholder">
                              {clanIcon.image ? (
                                <img src={clanIcon.image} alt="" />
                              ) : (
                                <span>{clanIcon.emoji}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="clan-leaderboard__player-name">{player.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {enlargedAvatar && (
        <div className="clan-leaderboard__avatar-modal" onClick={(e) => { e.stopPropagation(); setEnlargedAvatar(null); }}>
          <img src={enlargedAvatar} alt="Powiększony awatar" />
        </div>
      )}
    </div>
  );
}
