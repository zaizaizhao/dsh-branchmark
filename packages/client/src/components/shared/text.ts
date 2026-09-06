/** Shares the framework's translation function with the Dock's feature components. */
import { createContext, useContext } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '../../locales/index.ts'

export const BranchMarkTextContext = createContext<TranslateNS<'branchmark'> | null>(null)

/** Read the owning Slot's live locale translation function.
 * @returns The typed BranchMark translator.
 */
export function useBranchMarkText(): TranslateNS<'branchmark'> {
  const t = useContext(BranchMarkTextContext)
  if (t === null) throw new Error('BranchMark components require the locale provider')
  return t
}
