/** Human-readable model input for explicitly selected Clip attachments. */

import type { Clip } from 'dsh-branchmark-host/types'

interface ClipContextItem {
  readonly clip: Clip
  readonly includeNote: boolean
}

function quote(text: string): string {
  return text.split('\n').map(line => `> ${line}`).join('\n')
}

/** Serialize selected Clips as model-readable context at an explicit send or launch boundary. */
export function renderClipContext(items: readonly ClipContextItem[]): string {
  const rows = items.map(({ clip, includeNote }, index) => {
    const source = clip.source.kind === 'session-message'
      ? `${clip.source.sessionTitleSnapshot ?? clip.source.sessionId} · turn ${String(clip.source.turn)}`
      : 'temporary Side Chat answer'
    return [
      `【枝签 ${String(index + 1)}｜来源：${source}】`,
      quote(clip.excerpt),
      ...(includeNote && clip.note !== undefined
        ? [`备注：${clip.note}`]
        : []),
    ].join('\n')
  })
  return `以下枝签仅作为本条消息的引用材料：\n\n${rows.join('\n\n')}`
}
