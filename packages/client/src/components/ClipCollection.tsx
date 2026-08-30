import {
  useCallback, useEffect, useMemo, useState,
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
  const selected = useMemo(() => clips.filter(clip => selectedIds.includes(clip.id)), [clips, selectedIds])
  const refresh = useCallback(() => { setRefreshKey(value => value + 1) }, [])
  useEffect(() => { setSelectedIds(ids => ids.filter(id => clips.some(clip => clip.id === id))) }, [clips])
  const toggle = (id: ClipId): void => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
  }
  const batch = async (kind: 'project' | 'trash' | 'tags'): Promise<void> => {
    if (workspaceId === undefined) return
    try {
      if (kind === 'project') {
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map(clip => clip.id),
          mutation: { kind: 'set-scope', scope: 'project' },
        })
      } else if (kind === 'trash') {
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map(clip => clip.id),
          mutation: { kind: 'set-status', status: 'trashed' },
        })
      } else {
        const extra = batchTags.split(',').map(value => value.trim()).filter(Boolean)
        await client.batchUpdate({
          workspaceId,
          clipIds: selected.map(clip => clip.id),
          mutation: { kind: 'add-tags', tags: extra },
        })
      }
      controller.clipsChanged()
      controller.notify('success', `已批量更新 ${String(selected.length)} 枚枝签`)
      setSelectedIds([])
      setBatchTags('')
      refresh()
    } catch (error) {
      controller.notify('error', errorText(error))
    }
  }
  const selectedSource = selected.find(clip => clip.source.kind === 'session-message')
  const launcherSource = sessionId
    ?? (selectedSource?.source.kind === 'session-message' ? selectedSource.source.sessionId : undefined)
  if (workspaceId === undefined || (mode === 'session' && sessionId === undefined)) {
    return <div className="dbm-empty"><div><strong>没有可用的会话</strong><p>打开一个项目会话后即可使用枝签 Dock。</p></div></div>
  }
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
        {clips.map(clip => (
          <ClipCard
            key={clip.id}
            clip={clip}
            selected={selectedIds.includes(clip.id)}
            onSelect={() => { toggle(clip.id) }}
            onChanged={refresh}
            client={client}
            controller={controller}
            trash={trash}
            {...(sessionId === undefined ? {} : { currentSessionId: sessionId })}
          />
        ))}
      </div>
      {selected.length > 0 && !trash && (
        <div className="dbm-batchbar">
          <span>已选 {String(selected.length)} 枚</span>
          <div className="dbm-batch-actions">
            <input className="dbm-input" value={batchTags} placeholder="追加标签" onChange={event => { setBatchTags(event.target.value) }} />
            <button type="button" className="dbm-button" disabled={batchTags.trim() === ''} onClick={() => { void batch('tags') }}>加标签</button>
            {selected.some(clip => clip.scope === 'session') && <button type="button" className="dbm-button" onClick={() => { void batch('project') }}>保存到项目</button>}
            <button type="button" className="dbm-button dbm-button-danger" onClick={() => { void batch('trash') }}>删除</button>
            <button
              type="button"
              className="dbm-button dbm-button-primary"
              disabled={launcherSource === undefined}
              onClick={() => {
                if (launcherSource !== undefined) controller.openLauncher(workspaceId, launcherSource, selected)
              }}
            >继续探索</button>
          </div>
        </div>
      )}
    </div>
  )
}
