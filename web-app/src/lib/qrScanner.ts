import { supabase } from './supabase';

export interface QRScanResult {
  success: boolean;
  error?: string;
  message?: string;
  taskCompleted?: boolean;
  questCompleted?: boolean;
  scannedCount?: number;
  totalCount?: number;
  taskReward?: number;
  questTotalReward?: number;
}

export async function scanQRCode(
  questId: string,
  scannedCode: string,
  gameId: string,
  klanId: string,
  playerId: string,
): Promise<QRScanResult> {
  console.log('[QR] === scanQRCode started ===');
  console.log('[QR] input:', { questId, scannedCode, gameId, klanId, playerId });

  const activation = await (supabase as any)
    .from('quest_activations')
    .select('id')
    .eq('quest_id', questId)
    .eq('klan_id', klanId)
    .is('completed_at', null)
    .limit(1);

  console.log('[QR] activation query result:', { error: activation.error, data: activation.data });

  if (!activation.data || activation.data.length === 0) {
    console.log('[QR] FAIL: no active activation');
    return { success: false, error: 'Brak aktywnej aktywacji tego questa.' };
  }

  const activationId = activation.data[0].id;
  console.log('[QR] activationId:', activationId);

  const [{ data: tasks }, { data: taskCompletions }, { data: allMarkers }, { data: matchingMarkers }] = await Promise.all([
    (supabase as any).from('tasks').select('id, title, reward_points').eq('quest_id', questId).order('sort_order'),
    (supabase as any).from('task_completions').select('task_id, completed_at, metadata').eq('quest_activation_id', activationId),
    (supabase as any).from('map_markers').select('id, task_id').eq('quest_id', questId).eq('type', 'qr').not('task_id', 'is', null),
    (supabase as any).from('map_markers').select('id, task_id, qr_secret').eq('quest_id', questId).eq('type', 'qr').eq('qr_secret', scannedCode).not('task_id', 'is', null),
  ]);

  console.log('[QR] allMarkers:', allMarkers);
  console.log('[QR] matchingMarkers (by qr_secret):', matchingMarkers);
  console.log('[QR] tasks:', tasks);
  console.log('[QR] taskCompletions:', taskCompletions);

  if (!matchingMarkers || matchingMarkers.length === 0) {
    console.log('[QR] FAIL: no marker matches scanned code %o', scannedCode);
    return { success: false, error: 'Nieprawidłowy kod QR.' };
  }

  if (!tasks || tasks.length === 0) {
    console.log('[QR] FAIL: no tasks');
    return { success: false, error: 'Brak zadań dla questa.' };
  }

  const completedTaskIds = new Set(
    (taskCompletions || []).filter((tc: any) => tc.completed_at).map((tc: any) => tc.task_id),
  );

  console.log('[QR] completedTaskIds:', [...completedTaskIds]);

  let currentTask: any = null;
  // Find the task that this QR marker belongs to (by task_id on the marker)
  const matchedByTask = (matchingMarkers as any[]).find((m: any) =>
    tasks.some((t: any) => t.id === m.task_id),
  );
  if (matchedByTask) {
    currentTask = tasks.find((t: any) => t.id === matchedByTask.task_id);
  }

  if (!currentTask) {
    console.log('[QR] FAIL: no task matches the scanned marker');
    return { success: false, error: 'Nieprawidłowy kod QR.' };
  }

  if (completedTaskIds.has(currentTask.id)) {
    console.log('[QR] FAIL: task already completed');
    return { success: false, error: 'Ten kod został już zeskanowany.' };
  }

  console.log('[QR] currentTask:', currentTask);

  const currentTaskCompletion = (taskCompletions || []).find(
    (tc: any) => tc.task_id === currentTask.id,
  );
  const scannedMarkerIds: string[] = currentTaskCompletion?.metadata?.scanned_marker_ids || [];

  console.log('[QR] scannedMarkerIds:', scannedMarkerIds);
  console.log('[QR] selecting unscanned marker from', matchingMarkers.length, 'matching markers');

  const matchedMarker = (matchingMarkers as any[]).find(
    (m: any) => m.task_id === currentTask.id && !scannedMarkerIds.includes(m.id),
  );

  if (!matchedMarker) {
    const anyForCurrentTask = (matchingMarkers as any[]).some((m: any) => m.task_id === currentTask.id);
    if (anyForCurrentTask) {
      console.log('[QR] FAIL: all matching markers already scanned');
      return { success: false, error: 'Ten kod został już zeskanowany.' };
    }
    console.log('[QR] FAIL: no matching marker belongs to current task');
    return { success: false, error: 'Ten kod nie należy do aktualnego zadania.' };
  }

  console.log('[QR] matched marker:', matchedMarker);

  const totalMarkers = (allMarkers || []).filter((m: any) => m.task_id === currentTask.id).length;

  console.log('[QR] totalMarkers (for current task):', totalMarkers);

  const updatedScannedIds = [...scannedMarkerIds, matchedMarker.id];
  const allScanned = updatedScannedIds.length >= totalMarkers;

  console.log('[QR] allScanned:', allScanned, 'updatedScannedIds:', updatedScannedIds);

  const { error: updateError } = await (supabase as any)
    .from('task_completions')
    .upsert(
      {
        quest_activation_id: activationId,
        task_id: currentTask.id,
        completed_at: allScanned ? new Date().toISOString() : null,
        completed_by_player_id: playerId,
        metadata: { scanned_marker_ids: updatedScannedIds },
      },
      { onConflict: 'quest_activation_id, task_id' },
    );

  if (updateError) {
    return { success: false, error: 'Błąd zapisu.' };
  }

  if (allScanned) {
    const taskPoints = currentTask.reward_points || 0;
    let awardedPoints = taskPoints;

    if (taskPoints > 0) {
      const { data: result } = await (supabase as any).rpc('award_clan_points', {
        p_klan_id: klanId,
        p_base_points: taskPoints,
      });
      if (result) awardedPoints = result;
    }

    const taskTitle = currentTask.title || 'Nieznane zadanie';
    const { data: questData } = await (supabase as any)
      .from('quests')
      .select('title')
      .eq('id', questId)
      .single();
    const { data: klanInfo } = await (supabase as any)
      .from('klans')
      .select('name')
      .eq('id', klanId)
      .single();
    const questTitle = questData?.title || 'Nieznany quest';
    const klanName = klanInfo?.name || 'Klan';

    const allTasksDone = tasks.every((t: any) => completedTaskIds.has(t.id) || t.id === currentTask.id);

    if (allTasksDone) {
      // Suma: bazowe punkty już ukończonych tasków + obecny (z buffem)
      const previouslyCompletedBase = tasks
        .filter((t: any) => t !== currentTask)
        .reduce((sum: number, t: any) => sum + (t.reward_points || 0), 0);
      const questAwardedTotal = previouslyCompletedBase + awardedPoints;

      await (supabase as any).from('quest_completions').insert({
        quest_id: questId,
        klan_id: klanId,
        game_id: gameId,
        completed_by_player_id: playerId,
        points_awarded: questAwardedTotal,
      });

      await (supabase as any)
        .from('quest_activations')
        .update({ completed_at: new Date().toISOString(), completed_by_player_id: playerId })
        .eq('id', activationId);

      await (supabase as any).from('messages').insert({
        content: `${klanName} ukończył zadanie „${taskTitle}" kończąc quest „${questTitle}" (+${questAwardedTotal} 🔥)!`,
        sender: 'god',
        game_id: gameId,
        klan_id: null,
        sender_klan_id: null,
        tts_requested: false,
      });

      return {
        success: true,
        message: `Quest ukończony! +${questAwardedTotal} 🔥`,
        questCompleted: true,
        taskCompleted: true,
        scannedCount: updatedScannedIds.length,
        totalCount: totalMarkers,
        questTotalReward: questAwardedTotal,
      };
    } else {
      await (supabase as any).from('messages').insert({
        content: `${klanName} ukończył zadanie „${taskTitle}" w queście „${questTitle}" (+${awardedPoints} 🔥)!`,
        sender: 'god',
        game_id: gameId,
        klan_id: null,
        sender_klan_id: null,
        tts_requested: false,
      });

      return {
        success: true,
        message: `Zadanie ukończone! +${taskPoints} 🔥`,
        taskCompleted: true,
        scannedCount: updatedScannedIds.length,
        totalCount: totalMarkers,
        taskReward: taskPoints,
      };
    }
  } else {
    return {
      success: true,
      message: `Zeskanowano ${updatedScannedIds.length}/${totalMarkers} kodów.`,
      scannedCount: updatedScannedIds.length,
      totalCount: totalMarkers,
    };
  }
}
