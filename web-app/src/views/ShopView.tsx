import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../App';
import { usePlayerSession } from '../App';
import { PreGameSplash } from '../components/PreGameSplash';
import type { Database } from '../types/database.types';

type ShopItemRow = Database['public']['Tables']['shop_items']['Row'];
type ClanItemRow = Database['public']['Tables']['clan_items']['Row'];
type KlanRow = Database['public']['Tables']['klans']['Row'];

type ShopItemView = ShopItemRow & {
  purchasedByGame: number;
  purchasedByKlan: number;
  activeUntil: number | null; // ms timestamp when active buff expires
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ShopView() {
  const { klanPoints } = useGame();
  const { session, gameStatus } = usePlayerSession();
  const [catalog, setCatalog] = useState<ShopItemRow[]>([]);
  const [purchases, setPurchases] = useState<ClanItemRow[]>([]);
  const [klans, setKlans] = useState<KlanRow[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [targetKlanId, setTargetKlanId] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!session?.game_id) return;

    const fetchCatalog = () => {
      supabase
        .from('shop_items')
        .select('*')
        .eq('game_id', session.game_id)
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          if (data) setCatalog(data);
        });
    };

    const fetchPurchases = () => {
      supabase
        .from('clan_items')
        .select('*')
        .eq('game_id', session.game_id)
        .then(({ data }) => {
          if (data) setPurchases(data);
        });
    };

    fetchCatalog();
    fetchPurchases();

    supabase
      .from('klans')
      .select('*')
      .eq('game_id', session.game_id)
      .then(({ data }) => {
        if (data) setKlans(data);
      });

    const channel = supabase
      .channel('shop-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clan_items', filter: `game_id=eq.${session.game_id}` },
        () => fetchPurchases(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_items', filter: `game_id=eq.${session.game_id}` },
        () => fetchCatalog(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.game_id]);

  const now = Date.now();

  const shopItems = useMemo<ShopItemView[]>(() => {
    return catalog.map(item => {
      const purchasedByGame = purchases.filter(p => p.shop_item_id === item.id).length;
      const purchasedByKlan = purchases.filter(
        p => p.shop_item_id === item.id && p.klan_id === session?.klan_id,
      ).length;

      let activeUntil: number | null = null;
      if (session?.klan_id) {
        const active = purchases.find(
          p =>
            p.shop_item_id === item.id &&
            p.klan_id === session.klan_id &&
            p.active &&
            p.activated_at,
        );
        if (active && active.duration_seconds && active.activated_at) {
          const expiresAt = new Date(active.activated_at).getTime() + active.duration_seconds * 1000;
          if (expiresAt > now) {
            activeUntil = expiresAt;
          }
        }
      }

      return { ...item, purchasedByGame, purchasedByKlan, activeUntil };
    });
  }, [catalog, purchases, session?.klan_id, now, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuy = async (item: ShopItemView) => {
    if (!session?.klan_id || !session?.game_id) return;

    if (item.type === 'curse' && !targetKlanId[item.id]) {
      alert('Wybierz klan-cel klątwy.');
      return;
    }

    if (klanPoints < item.price) {
      alert(`Za mało ogników! Potrzebujesz ${item.price - klanPoints} więcej.`);
      return;
    }

    const perGameRem = item.max_per_game != null ? item.max_per_game - item.purchasedByGame : Infinity;
    if (perGameRem <= 0) {
      alert('Ten przedmiot jest już wyczerpany (limit globalny).');
      return;
    }

    const perKlanRem = item.max_per_klan != null ? item.max_per_klan - item.purchasedByKlan : Infinity;
    if (perKlanRem <= 0) {
      alert('Twój klan wykorzystał już limit tego przedmiotu.');
      return;
    }

    if (item.activeUntil) {
      alert('Ten przedmiot jest już aktywny. Poczekaj aż wygaśnie.');
      return;
    }

    setPurchasing(item.id);
    try {
      const itemEffect = item.effect as Record<string, unknown>;

      if (itemEffect?.type === 'cleanse_curses') {
        const { data: count, error: cleanseErr } = await (supabase as any).rpc('cleanse_curses', { p_klan_id: session.klan_id });
        if (cleanseErr) { alert(`Błąd: ${cleanseErr.message}`); return; }
        await supabase.from('klans').update({ points: klanPoints - item.price }).eq('id', session.klan_id);
        await supabase.from('clan_items').insert({
          shop_item_id: item.id,
          klan_id: session.klan_id,
          game_id: session.game_id,
          name: item.name,
          type: item.type,
          description: item.description,
          target_type: 'klan',
          effect: item.effect,
        });
        alert(`Oczyszczono ${count || 0} klątw!`);
        return;
      }

      await Promise.all([
        supabase.from('clan_items').insert({
          shop_item_id: item.id,
          klan_id: session.klan_id,
          game_id: session.game_id,
          name: item.name,
          type: item.type,
          description: item.description,
          target_type: 'klan',
          target_klan_id: item.type === 'curse' ? targetKlanId[item.id] || null : null,
          effect: item.effect,
          duration_seconds: item.duration_seconds,
          active: item.duration_seconds != null ? true : false,
          activated_at: item.duration_seconds != null ? new Date().toISOString() : null,
        }),
        supabase.from('klans').update({ points: klanPoints - item.price }).eq('id', session.klan_id),
      ]);
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Błąd zakupu');
    } finally {
      setPurchasing(null);
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'buff': return 'Buff';
      case 'curse': return 'Klątwa';
      case 'tool': return 'Przedmiot';
      default: return type;
    }
  };

  return (
    <div className="view view--shop">
      <header className="view__header">
        <h1 className="view__title view__title--small">⚗️ Sklep Żercy</h1>
        <p className="view__subtitle">Buffy i klątwy dla Twojego Klanu</p>
        <div className="shop-balance">
          <span className="shop-balance__icon">🔥</span>
          <span className="shop-balance__points">{klanPoints}</span>
          <span className="shop-balance__label">ogników</span>
        </div>
      </header>

      <main className="view__content">
        {gameStatus !== 'active' && !session?.is_test ? (
          <PreGameSplash view="shop" status={gameStatus} />
        ) : (
          <div className="shop-items">
            {shopItems.map(item => {
              const canAfford = klanPoints >= item.price;
              const isPurchasing = purchasing === item.id;
              const perGameRem = item.max_per_game != null
                ? Math.max(0, item.max_per_game - item.purchasedByGame)
                : null;
              const perKlanRem = item.max_per_klan != null
                ? Math.max(0, item.max_per_klan - item.purchasedByKlan)
                : null;
              const outOfStock =
                (perGameRem !== null && perGameRem <= 0) ||
                (perKlanRem !== null && perKlanRem <= 0);
              const canBuy = canAfford && !outOfStock && !item.activeUntil;

              const remainingSeconds = item.activeUntil
                ? Math.max(0, Math.floor((item.activeUntil - now) / 1000))
                : 0;
              const isActive = remainingSeconds > 0;
              const isOwned = !isActive && item.purchasedByKlan > 0 && !item.duration_seconds;

              return (
                <div
                  key={item.id}
                  className={`quest-card shop-card shop-card--${item.type}${isActive ? ' quest-card--active' : ''}${outOfStock ? ' shop-card--soldout' : ''}${isOwned ? ' shop-card--owned' : ''}`}
                >
                  <div className="quest-card__header">
                    <span className="quest-card__icon">{item.icon}</span>
                    <div className="quest-card__info">
                      <h3 className="quest-card__title">
                        {item.name}
                        <span className={`quest-card__status shop-card__badge shop-card__badge--${item.type}`}>
                          {typeLabel(item.type)}
                        </span>
                      </h3>
                      <p className="quest-card__desc">{item.description}</p>
                    </div>
                    {isActive && (
                      <span className="quest-card__status quest-card__status--buff">AKTYWNY</span>
                    )}
                  </div>

                  <div className="quest-card__meta">
                    <span className={!canAfford && !isActive ? 'shop-card__price--low' : ''}>
                      🔥 {item.price} ogników
                    </span>
                    {item.duration_seconds && (
                      <span>⏱ {Math.floor(item.duration_seconds / 60)} min</span>
                    )}
                    {perGameRem !== null && (
                      <span className={perGameRem <= 0 ? 'shop-card__stock--empty' : ''}>
                        🌍 {perGameRem}/{item.max_per_game}
                      </span>
                    )}
                    {perKlanRem !== null && (
                      <span className={perKlanRem <= 0 ? 'shop-card__stock--empty' : ''}>
                        🏠 {perKlanRem}/{item.max_per_klan}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="quest-card__success shop-card__countdown">
                      ✓ Aktywny • {formatTime(remainingSeconds)}
                    </div>
                  )}

                  {isOwned && (
                    <div className="quest-card__success">
                      ✓ W posiadaniu ({item.purchasedByKlan})
                    </div>
                  )}

                  {!item.activeUntil && !isOwned && (
                    <>
                      {item.type === 'curse' && (
                        <select
                          className="shop-card__target-select"
                          value={targetKlanId[item.id] || ''}
                          onChange={e => setTargetKlanId(prev => ({ ...prev, [item.id]: e.target.value }))}
                          style={{
                            width: '100%',
                            marginBottom: 8,
                            padding: '8px 12px',
                            background: '#1a1a2e',
                            color: '#fff',
                            border: '1px solid #444',
                            borderRadius: 8,
                            fontFamily: 'Metamorphous, serif',
                            fontSize: '0.8rem',
                          }}
                        >
                          <option value="">🎯 Wybierz cel klątwy...</option>
                          {klans.filter(k => k.id !== session?.klan_id).map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                      className="quest-card__action-btn"
                      onClick={() => handleBuy(item)}
                      disabled={!canBuy || isPurchasing}
                    >
                      {isPurchasing ? '⏳ Kupowanie...' : canBuy ? '🔥 Kup' : outOfStock ? 'Wyczerpane' : 'Za mało ogników'}
                    </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
