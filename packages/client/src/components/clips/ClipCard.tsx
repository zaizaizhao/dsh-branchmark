/** Compact Clip reading and primary actions; metadata editing stays in dedicated controls. */
import { useState, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  IconBranchOutline16,
  IconChevronDownOutline14,
  IconPaperclipOutline16,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Clip, DerivedSessionRelation } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import type { BranchMarkUiController } from '../../domain/controller.ts'
import { formatClipSource, formatClipTime } from '../../domain/clip-presentation.ts'
import { useBranchMarkText } from '../shared/text.ts'
import { ClipCardMenu } from './ClipCardMenu.tsx'
import { ClipExcerpt } from './ClipExcerpt.tsx'
import { ClipFocusDialog } from './ClipFocusDialog.tsx'
import { useClipActions } from './useClipActions.ts'
import { ClipEditor } from './ClipEditor.tsx'

/** Render one Clip with natural height and a measured long-excerpt expansion.
 * @param props - Clip state, selection, retained relationships, and public client actions.
 * @returns A card with compact session, quote, and Side Chat actions.
 */
export function ClipCard({
  clip,
  selected,
  onSelect,
  client,
  controller,
  trash,
  currentSessionId,
  dragHandle,
  relations,
}: {
  readonly clip: Clip
  readonly selected: boolean
  readonly onSelect: () => void
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
  readonly trash: boolean
  readonly currentSessionId?: SessionId
  readonly dragHandle: ReactNode
  readonly relations: readonly DerivedSessionRelation[]
}) {
  const t = useBranchMarkText()
  const [editing, setEditing] = useState<'note' | 'tags' | null>(null)
  const [focused, setFocused] = useState(false)
  const { busy, quote, startSideChat, action, saveMetadata, restore } = useClipActions({
    clip,
    client,
    controller,
    currentSessionId,
    onEdit: setEditing,
    onFocus: () => {
      setFocused(true)
    },
  })
  return (
    <>
      <article
        className="dbm-card"
        data-selected={selected}
        data-scope={clip.scope}
        data-pinned={clip.pinnedAt !== undefined}
        data-dbm-clip-id={clip.id}
        onClick={() => {
          if (!trash && window.getSelection()?.isCollapsed !== false) onSelect()
        }}
      >
        <div className="dbm-card-scope">
          {!trash && (
            <input
              type="checkbox"
              aria-label={t('selectClip')}
              checked={selected}
              onClick={(event) => {
                event.stopPropagation()
              }}
              onChange={onSelect}
            />
          )}
          <i />
          <span>
            {t(clip.scope === 'project' ? 'projectClip' : 'sessionClip')} · {formatClipTime(clip.createdAt)}
          </span>
          {clip.pinnedAt !== undefined && <b className="dbm-pin-badge">{t('pinned')}</b>}
          {!trash && dragHandle}
          <ClipCardMenu clip={clip} busy={busy} onAction={action} />
        </div>
        <ClipExcerpt
          text={clip.excerpt}
          onFocus={() => {
            setFocused(true)
          }}
        />
        {clip.note !== undefined && (
          <p className="dbm-note">
            <span>{t('note')}</span>
            {clip.note}
          </p>
        )}
        {clip.tags.length > 0 && (
          <div className="dbm-tags">
            {clip.tags.map((tag) => (
              <span className="dbm-tag" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="dbm-meta">{formatClipSource(clip)}</div>
        {relations.length > 0 && (
          <details
            className="dbm-derived"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <summary>
              <IconBranchOutline16 size={12} />
              {t('derivedCount', { count: relations.length })}
              <IconChevronDownOutline14 />
            </summary>
            {relations.map((relation) => (
              <button
                type="button"
                className="dbm-derived-link"
                key={relation.derivedSessionId}
                onClick={() => {
                  void client
                    .openRelatedSession(relation.derivedSessionId, clip.workspaceId)
                    .catch((error) => {
                      controller.notify('error', error instanceof Error ? error.message : String(error))
                    })
                }}
              >
                <span>
                  {t(
                    relation.mode === 'full-fork'
                      ? 'fullFork'
                      : relation.mode === 'blank'
                        ? 'blankBranch'
                        : 'clipsOnly',
                  )}
                </span>
                <strong>{client.sessionTitle(relation.derivedSessionId) ?? t('derivedSession')}</strong>
                <i>↗</i>
              </button>
            ))}
          </details>
        )}
        <div
          className="dbm-card-actions"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          {trash ? (
            <button type="button" className="dbm-button dbm-button-branch" disabled={busy} onClick={restore}>
              {t('restore')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="dbm-button dbm-button-branch"
                disabled={busy}
                onClick={() => {
                  controller.openLauncher('session', clip.workspaceId, clip.ownerSessionId, [clip])
                }}
              >
                <IconBranchOutline16 size={13} />
                {t('newSession')}
              </button>
              <button
                type="button"
                className="dbm-button"
                disabled={busy || currentSessionId === undefined}
                title={currentSessionId === undefined ? t('composerUnavailable') : t('quote')}
                onClick={quote}
              >
                <IconPaperclipOutline16 size={13} />
                {t('quote')}
              </button>
              <button
                type="button"
                className="dbm-button"
                disabled={busy}
                onClick={() => {
                  void startSideChat()
                }}
              >
                <IconSparkle16 size={13} />
                {t('sideChat')}
              </button>
            </>
          )}
        </div>
      </article>
      {editing !== null && (
        <ClipEditor
          key={`${clip.id}:${editing}`}
          clip={clip}
          field={editing}
          busy={busy}
          onClose={() => {
            setEditing(null)
          }}
          onSave={(value) => {
            saveMetadata(editing, value)
          }}
        />
      )}
      <ClipFocusDialog
        clip={clip}
        open={focused}
        onClose={() => {
          setFocused(false)
        }}
        {...(!trash && currentSessionId !== undefined ? { onQuote: quote } : {})}
      />
    </>
  )
}
