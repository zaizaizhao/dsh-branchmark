/** Pointer and keyboard sorting with pinned groups and animated card placement. */
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Clip, ClipId } from 'dsh-branchmark-host/types'
import { useBranchMarkText } from '../shared/text.ts'

const withinGroup: CollisionDetection = (args) =>
  closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (item) => item.data.current?.group === args.active.data.current?.group,
    ),
  })

function SortableClip({
  clip,
  disabled,
  render,
}: {
  readonly clip: Clip
  readonly disabled: boolean
  readonly render: (handle: ReactNode) => ReactNode
}) {
  const t = useBranchMarkText()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: clip.id,
      disabled,
      data: { group: clip.pinnedAt === undefined ? 'regular' : 'pinned' },
      transition: { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' },
    })
  const handle = (
    <button
      type="button"
      className="dbm-drag-handle"
      ref={setActivatorNodeRef}
      disabled={disabled}
      {...attributes}
      {...listeners}
      aria-label={t('dragClip')}
      title={t(disabled ? 'dragDisabled' : 'dragClip')}
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M5 3h.01M5 8h.01M5 13h.01M11 3h.01M11 8h.01M11 13h.01"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
  return (
    <div
      className="dbm-sortable-clip"
      ref={setNodeRef}
      data-dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {render(handle)}
    </div>
  )
}

/** Sort complete collections while keeping active content out of the drag preview.
 * @param props - Ordered Clips, view mode, card renderer, and committed move callback.
 * @returns Independently sortable pin groups and a pointer-following preview.
 */
export function SortableClips({
  clips,
  disabled,
  trash,
  view,
  renderClip,
  onMove,
}: {
  readonly clips: readonly Clip[]
  readonly disabled: boolean
  readonly trash: boolean
  readonly view: 'grid' | 'list'
  readonly renderClip: (clip: Clip, handle: ReactNode) => ReactNode
  readonly onMove: (sourceId: ClipId, targetId: ClipId) => void
}) {
  const t = useBranchMarkText()
  const [activeId, setActiveId] = useState<ClipId | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const active = clips.find((clip) => clip.id === activeId)
  const groups = [
    clips.filter((clip) => clip.pinnedAt !== undefined),
    clips.filter((clip) => clip.pinnedAt === undefined),
  ]
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={withinGroup}
      accessibility={{
        screenReaderInstructions: { draggable: t('dragInstructions') },
        announcements: {
          onDragStart: () => t('dragStarted'),
          onDragOver: ({ over }) =>
            over === null
              ? undefined
              : t('dragOver', { position: clips.findIndex((clip) => clip.id === over.id) + 1 }),
          onDragEnd: () => t('dragEnded'),
          onDragCancel: () => t('dragCancelled'),
        },
      }}
      onDragStart={({ active: item }) => {
        setActiveId(item.id as ClipId)
      }}
      onDragCancel={() => {
        setActiveId(null)
      }}
      onDragEnd={({ active: item, over }) => {
        setActiveId(null)
        if (!disabled && over !== null && item.id !== over.id) onMove(item.id as ClipId, over.id as ClipId)
      }}
    >
      {groups.map((group, index) =>
        group.length === 0 ? null : (
          <section className="dbm-clip-group" key={index}>
            <div className="dbm-collection-divider">
              <span>
                {t(trash ? 'trashedClips' : index === 0 ? 'pinned' : 'allClips')} · {group.length}
              </span>
              <i />
            </div>
            <SortableContext
              items={group.map((clip) => clip.id)}
              strategy={view === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
            >
              <div className="dbm-card-grid" data-view={view}>
                {group.map((clip) => (
                  <SortableClip
                    clip={clip}
                    disabled={disabled}
                    key={clip.id}
                    render={(handle) => renderClip(clip, handle)}
                  />
                ))}
              </div>
            </SortableContext>
          </section>
        ),
      )}
      {createPortal(
        <DragOverlay
          dropAnimation={
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? null
              : { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' }
          }
        >
          {active === undefined ? null : (
            <div className="dbm-card dbm-drag-preview" aria-hidden="true">
              <div className="dbm-card-scope">
                {t(active.scope === 'session' ? 'sessionClip' : 'projectClip')}
              </div>
              <div className="dbm-drag-preview-excerpt">{active.excerpt}</div>
              {active.note !== undefined && <p className="dbm-note">{active.note}</p>}
              <div className="dbm-tags">
                {active.tags.map((tag) => (
                  <span key={tag} className="dbm-tag">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
