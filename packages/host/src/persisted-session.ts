/** Detached reads of DSH history with scoped storage-handle ownership. */

import type { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionInspection, SessionPersistence } from '@deepseek-ai/dsh-session-persistence'

/**
 * Read current logical history, including DSH's adjacent format migrations.
 * @param persistence - The active Session storage provider.
 * @param id - Persisted Session identity.
 * @returns Header, inherited prefix, and validated current events after closing the read handle.
 */
export async function readPersistedSession(
  persistence: SessionPersistence,
  id: SessionId,
): Promise<SessionInspection> {
  const handle = await persistence.open(id, 'read')
  try {
    const { events } = await handle.read()
    return { meta: handle.header, inheritedEventCount: handle.inheritedEventCount, events }
  } finally {
    await handle.close()
  }
}
