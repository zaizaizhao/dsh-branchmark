# Agent Note: Compact batch commands and Clip ordering

Status: implemented

English | [中文](2026-08-30-compact-batch-commands-and-clip-ordering.zh.md)

## Problem

The project and Session collections expose several per-Clip actions, but an always-expanded multi-selection bar repeats controls, consumes the narrow Dock's reading area, and wraps poorly. Long excerpts also make card heights unpredictable. A visual drag interaction without a Host-owned ordering rule would let filtered results reorder hidden Clips or mix pinned and unpinned records without an explicit user decision.

## Decision

Multi-selection renders one sticky command capsule. Opening it reveals six explicit commands: attach to Composer, create Side Chat, create a Session, toggle pin state, add tags, and move to trash. The tag input appears only after choosing the tag command. At narrow container widths the command labels become visually hidden while their accessible text remains available. Batch Composer attachment receives Clips in selection order and invokes the existing head insertion in reverse, so the final native Reference Chip order matches the user's selection and no action sends the draft.

DSH persists each occurrence through its `clipboardText` projection and restores the draft without the process-local occurrence table. BranchMark's projection is `@branchmark:<ClipId>`. The Shell watches the current Composer for those tokens, resolves each id against the visible Session and project collections, and replaces matches from right to left through the public `insertReference()` API. This reconstructs native Chips without changing surrounding draft text; unresolved tokens remain visible instead of pretending to carry model context.

Cards use a fixed collapsed reading height. Users can expand a card in place or open the immutable excerpt in a centered DSH Modal. Pin, drag, editing, and derivation controls remain outside the excerpt text. The drag handle is the only drag origin so text selection and card selection remain independent. The handle captures the pointer for the gesture, while window-level pointer-release and mouse-release listeners resolve the card beneath the final coordinates. The mouse listener covers hosts that synthesize a release without returning React's pointer event to the captured button. The active drag id lives in a synchronous gesture-local ref so the release handler can read it before React schedules another render.

`Clip.pinnedAt` and `Clip.sortIndex` are optional fields in the existing `clip_explorer` version 1 domain. Existing records therefore remain valid without a storage migration. Pinned Clips sort before unpinned Clips; an unindexed record sorts before previously indexed records in its group and then uses creation time and id as stable fallbacks.

Reordering reuses `batchUpdate`. The request contains the complete active collection order and identifies either the project collection or one owner Session collection. The Host validates every id, exact collection membership, and the pinned-before-unpinned grouping before writing consecutive indices. Search, tag-filter, and trash views disable drag, and the Client rejects cross-group drops before issuing a request. Pin or scope changes clear the affected Clip's prior `sortIndex` because both operations move it into a different ordered collection.

## Alternatives considered

**Keep every batch action permanently visible.** Rejected because the Dock has a 340px supported minimum width and the action row competes directly with Clip content. Horizontal scrolling also hides available actions without establishing a clear primary interaction.

**Persist the order of only currently visible search results.** Rejected because omitted Clips have no unambiguous destination. Requiring the complete active collection makes one request a full replacement order and lets the Host reject accidental partial mutations.

**Allow dragging directly across the pin divider.** Rejected because ordering and pinning express different decisions. A cross-group move would otherwise change durable pin state as a side effect of spatial movement.

**Store only one numeric rank and infer pin state from its range.** Rejected because pinning is user-visible metadata while rank is collection-local presentation state. Independent optional fields preserve that distinction and allow pin changes to invalidate only the obsolete rank.

## Consequences

The collection keeps more vertical space for reading and presents one predictable batch entry on narrow and wide Dock widths. Long excerpts no longer determine the collapsed card size, while full text remains available without editing the immutable source. Manual order survives Host restarts and remains isolated by Workspace plus project or owner Session collection. Pointer capture keeps dragging stable across card descendants and the Dock's scrolling surface; keyboard users can still change pin state and use every command, but direct keyboard reordering is not provided in this version.

## Verification

Host tests cover pin persistence, complete collection replacement order, and rejection of partial or cross-group requests without changing the saved order. Client tests cover the six-command capsule, selection-order Composer attachment, draft-mirror token recovery without changing surrounding text, cross-group drag rejection, and card reading, pin, and drag controls. The release checks build the generated Remote codecs and the self-contained browser Bundle, and the Web-profile smoke test covers the compact and narrow command presentations.
