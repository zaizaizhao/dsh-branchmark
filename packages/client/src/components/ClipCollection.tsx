import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import type { SessionId, WorkspaceId } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconArchiveOutline20,
  IconListPenOutline16,
  IconSearchOutline16,
  IconTrashOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip, ClipId, ListClipsRequest } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../domain/client.ts'
import type { BranchMarkUiController } from '../domain/controller.ts'
import { useBranchMarkUi } from '../domain/controller.ts'
import { moveClipInCollection } from '../domain/clip-order.ts'
import { BatchCommandCapsule } from './BatchCommandCapsule.tsx'
import { ClipCard } from './ClipCard.tsx'

type CollectionMode = 'session' | 'project'

interface LoadState {
  readonly clips: readonly Clip[]
  readonly tags: readonly string[]
  readonly loading: boolean
  readonly error?: string
}

const EMPTY_LOAD: LoadState = { clips: [], tags: [], loading: true }

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function useClipCollection(
  client: BranchMarkClient,
  request: ListClipsRequest | undefined,
  refreshKey: number,
): LoadState {
  const [state, setState] = useState<LoadState>(EMPTY_LOAD)
  const requestKey = request === undefined ? '' : JSON.stringify(request)
  useEffect(() => {
    if (request === undefined) {
      setState({ clips: [], tags: [], loading: false })
      return
    }
    let active = true
    setState(previous => ({ clips: previous.clips, tags: previous.tags, loading: true }))
    void client.list(request).then(
      value => { if (active) setState({ clips: value.clips, tags: value.tags, loading: false }) },
      error => { if (active) setState({ clips: [], tags: [], loading: false, error: errorText(error) }) },
    )
    return () => { active = false }
  }, [client, refreshKey, requestKey])
  return state
}

/** Render one visibility-safe session or project Clip collection.
 * @param props - Collection scope, current identities, Client adapter, and UI controller.
 * @returns Search, filters, Clip cards, trash, and selected-Clip batch actions.
 */
export function ClipCollection({ mode, workspaceId, sessionId, client, controller }: {
  readonly mode: CollectionMode
  readonly workspaceId: WorkspaceId | undefined
  readonly sessionId: SessionId | undefined
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([])
  const [selectedIds, setSelectedIds] = useState<readonly ClipId[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [trash, setTrash] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [batchTags, setBatchTags] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)
  const [tagEditorOpen, setTagEditorOpen] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)
  const draggingId = useRef<ClipId | null>(null)
  const [orderOverride, setOrderOverride] = useState<readonly ClipId[] | null>(null)
  const state = useBranchMarkUi(controller)
  const request = useMemo<ListClipsRequest | undefined>(() => {
    if (workspaceId === undefined || (mode === 'session' && sessionId === undefined)) return undefined
    return {
      workspaceId,
      visibility: trash
        ? mode === 'project' ? 'project-trash' : 'session-trash'
        : mode === 'project' ? 'project-library' : 'session-drawer',
      ...(mode === 'session' && sessionId !== undefined ? { ownerSessionId: sessionId } : {}),
      ...(search.trim() === '' ? {} : { search }),
      ...(selectedTags.length === 0 ? {} : { tags: selectedTags }),
    }
  }, [mode, search, selectedTags, sessionId, trash, workspaceId])
  const loaded = useClipCollection(client, request, refreshKey + state.clipsRevision)
  const clips = useMemo(() => loaded.clips.filter((clip) => {
    if (mode === 'project') return clip.scope === 'project'
    return clip.scope === 'session' && clip.ownerSessionId === sessionId
  }), [loaded.clips, mode, sessionId])
  const displayedClips = useMemo(() => {
    if (orderOverride === null) return clips
    const byId = new Map(clips.map(clip => [clip.id, clip]))
    if (orderOverride.length !== clips.length || orderOverride.some(id => !byId.has(id))) return clips
    return orderOverride.map(id => byId.get(id)!)
  }, [clips, orderOverride])
  const selected = useMemo(() => {
    const byId = new Map(clips.map(clip => [clip.id, clip]))
    return selectedIds.flatMap(id => {
      const clip = byId.get(id)
      return clip === undefined ? [] : [clip]
    })
  }, [clips, selectedIds])
  const pinnedClips = useMemo(() => displayedClips.filter(clip => clip.pinnedAt !== undefined), [displayedClips])
  const regularClips = useMemo(() => displayedClips.filter(clip => clip.pinnedAt === undefined), [displayedClips])
  const allPinned = selected.length > 0 && selected.every(clip => clip.pinnedAt !== undefined)
  const canReorder = !trash && !loaded.loading && search.trim() === '' && selectedTags.length === 0
  const refresh = useCallback(() => { setRefreshKey(value => value + 1) }, [])
  useEffect(() => { setSelectedIds(ids => ids.filter(id => clips.some(clip => clip.id === id))) }, [clips])
  useEffect(() => {
    if (orderOverride === null) return
    const loadedIds = clips.map(clip => clip.id)
    if (loadedIds.join('\0') === orderOverride.join('\0')
      || loadedIds.some(id => !orderOverride.includes(id))
      || loadedIds.length !== orderOverride.length) setOrderOverride(null)
  }, [clips, orderOverride])
  const toggle = (id: ClipId): void => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  }
  const batch = async (kind: 'trash' | 'tags' | 'pin'): Promise<void> => {
    if (workspaceId === undefined) return
    setBatchBusy(true)
    try {
      if (kind === 'trash') {
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map(clip => clip.id),
          mutation: { kind: 'set-status', status: 'trashed' },
        })
      } else if (kind === 'tags') {
        const extra = batchTags.split(',').map(value => value.trim()).filter(Boolean)
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map(clip => clip.id),
          mutation: { kind: 'add-tags', tags: extra },
        })
      } else {
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map(clip => clip.id),
          mutation: { kind: 'set-pinned', pinned: !allPinned },
        })
      }
      controller.clipsChanged()
      controller.notify('success', `已批量更新 ${String(selected.length)} 枚枝签`)
      setSelectedIds([])
      setBatchTags('')
      setBatchOpen(false)
      setTagEditorOpen(false)
      refresh()
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBatchBusy(false)
    }
  }
  const selectedSource = selected.find(clip => clip.source.kind === 'session-message')
  const launcherSource = sessionId
    ?? (selectedSource?.source.kind === 'session-message' ? selectedSource.source.sessionId : undefined)
  const quoteSelected = (): void => {
    if (sessionId === undefined) {
      controller.notify('error', '请先打开一个会话，再把枝签引用到输入框。')
      return
    }
    const result = client.attachClipsToComposer(sessionId, selected)
    if (result.failed.length > 0) {
      controller.notify('error', `已有 ${String(result.inserted.length)} 枚引用成功，${String(result.failed.length)} 枚未能写入输入框。`)
      return
    }
    const detail = result.duplicates.length > 0
      ? `；${String(result.duplicates.length)} 枚已存在`
      : ''
    controller.notify('success', `已引用 ${String(result.inserted.length)} 枚枝签到主输入框${detail}，不会自动发送`)
    setSelectedIds([])
    setBatchOpen(false)
  }
  const openSelectedSideChat = async (): Promise<void> => {
    if (workspaceId === undefined) return
    const candidates = selected.filter(clip => clip.source.kind === 'session-message' && clip.source.forkable)
    if (candidates.length === 0) {
      controller.notify('error', '所选枝签没有可恢复的来源消息，不能创建 Side Chat。')
      return
    }
    const sourceSessions = new Set(candidates.map(clip => clip.source.kind === 'session-message' ? clip.source.sessionId : undefined))
    if (sourceSessions.size > 1) {
      if (launcherSource !== undefined) controller.openLauncher('side-chat', workspaceId, launcherSource, selected)
      setBatchOpen(false)
      return
    }
    const primary = candidates.toSorted((left, right) => {
      const leftSeq = left.source.kind === 'session-message' ? left.source.eventSeq : -1
      const rightSeq = right.source.kind === 'session-message' ? right.source.eventSeq : -1
      return rightSeq - leftSeq
    })[0]!
    if (primary.source.kind !== 'session-message') return
    setBatchBusy(true)
    try {
      const snapshot = await client.createSideChat({
        workspaceId,
        ownerSessionId: primary.source.sessionId,
        primaryClipId: primary.id,
        clips: selected.map(clip => ({ clipId: clip.id, includeNote: clip.note !== undefined })),
      })
      controller.upsertSideChat(snapshot, true)
      setSelectedIds([])
      setBatchOpen(false)
    } catch (error) {
      controller.notify('error', errorText(error))
    } finally {
      setBatchBusy(false)
    }
  }
  const dropOn = async (targetId: ClipId): Promise<void> => {
    const sourceId = draggingId.current
    if (workspaceId === undefined || !canReorder || sourceId === null) return
    draggingId.current = null
    const moved = moveClipInCollection(displayedClips, sourceId, targetId)
    if (!moved.ok) {
      controller.notify('error', moved.reason === 'pin-group-mismatch'
        ? '置顶与未置顶枝签不能直接跨组拖动，请先切换置顶状态。'
        : '拖动的枝签已经不在当前集合中。')
      return
    }
    if (moved.clipIds.join('\0') === displayedClips.map(clip => clip.id).join('\0')) return
    setOrderOverride(moved.clipIds)
    try {
      await client.batchUpdate({
        workspaceId,
        clipIds: moved.clipIds,
        mutation: {
          kind: 'reorder',
          scope: mode,
          ...(mode === 'session' && sessionId !== undefined ? { ownerSessionId: sessionId } : {}),
        },
      })
      controller.clipsChanged()
      controller.notify('success', '枝签顺序已保存')
    } catch (error) {
      setOrderOverride(null)
      controller.notify('error', errorText(error))
    }
  }
  if (workspaceId === undefined || (mode === 'session' && sessionId === undefined)) {
    return <div className="dbm-empty"><div><strong>没有可用的会话</strong><p>打开一个项目会话后即可使用枝签 Dock。</p></div></div>
  }
  const renderClip = (clip: Clip) => (
    <ClipCard
      key={clip.id}
      clip={clip}
      selected={selectedIds.includes(clip.id)}
      onSelect={() => { toggle(clip.id) }}
      onChanged={refresh}
      client={client}
      controller={controller}
      trash={trash}
      draggable={canReorder}
      onDragStart={(clipId) => { draggingId.current = clipId }}
      onDragEnd={() => { draggingId.current = null }}
      onDrop={(targetId) => { void dropOn(targetId) }}
      {...(sessionId === undefined ? {} : { currentSessionId: sessionId })}
    />
  )
  return (
    <div className="dbm-collection">
      <div className="dbm-toolbar">
        <label className="dbm-search">
          <IconSearchOutline16 size={14} />
          <input type="search" value={search} placeholder="搜索正文、备注或标签" onChange={event => { setSearch(event.target.value) }} />
        </label>
        <button type="button" className="dbm-button dbm-icon-button" data-active={trash} title={trash ? '返回枝签' : '回收站'} onClick={() => { setTrash(value => !value); setSelectedIds([]) }}>
          <IconTrashOutline16 />
        </button>
        {mode === 'project' && (
          <button type="button" className="dbm-button dbm-icon-button" title={view === 'grid' ? '切换到列表' : '切换到卡片'} onClick={() => { setView(value => value === 'grid' ? 'list' : 'grid') }}>
            <IconListPenOutline16 />
          </button>
        )}
      </div>
      <p className="dbm-scope-description">
        {mode === 'project'
          ? '这里只显示显式保存到项目的枝签；其他会话的私有枝签不会混入。'
          : '这里只显示当前会话的私有枝签；项目枝签请到“项目”标签查看。'}
      </p>
      {loaded.tags.length > 0 && (
        <div className="dbm-tags dbm-filter-tags" aria-label="标签筛选">
          {loaded.tags.map(tag => (
            <button
              type="button"
              className="dbm-tag"
              data-active={selectedTags.includes(tag)}
              key={tag}
              onClick={() => { setSelectedTags(values => values.includes(tag) ? values.filter(value => value !== tag) : [...values, tag]) }}
            >#{tag}</button>
          ))}
        </div>
      )}
      {loaded.loading && <div className="dbm-loading">正在读取本地枝签…</div>}
      {loaded.error !== undefined && <div className="dbm-error">{loaded.error}</div>}
      {!loaded.loading && loaded.error === undefined && clips.length === 0 && (
        <div className="dbm-empty"><div><div className="dbm-empty-orb"><IconArchiveOutline20 /></div><strong>{trash ? '回收站为空' : '还没有枝签'}</strong><p>在消息中选择一段文字即可生成枝签。</p></div></div>
      )}
      <div className="dbm-card-grid" data-view={mode === 'project' ? view : 'list'}>
        {pinnedClips.length > 0 && <div className="dbm-collection-divider"><span>置顶</span><i /></div>}
        {pinnedClips.map(renderClip)}
        {pinnedClips.length > 0 && regularClips.length > 0 && <div className="dbm-collection-divider"><span>全部枝签</span><i /></div>}
        {regularClips.map(renderClip)}
      </div>
      {selected.length > 0 && !trash && (
        <BatchCommandCapsule
          count={selected.length}
          open={batchOpen}
          tagEditorOpen={tagEditorOpen}
          tagValue={batchTags}
          allPinned={allPinned}
          canQuote={sessionId !== undefined}
          busy={batchBusy}
          onOpenChange={(open) => {
            setBatchOpen(open)
            if (!open) setTagEditorOpen(false)
          }}
          onTagValueChange={setBatchTags}
          onCloseTagEditor={() => { setTagEditorOpen(false) }}
          onApplyTags={() => { void batch('tags') }}
          onQuote={quoteSelected}
          onSideChat={() => { void openSelectedSideChat() }}
          onNewSession={() => {
            if (launcherSource === undefined) {
              controller.notify('error', '所选枝签没有可用的来源会话。')
              return
            }
            setBatchOpen(false)
            controller.openLauncher('session', workspaceId, launcherSource, selected)
          }}
          onTogglePinned={() => { void batch('pin') }}
          onOpenTagEditor={() => { setTagEditorOpen(true) }}
          onTrash={() => { void batch('trash') }}
        />
      )}
    </div>
  )
}
