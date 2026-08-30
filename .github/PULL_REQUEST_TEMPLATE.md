## Summary

Describe the user-visible change and the behavior that remains unchanged.

## Data and capability impact

- [ ] No change to persisted data or migration behavior
- [ ] No change to model-visible context
- [ ] No change to file or Web tool permissions
- [ ] No change to Session/project isolation

Explain every unchecked item and update the corresponding README/security documentation.

## Verification

List the exact commands and manual flows you ran. Do not write only “tests pass.”

- [ ] `pnpm run check`
- [ ] `pnpm run release:check` when publication files or package behavior changed
- [ ] Light and dark theme checked for UI changes
- [ ] Narrow and wide layouts checked for UI changes
- [ ] Screenshot or short recording attached for UI changes

## Release notes

- [ ] `CHANGELOG.md` updated under `Unreleased`, or this change has no public effect
- [ ] No secrets, credentials, private conversations, build output, or local DSH data are included
