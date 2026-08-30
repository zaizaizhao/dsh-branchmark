interface SelectionActionsProps {
  readonly disabled: boolean
  readonly onSaveSession: () => void
  readonly onSaveProject: () => void
  readonly onSideChat: () => void
  readonly onReference: () => void
}

/** Render the compact actions attached to one DSH text selection.
 * @param props - Disabled state and the four explicit action callbacks.
 * @returns A segmented action strip without changing the browser selection.
 */
export function SelectionActions({
  disabled, onSaveSession, onSaveProject, onSideChat, onReference,
}: SelectionActionsProps) {
  return (
    <>
      <button type="button" className="dbm-selection-action" data-kind="session" title="保存为当前会话的私有枝签" disabled={disabled} onClick={onSaveSession}>摘录到会话</button>
      <button type="button" className="dbm-selection-action" data-kind="project" title="保存为当前项目内跨会话可见的枝签" disabled={disabled} onClick={onSaveProject}>摘录到项目</button>
      <button type="button" className="dbm-selection-action" data-kind="side-chat" disabled={disabled} onClick={onSideChat}>Ask in side</button>
      <button type="button" className="dbm-selection-action" data-kind="reference" disabled={disabled} onClick={onReference}>引用到输入框</button>
    </>
  )
}
