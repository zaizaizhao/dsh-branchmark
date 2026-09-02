<p align="center">
  <img src="assets/brand/branchmark-logo-threadbook-v4-color.svg" width="112" alt="BranchMark color logo">
</p>

<h1 align="center">BranchMark · 枝签</h1>

<p align="center"><strong>Clip the insight. Grow a branch.</strong></p>

<p align="center">Capture important knowledge, preserve a traceable Session tree, and fork your attention without losing the main development thread. BranchMark keeps every branch connected to its source so Vibe Coding stays focused.</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="#interactive-demo">Interactive demo</a> ·
  <a href="#branchmark-prevents-developer-attention-loss">Why BranchMark</a> ·
  <a href="#session-tree-and-session-management">Session tree</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#dsh-plugin-distribution-and-ecosystem-requirements">Distribution</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-branchmark"><img alt="npm latest 0.1.1-rc.2" src="https://img.shields.io/badge/npm_latest-0.1.1--rc.2-6D5C46"></a>
  <a href="https://www.npmjs.com/package/dsh-branchmark?activeTab=versions"><img alt="npm alpha 0.1.2-alpha.5" src="https://img.shields.io/badge/npm_alpha-0.1.2--alpha.5-BD5745"></a>
  <img alt="DeepSeek Harness alpha 0.1.2-alpha.5" src="https://img.shields.io/badge/DSH_alpha-0.1.2--alpha.5-405F52">
  <img alt="Node.js 22.19 or 24+" src="https://img.shields.io/badge/Node.js-%5E22.19_%7C_%3E%3D24-5C7A69">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-776D5E"></a>
</p>

## Interactive demo

The left demo creates a durable Session from an important excerpt, switches between Sessions, and traces the result through the Session tree. The right demo uses a temporary Side Chat without interrupting the main thread, then saves useful content as a clip. Select either animation to view it at full size.

<table>
  <thead>
    <tr>
      <th width="50%">Clips, durable forks, and the Session tree</th>
      <th width="50%">Temporary Side Chat and follow-up clipping</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td width="50%" valign="top"><a href="assets/demo/branchmark-session-tree-and-derived-session-demo.gif"><img src="assets/demo/branchmark-session-tree-and-derived-session-demo.gif" width="100%" alt="BranchMark creates a durable Session from a clip, switches branches, and traces the source in the Session tree"></a></td>
      <td width="50%" valign="top"><a href="assets/demo/branchmark-side-chat-and-clipping-demo.gif"><img src="assets/demo/branchmark-side-chat-and-clipping-demo.gif" width="100%" alt="BranchMark uses a temporary Side Chat and saves useful content as a reusable clip"></a></td>
    </tr>
  </tbody>
</table>

> [!IMPORTANT]
> BranchMark releases use the exact version of their target DSH release. `dsh-branchmark@0.1.1-rc.2` tracks the npm `latest` DSH `0.1.1-rc.2` release, while `dsh-branchmark@0.1.2-alpha.5` tracks the npm `alpha` DSH `0.1.2-alpha.5` release. These channels use different DSH Client APIs and must not be mixed.

BranchMark is a plugin Bundle that does not modify DSH source code. It saves important conversation excerpts as clips and uses the clip's source message as an attention fork point. You can create a child Session that inherits the source context or a standalone Session that receives only the selected knowledge. Clip text and source anchors remain immutable; notes and tags remain editable.

## Contents

- [Interactive demo](#interactive-demo)
- [BranchMark prevents developer attention loss](#branchmark-prevents-developer-attention-loss)
- [Core workflow: clip, fork, and return to the main thread](#core-workflow-clip-fork-and-return-to-the-main-thread)
- [Session tree and Session management](#session-tree-and-session-management)
- [Quick start](#quick-start)
- [Operation guide](#operation-guide)
- [Data and permissions](#data-and-permissions)
- [DSH plugin distribution and ecosystem requirements](#dsh-plugin-distribution-and-ecosystem-requirements)
- [Documentation](#documentation)
- [Development and contribution](#development-and-contribution)

## BranchMark prevents developer attention loss

Long development tasks are not a single uninterrupted exchange. While implementing the main task, you encounter conclusions worth preserving, assumptions that need verification, and side paths that can progress independently. Keeping every follow-up in one Session gradually buries the main thread. Starting an empty Session loses the original context. Copying text alone disconnects the knowledge from the decision process that produced it.

| Development moment | Common response | What gets lost |
| --- | --- | --- |
| A response is important, but the current task must continue | Keep it in mind and find it later | The important knowledge and its source position |
| An idea deserves deeper validation | Continue asking in the main Session | The attention thread of the current task |
| Open a new Session directly | Re-explain the background | The parent context and reason for the fork |
| Advance several directions at once | Create unrelated Sessions | Parent-child relationships and a path back to the main thread |

BranchMark binds knowledge anchors to Session forks. Clips preserve reusable content, while Session relationships record where attention diverged. You can continue along the main thread, move a side path into a new Session, and return to the original location through the relationship tree or source link.

## Core workflow: clip, fork, and return to the main thread

BranchMark centers on traceable Sessions that grow from important knowledge, not on adding another chat window.

```text
Main Session: continue the current development goal
        │
        ├── Select key text → Save a clip → Add notes and tags
        │                                  │
        │                                  ├── Reference in the current Composer: stay on the main thread
        │                                  ├── Full fork: carry parent history into a child Session
        │                                  └── Clip-only: start an independent Session with focused knowledge
        │
        └── The main Session does not need to contain every exploratory branch
```

### 1. Capture important knowledge

Select text in a completed user or assistant message, then save it to the current Session or project. A Session clip belongs only to its source Session by default. A project clip can be searched and reused across Sessions, but only an explicit “Save to project” action puts it in the project clip library. The current Session does not display private clips from other Sessions.

Clip text and source messages cannot be edited, so future references preserve the conclusion that was actually recorded. Notes and multiple tags are editable and can record why the clip matters, what to verify next, and which technical topic it belongs to.

### 2. Fork attention from a knowledge point

When you create a Session, first choose how much parent context the new task needs:

| Fork mode | What the new Session receives | Attention strategy |
| --- | --- | --- |
| Full fork | Complete turns from the primary clip's source Session, from the beginning through the source message, plus all selected clips and enabled notes | Continue with the original reasoning process |
| Clip-only | A new Session without a DSH parent, plus all selected clips and enabled notes | Carry only focused knowledge and isolate parent-session noise |

When selected clips come from different Sessions, choose one primary source. The primary source only determines which parent chain a full fork inherits; every other clip still enters the new Session as complete knowledge material.

### 3. Advance a branch and return to its source

“Create and open” enters the new Session immediately and leaves its Composer empty. “Create and send” collects a question first, then creates and runs the new Session in the background. A derived Session displays its source and fork details, while each clip card lists the derived Sessions that used it.

A new Session has an independent lifecycle. Moving a clip to the recycle bin or permanently deleting it does not delete, rewrite, or stop an existing derived Session.

### Quick questions

Side Chat is a temporary outlet for attention, not BranchMark's primary data structure. Use it to ask a quick question about one or more clips without writing messages to the source Session or entering the Session tree. Closing a tab or exiting the Host destroys the Side Chat immediately. Save useful results as clips or promote the work to a durable Session.

## Session tree and Session management

A full fork uses the native DSH Session fork operation. DSH `parentSession` is the authoritative parent-child relationship, and BranchMark's Relationship view projects the known tree around the current Session from `parentId`.

```text
Session A: implement the authentication flow
├── Session B: full fork from “permission model”
│   └── Session D: full fork again from “cache invalidation”
└── Session C: full fork from “database migration”

Session E: created with clips only
└── No DSH parent; BranchMark clip usage connects it to the source knowledge
```

BranchMark preserves two different relationship types and does not merge them into a fabricated tree:

| Relationship | Authoritative data | UI purpose |
| --- | --- | --- |
| DSH Session lineage | `SessionHeader.parentSession` / Client `parentId` | Builds the parent-child Session tree for full forks |
| BranchMark usage relationship | Derived Session, primary clip, additional clips, and immutable usage snapshots | Finds derived Sessions from a clip and returns from a derived Session to its source |
| Side Chat | No durable relationship | Exists only as a temporary quick-question tab |

This distinction keeps Session management accurate. A full fork means that a Session continues from a completed turn in its parent. A clip-only Session means that an independent Session used the selected knowledge. Both remain traceable, but only the full fork enters the DSH Session tree.

## Quick start

BranchMark installs into the DSH Web Profile as an npm Bundle. Saving clips, viewing the relationship tree, and using “Create and open” do not require a model. Sending a question to a durable Session or using Side Chat requires an available model configured in DSH.

### Requirements

| npm channel | BranchMark | DeepSeek Harness | Use |
| --- | --- | --- | --- |
| `latest` | `0.1.1-rc.2` | `0.1.1-rc.2` | Default installation with the npm `latest` DSH release |
| `alpha` | `0.1.2-alpha.5` | `0.1.2-alpha.5` | Current `main` with the newer DSH Client API |

Both channels require Node.js `^22.19.0` or `>=24.0.0` and support only the DSH Web Profile. The BranchMark version must exactly match `dsh --version`.

The default channel can use the npm `latest` tag directly. `@deepseek-ai/dsh@latest` and `dsh-branchmark@latest` must resolve to the same version. Verify the installation with `dsh --version`; if the versions differ, use the exact versions in the table above. The `alpha` channel continues to use exact versions so temporary prerelease-tag differences cannot install mismatched packages.

### 1. Select and install a matching version

Use the default `latest` channel:

```sh
npm install --global @deepseek-ai/dsh@latest
dsh plugin --profile web add dsh-branchmark@latest
```

Use the `alpha` channel that matches the current `main` branch:

```sh
npm install --global @deepseek-ai/dsh@0.1.2-alpha.5
dsh plugin --profile web add dsh-branchmark@0.1.2-alpha.5
```

To isolate this installation from daily profiles, create a dedicated DSH home before installation:

```sh
export BRANCHMARK_DSH_HOME="$(mktemp -d)"
DSH_HOME="$BRANCHMARK_DSH_HOME" \
  dsh plugin --profile web add dsh-branchmark@0.1.2-alpha.5
```

When you use an isolated home, every later `dsh` command must also include `DSH_HOME="$BRANCHMARK_DSH_HOME"`; otherwise the command reads the default Profile.

### 2. Verify the Profile

```sh
dsh --version
dsh --profile web --dump-config
```

`dsh --version` must match the installed BranchMark version. The configuration output must contain both `dsh-branchmark` and `branchmark-host`. If the version differs or either entry is missing, remove the incorrect version and reinstall from the matching channel.

### 3. Start DSH from the target project

DSH uses the launch directory as the Workspace by default, so enter the project you want to work on before starting DSH:

```sh
cd /absolute/path/to/your/project

dsh web
```

Open a Session, wait for a user or assistant message to finish, and select text in that message. The plugin is active when the four selection actions and the BranchMark chip appear.

### Build the current alpha from source

```sh
git clone https://github.com/zaizaizhao/dsh-branchmark.git
cd dsh-branchmark
corepack enable
pnpm install --frozen-lockfile
pnpm run release:check
pnpm run pack:bundle
dsh plugin --profile web add ./dist/dsh-branchmark-0.1.2-alpha.5.tgz
```

Do not install through a Git URL, a GitHub source specifier, or `plugin add .`. The source repository does not commit compiled `lib/` output. Only the npm package and a locally built tarball contain the complete installable package.

## Operation guide

Every entry point requires an explicit user selection or send action. Selecting text never causes BranchMark to contact a model automatically.

| Attention need | Operation | Result |
| --- | --- | --- |
| Preserve an important conclusion from the current task | Save to Session | The clip is durable and appears only in the source Session |
| Make focused knowledge available to other Sessions | Save to project | The clip is durable and appears in the current Workspace's project library |
| Provide knowledge to the current Composer without leaving the main thread | Reference in Composer | Inserts removable native reference chips and never sends automatically |
| Continue a durable branch from the original discussion point | Full fork | Creates a durable child Session with a DSH parent |
| Start an isolated task from focused knowledge | Clip-only | Creates a durable root Session without a DSH parent |
| Manage parallel development branches | Relationship view and clip cards | Shows the Session tree, sources, and bidirectional usage relationships |
| Confirm a small question temporarily | Ask in side | Creates a temporary quick-question tab that is not durable and does not enter the tree |

The right Dock provides Session, Project, Relationship, and Side Chat views. The project clip library supports full-text search, multiple tag filters, card and list layouts, pinning, within-group ordering, multi-select actions, and a recycle bin.

## Data and permissions

BranchMark keeps durable knowledge and relationships in local DSH storage and limits temporary exploration to the current Host process.

- Clips, notes, tags, ordering, recycle-bin state, usage snapshots, and derived relationships are stored in the local DSH `storageDomain` under the `clip_explorer` domain. The plugin provides no cloud synchronization and uploads no data to a service controlled by its author.
- Full-fork and clip-only Sessions use native DSH persistence. BranchMark does not copy or replace DSH Session logs.
- Saving, searching, and organizing clips and viewing relationships do not call a model. Only after the user sends a question do selected clips, enabled notes, and reconstructed context enter a request to the configured DSH provider.
- Side Chat project-file tools are read-only, but tool results can enter model requests. Web search and fetch behavior follows the current DSH deployment's provider configuration.
- Workspace and Session are the current data-isolation keys; a Worktree is not a separate isolation boundary. BranchMark supports only the DSH Web Profile and does not modify the native DSH sidebar hierarchy.

For complete configuration, network behavior, and limitations, see the [Bundle reference](packages/bundle/README.md) and [compatibility and limitations reference](course/reference/compatibility-and-limitations.md). Report security issues privately according to [SECURITY.md](SECURITY.md); never publish credentials in an issue, log, or screenshot.

## DSH plugin distribution and ecosystem requirements

BranchMark uses the official Bundle mechanism of its target DSH release. The DSH [plugin packaging and installation guide](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/docs/user/develop/basic/publish.md) defines Profile Bundles, while the [Client module documentation](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/packages/client/modules/README.md) defines the Web browser entry point.

The official material for the DSH versions supported by BranchMark does not provide a third-party marketplace submission interface, and the official repository does not accept external code pull requests. The DSH [contribution guide](https://github.com/deepseek-ai/deepseek-harness/blob/db6bdc3576c2d4e7c965e8e3ed0c2a731eed87f5/CONTRIBUTING.md) directs plugin authors to maintain their own repositories and add the GitHub [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic for discovery. Community catalogs provide another distribution channel but do not represent official DSH review, compatibility guarantees, or security certification.

<details>
<summary>View installability conditions and BranchMark release readiness</summary>

### Installable Bundle requirements

| DSH requirement | BranchMark implementation |
| --- | --- |
| The package has non-empty `name` and `version` fields and provides a resolvable runtime entry point | `dsh-branchmark@0.1.2-alpha.5` publishes compiled Host, Typert, Remote, and browser entry points |
| `package.json` declares `dsh.bundle.patch`; otherwise `dsh plugin add` installs a dependency without activating a Profile layer | `packages/bundle/package.json` points to `./cordis.patch.yml` |
| `cordis.patch.yml` inserts or overrides a real Loader row and uses a package name resolvable after installation | The Bundle patch inserts `branchmark-host` with module name `dsh-branchmark` |
| A Web plugin exports `./client` and declares its browser entry point with `dsh.client.platform: "web"` | The Bundle exports the self-contained `lib/client.js` and declares the required Client injections |
| An npm package or tarball contains compiled output; a Git source installation that requires a build provides a self-contained `prepare` script explicitly approved by the user in pnpm | BranchMark does not run install-time scripts and supports only a local tarball containing `lib/`; direct installation from Git source is not supported |
| After installation, verify the Bundle layer with `--dump-config`, then restart the target Profile | The README and release workflow check `dsh-branchmark` and `branchmark-host` in an isolated DSH home |

BranchMark release readiness:

| Item | Status |
| --- | --- |
| Independent public repository, MIT License, Issues, and a security-reporting path | Complete |
| `dsh.bundle.patch`, `cordis.patch.yml`, Web `./client`, and `dsh.client` declaration | Complete |
| Node `22.19` / `24` CI, keyless tests, Bundle self-containment checks, and npm dry-run | Complete |
| Isolated Profile tarball installation and `--dump-config` verification | Complete |
| Matching npm `latest` and `alpha` releases | Complete |
| GitHub `dsh-plugin` topic | Complete |

</details>

See [RELEASING.md](RELEASING.md) for the release procedure, file inventory, npm verification, and real-Profile smoke test.

## Documentation

This README explains the attention problem, Session management, installation path, and distribution status. The documents below own the complete product rules, implementation architecture, and reproduction course.

| What you want to learn | Document |
| --- | --- |
| Reproduce the complete plugin from first principles | [Course index](course/README.md) |
| Product rules and acceptance scope | [PRD](docs/PRD.md) |
| Host, Client, storage, Session fork, and relationship architecture | [Architecture](docs/ARCHITECTURE.md) |
| DSH Session lineage and BranchMark usage relationships | [Architecture map](course/reference/architecture-map.md) |
| Why the DSH Client uses the current extension design | [DSH Client architecture rationale](course/reference/dsh-client-architecture-rationale.md) |
| Configuration fields, data rules, and limitations | [Bundle reference](packages/bundle/README.md) |
| Distribution and real-Profile acceptance | [Release process](RELEASING.md) |

## Development and contribution

Run these checks before submitting code:

```sh
pnpm run check
pnpm run release:check
```

`check` covers type checks, keyless tests, builds, and Bundle self-containment verification. `release:check` adds documentation checks, public-package metadata checks, publint, and an npm dry-run. Keyless checks do not make real provider requests; a release candidate must still complete the isolated Web Profile smoke test in [RELEASING.md](RELEASING.md).

Read [CONTRIBUTING.md](CONTRIBUTING.md) before contributing. Report ordinary defects and feature requests through [GitHub Issues](https://github.com/zaizaizhao/dsh-branchmark/issues). See [CHANGELOG.md](CHANGELOG.md) for version changes. BranchMark uses the [MIT License](LICENSE).
