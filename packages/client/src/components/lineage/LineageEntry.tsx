/** Header entry reflecting the actual branch context mode. */
import { useEffect, useState } from 'react'
import { IconBranchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import { useBranchMarkUi, type BranchMarkUiController } from '../../domain/controller.ts'

type LineageProps = PropsRuntime<'conversation.session.header.actions'> &
  PropsLocale<'branchmark'> & {
    readonly controller: BranchMarkUiController
    readonly client: BranchMarkClient
  }

/** Open the relationship tree from a correctly labelled derived Session header.
 * @param props - Session identity, locale, and BranchMark services.
 * @returns A mode badge, or no badge for an unrelated Session.
 */
export function BranchMarkLineageAction({ sessionId, controller, client, t }: LineageProps) {
  const { clipsRevision } = useBranchMarkUi(controller)
  const [state, setState] = useState<{ id: SessionId; relation: DerivedSessionRelation | null }>({
    id: sessionId,
    relation: null,
  })
  useEffect(() => {
    const workspaceId = client.workspaceForSession(sessionId)
    if (workspaceId === undefined) return
    let active = true
    void client.relations({ workspaceId, derivedSessionId: sessionId }).then(
      (value) => {
        if (active) setState({ id: sessionId, relation: value.relations[0] ?? null })
      },
      () => {
        if (active) setState({ id: sessionId, relation: null })
      },
    )
    return () => {
      active = false
    }
  }, [client, sessionId, clipsRevision])
  const relation = state.id === sessionId ? state.relation : null
  if (relation === null) return null
  const label = { 'full-fork': 'fullFork', 'clips-only': 'clipsOnly', blank: 'blankBranch' } as const
  return (
    <button
      type="button"
      className="dbm-lineage-pill"
      data-mode={relation.mode}
      title={t('sessionTree')}
      onClick={() => {
        controller.openDock('lineage')
      }}
    >
      <IconBranchOutline16 size={14} />
      {t(label[relation.mode])}
    </button>
  )
}
