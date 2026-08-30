# Use BranchMark as the product identity without changing persisted Clip keys

The installable package, Loader, browser module, Remote namespace, provenance strings, documentation, and visible UI use `dsh-branchmark`, `branchmark`, and 枝签. The internal `Clip` domain types and the existing `clip_explorer` storage unit remain stable because they describe saved excerpts and preserve upgrades for data already stored by earlier builds; renaming those durable keys would trade cosmetic uniformity for data loss or a migration dependency.
