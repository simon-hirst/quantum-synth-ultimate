import http from 'http'
import fs from 'fs'
import path from 'path'
import url from 'url'

const root = process.cwd()
const port = parseInt(process.argv[2] || '5173', 10)
const types = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8'
}

const send = (res, code, body, headers={}) => {
  res.writeHead(code, headers)
  res.end(body)
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url)
  let pathname = decodeURIComponent(parsed.pathname || '/')
  if (pathname.endsWith('/')) pathname += 'index.html'
  const file = path.join(root, pathname.replace(/^\//, ''))
  if (!file.startsWith(root)) return send(res, 403, 'forbidden')

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'not found')
    const ext = path.extname(file).toLowerCase()
    const type = types[ext] || 'application/octet-stream'
    res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-store'})
    fs.createReadStream(file).pipe(res)
  })
})

server.listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`)
})
