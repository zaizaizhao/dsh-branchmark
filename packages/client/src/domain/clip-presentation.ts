import type { Clip } from 'dsh-branchmark-host/types'

/** Format a Clip timestamp for compact card metadata.
 * @param value - ISO timestamp from the Host.
 * @returns Localized month, day, hour, and minute text.
 */
export function formatClipTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

/** Describe the immutable source attached to one Clip.
 * @param clip - Clip shown in a collection or launch flow.
 * @returns A concise source label suitable for visible metadata.
 */
export function formatClipSource(clip: Clip): string {
  if (clip.source.kind === 'temporary-answer') return '临时 Side Chat'
  return `${clip.source.sessionTitleSnapshot ?? '来源会话'} · 第 ${String(clip.source.turn)} 轮`
}
