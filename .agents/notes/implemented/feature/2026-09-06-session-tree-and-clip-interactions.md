# Agent Note: Session tree and Clip interactions

Status: implemented

English | [中文](2026-09-06-session-tree-and-clip-interactions.zh.md)

## Problem

A Session tree based only on native history inheritance cannot organize independent Clip-only work or new ideas without context. DSH can also omit unprompted Sessions from its visible list after restart. A retained relationship therefore needs a readable endpoint before it can support navigation. Repeated card controls and fixed reading space make a narrow collection harder to scan.

## Decision

Every new derived Session records an explicit organizational parent in the same Workspace. Only full-fork inherits DSH history; clips-only receives frozen Clip recall, and blank receives neither history nor attachments. Blank mode rejects existing model context and appends no recall. The optional parent field keeps existing records readable; old Clip-only records do not infer parentage from mutable Clips.

The Host owns relation validation and storage in `DerivedSessionStore`. Opt-in endpoint reads inspect persisted logs and use DSH's title fold to return metadata without transcript bodies. The Client combines these endpoints with the native catalog, retaining persisted titles when native metadata contains only a display fallback. Unlisted endpoints must remain readable and belong to the Workspace before the Client adopts their existing identity through the public Session API. Missing endpoints remain visible but unavailable. With no selected Session, the panel shows the Workspace's known relationships.

Cards use natural height, with reading controls only for overflowing excerpts. Three primary buttons keep content-sized widths; secondary actions use DSH menus and dialogs. Batch commands appear for at least two selected Clips. The recycle bin is a separate labelled search-side control. Transient undo reverses recycling or a complete ordering operation; it is not a durable history or a transaction across concurrent edits.

Collection reads, mutations, sorting, card presentation, launch forms, and tree geometry have separate owners. dnd-kit supplies pointer and keyboard gesture handling, collision detection, displacement, and the drag overlay. Host validation retains the complete-collection and pin-group rules described in the [ordering note](2026-08-30-compact-batch-commands-and-clip-ordering.md). Browser strings use the BranchMark locale dictionary. The browser build replaces the dependency's `process.env.NODE_ENV` constant and a Node-global-free factory check rejects regressions.

## Alternatives considered

**Use native parent headers for every branch.** A native parent expresses inherited history. Assigning it to a blank or Clip-only Session would misstate the context the model receives.

**Build the tree solely from the visible native list.** DSH's unprompted-session filtering removes valid persisted endpoints after restart. Reading plugin relations alone also lacks current titles and cannot establish that a deleted endpoint is safe to open.

**Keep custom pointer release listeners.** They duplicate maintained gesture handling and do not provide the keyboard sorting or displacement needed by the collection. dnd-kit supplies these behaviors while the plugin retains its domain rules.

**Keep fixed card height and a nested command capsule.** Short excerpts reserve empty reading space, while multi-selection requires another interaction to expose actions. Natural height and conditional batch commands fit the approved compact layout.

## Consequences

Organizational lineage is durable without adding model input or falsifying DSH inheritance. Endpoint metadata requires log reads when the tree loads; Clip-card relation queries avoid those reads. Relationship storage and recall append remain separate durable operations without a cross-system transaction. The browser bundle includes the drag library, while presentation remains separated from Host and Client orchestration.

The [ordering note](2026-08-30-compact-batch-commands-and-clip-ordering.md) remains active for full-collection validation, independent pin metadata, selection order, and draft-reference recovery; this note owns card presentation and tree navigation.

## Verification

Host tests record all three modes through real Session services and compare model-context expectations. They reject invalid blank context and duplicate concurrent registration, preserve source events, read old records, and resolve missing endpoints. Client tests cover collection scope changes, batch visibility, locale changes, the 12-node tree with only three native entries, and opening or rejecting retained identities. Browser-factory negative controls reject Node globals and undeclared externals. The isolated DSH Web profile exercises real persisted branches and a real provider response.
