# Agent Note：独立的插件发布版本

Status: implemented

[English](2026-09-06-independent-plugin-release-versions.md) | 中文

## 问题

BranchMark 可以在受支持的 DSH 版本保持固定时发布 UI 和存储变更。npm 包版本不可覆盖，因此要求插件和 DSH 同号，会让这类发布依赖一次无关的宿主升级。

## 决策

根目录、Host、Client 和公开 Bundle 的 manifest 共用 BranchMark 版本。根 manifest 中精确固定的 Typert generator 依赖声明 DSH 目标。发布检查要求实际安装的 generator 和所有公开 DSH peers 与该目标一致。课程检查分别比较插件和 DSH 的表格行。包与仓库 README 明确公布兼容组合。

每次发布使用新的不可变包版本和 annotated Git tag。发布先进入 `rc` dist-tag；在全新 npm Profile 中安装验收后才提升到 `latest`。历史 `alpha` 包保留明确的兼容目标。只有公开 Bundle 会被发布。

## 考虑过的替代方案

**插件与宿主继续同号。** 这会把插件修复绑定到 DSH 的发布时机，也无法标识面向一个 DSH 版本的多个插件产物。

**允许 DSH 依赖范围。** 预稳定 API 的兼容性需要经过验证的精确依赖集合。插件独立版本不放宽 generator 或 peer 检查。

## 验证

发布门禁接受插件新版本搭配固定 DSH 目标，并拒绝私有工作区版本不一致、peer 缺失或不符以及 generator 范围声明。课程 fixture 使用不同的插件和 DSH 版本，并拒绝过期的基线或 generator 声明。构建、包内容检查和隔离 Profile 验收继续遵循 [RELEASING.md](../../../../RELEASING.md) 的发布要求。
