/** Explicit history choices for a new branch. */
import { useId } from 'react'
import type { DerivedSessionMode } from 'dsh-branchmark-host/types'
import { useBranchMarkText } from '../shared/text.ts'

const MODES = [
  { mode: 'full-fork', label: 'fullFork', hint: 'fullForkHint' },
  { mode: 'clips-only', label: 'clipsOnly', hint: 'clipsOnlyHint' },
  { mode: 'blank', label: 'blankBranch', hint: 'blankBranchHint' },
] as const

/** Select a branch's model context independently of its organizational parent.
 * @param props - Current mode, available context, and selection callback.
 * @returns Three mutually exclusive, labelled context choices.
 */
export function ContextModePicker({
  value,
  canFork,
  hasClips,
  onChange,
}: {
  readonly value: DerivedSessionMode
  readonly canFork: boolean
  readonly hasClips: boolean
  readonly onChange: (mode: DerivedSessionMode) => void
}) {
  const t = useBranchMarkText()
  const name = useId()
  return (
    <fieldset className="dbm-context-modes">
      <legend>{t('contextMode')}</legend>
      {MODES.map(({ mode, label, hint }) => {
        const disabled = mode === 'full-fork' ? !canFork : mode === 'clips-only' && !hasClips
        return (
          <label key={mode} className="dbm-mode" data-active={value === mode} data-disabled={disabled}>
            <input
              type="radio"
              name={name}
              checked={value === mode}
              disabled={disabled}
              onChange={() => {
                onChange(mode)
              }}
            />
            <span>
              <strong>{t(label)}</strong>
              <small>{t(hint)}</small>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
