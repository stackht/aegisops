import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { installDemoApi } from './demo/engine.js'
import './index.css'

// Static demo: the whole backend runs in the browser, so /api/v1 calls are answered locally.
installDemoApi()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
