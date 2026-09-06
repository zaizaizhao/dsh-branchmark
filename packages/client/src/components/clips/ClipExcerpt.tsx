/** Natural-height excerpt reading with controls only when content is clipped. */
import { useEffect, useRef, useState } from 'react'
import {
  IconChevronDownOutline14,
  IconFullscreenOutline16,
  MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { BRANCHMARK_MARKDOWN_LABELS } from '../markdown.ts'
import { useBranchMarkText } from '../shared/text.ts'

/** Expand long excerpts without reserving empty space below short ones.
 * @param props - Immutable excerpt and focused-reading callback.
 * @returns Measured Markdown text with contextual reading controls.
 */
export function ClipExcerpt({ text, onFocus }: { readonly text: string; readonly onFocus: () => void }) {
  const t = useBranchMarkText()
  const [expanded, setExpanded] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const excerpt = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const content = excerpt.current
    const shell = content?.parentElement
    if (content === null || shell == null || expanded) return
    const measure = (): void => {
      setOverflow(content.scrollHeight > shell.clientHeight + 1)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    measure()
    return () => {
      observer.disconnect()
    }
  }, [text, expanded])
  return (
    <div className="dbm-card-reading" data-expanded={expanded}>
      <div className="dbm-excerpt-shell">
        <div className="dbm-excerpt" ref={excerpt}>
          <MarkdownText text={text} labels={BRANCHMARK_MARKDOWN_LABELS} />
        </div>
      </div>
      {(overflow || expanded) && (
        <div
          className="dbm-reading-actions"
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          <button
            type="button"
            className="dbm-reading-action"
            aria-expanded={expanded}
            onClick={() => {
              setExpanded((value) => !value)
            }}
          >
            <IconChevronDownOutline14 />
            {t(expanded ? 'collapseExcerpt' : 'expandExcerpt')}
          </button>
          <button type="button" className="dbm-reading-action dbm-focus-trigger" onClick={onFocus}>
            <IconFullscreenOutline16 size={13} />
            {t('focusReading')}
          </button>
        </div>
      )}
    </div>
  )
}
