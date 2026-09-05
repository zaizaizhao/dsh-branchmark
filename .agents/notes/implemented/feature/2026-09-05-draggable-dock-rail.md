# Agent Note: Browser-owned vertical Dock handle position

Status: implemented

English | [中文](2026-09-05-draggable-dock-rail.zh.md)

## Problem

DSH's turn navigation occupies the right edge near the viewport center. A centered BranchMark handle covers those controls, and a fixed offset cannot accommodate every window size or neighboring plugin.

## Decision

The collapsed handle starts 120px above the vertical center and supports single-pointer vertical dragging along the right edge. Pointer capture owns each gesture; the release commits a bounded relative position, while cancellation, viewport resizing, and unmount release ownership. A six-pixel movement threshold separates clicks from drags, and the drag's compatibility click cannot open the Dock. Arrow keys, Home, and End provide keyboard positioning while Enter and Space retain button activation.

The optional-on-read `railPosition` field belongs to the existing `dsh-branchmark.ui.v1` browser preference, not the Host's Clip storage. A null or absent value selects default placement; a saved value is a fraction of available vertical travel. This keeps the handle within a resized viewport without rewriting saved coordinates. No Clip content, Session reference, or model input enters this preference.

## Alternatives considered

**Only shift the fixed handle.** This separates the default controls but gives users no adjustment when another plugin occupies that position.

**Allow unrestricted two-dimensional dragging.** This permits the handle to cover message text and adds horizontal state that the edge-only interaction does not need.

**Persist absolute pixels in the Host.** Browser dimensions differ across clients. Host persistence would couple a local layout choice to shared durable data and still require viewport correction.

## Consequences

The handle remains an overlay and does not resize DSH. Users can deliberately place it near other controls; collision avoidance beyond the default offset remains manual. Browser storage denial preserves in-memory operation. The collection-ordering decision remains independent because it owns durable Clip order rather than handle geometry.

## Verification

The owning component tests exercise mouse and touch gestures, click suppression, keyboard movement, bounded resizing, legacy and invalid preferences, denied storage, cancellation, and listener/capture disposal. Release checks validate the matching DSH 0.1.2-rc.1 peer graph and the self-contained public Bundle. Real Web-profile checks own the visual overlap and browser event-delivery evidence.
