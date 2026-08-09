import {
  getLogs,
  replaceLogs,
  getProfile,
  saveProfile,
  getSpots,
  getAchievements,
  saveAchievements,
  getSyncQueue,
  replaceSyncQueue,
  type SyncOp,
} from './local-store';
import {
  fetchRemoteLogs,
  upsertRemoteLog,
  deleteRemoteLog,
  fetchRemoteProfile,
  upsertRemoteProfile,
  upsertRemoteSpot,
  fetchRemoteAchievements,
  upsertRemoteAchievement,
} from './remote-store';
import { uploadPhoto, PhotoUnreadableError } from '../lib/images';
import { useSessionStore } from '../state/session';

/**
 * Local-first sync (brief §4: "Local plus cloud data from the start").
 * Writes land in AsyncStorage immediately and are queued; this flushes the
 * queue and pull-merges the user's cloud data whenever a session exists.
 */
export async function syncWithCloud(): Promise<void> {
  const { isAuthenticated, userId } = useSessionStore.getState();
  if (!isAuthenticated || !userId) return;

  try {
    await flushQueue(userId);
    await pullMerge(userId);
  } catch {
    // Offline or backend not provisioned yet — queue is preserved for later.
  }
}

async function flushQueue(userId: string): Promise<void> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return;
  const remaining: SyncOp[] = [];

  for (const op of queue) {
    try {
      await applyOp(op, userId);
    } catch {
      remaining.push(op);
    }
  }
  await replaceSyncQueue(remaining);
}

async function applyOp(op: SyncOp, userId: string): Promise<void> {
  switch (op.kind) {
    case 'upsert-log': {
      const log = (await getLogs()).find((l) => l.id === op.id);
      if (!log) return;
      let photoUrl = log.photoUrl;
      let photoUri = log.photoUri;
      if (!photoUrl && photoUri) {
        try {
          photoUrl = await uploadPhoto(photoUri, userId, log.id);
        } catch (e) {
          // A network failure is worth retrying, so let it fail the op and
          // stay queued. A missing local file never is: without this the op
          // is retried forever and the log itself never reaches the server.
          if (!(e instanceof PhotoUnreadableError)) throw e;
          photoUri = null;
        }
      }
      const synced = { ...log, userId, photoUri, photoUrl };
      await upsertRemoteLog(synced);
      const logs = await getLogs();
      await replaceLogs(logs.map((l) => (l.id === op.id ? synced : l)));
      return;
    }
    case 'delete-log':
      return deleteRemoteLog(op.id);
    case 'upsert-profile': {
      const profile = await getProfile();
      if (profile) await upsertRemoteProfile({ ...profile, id: userId });
      return;
    }
    case 'upsert-spot': {
      const spot = (await getSpots()).find((s) => s.id === op.id);
      if (spot) await upsertRemoteSpot(spot, userId);
      return;
    }
    case 'upsert-achievement': {
      const achievement = (await getAchievements()).find((a) => a.id === op.id);
      if (achievement) await upsertRemoteAchievement({ ...achievement, userId });
      return;
    }
  }
}

async function pullMerge(userId: string): Promise<void> {
  const [remoteLogs, localLogs] = await Promise.all([fetchRemoteLogs(userId), getLogs()]);
  const byId = new Map(remoteLogs.map((l) => [l.id, l]));
  for (const local of localLogs) {
    const remote = byId.get(local.id);
    // Local wins when newer (or when the remote copy is missing but unsynced).
    if (!remote || new Date(local.updatedAt) >= new Date(remote.updatedAt)) {
      byId.set(local.id, { ...local, photoUrl: local.photoUrl ?? remote?.photoUrl ?? null });
    } else {
      // Keep the local photo file for instant rendering.
      byId.set(local.id, { ...remote, photoUri: local.photoUri });
    }
  }
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  await replaceLogs(merged);

  const remoteProfile = await fetchRemoteProfile(userId);
  const localProfile = await getProfile();
  if (remoteProfile && !localProfile) await saveProfile(remoteProfile);

  const remoteAchievements = await fetchRemoteAchievements(userId);
  const localAchievements = await getAchievements();
  const achievementTypes = new Set(localAchievements.map((a) => a.type));
  const mergedAchievements = [
    ...localAchievements,
    ...remoteAchievements.filter((a) => !achievementTypes.has(a.type)),
  ];
  if (mergedAchievements.length !== localAchievements.length) {
    await saveAchievements(mergedAchievements);
  }
}
