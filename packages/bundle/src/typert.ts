/** Host reflection manifest republished under the installable bundle identity. */

import { TYPERT as hostTypert } from 'dsh-branchmark-host/typert'
import type { TypertContribution } from '@deepseek-ai/dsh-typert-registry/types'

const contribution = hostTypert as TypertContribution

export const TYPERT: TypertContribution = Object.freeze({
  ...contribution,
  package: 'dsh-branchmark',
})
