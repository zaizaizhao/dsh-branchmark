/** Stable selection mapping from DSH Chat nodes to persisted message anchors. */

import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { MessageId } from '@deepseek-ai/dsh-llm/brand'
import type { ChatConversationViewNode, ChatNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import type { ClipSelectionCandidate } from './controller.ts'

function textOf(node: ChatNode): string | undefined {
  if (node.kind === 'user' || node.kind === 'steering') {
    return node.data.content.flatMap(block => block.type === 'text' ? [block.text] : []).join('\n\n')
  }
  if (node.kind === 'assistant-step' && node.data.status === 'settled') {
    return node.data.blocks.flatMap(block => block.kind === 'text' || block.kind === 'reasoning'
      ? [block.text]
      : []).join('\n\n')
  }
  return undefined
}

/** Canonical DSH text represented by one visible Chat node. */
export function chatNodeText(snapshot: ConversationSnapshot, nodeKey: string): string | undefined {
  const raw = snapshot.views.get('chat')?.nodes.get(nodeKey)
  const node = raw as ChatConversationViewNode as ChatNode | undefined
  return node === undefined ? undefined : textOf(node)
}

function messageAnchor(node: ChatNode): {
  readonly messageId: MessageId
  readonly eventSeq: number
  readonly turn: number
  readonly role: 'user' | 'assistant'
} | undefined {
  if (node.kind === 'assistant-step') {
    const final = node.data.finalNode
    if (node.data.status !== 'settled' || final?.messageId === undefined) return undefined
    return { messageId: final.messageId, eventSeq: final.seq, turn: node.data.turn, role: 'assistant' }
  }
  if (node.kind !== 'user' && node.kind !== 'steering') return undefined
  const location = node.location
  if (location.kind !== 'turn' && location.kind !== 'step') return undefined
  const messageId = node.kind === 'steering' ? node.data.messageId : node.id as MessageId
  return { messageId, eventSeq: node.data.seq, turn: location.turn.turn, role: 'user' }
}

interface ProjectionChar {
  readonly value: string
  readonly sourceStart: number
  readonly sourceEnd: number
}

interface PositionedMarkdownNode {
  readonly type: string
  readonly value?: string
  readonly alt?: string
  readonly children?: readonly PositionedMarkdownNode[]
  readonly position?: {
    readonly start: { readonly offset?: number }
    readonly end: { readonly offset?: number }
  }
}

function sourceOffsets(markdown: string, node: PositionedMarkdownNode, visible: string): {
  readonly start: number
  readonly end: number
} | undefined {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) return undefined
  const found = markdown.indexOf(visible, start)
  if (found >= start && found + visible.length <= end) return { start: found, end: found + visible.length }
  return { start, end }
}

function leafText(node: PositionedMarkdownNode): string | undefined {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
    case 'code':
    case 'html':
    case 'inlineMath':
    case 'math':
      return node.value ?? ''
    case 'image':
    case 'imageReference':
      return node.alt ?? ''
    case 'break':
      return '\n'
    default:
      return undefined
  }
}

function markdownProjection(markdown: string): readonly ProjectionChar[] {
  const root = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  }) as PositionedMarkdownNode
  const leaves: Array<{ readonly text: string; readonly start: number; readonly end: number }> = []
  const visit = (node: PositionedMarkdownNode): void => {
    const visible = leafText(node)
    if (visible !== undefined && visible !== '') {
      const offsets = sourceOffsets(markdown, node, visible)
      if (offsets !== undefined) leaves.push({ text: visible, ...offsets })
      return
    }
    for (const child of node.children ?? []) visit(child)
  }
  visit(root)
  leaves.sort((left, right) => left.start - right.start || left.end - right.end)
  const projected: ProjectionChar[] = []
  let previousEnd = 0
  for (const leaf of leaves) {
    const gap = markdown.slice(previousEnd, leaf.start)
    const lineBreaks = gap.match(/\r?\n/g)?.length ?? 0
    const separators = Math.min(2, lineBreaks)
    for (let index = 0; index < separators; index += 1) {
      projected.push({ value: '\n', sourceStart: previousEnd, sourceEnd: leaf.start })
    }
    for (let index = 0; index < leaf.text.length; index += 1) {
      const sourceStart = leaf.start + Math.min(index, Math.max(0, leaf.end - leaf.start - 1))
      projected.push({ value: leaf.text[index] ?? '', sourceStart, sourceEnd: sourceStart + 1 })
    }
    previousEnd = Math.max(previousEnd, leaf.end)
  }
  return projected
}

function normalizedProjection(chars: readonly ProjectionChar[]): {
  readonly text: string
  readonly sourceChars: readonly ProjectionChar[]
} {
  const text: string[] = []
  const sourceChars: ProjectionChar[] = []
  let inWhitespace = true
  for (const char of chars) {
    if (/\s/.test(char.value)) {
      if (!inWhitespace) {
        text.push(' ')
        sourceChars.push(char)
      }
      inWhitespace = true
      continue
    }
    text.push(char.value)
    sourceChars.push(char)
    inWhitespace = false
  }
  if (text.at(-1) === ' ') {
    text.pop()
    sourceChars.pop()
  }
  return { text: text.join(''), sourceChars }
}

function compactedProjection(chars: readonly ProjectionChar[]): {
  readonly text: string
  readonly sourceChars: readonly ProjectionChar[]
} {
  const sourceChars = chars.filter(char => !/\s/.test(char.value))
  return { text: sourceChars.map(char => char.value).join(''), sourceChars }
}

function projectedRange(
  projection: { readonly text: string; readonly sourceChars: readonly ProjectionChar[] },
  visible: string,
  approximateOffset: number,
): { readonly start: number; readonly end: number } | undefined {
  if (visible === '') return undefined
  const matches: number[] = []
  let cursor = 0
  while (cursor <= projection.text.length - visible.length) {
    const found = projection.text.indexOf(visible, cursor)
    if (found < 0) break
    matches.push(found)
    cursor = found + Math.max(1, visible.length)
  }
  if (matches.length === 0) return undefined
  const projectedStart = matches.reduce((best, candidate) => {
    const bestSource = projection.sourceChars[best]?.sourceStart ?? 0
    const candidateSource = projection.sourceChars[candidate]?.sourceStart ?? 0
    return Math.abs(candidateSource - approximateOffset) < Math.abs(bestSource - approximateOffset) ? candidate : best
  })
  const first = projection.sourceChars[projectedStart]
  const last = projection.sourceChars[projectedStart + visible.length - 1]
  return first === undefined || last === undefined
    ? undefined
    : { start: first.sourceStart, end: last.sourceEnd }
}

function markdownRange(text: string, excerpt: string, approximateOffset: number): {
  readonly start: number
  readonly end: number
} | undefined {
  const matches: number[] = []
  let cursor = 0
  while (cursor <= text.length - excerpt.length) {
    const found = text.indexOf(excerpt, cursor)
    if (found === -1) break
    matches.push(found)
    cursor = found + Math.max(1, excerpt.length)
  }
  if (matches.length > 0) {
    const start = matches.reduce((best, candidate) =>
      Math.abs(candidate - approximateOffset) < Math.abs(best - approximateOffset) ? candidate : best)
    return { start, end: start + excerpt.length }
  }
  const source = markdownProjection(text)
  const projected = normalizedProjection(source)
  const visible = excerpt.trim().replace(/\s+/g, ' ')
  const normalized = projectedRange(projected, visible, approximateOffset)
  if (normalized !== undefined) return normalized
  return projectedRange(compactedProjection(source), excerpt.replace(/\s+/g, ''), approximateOffset)
}

/** Map a DOM excerpt back to one completed DSH user or assistant Chat node. */
export function selectionCandidate(input: {
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly sessionTitle?: string
  readonly snapshot: ConversationSnapshot
  readonly nodeKey: string
  readonly excerpt: string
  readonly approximateOffset: number
  readonly rect: ClipSelectionCandidate['rect']
}): ClipSelectionCandidate | undefined {
  const raw = input.snapshot.views.get('chat')?.nodes.get(input.nodeKey)
  const node = raw as ChatConversationViewNode as ChatNode | undefined
  if (node === undefined || node.visibility !== 'visible') return undefined
  const text = textOf(node)
  const anchor = messageAnchor(node)
  if (text === undefined || anchor === undefined) return undefined
  const range = markdownRange(text, input.excerpt, input.approximateOffset)
  if (range === undefined) return undefined
  return {
    workspaceId: input.workspaceId,
    ownerSessionId: input.sessionId,
    source: {
      kind: 'session-message',
      sessionId: input.sessionId,
      messageId: anchor.messageId,
      eventSeq: anchor.eventSeq,
      turn: anchor.turn,
      role: anchor.role,
      range,
      ...(input.sessionTitle === undefined ? {} : { sessionTitleSnapshot: input.sessionTitle }),
    },
    excerpt: text.slice(range.start, range.end),
    rect: input.rect,
  }
}

/** Count selected visible text before the Range start inside one Chat row. */
export function selectionOffset(row: HTMLElement, range: Range): number {
  const prefix = document.createRange()
  prefix.selectNodeContents(row)
  prefix.setEnd(range.startContainer, range.startOffset)
  return prefix.toString().length
}
