# FinInsight

**AI-powered personal finance tracker for everyday spending and alternative assets.**

FinInsight is a free, web-based personal finance tool that helps you understand your money beyond plain bookkeeping.

## What it does

- **Daily tracking** — log income and expenses as you go.
- **Assets & liabilities** — manually record what you own and what you owe, for a real net-worth view.
- **AI analysis** — FinInsight runs a four-layer AI pipeline (DeepSeek LLM → local Ollama model → rule engine) to classify transactions and surface personal wealth insights. Privacy-sensitive users can run the AI fully offline via the local Ollama model.
- **Alternative-asset aware** — uniquely handles niche and alternative assets. For example, a "buy-then-resell" behavior (like buying a collectible doll and flipping it) is recognized as a quasi-investment and placed on the asset side, instead of being buried as a one-off expense.

## Why it's different

Most budgeting apps stop at categorization. FinInsight adds a personal-finance analysis layer and specifically deals with small or unconventional assets that other tools ignore — the kind of transactions real people actually have but no app knows how to treat.

## Tech stack

- Frontend: Vue 3 + TypeScript
- Backend: Hono + Node.js
- Deployment: GitHub Pages & Vercel (frontend), Railway (backend)
- Data: anonymous UUID-based accounts keep each user's data isolated

## Try it

Live demo: https://jiaxuanhan666.github.io/FinInsight/

## Privacy

FinInsight does not collect personal identity information (no phone number, no WeChat). Users are distinguished by an anonymous UUID, and data is isolated per user.
