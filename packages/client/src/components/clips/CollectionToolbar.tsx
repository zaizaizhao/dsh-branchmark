/** Search and trash remain distinct, labelled collection controls. */
import { IconSearchOutline16, IconTrashOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { useBranchMarkText } from '../shared/text.ts'

/** Render the search field and a separate trash button with an exact nonzero count.
 * @param props - Search state, trash state, and change callbacks.
 * @returns A compact responsive collection toolbar.
 */
export function CollectionToolbar({
  search,
  onSearch,
  trash,
  trashCount,
  onToggleTrash,
}: {
  readonly search: string
  readonly onSearch: (value: string) => void
  readonly trash: boolean
  readonly trashCount: number
  readonly onToggleTrash: () => void
}) {
  const t = useBranchMarkText()
  return (
    <div className="dbm-toolbar">
      <label className="dbm-search">
        <IconSearchOutline16 size={14} />
        <input
          type="search"
          value={search}
          aria-label={t('search')}
          placeholder={t('search')}
          onChange={(event) => {
            onSearch(event.target.value)
          }}
        />
      </label>
      <button type="button" className="dbm-trash-toggle" aria-pressed={trash} onClick={onToggleTrash}>
        <IconTrashOutline16 size={15} />
        <span>{t('trash')}</span>
        {trashCount > 0 && <b>{trashCount}</b>}
      </button>
    </div>
  )
}
