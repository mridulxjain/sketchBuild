# sketchBuild 🎨 ➡️ 💻

Turn hand-drawn UI wireframes and design images into production-ready React + Tailwind CSS components instantly.

## ✨ Features
- **Design Canvas:** Full interactive drawing toolkit (shapes, colors, fill bucket, eraser).
- **Image Upload:** Upload wireframes or mockups directly (PNG, JPG, WEBP).
- **Live Preview & Code:** Instantly view the generated UI and copy the React code.
- **AI-Powered:** Uses Vision LLMs (Groq, OpenAI, xAI) to accurately translate visual semantics into code.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API keys:**
   ```bash
   cp .env.example .env
   ```
   Add your preferred provider's keys in `.env` (Groq, OpenAI, or xAI) along with the model.

3. **Run locally:**
   ```bash
   npm run dev
   ```

> **Note:** Never expose API keys in production frontend bundles. Always use a secure backend proxy for live deployments.
