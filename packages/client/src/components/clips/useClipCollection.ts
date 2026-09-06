/** Reads one complete visibility-safe collection and its retained relationships. */
import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { Clip, DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'

export type CollectionMode = 'session' | 'project'

export interface CollectionData {
  readonly active: readonly Clip[]
  readonly trash: readonly Clip[]
  readonly relations: readonly DerivedSessionRelation[]
  readonly loading: boolean
  readonly error?: string
}

const EMPTY: CollectionData = { active: [], trash: [], relations: [], loading: false }

/** Load both statuses once so filtering stays local and trash counts remain exact.
 * @param client - Typed Remote adapter.
 * @param mode - Session-private or explicitly shared project collection.
 * @param workspaceId - Owning Workspace.
 * @param sessionId - Required for session-private collections.
 * @param revision - Invalidates data after a committed mutation.
 * @returns Current collection, retained relationships, loading state, or read failure.
 */
export function useClipCollection(
  client: BranchMarkClient,
  mode: CollectionMode,
  workspaceId: WorkspaceId | undefined,
  sessionId: SessionId | undefined,
  revision: number,
): CollectionData {
  const scopeKey = `${mode}:${workspaceId ?? ''}:${mode === 'session' ? (sessionId ?? '') : ''}`
  const [state, setState] = useState<{ key: string; data: CollectionData }>({ key: scopeKey, data: EMPTY })
  useEffect(() => {
    if (workspaceId === undefined || (mode === 'session' && sessionId === undefined)) {
      setState({ key: scopeKey, data: EMPTY })
      return
    }
    let active = true
    setState((previous) => ({
      key: scopeKey,
      data: { ...(previous.key === scopeKey ? previous.data : EMPTY), loading: true },
    }))
    const scope = {
      workspaceId,
      ...(mode === 'session' && sessionId !== undefined ? { ownerSessionId: sessionId } : {}),
    }
    const visible = (clips: readonly Clip[]): readonly Clip[] =>
      clips.filter(
        (clip) =>
          clip.workspaceId === workspaceId &&
          (mode === 'project'
            ? clip.scope === 'project'
            : clip.scope === 'session' && clip.ownerSessionId === sessionId),
      )
    void Promise.all([
      client.list({ ...scope, visibility: mode === 'project' ? 'project-library' : 'session-drawer' }),
      client.list({ ...scope, visibility: mode === 'project' ? 'project-trash' : 'session-trash' }),
      client.relations({ workspaceId }),
    ]).then(
      ([list, trash, relations]) => {
        if (active)
          setState({
            key: scopeKey,
            data: {
              active: visible(list.clips),
              trash: visible(trash.clips),
              relations: relations.relations,
              loading: false,
            },
          })
      },
      (error) => {
        if (active)
          setState({
            key: scopeKey,
            data: { ...EMPTY, error: error instanceof Error ? error.message : String(error) },
          })
      },
    )
    return () => {
      active = false
    }
  }, [client, mode, workspaceId, sessionId, revision, scopeKey])
  return state.key === scopeKey ? state.data : { ...EMPTY, loading: true }
}
