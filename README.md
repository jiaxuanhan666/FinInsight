<p align="center">
  <img src="https://img.shields.io/badge/FinInsight-v2.1-a78bfa?style=for-the-badge" alt="FinInsight">
</p>

<h1 align="center">🏦 FinInsight</h1>
<h3 align="center">AI-Native Personal Finance Tracker · 青年 AI 智能记账系统</h3>
<p align="center">
  <em>Your purchases aren't endpoints — they might be hidden assets. AI makes the call.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript" alt="TS">
  <img src="https://img.shields.io/badge/Hono-4.6-E36002?logo=hono" alt="Hono">
  <img src="https://img.shields.io/badge/DeepSeek-AI-536DFE?logo=openai" alt="DeepSeek">
  <img src="https://img.shields.io/badge/Ollama-Local-000000?logo=ollama" alt="Ollama">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## What is FinInsight? / 什么是 FinInsight？

**EN** — FinInsight is an AI-native personal finance app for Gen Z. Unlike traditional bookkeeping tools that stop at "income minus expense," FinInsight uses a 4-layer AI pipeline to determine whether each purchase is pure consumption or a potentially resellable asset — in real time, at the moment of logging. Voice-to-ledger, category auto-tagging, AI financial reports, and a privacy-first UUID system make it the first tool that treats your sneakers, blind boxes, and digital gear as part of your net worth.

**CN** — FinInsight 是一款面向 Z 世代的 AI 原生记账工具。传统记账止步于"收入减支出"，FinInsight 通过四层 AI 决策流水线在记账瞬间判断每笔消费是纯消耗还是可变现资产。语音记账、品类自动标签、AI 财务报告、无感注册——你的潮玩、球鞋、数码设备第一次被当作净资产来管理。

---

## ✨ Why FinInsight / 核心亮点

| Feature / 功能 | Description |
|---------------|-------------|
| 🧠 **4-Layer AI Classification** | DeepSeek LLM → Ollama local → rule engine → temporal pattern detection. Every transaction is classified as `pure_consumption`, `dual_attribute`, or `alternative_asset`. |
| 🎤 **Voice-to-Ledger** | Speak "lunch 35 wechat" — AI extracts type, amount, category, and payment method. Supports batch: "lunch 35, coffee 18, cab 27". |
| 📊 **AI Financial Reports** | Structured JSON reports with consumption insights, asset snapshots, health metrics, and personality tags. Generated via DeepSeek or local Ollama. |
| 💎 **Alternative Asset Tracking** | Sneakers, blind boxes, luxury goods, digital products, collectibles — auto-detected and tracked as assets, not buried as expenses. |
| 🔒 **Zero-Data Collection** | No phone, no email, no real name. UUID-based anonymous accounts. Full offline AI via Ollama for privacy-conscious users. |
| 📈 **Growth Dashboard** | Real-time analytics: DAU trend, user value funnel, per-user feature adoption timeline, CSV export. Built for product-led growth operations. |
| 🌙 **Neon Noir Design** | Dark glassmorphism + 6-color neon accent system + spring-physics animations. Lexend font for data readability. |
| 💰 **$5/month to run** | Railway free tier + DeepSeek API (~¥0.001/1K tokens) + GitHub Pages. Sub-$10/month total infra cost for 1,000+ DAU. |

---

## 🧠 AI Architecture / AI 技术架构

```
User logs a transaction
        │
        ▼
┌─ Layer 1: DeepSeek LLM ──────────────────┐
│  Semantic understanding with 10 few-shot  │
│  examples. Output: JSON classification.   │
│  Temp 0.1 for deterministic results.      │
├─ Layer 2: Ollama Local ──────────────────┤
│  Falls back to qwen2.5:7b when DeepSeek   │
│  is unavailable. Fully offline.           │
├─ Layer 3: Rule Engine ───────────────────┤
│  50+ consumption keywords, 30+ asset      │
│  keywords. 100% availability, zero cost.  │
├─ Layer 4: Temporal Pattern Detection ────┤
│  Jaccard similarity on historical notes.  │
│  Detects buy-sell trading patterns.       │
└───────────────────────────────────────────┘
        │
        ▼
┌─ persistentTags ─────────────────────────┐
│  High-confidence (>0.85) classifications  │
│  are permanently memorized. Future same-  │
│  category transactions skip AI entirely.   │
│  Accuracy: 50% cold start → 95% after 1mo │
└───────────────────────────────────────────┘
```

---

## 📈 Growth Dashboard / 增长运营看板

FinInsight ships with a built-in analytics dashboard designed for **product-led growth operations**:

| Module | What it tracks | Why it matters |
|--------|---------------|----------------|
| **KPI Cards** | Total users, today's active, total transactions, AI reports | Real-time product health at a glance |
| **7-Day DAU Trend** | Daily active users over the past week | Retention signal — is the product sticky? |
| **User Value Funnel** | All users → Made a transaction → Used voice AI → Generated AI report | Activation & AI adoption rate; identifies conversion bottlenecks |
| **Feature Usage Rates** | % of users who used: ledger, AI reports, assets, savings goals | Which features drive engagement, which need promotion |
| **User Table (13 cols)** | Per-user: join date, active days, visit frequency, feature counts with timestamps | Segment power users vs. churn risks; target re-engagement |
| **CSV Export** | Full user list + funnel data downloadable as CSV | Offline analysis, investor reporting, cohort slicing |

**Growth thinking behind the design:**

> Traditional analytics dashboards show "what happened." FinInsight's dashboard is designed to answer "what should I do next?" — the user value funnel reveals exactly where users drop off, the feature usage table shows which AI capabilities need better onboarding, and the per-user active-day metric segments sticky users from one-time visitors. Every metric maps to an operational action: low activation → improve first-run experience; low voice adoption → make the mic button more prominent; low AI report conversion → add a post-transaction nudge.

---

## 🚀 Quick Start / 快速开始

```bash
# Prerequisites: Node.js >= 18, (optional) DeepSeek API key

git clone https://github.com/your-org/fininsight.git
cd fininsight

# Install dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# Set AI provider (optional)
echo "DEEPSEEK_API_KEY=sk-your-key" > server/.env

# Start server (port 3000)
cd server && npm run dev

# Start client (port 5173)
cd client && npm run dev

# Open: http://localhost:5173
```

---

## 🏗️ Tech Stack / 技术栈

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Vue 3.5 + TypeScript + Vite 5 | Reactive, fast HMR, Composition API |
| State | Pinia 2.2 | Modular stores for transactions, assets, savings |
| Charts | ECharts 5.5 | Dark-theme charts for DAU, funnel, rankings |
| Backend | Hono 4.6 (Node.js) | 3-5x faster than Express, native TS |
| AI Engine | DeepSeek API + Ollama local | Cloud + edge dual-mode, privacy option |
| Database | JSON File DB + Railway Volume | Zero-dependency, persistent, 300ms debounced writes |
| Design | Custom Glassmorphism + Neon | Lexend font, spring physics, 6-color system |
| Deployment | GitHub Pages (frontend) + Railway (backend) | Free-tier hosting, sub-$10/month total |

---

## 📁 Project Structure / 项目结构

```
fininsight/
├── client/                     # Vue 3 SPA
│   └── src/
│       ├── views/              # 11 page components
│       ├── components/ui/      # Card, Toast, BottomSheet, etc.
│       ├── components/charts/  # BarChart, PieChart (ECharts)
│       ├── stores/             # Pinia: user, transaction, asset, savings
│       └── styles/             # Design system CSS variables
├── server/                     # Hono API
│   └── src/
│       ├── routes/             # 9 API route modules
│       ├── ai/                 # Classifier + Voice parser + Prompts
│       │   ├── classifier.ts   # 4-layer AI classification pipeline
│       │   ├── prompts/        # Few-shot prompts for classify + report
│       │   └── providers/      # DeepSeek + Ollama adapters
│       └── db/                 # JSON file database with collection API
└── README.md
```

---

## 🔒 Privacy / 隐私

- **No personal data collected**: No phone, email, real name, or social login
- **UUID-based accounts**: Anonymous, generated client-side, no server-side identity linking
- **Offline AI capable**: Ollama local mode processes all data on-device
- **Zero third-party SDKs**: No analytics, no tracking, no ads
- **Open source**: Every line auditable

---

## 📄 License

MIT © FinInsight Team

<p align="center">
  <sub>AI is not the feature — it's the foundation. 你的每一次消费都不是终点。</sub>
</p>
