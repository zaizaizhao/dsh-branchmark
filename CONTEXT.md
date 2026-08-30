# BranchMark

BranchMark turns saved excerpts into explicit starting points for temporary exploration or durable DSH conversation branches while the source conversation remains focused.

## Language

**BranchMark · 枝签**:
The product and plugin name. A user-created 枝签 is a saved excerpt that can start a Side Chat or a derived Session.
_Avoid_: Generic library wording as the product name

**Excerpt · 摘录正文**:
The immutable selected text retained by a 枝签. Notes and tags may change without rewriting the excerpt.
_Avoid_: Editable excerpt

**Source anchor · 来源锚点**:
The persisted DSH message position associated with a 枝签. A complete source turn makes the anchor eligible for context inheritance.
_Avoid_: Hidden history copy

**Derived Session · 衍生会话**:
A durable DSH Session created from selected 枝签, optionally inheriting the complete source context at one primary source anchor.
_Avoid_: Side Chat, subagent

**Side Chat**:
A temporary read-only exploration started from selected 枝签. It is not a DSH Session and disappears when its tab closes or the Host exits.
_Avoid_: Child Session, persistent chat

**Session 枝签**:
A 枝签 visible only from its owner Session.
_Avoid_: Other-session excerpt

**Project 枝签**:
A 枝签 explicitly promoted to the project collection and available across Sessions in that project.
_Avoid_: Automatically shared excerpt
