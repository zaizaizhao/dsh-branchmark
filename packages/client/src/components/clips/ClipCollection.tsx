import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { IconListPenOutline16, IconTrashOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip, ClipId } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import type { BranchMarkUiController } from '../../domain/controller.ts'
import { useBranchMarkUi } from '../../domain/controller.ts'
import { useCollectionActions } from './useCollectionActions.ts'
import { ClipBatchActions } from './ClipBatchActions.tsx'
import { BranchMarkLogo } from '../BranchMarkLogo.tsx'
import { useClipCollection, type CollectionMode } from './useClipCollection.ts'
import { SortableClips } from './SortableClips.tsx'
import { CollectionToolbar } from './CollectionToolbar.tsx'
import { useBranchMarkText } from '../shared/text.ts'
import { ClipCard } from './ClipCard.tsx'

/** Render one visibility-safe session or project Clip collection.
 * @param props - Collection scope, current identities, Client adapter, and UI controller.
 * @returns Search, filters, Clip cards, trash, and selected-Clip batch actions.
 */
export function ClipCollection({
  mode,
  workspaceId,
  sessionId,
  client,
  controller,
}: {
  readonly mode: CollectionMode
  readonly workspaceId: WorkspaceId | undefined
  readonly sessionId: SessionId | undefined
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const t = useBranchMarkText()
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([])
  const [selectedIds, setSelectedIds] = useState<readonly ClipId[]>([])
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [trash, setTrash] = useState(false)
  const [batchTags, setBatchTags] = useState('')
  const [batchOpen, setBatchOpen] = useState(false)
  const [tagEditorOpen, setTagEditorOpen] = useState(false)
  const [orderOverride, setOrderOverride] = useState<readonly ClipId[] | null>(null)
  const state = useBranchMarkUi(controller)
  const loaded = useClipCollection(client, mode, workspaceId, sessionId, state.clipsRevision)
  const collection = trash ? loaded.trash : loaded.active
  const tags = useMemo(() => [...new Set(collection.flatMap((clip) => clip.tags))].sort(), [collection])
  const clips = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return collection.filter(
      (clip) =>
        (query === '' ||
          [clip.excerpt, clip.note ?? '', ...clip.tags].join(' ').toLocaleLowerCase().includes(query)) &&
        selectedTags.every((tag) => clip.tags.includes(tag)),
    )
  }, [collection, search, selectedTags])
  const displayedClips = useMemo(() => {
    if (orderOverride === null) return clips
    const byId = new Map(clips.map((clip) => [clip.id, clip]))
    if (orderOverride.length !== clips.length || orderOverride.some((id) => !byId.has(id))) return clips
    return orderOverride.map((id) => byId.get(id)!)
  }, [clips, orderOverride])
  const selected = useMemo(() => {
    const byId = new Map(clips.map((clip) => [clip.id, clip]))
    return selectedIds.flatMap((id) => {
      const clip = byId.get(id)
      return clip === undefined ? [] : [clip]
    })
  }, [clips, selectedIds])
  const canReorder = !trash && !loaded.loading && search.trim() === '' && selectedTags.length === 0
  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => clips.some((clip) => clip.id === id)))
  }, [clips])
  useEffect(() => {
    if (orderOverride === null) return
    const loadedIds = clips.map((clip) => clip.id)
    if (
      loadedIds.join('\0') === orderOverride.join('\0') ||
      loadedIds.some((id) => !orderOverride.includes(id)) ||
      loadedIds.length !== orderOverride.length
    )
      setOrderOverride(null)
  }, [clips, orderOverride])
  const toggle = (id: ClipId): void => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]))
  }
  const {
    batchBusy,
    orderSaving,
    allPinned,
    batch,
    quoteSelected,
    openSelectedSideChat,
    moveClip,
    openSelectedSession,
  } = useCollectionActions({
    mode,
    workspaceId,
    sessionId,
    selected,
    displayedClips,
    canReorder,
    batchTags,
    client,
    controller,
    onOrderChange: setOrderOverride,
    onClosePanel: () => {
      setBatchOpen(false)
      setTagEditorOpen(false)
    },
    onComplete: () => {
      setSelectedIds([])
      setBatchTags('')
      setBatchOpen(false)
      setTagEditorOpen(false)
    },
  })
  if (workspaceId === undefined || (mode === 'session' && sessionId === undefined)) {
    return (
      <div className="dbm-empty">
        <div>
          <strong>没有可用的会话</strong>
          <p>打开一个项目会话后即可使用枝签 Dock。</p>
        </div>
      </div>
    )
  }
  const clearFilters = (): void => {
    setSearch('')
    setSelectedTags([])
  }
  const toggleTrash = (): void => {
    setTrash((value) => !value)
    setSelectedIds([])
    clearFilters()
  }
  const renderClip = (clip: Clip, handle: ReactNode) => (
    <ClipCard
      key={clip.id}
      clip={clip}
      selected={selectedIds.includes(clip.id)}
      onSelect={() => {
        toggle(clip.id)
      }}
      client={client}
      controller={controller}
      trash={trash}
      dragHandle={handle}
      relations={loaded.relations.filter((relation) => relation.attachedClipIds.includes(clip.id))}
      {...(sessionId === undefined ? {} : { currentSessionId: sessionId })}
    />
  )
  const filtered = search.trim() !== '' || selectedTags.length > 0
  return (
    <div className="dbm-collection">
      <CollectionToolbar
        search={search}
        onSearch={setSearch}
        trash={trash}
        trashCount={loaded.trash.length}
        onToggleTrash={toggleTrash}
      />
      {trash && (
        <div className="dbm-trash-banner">
          <IconTrashOutline16 />
          <span>
            <strong>{t('trash')}</strong>
            <small>{t('trashHint')}</small>
          </span>
          <button type="button" className="dbm-button" onClick={toggleTrash}>
            {t('backToClips')}
          </button>
        </div>
      )}
      <div className="dbm-collection-summary">
        <span>
          {selected.length > 0
            ? t('selectedCount', { count: selected.length })
            : t(mode === 'project' ? 'projectScope' : 'sessionScope')}
        </span>
        {selected.length > 0 && (
          <button
            type="button"
            className="dbm-button"
            onClick={() => {
              setSelectedIds([])
            }}
          >
            {t('clearSelection')}
          </button>
        )}
        {mode === 'project' && (
          <button
            type="button"
            className="dbm-button dbm-icon-button"
            aria-label={t(view === 'grid' ? 'listView' : 'cardView')}
            onClick={() => {
              setView((value) => (value === 'grid' ? 'list' : 'grid'))
            }}
          >
            <IconListPenOutline16 />
          </button>
        )}
      </div>
      {tags.length > 0 && (
        <div className="dbm-tags dbm-filter-tags" aria-label={t('filterTags')}>
          <button
            type="button"
            className="dbm-tag"
            data-active={selectedTags.length === 0}
            aria-pressed={selectedTags.length === 0}
            onClick={() => {
              setSelectedTags([])
            }}
          >
            {t('allTags')}
          </button>
          {tags.map((tag) => (
            <button
              type="button"
              className="dbm-tag"
              data-active={selectedTags.includes(tag)}
              aria-pressed={selectedTags.includes(tag)}
              key={tag}
              onClick={() => {
                setSelectedTags((values) =>
                  values.includes(tag) ? values.filter((value) => value !== tag) : [...values, tag],
                )
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
      {loaded.loading && (
        <div className="dbm-loading" role="status">
          {t('loadingClips')}
        </div>
      )}
      {loaded.error !== undefined && (
        <div className="dbm-error">
          {loaded.error}
          <button
            type="button"
            className="dbm-button"
            onClick={() => {
              controller.clipsChanged()
            }}
          >
            {t('retry')}
          </button>
        </div>
      )}
      {!loaded.loading && loaded.error === undefined && clips.length === 0 && (
        <div className="dbm-empty">
          <div>
            <div className="dbm-empty-orb">
              {trash ? <IconTrashOutline16 size={22} /> : <BranchMarkLogo compact size={20} />}
            </div>
            <strong>{t(filtered ? 'noMatches' : trash ? 'trashEmpty' : 'noClips')}</strong>
            <p>{t(filtered ? 'noMatchesHint' : trash ? 'trashHint' : 'noClipsHint')}</p>
            {filtered && (
              <button type="button" className="dbm-button" onClick={clearFilters}>
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>
      )}
      <SortableClips
        clips={displayedClips}
        disabled={!canReorder || orderSaving || batchBusy}
        trash={trash}
        view={mode === 'project' ? view : 'list'}
        renderClip={renderClip}
        onMove={(source, target) => {
          void moveClip(source, target)
        }}
      />
      {selected.length >= 2 && !trash && (
        <ClipBatchActions
          count={selected.length}
          onClearSelection={() => {
            setSelectedIds([])
          }}
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
          onCloseTagEditor={() => {
            setTagEditorOpen(false)
          }}
          onApplyTags={() => {
            void batch('tags')
          }}
          onQuote={quoteSelected}
          onSideChat={() => {
            void openSelectedSideChat()
          }}
          onNewSession={openSelectedSession}
          onTogglePinned={() => {
            void batch('pin')
          }}
          onOpenTagEditor={() => {
            setTagEditorOpen(true)
          }}
          onTrash={() => {
            void batch('trash')
          }}
        />
      )}
    </div>
  )
}
