<p align="center">
  <img src="assets/brand/branchmark-logo-threadbook-v4-color.svg" width="112" alt="BranchMark logo">
</p>

<h1 align="center">BranchMark · 枝签</h1>

<p align="center"><strong>Clip the insight. Grow a branch.</strong></p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="#interactive-demo">Interactive demo</a> ·
  <a href="#quick-start">Install and use</a>
</p>

BranchMark is a DSH Web plugin: save answers worth keeping, ask quick questions in Side Chat, and start related conversations from excerpts. A Session tree helps you keep track of different approaches.

## Why I built it

With tight deadlines and several tasks at work, I often open separate Sessions for different ideas and features. When there are multiple approaches, I fork more conversations. Over time, my attention gets scattered, and I lose track of which proposals still need review and where each branch began.

> The human brain is the bottleneck.

I built BranchMark to keep useful knowledge and conversations that need follow-up together:

- **Save a good idea for later.** Keep a useful answer as a Clip when you are not ready to explore it, and add notes or tags as needed.
- **Follow different approaches separately.** Start related conversations from excerpts, see their relationships in the Session tree, and select a node to return to its discussion.
- **Clear up a small question.** Open Side Chat around something you do not understand. Closing it destroys the temporary exchange without leaving another durable Session.

## Interactive demo

**Save, organize, and reference Clips**

<p align="center">
  <a href="assets/demo/branchmark-clips-and-organization-demo.gif"><img src="assets/demo/branchmark-clips-and-organization-demo.gif" width="100%" alt="Save and organize Clips with notes, tags, multiple selection, and ordering"></a>
</p>

**Continue from an excerpt and revisit approaches in the Session tree**

<p align="center">
  <a href="assets/demo/branchmark-session-tree-and-derived-session-demo.gif"><img src="assets/demo/branchmark-session-tree-and-derived-session-demo.gif" width="100%" alt="Explore the Session tree, open branches, and start related conversations"></a>
</p>

## Quick start

The supported pair is **BranchMark `0.1.2-rc.2` + DSH `0.1.2-rc.1`**, using the Web Profile. Node.js must satisfy `^22.19.0 || >=24.0.0`.

```sh
npm install --global @deepseek-ai/dsh@0.1.2-rc.1
dsh plugin --profile web add dsh-branchmark@0.1.2-rc.2
dsh --profile web
```

If you already have the matching DSH version, run the plugin installation command and restart the Web Profile. Side Chat and regular conversation prompts require an available model configured in DSH.

### How to use

1. Select text in a completed conversation message and save it to the current Session or project. Project Clips can be reused by other Sessions in the same Workspace.
2. Open the right-hand Clip panel to add notes and tags or search saved content.
3. Select **Quote** to insert a Clip into the composer, or **Side Chat** to ask a temporary question about it. Adding a reference does not send it automatically.
4. Select **New session**: a full fork inherits source history and carries the selected Clips; Clips-only carries just the selected excerpts and enabled notes; a blank branch carries neither history nor excerpts but retains its organizational relationship.
5. Open **Tree** to view the Session tree and select a node to continue its discussion.

Clips and relationships are stored locally. When you send a question, the selected content is passed to your configured model service.

To uninstall:

```sh
dsh plugin --profile web remove dsh-branchmark
```

Restart the Web Profile after uninstalling. Existing Clip data is retained.

See the [Bundle reference](packages/bundle/README.md) for configuration and the [installation tutorial](course/tutorials/10-package-install-and-adapt.md) for source builds. Report problems through [GitHub Issues](https://github.com/zaizaizhao/dsh-branchmark/issues). Licensed under [MIT](LICENSE).

## Community

[LINUX DO](https://linux.do/) — A technology community built on sincerity, friendliness, solidarity, and professionalism.
