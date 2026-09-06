# Agent Note: Compact batch commands and Clip ordering

Status: implemented

English | [中文](2026-08-30-compact-batch-commands-and-clip-ordering.zh.md)

## Problem

The project and Session collections expose several per-Clip actions, but an always-expanded multi-selection bar repeats controls, consumes the narrow Dock's reading area, and wraps poorly. Long excerpts also make card heights unpredictable. A visual drag interaction without a Host-owned ordering rule would let filtered results reorder hidden Clips or mix pinned and unpinned records without an explicit user decision.

## Decision

Batch Composer attachment receives Clips in selection order and invokes head insertion in reverse, so native Reference Chip order matches the selection without sending the draft. Card presentation and gesture handling are owned by the [Session tree and interaction note](2026-09-06-session-tree-and-clip-interactions.md).

DSH persists each occurrence through its `clipboardText` projection and restores the draft without the process-local occurrence table. BranchMark's projection is `@branchmark:<ClipId>`. The Shell watches the current Composer for those tokens, resolves each id against the visible Session and project collections, and replaces matches from right to left through the public `insertReference()` API. This reconstructs native Chips without changing surrounding draft text; unresolved tokens remain visible instead of pretending to carry model context.

`Clip.pinnedAt` and `Clip.sortIndex` are optional fields in the existing `clip_explorer` version 1 domain. Existing records therefore remain valid without a storage migration. Pinned Clips sort before unpinned Clips; an unindexed record sorts before previously indexed records in its group and then uses creation time and id as stable fallbacks.

Reordering reuses `batchUpdate`. The request contains the complete active collection order and identifies either the project collection or one owner Session collection. The Host validates every id, exact collection membership, and the pinned-before-unpinned grouping before writing consecutive indices. Search, tag-filter, and trash views disable drag, and the Client rejects cross-group drops before issuing a request. Pin or scope changes clear the affected Clip's prior `sortIndex` because both operations move it into a different ordered collection.

## Alternatives considered

**Keep every batch action permanently visible.** Rejected because the Dock has a 340px supported minimum width and the action row competes directly with Clip content. Horizontal scrolling also hides available actions without establishing a clear primary interaction.

**Persist the order of only currently visible search results.** Rejected because omitted Clips have no unambiguous destination. Requiring the complete active collection makes one request a full replacement order and lets the Host reject accidental partial mutations.

**Allow dragging directly across the pin divider.** Rejected because ordering and pinning express different decisions. A cross-group move would otherwise change durable pin state as a side effect of spatial movement.

**Store only one numeric rank and infer pin state from its range.** Rejected because pinning is user-visible metadata while rank is collection-local presentation state. Independent optional fields preserve that distinction and allow pin changes to invalidate only the obsolete rank.

## Consequences

Manual order survives Host restarts and stays isolated by Workspace plus project or owner Session collection. Independent pin state prevents ordering from silently moving records between groups. Draft-reference recovery preserves surrounding text and leaves unresolved tokens visible.

## Verification

Host tests cover pin persistence, complete collection replacement, and rejection of partial or cross-group orders. Client tests cover selection-order attachment, draft-mirror recovery, and cross-group rejection. Card and gesture evidence is maintained with the interaction owner.
