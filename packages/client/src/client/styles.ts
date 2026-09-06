/** Installs the feature-owned styles as one disposable plugin stylesheet. */
import { BASE_CSS } from './styles/base.ts'
import { SHELL_CSS } from './styles/shell.ts'
import { CLIPS_CSS } from './styles/clips.ts'
import { LAUNCHER_CSS } from './styles/launcher.ts'
import { LINEAGE_CSS } from './styles/lineage.ts'
import { SIDE_CHAT_CSS } from './styles/side-chat.ts'
import { SELECTION_CSS } from './styles/selection.ts'

const STYLE_ID = 'dsh-branchmark-styles'
const CSS = [BASE_CSS, SHELL_CSS, CLIPS_CSS, LAUNCHER_CSS, LINEAGE_CSS, SIDE_CHAT_CSS, SELECTION_CSS].join(
  '\n',
)

/** Install one tagged stylesheet and return its disposer. */
export function installBranchMarkStyles(): () => void {
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.dataset.plugin = 'dsh-branchmark-client'
  style.textContent = CSS
  document.head.append(style)
  return () => {
    style.remove()
  }
}
