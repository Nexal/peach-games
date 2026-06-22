import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { usePlayerSession, useGame } from '../App';
import type { ChaseInstance } from '../hooks/useGameProvider';
import { supabase } from '../lib/supabase';
import type { MapMarker } from '../types/map.types';
import { DEFAULT_MAP_CONFIG, TILE_LAYERS } from '../types/map.types';
import { LocationMarker, CenterOnLocationButton } from '../components/map/MapControls';
import { QRScannerModal } from '../components/quest/QRScannerModal';
import { MediaUploadModal } from '../components/quest/MediaUploadModal';
import { PreGameSplash } from '../components/PreGameSplash';
import { useQRScanner } from '../hooks/useQRScanner';
import { useClanMemberPositions } from '../hooks/usePlayerPosition';
import L from 'leaflet';
import {
  baseIcon,
  questIcon,
  clanIcon,
  chaseIcon,
  qrIcon,
  photoIcon,
} from '../components/map/markerIcons';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

function getDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusM = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusM * c;
}

function ChaseMarker({ questId }: { questId: string }) {
  const { activeQuests, completeChase, playerPosition } = useGame();
  const state = activeQuests[questId];

  if (!state?.instances) return null;

  return (
    <>
      {state.instances.filter(i => i.position).map(inst => (
        <ChaseInstanceMarker
          key={inst.session.id}
          instance={inst}
          playerPosition={playerPosition}
          onCatch={() => completeChase(inst.session.id, questId)}
        />
      ))}
    </>
  );
}

function ChaseInstanceMarker({
  instance,
  playerPosition,
  onCatch,
}: {
  instance: ChaseInstance;
  playerPosition: { lat: number; lng: number } | null;
  onCatch: () => void;
}) {
  useEffect(() => {
    if (!instance?.position || !playerPosition) return;

    const distance = getDistanceM(
      playerPosition.lat, playerPosition.lng,
      instance.position.lat, instance.position.lng
    );

    if (distance <= (instance.session.catch_distance_m || 20)) {
      onCatch();
    }
  }, [instance?.position, playerPosition, instance?.session, onCatch]);

  const icon = instance.iconUrl
    ? new L.Icon({ iconUrl: instance.iconUrl, iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22] })
    : chaseIcon;

  return (
    <Marker position={instance.position!} icon={icon}>
      <Popup>
        <div className="map-popup map-popup--chase">
          <h3>🐎 Gonitwa!</h3>
          <p>Płań ku kóncu by schwytać!</p>
        </div>
      </Popup>
    </Marker>
  );
}

function MapContent({ focusPoint, onFocusHandled }: { focusPoint?: [number, number] | null; onFocusHandled?: () => void }) {
  const { session } = usePlayerSession();
  useGame();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [chaseQuestIds, setChaseQuestIds] = useState<string[]>([]);
  const [currentTaskIds, setCurrentTaskIds] = useState<string[]>([]);
  const [showAllMarkersQuestIds, setShowAllMarkersQuestIds] = useState<Set<string>>(new Set());
  const [scanningMarker, setScanningMarker] = useState<MapMarker | null>(null);
  const [uploadingMarker, setUploadingMarker] = useState<MapMarker | null>(null);
  const [photoActivations, setPhotoActivations] = useState<Record<string, string>>({});
  const [taskProgress, setTaskProgress] = useState<Record<string, { scanned: number; total: number }>>({});
  const [taskRefresh, setTaskRefresh] = useState(0);
  const [showClanMembers, setShowClanMembers] = useState(true);
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('map_theme') as 'dark' | 'light') || 'dark');
  const [enlargedAvatar, setEnlargedAvatar] = useState<string | null>(null);
  const map = useMap();

  const fetchTasksRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (focusPoint && focusPoint[0] && focusPoint[1]) {
      map.flyTo(focusPoint, 17, { animate: true, duration: 0.8 });
      onFocusHandled?.();
    }
  }, [focusPoint, map, onFocusHandled]);

  const clanMembers = useClanMemberPositions(
    session?.game_id,
    session?.klan_id,
    session?.player_id || session?.id
  );
  const { scan, feedback } = useQRScanner(useCallback(() => {
    if (!session?.game_id) return;
    (supabase as any)
      .from('map_markers')
      .select('*')
      .eq('game_id', session.game_id)
      .eq('is_active', true)
      .then(({ data }: { data: any }) => {
        if (data) {
          setMarkers(data.map((m: any) => ({
            id: m.id,
            position: [m.lat ?? 0, m.lng ?? 0] as [number, number],
            title: m.title,
            description: m.description ?? undefined,
            type: m.type as 'quest' | 'base' | 'clan_base' | 'chase' | 'qr',
            clan_id: m.klan_id ?? undefined,
            icon_url: m.icon_url ?? undefined,
            is_active: m.is_active ?? true,
            quest_id: m.quest_id ?? undefined,
            task_id: m.task_id ?? undefined,
            reward_points: m.reward_points ?? undefined,
          })));
          setTaskRefresh(t => t + 1);
        }
      });
  }, [session?.game_id]));

  useEffect(() => {
    if (!session?.game_id) return;

    const fetchMarkers = async () => {
      const { data } = await (supabase as any)
        .from('map_markers')
        .select('*')
        .eq('game_id', session.game_id)
        .eq('is_active', true);

      if (data) {
        console.log('[MapView] map_markers fetched:', data.length, 'markers');
        setMarkers(data.map((m: any) => ({
          id: m.id,
          position: [m.lat ?? 0, m.lng ?? 0] as [number, number],
          title: m.title,
          description: m.description ?? undefined,
          type: m.type as 'quest' | 'base' | 'clan_base' | 'chase' | 'qr' | 'photo',
          clan_id: m.klan_id ?? undefined,
          icon_url: m.icon_url ?? undefined,
          is_active: m.is_active ?? true,
          quest_id: m.quest_id ?? undefined,
          task_id: m.task_id ?? undefined,
          reward_points: m.reward_points ?? undefined,
        })));
      }
    };

    fetchMarkers();

    const channel = supabase
      .channel('map_markers_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'map_markers',
        filter: `game_id=eq.${session.game_id}`,
      }, fetchMarkers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.game_id]);

  useEffect(() => {
    if (!session?.game_id || !session?.klan_id) return;

    const fetchCurrentTasks = async () => {
      const { data: activations } = await (supabase as any)
        .from('quest_activations')
        .select('id, quest_id')
        .eq('game_id', session.game_id)
        .eq('klan_id', session.klan_id)
        .is('completed_at', null)
        .is('deactivated_at', null);

      if (!activations || activations.length === 0) {
        setCurrentTaskIds([]);
        setTaskProgress({});
        setShowAllMarkersQuestIds(new Set());
        setPhotoActivations({});
        return;
      }

      const questIds = activations.map((a: any) => a.quest_id);
      const activationIds = activations.map((a: any) => a.id);

      // Fetch quests with show_all_markers flag
      const { data: questsWithFlag } = await (supabase as any)
        .from('quests')
        .select('id, show_all_markers')
        .in('id', questIds)
        .eq('show_all_markers', true);
      const showAllIds = new Set<string>((questsWithFlag || []).map((q: any) => q.id));
      setShowAllMarkersQuestIds(showAllIds);

      const [
        { data: tasks },
        { data: taskCompletions },
        { data: qrMarkers },
      ] = await Promise.all([
        (supabase as any).from('tasks').select('*').in('quest_id', questIds).order('sort_order'),
        (supabase as any).from('task_completions').select('*').in('quest_activation_id', activationIds),
        (supabase as any).from('map_markers').select('id, task_id, type').in('quest_id', questIds).in('type', ['qr', 'photo']).eq('is_active', true),
      ]);

      if (!tasks) { setCurrentTaskIds([]); setTaskProgress({}); return; }

      const completions = (taskCompletions || []) as any[];

      const progress: Record<string, { scanned: number; total: number }> = {};
      for (const task of tasks as any[]) {
        const taskCompletion = completions.find(
          (c: any) => c.task_id === task.id && !c.completed_at,
        );
        const scanned = taskCompletion?.metadata?.scanned_marker_ids?.length || 0;
        const total = (qrMarkers || []).filter((m: any) => m.task_id === task.id).length;
        if (total > 0) {
          progress[task.id] = { scanned, total };
        }
      }

      const questTasks: Record<any, any[]> = {};
      for (const t of tasks) {
        if (!questTasks[t.quest_id]) questTasks[t.quest_id] = [];
        questTasks[t.quest_id].push(t);
      }

      const completedTaskIds = new Set(completions.filter((c: any) => c.completed_at).map((c: any) => c.task_id));

      const taskIds: string[] = [];
      for (const [, taskList] of Object.entries(questTasks)) {
        for (const task of taskList as any[]) {
          if (!completedTaskIds.has(task.id)) { taskIds.push(task.id); break; }
        }
      }

      setCurrentTaskIds(taskIds);
      setTaskProgress(progress);

      // Map task_id -> quest_activation_id for photo tasks
      const activationMap: Record<string, string> = {};
      for (const task of tasks as any[]) {
        const activation = activations.find(
          (a: any) => a.quest_id === task.quest_id && !a.completed_at
        );
        if (activation && task.type === 'photo') {
          activationMap[task.id] = activation.id;
        }
      }
      setPhotoActivations(activationMap);
    };

    fetchTasksRef.current = fetchCurrentTasks;
    fetchCurrentTasks();

    const channel = supabase
      .channel('quest_activations_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_activations' }, (payload: any) => {
        const record = payload.new || payload.old;
        if (record?.game_id === session.game_id && record?.klan_id === session.klan_id) {
          console.log('[MapView] quest_activations event, type:', payload.eventType);
          setTimeout(() => fetchTasksRef.current(), 250);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, () => fetchTasksRef.current())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.game_id, session?.klan_id, taskRefresh]);

  useEffect(() => {
    if (!session?.game_id) return;

    (supabase as any)
      .from('quests')
      .select('id')
      .eq('game_id', session.game_id)
      .eq('type', 'chase')
      .then(({ data }: { data: any }) => {
        if (data) setChaseQuestIds(data.map((q: any) => q.id));
      });
  }, [session?.game_id]);

  return (
    <>
      <TileLayer key={mapTheme} url={TILE_LAYERS[mapTheme].url} attribution={TILE_LAYERS[mapTheme].attribution} />
      <LocationMarker watchPosition={true} />

      <Marker position={DEFAULT_MAP_CONFIG.center} icon={baseIcon}>
        <Popup>
          <div className="map-popup map-popup--base">
            <h3>🔥 Ognisko / Baza</h3>
            <p>Centrum wydarzenia - Noc Kupały</p>
          </div>
        </Popup>
      </Marker>

      {chaseQuestIds.map(id => (
        <ChaseMarker key={id} questId={id} />
      ))}

      {showClanMembers && clanMembers.map((member) => (
        <Marker
          key={member.player_id}
          position={[member.lat, member.lng]}
          icon={L.divIcon({
            className: 'clan-member-marker',
            html: member.avatar_url
              ? `<div style="
                  width: 24px;
                  height: 24px;
                  border: 2px solid #fff;
                  border-radius: 50%;
                  overflow: hidden;
                  box-shadow: 0 0 4px rgba(0,0,0,0.3);
                ">
                  <img src="${member.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />
                </div>`
              : `<div style="
                  width: 20px;
                  height: 20px;
                  background: ${session?.klan_color || '#9B59B6'};
                  border: 2px solid #fff;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 10px;
                  font-weight: bold;
                  color: #fff;
                ">${member.player_name.charAt(0).toUpperCase()}</div>`,
            iconSize: member.avatar_url ? [24, 24] : [20, 20],
            iconAnchor: member.avatar_url ? [12, 12] : [10, 10],
          })}
        >
          <Popup>
            <div className="map-popup map-popup--clan-member">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {member.avatar_url && (
                  <img
                    src={member.avatar_url}
                    alt={member.player_name}
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${session?.klan_color || '#9B59B6'}`, cursor: 'pointer' }}
                    onClick={() => setEnlargedAvatar(member.avatar_url)}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <h3 style={{ margin: 0 }}>{member.player_name}</h3>
              </div>
              <p style={{ margin: '0 0 2px' }}><strong>Online:</strong> {new Date(member.updated_at).toLocaleTimeString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {markers.map((marker) => {
        let icon = questIcon;
        if (marker.icon_url) {
          icon = new L.Icon({ iconUrl: marker.icon_url, iconSize: [48, 48], iconAnchor: [24, 24], popupAnchor: [0, -24] });
        } else if (marker.type === 'clan_base') icon = clanIcon;
        else if (marker.type === 'chase') icon = chaseIcon;
        else if (marker.type === 'qr') icon = qrIcon;
        else if (marker.type === 'photo') icon = photoIcon;

        if (marker.type === 'chase') return null;
        if (marker.type === 'qr' || marker.type === 'photo') {
          const isActive = marker.task_id
            ? currentTaskIds.includes(marker.task_id) || (marker.quest_id ? showAllMarkersQuestIds.has(marker.quest_id) : false)
            : false;
          if (!isActive) return null;
        }

        if (marker.type === 'quest' && marker.clan_id && marker.clan_id !== session?.klan_id) return null;

        const progress = marker.task_id ? taskProgress[marker.task_id] : undefined;

        return (
          <Marker key={marker.id} position={marker.position} icon={icon}>
            <Popup>
              <div className={`map-popup map-popup--${marker.type}`}>
                <h3>{marker.title}</h3>
                {marker.description && <p>{marker.description}</p>}
                {marker.type === 'quest' && marker.reward_points && (
                  <span className="map-popup__reward">+{marker.reward_points} 🔥</span>
                )}
                {marker.type === 'qr' && marker.quest_id && (
                  <div className="map-popup__qr-scan">
                    {progress && (
                      <span className="map-popup__qr-progress">
                        {progress.scanned}/{progress.total} kodów
                      </span>
                    )}
                    <button
                      className="map-popup__scan-btn"
                      style={{ '--clan-color': session?.klan_color || '#9B59B6' } as React.CSSProperties}
                      onClick={() => setScanningMarker(marker)}
                    >
                      📱 Skanuj QR
                    </button>
                  </div>
                )}
                {marker.type === 'photo' && marker.quest_id && (
                  <div className="map-popup__qr-scan">
                    <button
                      className="map-popup__scan-btn"
                      style={{ '--clan-color': session?.klan_color || '#9B59B6' } as React.CSSProperties}
                      onClick={async () => {
                        const { data: existing } = await (supabase as any)
                          .from('submissions')
                          .select('id')
                          .eq('task_id', marker.task_id!)
                          .eq('klan_id', session!.klan_id!)
                          .eq('status', 'pending')
                          .maybeSingle();
                        if (existing) {
                          alert('⏳ To zadanie ma już oczekujące zgłoszenie. Poczekaj na weryfikację przez Boga.');
                          return;
                        }
                        setUploadingMarker(marker);
                      }}
                    >
                      📷 Wyślij dowód
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      <CenterOnLocationButton>
        <button
          onClick={() => setMapTheme(prev => { const next = prev === 'dark' ? 'light' : 'dark'; localStorage.setItem('map_theme', next); return next; })}
          className={`map-control-button map-theme-toggle ${mapTheme === 'light' ? 'map-theme-toggle--active' : ''}`}
          title={mapTheme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
          style={{ width: 44, height: 44 }}
        >
          {mapTheme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          onClick={() => setShowClanMembers(prev => !prev)}
          className={`map-control-button map-clan-toggle ${showClanMembers ? 'map-clan-toggle--active' : ''}`}
          title={showClanMembers ? 'Ukryj członków klanu' : 'Pokaż członków klanu'}
          style={{ width: 44, height: 44 }}
        >
          {showClanMembers ? '👥' : '‍️'}
        </button>
      </CenterOnLocationButton>

      {scanningMarker && (
        <QRScannerModal
          onScan={(code) => {
            const questId = scanningMarker.quest_id!;
            scan(questId, code);
            setScanningMarker(null);
          }}
          onClose={() => setScanningMarker(null)}
        />
      )}

      {uploadingMarker && session?.klan_id && (
        <MediaUploadModal
          taskId={uploadingMarker.task_id!}
          questActivationId={photoActivations[uploadingMarker.task_id!] || ''}
          klanId={session.klan_id}
          gameId={session.game_id}
          onClose={() => setUploadingMarker(null)}
          onSubmit={() => setUploadingMarker(null)}
        />
      )}

      {feedback && (
        <div className={`map-qr-feedback map-qr-feedback--${feedback.type}`}>
          {feedback.text}
        </div>
      )}

      {enlargedAvatar && (
        <div className="chat-image-modal" onClick={() => setEnlargedAvatar(null)}>
          <div className="chat-image-modal__content" onClick={(e) => e.stopPropagation()}>
            <button className="chat-image-modal__close" onClick={() => setEnlargedAvatar(null)}>✕</button>
            <img src={enlargedAvatar} alt="Powiększenie avatara" className="chat-image-modal__img" />
          </div>
        </div>
      )}
    </>
  );
}

export function MapView({ focusPoint, onFocusHandled }: { focusPoint?: [number, number] | null; onFocusHandled?: () => void }) {
  const { session, gameStatus } = usePlayerSession();

  return (
    <div className="view view--map">
      <header className="view__header">
        <h1 className="view__title view__title--small">Mapa</h1>
        <p className="view__subtitle">Twoje questy i lokalizacje</p>
      </header>

      <main className="view__content view__content--map">
        {gameStatus === 'active' || session?.is_test ? (
          <div className="map-container">
            <MapContainer
              center={DEFAULT_MAP_CONFIG.center}
              zoom={DEFAULT_MAP_CONFIG.zoom}
              maxZoom={DEFAULT_MAP_CONFIG.maxZoom}
              minZoom={DEFAULT_MAP_CONFIG.minZoom}
              className="leaflet-map"
              zoomControl={true}
              attributionControl={false}
            >
              <MapContent focusPoint={focusPoint} onFocusHandled={onFocusHandled} />
            </MapContainer>
          </div>
        ) : (
          <PreGameSplash view="map" status={gameStatus} />
        )}
      </main>
    </div>
  );
}