# BranchMark 品牌素材

本目录保存 BranchMark 当前使用的 Threadbook v4 标志和一组可复用导出。SVG 是产品界面的首选格式；PNG 用于不支持 SVG 的预览、文档或社交平台。

## 推荐素材

| 文件 | 用途 |
| --- | --- |
| `branchmark-logo-threadbook-v4-color.svg` | README、Release 和固定品牌色场景；在明暗背景上保持彩色可见性 |
| `branchmark-logo-threadbook-v4.svg` | 支持 `currentColor` 的产品界面；颜色由宿主主题控制 |
| `branchmark-logo-threadbook-v4-compact.svg` | 小尺寸按钮、标签和导航入口；颜色由宿主主题控制 |
| `branchmark-logo-threadbook-v4.png` | 512 × 512 白底栅格预览 |
| `branchmark-logo-threadbook-v4-compact.png` | 256 × 256 白底紧凑栅格预览 |

## 设计参考

`branchmark-logo-threadbook-v4-ai-reference.png` 是形成 Threadbook v4 方向时使用的视觉参考，不是产品标志，也不应替代上述 SVG。它保留在仓库中，便于后续调整枝条、线装本和来源节点时理解视觉来源。

## 维护规则

产品标志变化时先更新 SVG，再重新导出 PNG。用于 README 或 GitHub Release 的标志必须使用固定颜色版本，避免 `currentColor` 在深色页面中解析为不可见的黑色。
