# Agent Note: DSH alpha.2 Client capability integration

Status: implemented

English | [中文](2026-08-31-dsh-alpha2-client-capability-integration.zh.md)

## Problem

DSH `0.1.2-alpha.2` does not publish `@deepseek-ai/dsh-client-runtime`. It provides Session and Workspace state through API Controllers, Conversation state through UI Conversation bindings, Chat nodes through a keyed Chat View, and standard Slot hooks through the Session and Workspace UI packages.

BranchMark must use those owners without exposing their projections throughout the component tree or loading rc.2 and alpha.2 framework identities in one browser graph.

## Decision

BranchMark `0.4.x` targets DSH `0.1.2-alpha.2` only. The bundle declares the API Session/Workspace Controllers and the UI Renderer, Session, Workspace, Conversation, Chat, Layout, Sidebar, Input Trigger, Locale, and Gateway modules in its Client inject list.

`BranchMarkClient` remains the browser integration module. It owns Session creation and forking, Workspace selection, UI Conversation snapshot lookup, Composer admission, Typed Remote calls, and business-error translation. Components receive branded ids, standard Slot props, BranchMark controller state, and this module instead of reading DSH Controller internals directly.

The module resolves the current Session's Workspace first. Without a current Session, it selects the Workspace whose Sessions have the latest `updatedAt`, using Workspace order as the stable tie-breaker and `createdAt` for an empty Workspace. This matches the DSH Workspace navigation rule without depending on private UI state.

Conversation selection reads `ctx.uiConversation.binding(sessionBinding).snapshot` and then the `chat` entry in `snapshot.views`. Conversation event definitions register through `ctx.uiConversation.events`; Chat node data augments the UI Chat package. Clips-only creation calls the public `ISessions.create` method directly.

## Alternatives considered

**Keep `dsh-client-runtime@0.1.1-rc.2`.** Rejected because it creates a mixed dependency graph with incompatible Cordis scopes, invariants, Session types, and Controller services.

**Detect both DSH layouts at runtime.** Rejected because package imports, declaration merging, Client inject metadata, and bundle externals differ before runtime. A single artifact would carry two framework layouts and make every component aware of compatibility policy.

**Create a second pass-through adapter interface.** Rejected because `BranchMarkClient` already provides the useful seam. Another interface with one implementation would add indirection without hiding more behavior or improving the test surface.

## Consequences

BranchMark has one supported DSH package family and one browser integration owner. Host storage, source validation, Side Chat, Remote methods, durable Clip records, and derived-Session records do not change. Future DSH Client changes are expected to concentrate in `BranchMarkClient`, the Browser assembly, the Slot-facing type imports, and the bundle manifest.

## Verification

Client tests cover current-Workspace selection, UI Conversation snapshot lookup, Remote failure normalization, Chat View selection anchors, Session launch, Composer references, and UI state. The package checks cover Host, Client, and Bundle type checking, all unit tests, self-contained artifacts, publication metadata, a clean alpha.2 dependency graph, and installation into a fresh DSH Web profile.
