import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../App';
import { usePlayerSession } from '../App';

type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  type: 'buff' | 'curse' | 'tool';
};

const SHOP_ITEMS: ShopItem[] = [
  { id: '1', name: 'Oczyszczenie', description: 'Odkryj ukryte questy na mapie', price: 50, icon: '🔮', type: 'buff' },
  { id: '2', name: 'Tempo', description: 'Dostajesz 2x ogniki za 30 min', price: 100, icon: '⚡', type: 'buff' },
  { id: '3', name: 'Klątwa Słabości', description: '-20% punktów dla wrogiego klanu na 15 min', price: 150, icon: '💀', type: 'curse' },
  { id: '4', name: 'Radar', description: 'Pokaż pozycje graczy wrogiego klanu', price: 80, icon: '📡', type: 'tool' },
];

export function ShopView() {
  const { klanPoints } = useGame();
  const { session } = usePlayerSession();
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.klan_id) return;

    supabase
      .from('clan_items')
      .select('name')
      .eq('klan_id', session.klan_id)
      .then(({ data }) => {
        if (data) setOwnedItems(data.map(i => i.name));
      });
  }, [session?.klan_id]);

  const handleBuy = async (item: ShopItem) => {
    if (!session?.klan_id) return;
    if (klanPoints < item.price) {
      alert(`Za mało punktów! Potrzebujesz ${item.price - klanPoints} więcej.`);
      return;
    }
    if (ownedItems.includes(item.name)) {
      alert('Ten przedmiot jest już w posiadaniu klanu.');
      return;
    }

    setPurchasing(item.id);
    try {
      const newPoints = klanPoints - item.price;

      await Promise.all([
        supabase.from('clan_items').insert({
          klan_id: session.klan_id,
          name: item.name,
          type: item.type,
          description: item.description,
          target_type: 'klan',
          effect: JSON.parse('{}'),
        }),
        supabase.from('klans').update({ points: newPoints }).eq('id', session.klan_id),
      ]);

      setOwnedItems(prev => [...prev, item.name]);
      alert(`✅ Zakupiono "${item.name}"!`);
    } catch (err) {
      console.error('Purchase error:', err);
      alert('Błąd zakupu');
    } finally {
      setPurchasing(null);
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
        <div className="shop-items">
          {SHOP_ITEMS.map(item => {
            const owned = ownedItems.includes(item.id);
            const canAfford = klanPoints >= item.price;
            const isPurchasing = purchasing === item.id;

            return (
              <div key={item.id} className={`shop-item ${owned ? 'shop-item--owned' : ''}`}>
                <div className="shop-item__icon">{item.icon}</div>
                <div className="shop-item__info">
                  <h3 className="shop-item__name">{item.name}</h3>
                  <p className="shop-item__desc">{item.description}</p>
                  <span className={`shop-item__price ${!canAfford && !owned ? 'shop-item__price--expensive' : ''}`}>
                    {owned ? '✓ W posiadaniu' : `🔥 ${item.price} ogników`}
                  </span>
                </div>
                {!owned && (
                  <button
                    className={`shop-item__btn ${canAfford ? 'shop-item__btn--buy' : ''}`}
                    onClick={() => handleBuy(item)}
                    disabled={!canAfford || isPurchasing}
                  >
                    {isPurchasing ? '⏳' : canAfford ? 'Kup' : 'Brak punktów'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}