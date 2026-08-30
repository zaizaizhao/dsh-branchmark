import { useEffect, useRef } from 'react'
import {
  IconBranchOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconPaperclipOutline16,
  IconSparkle16,
  IconTrashOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'

function PinGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M5.2 2.5h5.6l-1 3.1 2.1 2.1v1H8.7V14L8 14.8 7.3 14V8.7H4.1v-1l2.1-2.1-1-3.1Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Render the compact multi-selection command surface used by Scheme B. */
export function BatchCommandCapsule({
  count,
  open,
  tagEditorOpen,
  tagValue,
  allPinned,
  canQuote,
  busy = false,
  onOpenChange,
  onTagValueChange,
  onCloseTagEditor,
  onApplyTags,
  onQuote,
  onSideChat,
  onNewSession,
  onTogglePinned,
  onOpenTagEditor,
  onTrash,
}: {
  readonly count: number
  readonly open: boolean
  readonly tagEditorOpen: boolean
  readonly tagValue?: string
  readonly allPinned: boolean
  readonly canQuote: boolean
  readonly busy?: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onTagValueChange?: (value: string) => void
  readonly onCloseTagEditor?: () => void
  readonly onApplyTags?: () => void
  readonly onQuote: () => void
  readonly onSideChat: () => void
  readonly onNewSession: () => void
  readonly onTogglePinned: () => void
  readonly onOpenTagEditor: () => void
  readonly onTrash: () => void
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent): void => {
      if (event.target instanceof Node && root.current?.contains(event.target) !== true) onOpenChange(false)
    }
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [onOpenChange, open])

  return (
    <div className="dbm-batch-capsule" ref={root}>
      {open && (
        <div className="dbm-batch-command-panel" role="menu" aria-label="批量处理枝签">
          {tagEditorOpen
            ? (
              <div className="dbm-batch-tag-editor">
                <label htmlFor="dbm-batch-tags">为 {String(count)} 枚枝签追加标签</label>
                <input
                  id="dbm-batch-tags"
                  className="dbm-input"
                  value={tagValue ?? ''}
                  placeholder="标签用逗号分隔"
                  onChange={event => { onTagValueChange?.(event.target.value) }}
                  autoFocus
                />
                <div>
                  <button type="button" className="dbm-button" onClick={onCloseTagEditor}>返回</button>
                  <button type="button" className="dbm-button dbm-button-primary" disabled={busy || tagValue?.trim() === ''} onClick={onApplyTags}>应用标签</button>
                </div>
              </div>
              )
            : (
              <div className="dbm-batch-command-grid">
                <button type="button" role="menuitem" title="引用到输入框" disabled={busy || !canQuote} onClick={onQuote}><IconPaperclipOutline16 /><span>引用到输入框</span></button>
                <button type="button" role="menuitem" title="Side Chat" disabled={busy} onClick={onSideChat}><IconSparkle16 /><span>Side Chat</span></button>
                <button type="button" role="menuitem" title="新会话" disabled={busy} onClick={onNewSession}><IconBranchOutline16 /><span>新会话</span></button>
                <button type="button" role="menuitem" title={allPinned ? '取消置顶' : '置顶'} disabled={busy} onClick={onTogglePinned}><PinGlyph /><span>{allPinned ? '取消置顶' : '置顶'}</span></button>
                <button type="button" role="menuitem" title="加标签" disabled={busy} onClick={onOpenTagEditor}><IconEditOutline16 /><span>加标签</span></button>
                <button type="button" role="menuitem" title="移入回收站" className="dbm-command-danger" disabled={busy} onClick={onTrash}><IconTrashOutline16 /><span>移入回收站</span></button>
              </div>
              )}
        </div>
      )}
      <button
        type="button"
        className="dbm-batch-capsule-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { onOpenChange(!open) }}
      >
        <span className="dbm-batch-selection-dot" />
        <strong>处理 {String(count)} 枚枝签</strong>
        <IconEllipsisOutline16 />
      </button>
    </div>
  )
}
