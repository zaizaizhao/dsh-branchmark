import { useState } from 'react'
import {
  IconArchiveOutline20,
  IconCloseOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ClipId } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkLauncher, BranchMarkUiController } from '../domain/controller.ts'
import { formatClipSource } from '../domain/clip-presentation.ts'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Render the explicit Side Chat or derived-Session launch flow.
 * @param props - Selected Clips, browser Client adapter, and shared UI controller.
 * @returns A Dock-contained sheet for context mode, primary source, notes, and optional prompt.
 */
export function BranchMarkLauncherSheet({ launcher, client, controller }: {
  readonly launcher: BranchMarkLauncher
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const sideChatIntent = launcher.intent === 'side-chat'
  const sourceClips = launcher.clips.filter(clip => clip.source.kind === 'session-message' && clip.source.forkable)
  const sourceIds = [...new Set(sourceClips.map(clip => clip.source.kind === 'session-message' ? clip.source.sessionId : undefined).filter(Boolean))]
  const defaultPrimary = sourceClips.toSorted((left, right) => {
    const leftSeq = left.source.kind === 'session-message' ? left.source.eventSeq : -1
    const rightSeq = right.source.kind === 'session-message' ? right.source.eventSeq : -1
    return rightSeq - leftSeq
  })[0]
  const [mode, setMode] = useState<'full-fork' | 'clips-only'>(defaultPrimary === undefined ? 'clips-only' : 'full-fork')
  const [primaryId, setPrimaryId] = useState<ClipId | undefined>(sourceIds.length <= 1 ? defaultPrimary?.id : undefined)
  const [notes, setNotes] = useState<ReadonlySet<ClipId>>(() => new Set(launcher.clips.filter(clip => clip.note !== undefined).map(clip => clip.id)))
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const sidePrimaryId = primaryId ?? (sourceIds.length <= 1 ? defaultPrimary?.id : undefined)
  const launchSession = async (send: boolean): Promise<void> => {
    if (mode === 'full-fork' && primaryId === undefined) {
      controller.notify('error', '请显式选择一个主要来源。')
      return
    }
    if (send && question.trim() === '') {
      controller.notify('error', '创建并发送需要先填写问题。')
      return
    }
    setBusy(true)
    try {
      await client.launch({
        workspaceId: launcher.workspaceId,
        clips: launcher.clips,
        mode,
        ...(mode === 'full-fork' && primaryId !== undefined ? { primaryClipId: primaryId } : {}),
        includeNotes: notes,
        ...(send ? { question: question.trim() } : {}),
      })
      controller.closeLauncher()
      controller.notify('success', send ? '会话已在后台创建并开始运行' : '新会话已打开，枝签上下文已安全写入会话')
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBusy(false)
    }
  }
  const launchSideChat = async (): Promise<void> => {
    if (sidePrimaryId === undefined) {
      controller.notify('error', '请为 Side Chat 显式选择一个主要来源。')
      return
    }
    const primary = launcher.clips.find(clip => clip.id === sidePrimaryId)
    if (primary?.source.kind !== 'session-message') {
      controller.notify('error', '主要来源当前不能恢复为 Side Chat。')
      return
    }
    setBusy(true)
    try {
      const snapshot = await client.createSideChat({
        workspaceId: launcher.workspaceId,
        ownerSessionId: primary.source.sessionId,
        primaryClipId: sidePrimaryId,
        clips: launcher.clips.map(clip => ({ clipId: clip.id, includeNote: notes.has(clip.id) })),
      })
      controller.upsertSideChat(snapshot, true)
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="dbm-launch-sheet" aria-label={sideChatIntent ? '创建 Side Chat' : '从枝签创建新会话'}>
      <div className="dbm-launch-header">
        <div>
          <strong>{sideChatIntent ? '创建 Side Chat' : '从枝签创建新会话'}</strong>
          <span>只有当前明确选择的枝签会进入目标上下文</span>
        </div>
        <button type="button" className="dbm-button dbm-icon-button" aria-label="关闭" onClick={() => { controller.closeLauncher() }}><IconCloseOutline16 /></button>
      </div>
      <div className="dbm-launch-scroll">
        {!sideChatIntent && (
          <section className="dbm-launch-section">
            <h3>新会话上下文</h3>
            <div className="dbm-mode-grid">
              <button type="button" className="dbm-mode" data-active={mode === 'full-fork'} disabled={sourceClips.length === 0} onClick={() => { setMode('full-fork') }}>
                <strong>继承来源上下文</strong><span>从主要枝签所在消息位置分叉；新会话后台恢复此前完整历史。</span>
              </button>
              <button type="button" className="dbm-mode" data-active={mode === 'clips-only'} onClick={() => { setMode('clips-only') }}>
                <strong>全新会话</strong><span>不继承历史；枝签与备注作为只读上下文写入会话，输入框保持空白。</span>
              </button>
            </div>
            {mode === 'full-fork' && sourceClips.length === 0 && <div className="dbm-warning">所选枝签没有可读取的来源消息，请显式选择“全新会话”。</div>}
            {mode === 'full-fork' && sourceIds.length > 1 && <div className="dbm-warning">枝签来自多个会话，请选择一个主要来源；其余枝签作为附件携带。</div>}
          </section>
        )}
        {((!sideChatIntent && mode === 'full-fork') || sourceIds.length > 1) && (
          <section className="dbm-launch-section">
            <h3>主要来源</h3>
            {sourceClips.map(clip => (
              <label className="dbm-source-row" key={clip.id}>
                <input type="radio" name="dbm-primary" checked={primaryId === clip.id} onChange={() => { setPrimaryId(clip.id) }} />
                <span><strong>{clip.excerpt}</strong><small>{formatClipSource(clip)}</small></span>
              </label>
            ))}
          </section>
        )}
        <section className="dbm-launch-section">
          <h3>携带的枝签与备注</h3>
          {launcher.clips.map(clip => (
            <div className="dbm-source-row" key={clip.id}>
              <IconArchiveOutline20 size={15} />
              <span><strong>{clip.excerpt}</strong><small>{formatClipSource(clip)}</small></span>
              {clip.note !== undefined && (
                <label className="dbm-note-toggle"><input type="checkbox" checked={notes.has(clip.id)} onChange={() => {
                  setNotes(current => {
                    const next = new Set(current)
                    if (next.has(clip.id)) next.delete(clip.id); else next.add(clip.id)
                    return next
                  })
                }} /> 备注</label>
              )}
            </div>
          ))}
        </section>
        {!sideChatIntent && (
          <section className="dbm-launch-section">
            <h3>创建并发送（可选）</h3>
            <textarea className="dbm-textarea" rows={4} value={question} placeholder="输入问题；留空则创建并打开，随后在新会话输入框中继续。" onChange={event => { setQuestion(event.target.value) }} />
          </section>
        )}
      </div>
      <div className="dbm-launch-actions">
        {sideChatIntent
          ? <button type="button" className="dbm-button dbm-button-primary" disabled={busy || sidePrimaryId === undefined} onClick={() => { void launchSideChat() }}>打开 Side Chat</button>
          : (
            <>
              <button type="button" className="dbm-button" disabled={busy} onClick={() => { void launchSession(false) }}>创建并打开</button>
              <button type="button" className="dbm-button dbm-button-primary" disabled={busy || question.trim() === ''} onClick={() => { void launchSession(true) }}>创建并发送</button>
            </>
            )}
      </div>
    </section>
  )
}
