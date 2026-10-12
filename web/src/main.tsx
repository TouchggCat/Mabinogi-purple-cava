import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics：訪客數、瀏覽次數（需在 Vercel 專案 Analytics 分頁啟用） */}
    <Analytics />
  </StrictMode>,
)
