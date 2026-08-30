import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconBranchOutline16,
  IconPaperclipOutline16,
  IconSparkle16,
  IconTrashOutline16,
  MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip, DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkUiController } from '../domain/controller.ts'
import { formatClipSource, formatClipTime } from '../domain/clip-presentation.ts'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function stopClickPropagation(event: { stopPropagation(): void }): void {
  event.stopPropagation()
}

function attachClipToComposer(
  clip: Clip,
  sessionId: SessionId,
  client: BranchMarkClient,
  controller: BranchMarkUiController,
): void {
  const outcome = client.attachClipToComposer(sessionId, clip, clip.note !== undefined)
  if (outcome === 'inserted') controller.notify('success', '已引用到主输入框，不会自动发送')
  else if (outcome === 'duplicate') controller.notify('success', '这枚枝签已经被当前消息引用。')
  else if (outcome === 'busy') controller.notify('error', '输入框正在发送或处理命令，请稍后重试。')
  else controller.notify('error', '当前会话的输入框尚未就绪。')
}

/** Render one mutable Clip and its derived-Session relations.
 * @param props - Clip state, selection state, mutation callbacks, and current Session context.
 * @returns One collection card with actions that never mutate the immutable excerpt.
 */
export function ClipCard({
  clip, selected, onSelect, onChanged, client, controller, trash, currentSessionId,
}: {
  readonly clip: Clip
  readonly selected: boolean
  readonly onSelect: () => void
  readonly onChanged: () => void
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
  readonly trash: boolean
  readonly currentSessionId?: SessionId
}) {
  const [editing, setEditing] = useState<'note' | 'tags' | null>(null)
  const [note, setNote] = useState(clip.note ?? '')
  const [tags, setTags] = useState(clip.tags.join(', '))
  const [busy, setBusy] = useState(false)
  const [relations, setRelations] = useState<readonly DerivedSessionRelation[]>([])
  useEffect(() => { setNote(clip.note ?? ''); setTags(clip.tags.join(', ')) }, [clip])
  useEffect(() => {
    let active = true
    void client.relations({ workspaceId: clip.workspaceId, clipId: clip.id }).then(
      value => { if (active) setRelations(value.relations) },
      () => { if (active) setRelations([]) },
    )
    return () => { active = false }
  }, [client, clip.id, clip.workspaceId])
  const mutate = async (work: () => Promise<unknown>, success: string): Promise<void> => {
    setBusy(true)
    try {
      await work()
      setEditing(null)
      onChanged()
      controller.clipsChanged()
      controller.notify('success', success)
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBusy(false)
    }
  }
  const startSideChat = async (): Promise<void> => {
    if (clip.source.kind !== 'session-message' || !clip.source.forkable) {
      controller.notify('error', '这枚枝签没有可恢复的来源消息，不能创建 Side Chat。')
      return
    }
    setBusy(true)
    try {
      const snapshot = await client.createSideChat({
        workspaceId: clip.workspaceId,
        ownerSessionId: clip.ownerSessionId,
        primaryClipId: clip.id,
        clips: [{ clipId: clip.id, includeNote: clip.note !== undefined }],
      })
      controller.upsertSideChat(snapshot, true)
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBusy(false)
    }
  }
  const saveNote = (): void => {
    void mutate(() => client.update({
      workspaceId: clip.workspaceId,
      clipId: clip.id,
      note: note.trim() === '' ? null : note,
    }), '备注已更新')
  }
  const saveTags = (): void => {
    const values = tags.split(',').map(value => value.trim()).filter(Boolean)
    void mutate(() => client.update({ workspaceId: clip.workspaceId, clipId: clip.id, tags: values }), '标签已更新')
  }
  return (
    <article className="dbm-card" data-selected={selected} data-scope={clip.scope} onClick={onSelect}>
      <div className="dbm-card-scope">
        <i />
        <span>{clip.scope === 'project' ? '项目枝签' : '本会话枝签'} · {formatClipTime(clip.createdAt)}</span>
        <input type="checkbox" aria-label="选择枝签" checked={selected} onClick={stopClickPropagation} onChange={onSelect} />
      </div>
      <div className="dbm-excerpt"><MarkdownText text={clip.excerpt} /></div>
      {editing === 'note'
        ? (
          <div className="dbm-inline-editor" onClick={stopClickPropagation}>
            <textarea className="dbm-textarea" rows={4} value={note} onChange={event => { setNote(event.target.value) }} autoFocus />
            <div className="dbm-inline-editor-actions">
              <button type="button" className="dbm-button" onClick={() => { setEditing(null) }}>取消</button>
              <button type="button" className="dbm-button dbm-button-primary" disabled={busy} onClick={saveNote}>保存</button>
            </div>
          </div>
        )
        : clip.note !== undefined && <p className="dbm-note">备注 · {clip.note}</p>}
      {editing === 'tags'
        ? (
          <div className="dbm-inline-editor" onClick={stopClickPropagation}>
            <input className="dbm-input" value={tags} placeholder="标签用逗号分隔" onChange={event => { setTags(event.target.value) }} autoFocus />
            <div className="dbm-inline-editor-actions">
              <button type="button" className="dbm-button" onClick={() => { setEditing(null) }}>取消</button>
              <button type="button" className="dbm-button dbm-button-primary" disabled={busy} onClick={saveTags}>保存</button>
            </div>
          </div>
        )
        : clip.tags.length > 0 && <div className="dbm-tags">{clip.tags.map(tag => <span className="dbm-tag" key={tag}>#{tag}</span>)}</div>}
      <div className="dbm-meta"><span>{formatClipSource(clip)}</span>{clip.source.forkable && <span>· 可恢复上下文</span>}</div>
      {relations.length > 0 && (
        <div className="dbm-derived" onClick={stopClickPropagation}>
          <span>衍生会话 {String(relations.length)}</span>
          {relations.map(relation => {
            const title = client.sessionTitle(relation.derivedSessionId) ?? '衍生会话'
            return (
              <button
                type="button"
                className="dbm-derived-link"
                key={relation.derivedSessionId}
                onClick={() => { client.openSession(relation.derivedSessionId) }}
              >
                <span>{relation.mode === 'full-fork' ? '完整分叉' : '仅枝签'}</span>
                <strong>{title}</strong>
                <i>↗</i>
              </button>
            )
          })}
        </div>
      )}
      <div className="dbm-card-actions" onClick={stopClickPropagation}>
        {!trash && (
          <button type="button" className="dbm-button" disabled={busy} onClick={() => { void startSideChat() }}>
            <IconSparkle16 size={13} /> Side Chat
          </button>
        )}
        {!trash && (
          <button type="button" className="dbm-button" onClick={() => { controller.openLauncher(clip.workspaceId, clip.ownerSessionId, [clip]) }}>
            <IconBranchOutline16 size={13} /> 新会话
          </button>
        )}
        {!trash && currentSessionId !== undefined && (
          <button type="button" className="dbm-button" onClick={() => { attachClipToComposer(clip, currentSessionId, client, controller) }}>
            <IconPaperclipOutline16 size={13} /> 引用到输入框
          </button>
        )}
        {!trash && <button type="button" className="dbm-button" onClick={() => { setEditing('note') }}>备注</button>}
        {!trash && <button type="button" className="dbm-button" onClick={() => { setEditing('tags') }}>标签</button>}
        {!trash && clip.scope === 'session' && (
          <button type="button" className="dbm-button" disabled={busy} onClick={() => {
            void mutate(() => client.update({ workspaceId: clip.workspaceId, clipId: clip.id, scope: 'project' }), '已保存到项目枝签')
          }}>保存到项目</button>
        )}
        {!trash && (
          <button type="button" className="dbm-button dbm-button-danger" disabled={busy} onClick={() => {
            void mutate(() => client.setStatus({ workspaceId: clip.workspaceId, clipId: clip.id, status: 'trashed' }), '已移入回收站')
          }}><IconTrashOutline16 size={13} /> 删除</button>
        )}
        {trash && (
          <button type="button" className="dbm-button" disabled={busy} onClick={() => {
            void mutate(() => client.setStatus({ workspaceId: clip.workspaceId, clipId: clip.id, status: 'active' }), '枝签已恢复')
          }}>恢复</button>
        )}
        {trash && (
          <button type="button" className="dbm-button dbm-button-danger" disabled={busy} onClick={() => {
            if (!window.confirm('永久删除这枚枝签？衍生会话不会受影响。')) return
            void mutate(() => client.deleteForever({ workspaceId: clip.workspaceId, clipId: clip.id }), '枝签已永久删除')
          }}>永久删除</button>
        )}
      </div>
    </article>
  )
}
