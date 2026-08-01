<p align="center">
  <img src="https://img.shields.io/badge/FinInsight-v2.1-a78bfa?style=for-the-badge&logo=github" alt="FinInsight">
</p>

<h1 align="center">🏦 FinInsight</h1>
<h3 align="center">AI 驱动的青年智能记账与资产管理系统</h3>
<p align="center">
  <em>Glassmorphism × Neon Accent · 暗夜霓光设计语言 · 零隐私采集</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript" alt="TS">
  <img src="https://img.shields.io/badge/Hono-4.6-E36002?logo=hono" alt="Hono">
  <img src="https://img.shields.io/badge/DeepSeek-AI-536DFE?logo=openai" alt="DeepSeek">
  <img src="https://img.shields.io/badge/Ollama-Local-000000?logo=ollama" alt="Ollama">
  <img src="https://img.shields.io/badge/ECharts-5.5-AA344D?logo=apacheecharts" alt="ECharts">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## ✨ 一句话介绍

**FinInsight** 是一款面向 18-30 岁年轻群体的 AI 智能记账应用。不再只是"记流水账"——每次记账，AI 自动判别这笔消费是"纯消耗"还是"可变现资产"，自动构建你的**另类资产台账**，并通过多轮时序行为分析学习你的消费习惯，最终生成专业的 AI 财务报告。**你的每一笔消费，都可能是一笔隐藏的资产。**

---

## 🎯 解决的核心问题

传统记账工具只做"收入 - 支出 = 结余"的平面记录。但 Z 世代的消费行为已完全不同——潮玩、球鞋、数码、奢侈品、收藏品……很多消费本身就是流动资产。FinInsight 通过 **AI 语义理解 + 规则引擎 + 时序行为分析 + 用户反馈学习** 四层决策流水线，在记账的那一刻自动识别资金属性，填补了"消费品 → 资产"认知鸿沟。

---

## 🧠 AI 技术亮点

### 四层 AI 分类决策流水线

```
用户记账 ─→ ┌─────────────────────────────────────────┐
            │ Layer 1: LLM 语义理解                      │
            │ DeepSeek API → 判定 pure_consumption      │
            │               → 或   dual_attribute       │
            │           ↓ fallback                      │
            │ Layer 2: 本地模型兜底 (Ollama / qwen2.5)   │
            │           ↓ fallback                      │
            │ Layer 3: 关键词规则引擎 (50+ 品类覆盖)      │
            │           ↓                               │
            │ Layer 4: 时序行为分析                       │
            │  检测同品类历史买卖模式                     │
            │  → 识别资产交易行为 (asset_trading)         │
            └─────────────────────────────────────────┘
                        ↓
            ┌──────────────────────────┐
            │ persistentTags 持久记忆   │
            │ 用户确认后永久记住品类标签  │
            │ 越用越准，冷启动后收敛极快  │
            └──────────────────────────┘
                        ↓
            ┌──────────────────────────┐
            │ AI 财务报告自动生成        │
            │ DeepSeek → 结构化 JSON    │
            │ 消费洞察 + 资产快照        │
            │ 财务健康指标 + 人格标签    │
            └──────────────────────────┘
```

### 关键 AI 能力

| 能力 | 技术实现 | 精度保障 |
|------|---------|---------|
| **语义分类** | DeepSeek-Chat LLM + 结构化 JSON 输出 | Few-shot 10 组范例 + Temperature 0.1 |
| **本地兜底** | Ollama qwen2.5:7b 本地推理 | 无网络环境下仍可运行 |
| **规则引擎** | 50+ 纯消费关键词 + 30+ 双属性关键词 + 变现关键词 | 100% 覆盖常见品类 |
| **时序分析** | 字符集 Jaccard 相似度 → 检测同品类买卖模式 | 相似度阈值 0.4 |
| **持久记忆** | persistentTags 表 → 用户确认后 AI 不再重复询问 | 高置信度(>0.85)自动记忆 |
| **财务报告** | 结构化数据注入 + LLM 生成 6 模块报告 | 所有数字由数据驱动，LLM 仅做归纳 |

---

## 🏗️ 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **前端框架** | Vue 3.5 + TypeScript | Composition API + `<script setup>` |
| **构建工具** | Vite 5.4 | 极速 HMR |
| **状态管理** | Pinia 2.2 | 模块化 Store |
| **路由** | Vue Router 4.4 | Hash History (SPA) |
| **图表** | ECharts 5.5 + vue-echarts | 柱状图/饼图/环形图 |
| **本地存储** | Dexie 4.0 (IndexedDB) | 离线数据缓存 |
| **服务端** | Hono 4.6 (Node.js) | 轻量级 Web 框架 |
| **AI 引擎** | DeepSeek API + Ollama 本地 | 双轨 AI，云+端 |
| **数据层** | JSON File DB | 零依赖，单文件持久化 |
| **设计系统** | Glassmorphism + Neon + Bento Grid | 暗色主题设计语言 |
| **字体** | Lexend (Google Fonts) + 系统中文 | 高品质数字显示 |

---

## 📊 功能模块全景

```
FinInsight v2.1
├── 🔐 无感注册              — UUID 自动生成，无需手机号/邮箱
├── 📊 智能总览 (Home)        — 净资产、收支统计、AI 分类概览
├── ✍️ AI 记账 (Record)       — 品类备注 → AI 自动分类 + 自定义品类
├── 🏠 资产负债 (Balance)     — 另类资产 / 金融资产 / 负债台账
├── 🤖 AI 报告 (Report)       — 自动生成周/月/年财务报告
├── ★ 攒钱计划 (Savings)      — 目标储蓄 + 进度追踪 + 环形图
├── 📋 记录管理 (Records)     — 全量交易查询/编辑/删除
├── 💳 月度还款追踪            — 负债月供自动同步，点击标记已还
├── 🔄 账本合并               — 换设备 → UUID 合并 → 数据无损迁移
└── 👤 个人中心 (Settings)    — 用户信息 / 数据概览 / 快捷入口
```

---

## 🚀 快速开始

### 前提条件

- Node.js >= 18
- (可选) DeepSeek API Key — 用于 AI 分类和报告生成
- (可选) Ollama 本地运行 — 离线 AI 能力

### 安装与运行

```bash
# 1. 克隆项目
git clone https://github.com/your-org/fininsight.git
cd fininsight

# 2. 安装依赖
cd client && npm install && cd ..
cd server && npm install && cd ..

# 3. 配置环境变量 (可选)
# server/.env
echo "DEEPSEEK_API_KEY=sk-your-key-here" > server/.env
echo "OLLAMA_BASE_URL=http://localhost:11434" >> server/.env

# 4. 启动服务端 (端口 3000)
cd server && npm run dev

# 5. 启动客户端 (端口 5173)
cd client && npm run dev

# 6. 打开浏览器
# http://localhost:5173
```

### 部署架构

```
┌─────────────┐     HTTPS      ┌──────────────┐
│   Vercel    │ ◄────────────── │   Browser    │
│  (SPA 静态) │                 │   (PWA-like) │
└─────────────┘                 └──────────────┘
                                      │
                               API (HTTPS)
                                      │
                               ┌──────┴──────┐
                               │   Railway   │
                               │  (Hono API) │
                               │   Port 3000 │
                               └──────┬──────┘
                                      │
                          ┌───────────┼───────────┐
                          ▼           ▼           ▼
                    ┌──────────┐ ┌────────┐ ┌──────────┐
                    │ DeepSeek │ │ Ollama │ │ JSON DB  │
                    │   API    │ │ (本地)  │ │ (文件)   │
                    └──────────┘ └────────┘ └──────────┘
```

---

## 🎨 设计系统

FinInsight 采用自主研发的 **暗夜霓光 (Neon Noir)** 设计语言：

- **Glassmorphism**: 半透明毛玻璃卡片 + `backdrop-filter: blur(24px)`
- **Neon Accent**: 6 色霓虹系统（紫/薄荷/粉/蓝/琥珀/珊瑚）
- **Bento Grid**: 苹果风格的不规则网格布局
- **Geometric Icons**: 几何符号替代 emoji，跨平台一致渲染
- **Spring Physics**: `cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性动效
- **Lexend Font**: Google 出品的可变字体，专为数据可视化优化数字可读性

---

## 📁 项目结构

```
fininsight/
├── client/                       # Vue 3 前端 SPA
│   ├── src/
│   │   ├── views/                # 11 个页面组件
│   │   │   ├── LoginView.vue     #   启动页 (功能引导)
│   │   │   ├── HomeView.vue      #   总览仪表盘
│   │   │   ├── RecordView.vue    #   记账表单 (自定义品类)
│   │   │   ├── BalanceSheetView.vue  # 资产负债台账
│   │   │   ├── ReportView.vue    #   AI 报告生成
│   │   │   ├── SavingsView.vue   #   攒钱计划
│   │   │   ├── RecordsView.vue   #   交易记录管理
│   │   │   ├── SettingsView.vue  #   个人中心
│   │   │   ├── HistoryReportsView.vue       # 报告历史
│   │   │   ├── ClassificationDetailView.vue # AI 分类详情
│   │   │   └── AdminDashboard.vue           # 管理后台
│   │   ├── components/
│   │   │   ├── ui/               # Card, Toast, Modal, BottomSheet, ProgressBar, RingProgress
│   │   │   └── charts/           # BarChart, PieChart, TrendChart (ECharts 封装)
│   │   ├── stores/               # Pinia 状态管理 (user/transaction/asset/savings)
│   │   ├── router/               # Vue Router 配置
│   │   ├── services/             # API 客户端 + 埋点
│   │   └── styles/               # 设计系统 CSS 变量
│   └── vercel.json               # Vercel 部署配置
│
├── server/                       # Hono API 服务端
│   ├── src/
│   │   ├── index.ts              # 服务入口
│   │   ├── db/index.ts           # JSON File DB (内存 + 磁盘持久化)
│   │   ├── middleware/auth.ts    # UUID 认证中间件
│   │   ├── routes/               # 8 个 API 路由模块
│   │   │   ├── user.ts           #   注册 / 合并账本
│   │   │   ├── transaction.ts    #   交易 CRUD + AI 分类触发
│   │   │   ├── asset.ts          #   资产 CRUD
│   │   │   ├── liability.ts      #   负债 CRUD
│   │   │   ├── savings.ts        #   攒钱目标 CRUD
│   │   │   ├── report.ts         #   AI 报告生成
│   │   │   ├── analytics.ts      #   埋点 + 管理后台
│   │   │   └── exchangeRate.ts   #   汇率查询
│   │   └── ai/                   # AI 引擎
│   │       ├── classifier.ts     #   四层分类决策流水线
│   │       ├── prompts/
│   │       │   ├── classify.ts   #   分类 Prompt + 10 组 Few-shot
│   │       │   └── report.ts     #   报告 Prompt + 财务人格标签库
│   │       └── providers/
│   │           ├── deepseek.ts   #   DeepSeek API 适配器
│   │           └── ollama.ts     #   Ollama 本地适配器
│   └── data/                     # JSON 数据库文件 (运行时生成)
│
└── README.md
```

---

## 🔒 隐私承诺

- **零隐私采集**: 无需手机号、邮箱、实名认证 — UUID 自动生成
- **数据全程加密**: HTTPS 传输，无第三方统计 SDK
- **本地优先**: 用户可选择仅使用 Ollama 本地模型，数据完全不出设备
- **开源透明**: 所有代码可审查，无后门

---

## 📄 License

MIT © FinInsight Team

---

<p align="center">
  <sub>Built with ❤️ by product-minded engineers. AI is not the feature — it's the foundation.</sub>
</p>
