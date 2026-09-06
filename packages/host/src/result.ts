/** Immutable business results shared by BranchMark's storage services. */

import type { ClipFailure, ClipRejected, ClipSuccess } from './types.ts'

/** Wrap an accepted value without changing its ownership.
 * @param value - Business result.
 * @returns An immutable success envelope.
 */
export function success<T>(value: T): ClipSuccess<T> {
  return Object.freeze({ ok: true, value })
}

/** Wrap a stable business rejection for the Remote transport.
 * @param error - Domain failure.
 * @returns An immutable rejection envelope.
 */
export function rejected(error: ClipFailure): ClipRejected {
  return Object.freeze({ ok: false, error: Object.freeze(error) })
}
