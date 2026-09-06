# Agent Note: Independent plugin release versions

Status: implemented

English | [中文](2026-09-06-independent-plugin-release-versions.zh.md)

## Problem

BranchMark can ship UI and storage changes while its supported DSH release stays fixed. npm package versions are immutable, so requiring the plugin and DSH to share a version prevents those releases without an unrelated host upgrade.

## Decision

The root, Host, Client, and public Bundle manifests share the BranchMark version. The root's exact Typert generator dependency declares the DSH target. Release verification requires the installed generator and every public DSH peer to match that target. The course checker compares the plugin and DSH table rows independently. Package and repository READMEs publish an explicit compatibility pair.

Each release uses a new immutable package version and an annotated Git tag. Publication starts on the `rc` dist-tag; a fresh npm Profile installation precedes promotion to `latest`. Historical `alpha` packages keep their explicit compatibility targets. Only the public Bundle is published.

## Alternatives considered

**Keep plugin and host versions identical.** This ties plugin fixes to DSH release timing and cannot identify multiple plugin artifacts for one DSH version.

**Allow DSH dependency ranges.** Pre-stable API compatibility needs a verified exact dependency set. An independent plugin version does not relax the generator or peer checks.

## Verification

The release gate accepts a newer plugin version with an unchanged DSH target and rejects a mismatched private workspace, a missing or mismatched peer, and a generator range. Course fixtures use different plugin and DSH versions and reject a stale baseline or generator declaration. Build, package inspection, and isolated Profile smoke tests remain release requirements in [RELEASING.md](../../../../RELEASING.md).
