import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import anthropicHandler from './api/anthropic.js'

function localApiProxy() {
  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/anthropic', (req, res) => {
        if (!res.status) {
          res.status = (code) => {
            res.statusCode = code
            return res
          }
        }
        if (!res.json) {
          res.json = (payload) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          }
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', async () => {
          req.body = body
          try {
            await anthropicHandler(req, res)
          } catch (error) {
            console.error('Local API proxy error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error?.message || 'Server error' }))
          }
        })
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
  plugins: [react(), localApiProxy()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  }
})
