import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { usePlayerSession, useGame } from '../App';
import { supabase } from '../lib/supabase';
import type { MapMarker } from '../types/map.types';
import { DEFAULT_MAP_CONFIG, TILE_LAYERS } from '../types/map.types';
import { LocationMarker, CenterOnLocationButton } from '../components/map/MapControls';
import { AnimatedMarker, PulsingMarker } from '../components/map/AnimatedMarkers';
import { QRScannerModal } from '../components/quest/QRScannerModal';
import { MediaUploadModal } from '../components/quest/MediaUploadModal';
import { useQRScanner } from '../hooks/useQRScanner';
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

  useEffect(() => {
    if (!state?.position || !state?.session || !playerPosition) return;

    const distance = getDistanceM(
      playerPosition.lat, playerPosition.lng,
      state.position.lat, state.position.lng
    );

    if (distance <= (state.session.catch_distance_m || 20)) {
      completeChase(state.session.id, questId);
    }
  }, [state?.position, playerPosition, state?.session, completeChase, questId]);

  if (!state?.position) return null;

  return (
    <Marker position={state.position} icon={chaseIcon}>
      <Popup>
        <div className="map-popup map-popup--chase">
          <h3>🐎 Gonitwa!</h3>
          <p>Płań ku kóncu by schwytać!</p>
        </div>
      </Popup>
    </Marker>
  );
}

function MapContent() {
  const { session } = usePlayerSession();
  useGame();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [chaseQuestIds, setChaseQuestIds] = useState<string[]>([]);
  const [currentTaskIds, setCurrentTaskIds] = useState<string[]>([]);
  const [scanningMarker, setScanningMarker] = useState<MapMarker | null>(null);
  const [uploadingMarker, setUploadingMarker] = useState<MapMarker | null>(null);
  const [photoActivations, setPhotoActivations] = useState<Record<string, string>>({});
  const [taskProgress, setTaskProgress] = useState<Record<string, { scanned: number; total: number }>>({});
  const [taskRefresh, setTaskRefresh] = useState(0);
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
        .is('completed_at', null);

      if (!activations || activations.length === 0) {
        setCurrentTaskIds([]);
        setTaskProgress({});
        return;
      }

      const questIds = activations.map((a: any) => a.quest_id);
      const activationIds = activations.map((a: any) => a.id);

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

    fetchCurrentTasks();

    const channel = supabase
      .channel('quest_activations_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quest_activations', filter: `game_id=eq.${session.game_id}` }, fetchCurrentTasks)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, fetchCurrentTasks)
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
      <TileLayer url={TILE_LAYERS.dark.url} attribution={TILE_LAYERS.dark.attribution} />
      <LocationMarker watchPosition={true} />
      <AnimatedMarker center={DEFAULT_MAP_CONFIG.center} orbitRadius={100} speed={0.5} />
      <PulsingMarker position={DEFAULT_MAP_CONFIG.center} />

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

      {markers.map((marker) => {
        let icon = questIcon;
        if (marker.type === 'clan_base') icon = clanIcon;
        if (marker.type === 'chase') icon = chaseIcon;
        if (marker.type === 'qr') icon = qrIcon;
        if (marker.type === 'photo') icon = photoIcon;

        if (marker.type === 'qr' || marker.type === 'photo') {
          const isActive = marker.task_id ? currentTaskIds.includes(marker.task_id) : false;
          if (!isActive) return null;
        }

        if (marker.type === 'quest' && marker.clan_id && marker.clan_id !== session?.klan_id) return null;
        if (marker.type === 'chase' && marker.clan_id && marker.clan_id !== session?.klan_id) return null;

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

      <CenterOnLocationButton />

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
    </>
  );
}

export function MapView() {
  return (
    <div className="view view--map">
      <header className="view__header">
        <h1 className="view__title view__title--small">🗺️ Mapa</h1>
        <p className="view__subtitle">Twoje questy i lokalizacje</p>
      </header>

      <main className="view__content view__content--map">
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
            <MapContent />
          </MapContainer>
        </div>
      </main>
    </div>
  );
}