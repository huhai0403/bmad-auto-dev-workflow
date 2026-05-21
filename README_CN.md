# bmad-auto-dev-workflow

一个面向 [BMad](https://github.com/bmad-code-org/BMAD-METHOD) 的全自动端到端开发流水线技能——BMad 是一个 AI 驱动的软件开发框架。该技能编排了从故事创建到实现、测试、多模型代码审查以及完成审计的完整软件开发生命周期。

## 概述

这是一个**工作流编排器**技能，将多个 BMad 子技能串联成一条无缝流水线：

```
故事创建 → 开发 → 测试 → 多模型代码审查 → 状态更新 → 完成审计
```

### 核心能力

- **双执行模式**：全自动（无头模式，零人工交互）或半自动（含人工检查点）
- **多模型代码审查**：两次独立的 AI 审查以提升代码质量
- **故障处理**：自动重试（最多 2 次）并详细记录阻塞点
- **完成审计**：自动验证所有已完成故事是否具备必需的证据产物（测试输出、代码审查）
- **演练模式**：验证路由逻辑而不真正执行开发/测试/审查
- **断点续传**：支持从上次中断处继续执行
- **多批次支持**：支持处理多个需求批次，并对命名差异进行模糊匹配

## 目录结构

```
bmad-auto-dev-workflow/
├── SKILL.md              # 技能入口与配置
├── workflow.md           # 详细工作流定义
├── validate-workflow.js  # 工作流文件静态校验器
├── references/
│   ├── batch-resolution.md
│   ├── dry-run-mode.md
│   ├── execution-log.md
│   ├── execution-mode.md
│   ├── markdown-sprint-status-parser.md
│   ├── report-mode.md
│   ├── resume-mode.md
│   ├── step-01-discovery.md
│   ├── step-02-create-story.md
│   ├── step-03-development.md
│   ├── step-04-testing.md
│   ├── step-05-code-review.md
│   ├── step-06-status-update.md
│   ├── step-07-checkpoint.md
│   └── step-08-completion-audit.md
├── LICENSE
├── README.md
└── README_CN.md
```

## 依赖项

该技能作为编排器运行，需要安装以下 BMad 技能：

| 技能 | 用途 |
|------|------|
| `bmad-create-story` | 从 backlog 创建故事上下文文件 |
| `bmad-dev-story` | 执行开发实现 |
| `bmad-code-review` | 执行对抗性代码审查 |
| `bmad-create-prd` | 生成 PRD 文档（规划阶段） |
| `bmad-create-architecture` | 创建架构方案设计 |
| `bmad-create-epics-and-stories` | 将需求拆分为史诗与故事 |
| `bmad-sprint-planning` | 生成 Sprint 状态跟踪 |

### 期望的项目级约定

该技能假定 BMad 项目具有以下目录结构：

- `_bmad/bmm/config.yaml` — BMad 主配置文件
- `_bmad-output/planning-artifacts/` — 规划产物（PRD、史诗、架构）
- `_bmad-output/implementation-artifacts/` — 实现产物（Sprint 状态、故事文件）
- `project-context.md` — 项目上下文文档

### 外部工具

测试阶段需要以下 npm 脚本可用：

- `npm run test:unit` — 单元测试（Jest）
- `npm run test:e2e` — 端到端测试（Playwright）
- `npm run lint` — 代码质量检查（ESLint）

## 使用方式

### 全新启动

```bash
# 全自动模式（无头）
bmad-auto-dev-workflow --headless

# 半自动模式（含检查点）
bmad-auto-dev-workflow --semi

# 指定批次
bmad-auto-dev-workflow --headless --batch "v1.3.13-editor-update"

# 从指定故事开始
bmad-auto-dev-workflow --headless --story "1-3-editor-update-plaintext-edit"

# 处理指定史诗
bmad-auto-dev-workflow --headless --epic 1

# 演练模式（仅验证路由，不真正执行）
bmad-auto-dev-workflow --dry-run --batch "v1.3.13-editor-update"
```

### 断点续传

```bash
bmad-auto-dev-workflow --resume
```

### 仅生成报告

```bash
bmad-auto-dev-workflow --report-only --batch "v1.3.13-editor-update"
```

## 校验

运行静态校验器检查工作流文件完整性：

```bash
node validate-workflow.js
```

## 交互风格

- **无头模式**：机器执行器——仅显示单行进度指示，不提问，无菜单
- **半自动模式**：对话式，解释决策，在检查点请求确认

## 许可证

MIT — 详见 [LICENSE](LICENSE)
