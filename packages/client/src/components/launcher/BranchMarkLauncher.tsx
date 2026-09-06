/** Session and temporary Side Chat launch orchestration inside the Dock. */
import { useId, useState } from 'react'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ClipId, DerivedSessionMode } from 'dsh-branchmark-host/types'
import type { BranchMarkClient } from '../../domain/client.ts'
import type { BranchMarkLauncher, BranchMarkUiController } from '../../domain/controller.ts'
import { formatClipSource } from '../../domain/clip-presentation.ts'
import { BranchMarkLogo } from '../BranchMarkLogo.tsx'
import { useBranchMarkText } from '../shared/text.ts'
import { ContextModePicker } from './ContextModePicker.tsx'

/** Render an explicit launch flow with an optional title and new question.
 * @param props - Source Session, selected Clips, and browser integration services.
 * @returns A context picker whose blank mode never carries Clip text or notes.
 */
export function BranchMarkLauncherSheet({
  launcher,
  client,
  controller,
}: {
  readonly launcher: BranchMarkLauncher
  readonly client: BranchMarkClient
  readonly controller: BranchMarkUiController
}) {
  const t = useBranchMarkText()
  const sourceName = useId()
  const sideChatIntent = launcher.intent === 'side-chat'
  const sourceClips = launcher.clips.filter(
    (clip) => clip.source.kind === 'session-message' && clip.source.forkable,
  )
  const sourceIds = new Set(sourceClips.map((clip) => clip.ownerSessionId))
  const defaultPrimary = sourceClips.toSorted((left, right) => {
    const leftSeq = left.source.kind === 'session-message' ? left.source.eventSeq : -1
    const rightSeq = right.source.kind === 'session-message' ? right.source.eventSeq : -1
    return rightSeq - leftSeq
  })[0]
  const [mode, setMode] = useState<DerivedSessionMode>(
    launcher.clips.length === 0 ? 'blank' : defaultPrimary === undefined ? 'clips-only' : 'full-fork',
  )
  const [primaryId, setPrimaryId] = useState<ClipId | undefined>(
    sourceIds.size <= 1 ? defaultPrimary?.id : undefined,
  )
  const [notes, setNotes] = useState<ReadonlySet<ClipId>>(
    () => new Set(launcher.clips.filter((clip) => clip.note !== undefined).map((clip) => clip.id)),
  )
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const carriesClips = sideChatIntent || mode !== 'blank'
  const needsPrimary = sideChatIntent || mode === 'full-fork'
  const launchSession = async (send: boolean): Promise<void> => {
    if (mode === 'full-fork' && primaryId === undefined) {
      controller.notify('error', t('pickPrimary'))
      return
    }
    if (send && question.trim() === '') {
      controller.notify('error', t('questionRequired'))
      return
    }
    setBusy(true)
    try {
      await client.launch({
        workspaceId: launcher.workspaceId,
        parentSessionId: launcher.sourceSessionId,
        clips: launcher.clips,
        mode,
        title,
        ...(mode === 'full-fork' && primaryId !== undefined ? { primaryClipId: primaryId } : {}),
        includeNotes: notes,
        ...(send ? { question: question.trim() } : {}),
      })
      controller.clipsChanged()
      controller.closeLauncher()
      controller.notify(
        'success',
        t(send ? 'branchStarted' : mode === 'blank' ? 'blankCreated' : 'branchCreated'),
      )
    } catch (error) {
      controller.notify('error', error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  const launchSideChat = async (): Promise<void> => {
    const primary = launcher.clips.find((clip) => clip.id === primaryId)
    if (primary?.source.kind !== 'session-message') {
      controller.notify('error', t('pickPrimary'))
      return
    }
    setBusy(true)
    try {
      const snapshot = await client.createSideChat({
        workspaceId: launcher.workspaceId,
        ownerSessionId: primary.source.sessionId,
        primaryClipId: primary.id,
        clips: launcher.clips.map((clip) => ({ clipId: clip.id, includeNote: notes.has(clip.id) })),
      })
      controller.upsertSideChat(snapshot, true)
    } catch (error) {
      controller.notify('error', error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section
      className="dbm-launch-sheet"
      role="dialog"
      aria-modal="false"
      aria-label={t(sideChatIntent ? 'sideChat' : 'newSession')}
    >
      <div className="dbm-launch-header">
        <div>
          <strong>{t(sideChatIntent ? 'sideChat' : 'newSession')}</strong>
          <span>
            {t('branchFrom', { title: client.sessionTitle(launcher.sourceSessionId) ?? t('currentSession') })}
          </span>
        </div>
        <button
          type="button"
          className="dbm-button dbm-icon-button"
          aria-label={t('close')}
          disabled={busy}
          onClick={() => {
            controller.closeLauncher()
          }}
        >
          <IconCloseOutline16 />
        </button>
      </div>
      <div className="dbm-launch-scroll">
        {!sideChatIntent && (
          <section className="dbm-launch-section">
            <label className="dbm-field-label">
              {t('sessionName')}
              <input
                className="dbm-input"
                value={title}
                placeholder={t('namePlaceholder')}
                maxLength={120}
                onChange={(event) => {
                  setTitle(event.target.value)
                }}
              />
            </label>
          </section>
        )}
        {!sideChatIntent && (
          <section className="dbm-launch-section">
            <ContextModePicker
              value={mode}
              canFork={sourceClips.length > 0}
              hasClips={launcher.clips.length > 0}
              onChange={setMode}
            />
          </section>
        )}
        {needsPrimary && (
          <section className="dbm-launch-section">
            <h3>{t('primarySource')}</h3>
            {sourceIds.size > 1 && <p className="dbm-warning">{t('chooseSource')}</p>}
            {sourceClips.map((clip) => (
              <label className="dbm-source-row" key={clip.id}>
                <input
                  type="radio"
                  name={sourceName}
                  checked={primaryId === clip.id}
                  onChange={() => {
                    setPrimaryId(clip.id)
                  }}
                />
                <span>
                  <strong>{clip.excerpt}</strong>
                  <small>{formatClipSource(clip)}</small>
                </span>
              </label>
            ))}
          </section>
        )}
        {carriesClips ? (
          <section className="dbm-launch-section">
            <h3>{t('attachments')}</h3>
            {launcher.clips.map((clip) => (
              <div className="dbm-source-row" key={clip.id}>
                <BranchMarkLogo compact size={14} />
                <span>
                  <strong>{clip.excerpt}</strong>
                  <small>{formatClipSource(clip)}</small>
                </span>
                {clip.note !== undefined && (
                  <label className="dbm-note-toggle">
                    <input
                      type="checkbox"
                      checked={notes.has(clip.id)}
                      onChange={() => {
                        setNotes((current) => {
                          const next = new Set(current)
                          if (next.has(clip.id)) next.delete(clip.id)
                          else next.add(clip.id)
                          return next
                        })
                      }}
                    />
                    {t('note')}
                  </label>
                )}
              </div>
            ))}
          </section>
        ) : (
          <p className="dbm-blank-summary">{t('noClipContext')}</p>
        )}
        {!sideChatIntent && (
          <section className="dbm-launch-section">
            <label className="dbm-field-label">
              {t('optionalQuestion')}
              <textarea
                className="dbm-textarea"
                rows={3}
                value={question}
                placeholder={t('questionPlaceholder')}
                onChange={(event) => {
                  setQuestion(event.target.value)
                }}
              />
            </label>
          </section>
        )}
      </div>
      <div className="dbm-launch-actions">
        {sideChatIntent ? (
          <button
            type="button"
            className="dbm-button dbm-button-primary"
            disabled={busy || primaryId === undefined}
            onClick={() => {
              void launchSideChat()
            }}
          >
            {t('sideChat')}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="dbm-button dbm-button-primary"
              disabled={busy}
              onClick={() => {
                void launchSession(false)
              }}
            >
              {t('createAndOpen')}
            </button>
            <button
              type="button"
              className="dbm-button"
              disabled={busy || question.trim() === ''}
              onClick={() => {
                void launchSession(true)
              }}
            >
              {t('createAndSend')}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
