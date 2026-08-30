import { useEffect, useState } from 'react'
import type {
  ConversationLocation, ConversationNodeContext, ConversationNodeDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'

interface ForkDividerData {
  readonly seq: number
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    'clip-fork-divider': ForkDividerData
  }
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationTurnDataMap {
    'clip-fork-divider': ForkDividerData
  }
}

function locationOf(context: ConversationNodeContext): ConversationLocation {
  return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' }
}

/** Conversation node anchored at DSH's authoritative end-of-seed event. */
export const forkDividerDefinition: ConversationNodeDefinition<ForkDividerData> = {
  kind: 'clip-fork-divider',
  target: 'chat',
  match: event => event.type === 'session/end-seed'
    ? { id: String(event.seq), role: 'start' }
    : null,
  start: (_context, match) => ({ seq: match.event.seq }),
  update: context => context.state,
  buildViewNode: (context) => context.state === undefined
    ? null
    : {
      key: context.key,
      kind: 'clip-fork-divider',
      id: context.id,
      target: 'chat',
      anchorSeq: context.state.seq,
      location: locationOf(context),
      visibility: 'visible',
      data: context.state,
    },
}

export type ForkDividerProps = PropsRuntime<'conversation.chat.node', 'clip-fork-divider'> & {
  readonly client: BranchMarkClient
}

/** Render the seed divider only when the current Session has a BranchMark relation. */
export function ForkDivider({ sessionId, client }: ForkDividerProps) {
  const [relation, setRelation] = useState<DerivedSessionRelation | null>(null)
  useEffect(() => {
    let active = true
    const workspaceId = client.workspaceForSession(sessionId)
    if (workspaceId === undefined) return () => { active = false }
    void client.relations({ workspaceId, derivedSessionId: sessionId }).then(
      value => { if (active) setRelation(value.relations[0] ?? null) },
      () => { if (active) setRelation(null) },
    )
    return () => { active = false }
  }, [client, sessionId])
  if (relation?.mode !== 'full-fork' || relation.sourceSessionId === undefined) return null
  return (
    <button
      type="button"
      className="dbm-fork-divider dbm-button"
      onClick={() => { client.openSession(relation.sourceSessionId as NonNullable<typeof relation.sourceSessionId>) }}
    >
      从来源会话第 {String(relation.sourceTurn ?? '?')} 轮完整分叉
    </button>
  )
}
