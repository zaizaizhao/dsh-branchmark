/** Loads plugin links and combines them with the host's known Session catalog. */
import { useEffect, useMemo, useState } from 'react'
import { IconBranchOutline16, IconFullscreenOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { ListRelationsValue } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import { useBranchMarkUi, type BranchMarkUiController } from '../../domain/controller.ts'
import { deriveCurrentLineage, mergeLineageSessions } from '../../domain/lineage.ts'
import { SessionTree } from './SessionTree.tsx'
import { useBranchMarkText } from '../shared/text.ts'

/** Display the current Session's entire known family and its branch launcher.
 * @param props - Current Workspace and Session feeds plus public client operations.
 * @returns A narrow tree and expandable full-tree dialog.
 */
export function LineageView({
  ids,
  byId,
  current,
  workspaceId,
  client,
  controller,
}: {
  readonly ids: readonly SessionId[]
  readonly byId: Readonly<Record<SessionId, SessionSummary>>
  readonly current: SessionId | undefined
  readonly workspaceId: WorkspaceId | undefined
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const t = useBranchMarkText()
  const { clipsRevision } = useBranchMarkUi(controller)
  const [loaded, setLoaded] = useState<{
    workspaceId?: WorkspaceId
    value: ListRelationsValue
    error?: string
  }>({ value: { relations: [], usages: [], sessions: [] } })
  const [retry, setRetry] = useState(0)
  const [overview, setOverview] = useState(false)
  const sessionKey = ids.join('\0')
  useEffect(() => {
    if (workspaceId === undefined) return
    let active = true
    void client.relations({ workspaceId, includeSessions: true }).then(
      (value) => {
        if (active) setLoaded({ workspaceId, value })
      },
      (error) => {
        if (active)
          setLoaded({
            workspaceId,
            value: { relations: [], usages: [], sessions: [] },
            error: error instanceof Error ? error.message : String(error),
          })
      },
    )
    return () => {
      active = false
    }
  }, [client, workspaceId, clipsRevision, sessionKey, retry])
  const rows = useMemo(() => {
    const metadata = loaded.workspaceId === workspaceId ? loaded.value : undefined
    const sessions = mergeLineageSessions(
      ids.filter((id) => client.workspaceForSession(id) === workspaceId).flatMap((id) => byId[id] ?? []),
      metadata?.sessions ?? [],
      t('untitledSession'),
    )
    const known = Object.values(sessions).map((session) => session.id)
    const seen = new Set<SessionId>()
    return (current === undefined ? known : [current]).flatMap((anchor) => {
      if (seen.has(anchor)) return []
      return deriveCurrentLineage(known, sessions, anchor, metadata?.relations).filter((row) => {
        if (seen.has(row.session.id)) return false
        seen.add(row.session.id)
        return true
      })
    })
  }, [ids, byId, current, client, workspaceId, loaded, t])
  if (
    workspaceId === undefined ||
    (rows.length === 0 && loaded.workspaceId === workspaceId && loaded.error === undefined)
  ) {
    return (
      <div className="dbm-empty">
        <div>
          <strong>{t('treeEmpty')}</strong>
          <p>{t('treeEmptyHint')}</p>
        </div>
      </div>
    )
  }
  const openSession = (id: SessionId): void => {
    if (workspaceId === undefined) return
    setOverview(false)
    void client.openRelatedSession(id, workspaceId).catch((error) => {
      controller.notify('error', error instanceof Error ? error.message : String(error))
    })
  }
  const continueBranch = (): void => {
    if (current === undefined || workspaceId === undefined) return
    setOverview(false)
    controller.openLauncher('session', workspaceId, current, [])
  }
  return (
    <div className="dbm-lineage-view">
      <div className="dbm-tree-heading">
        <strong>{t('sessionTree')}</strong>
        <button
          type="button"
          className="dbm-button"
          onClick={() => {
            setOverview(true)
          }}
        >
          <IconFullscreenOutline16 size={13} />
          {t('treeOverview')}
        </button>
      </div>
      <p className="dbm-tree-caption">{t('treeHint', { count: rows.length })}</p>
      {loaded.workspaceId !== workspaceId && <p className="dbm-loading">{t('treeLoading')}</p>}
      {loaded.workspaceId === workspaceId && loaded.error !== undefined && (
        <div className="dbm-error">
          {loaded.error}
          <button
            type="button"
            className="dbm-button"
            onClick={() => {
              setRetry((value) => value + 1)
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
      <SessionTree rows={rows} current={current} onOpen={openSession} />
      {current !== undefined && byId[current] !== undefined && (
        <div className="dbm-tree-current">
          <span>
            <strong>{byId[current].displayTitle}</strong>
            <small>{t('currentBranchHint')}</small>
          </span>
          <button type="button" className="dbm-button dbm-button-branch" onClick={continueBranch}>
            <IconBranchOutline16 size={13} />
            {t('continueBranch')}
          </button>
        </div>
      )}
      <Modal
        open={overview}
        onClose={() => {
          setOverview(false)
        }}
        title={t('treeTitle')}
        closeLabel={t('close')}
        className="dbm-tree-modal"
        contentClassName="dbm-tree-modal-content"
      >
        <SessionTree rows={rows} current={current} overview onOpen={openSession} />
      </Modal>
    </div>
  )
}
