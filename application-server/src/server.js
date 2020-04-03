const dashboardServer = require('./dashboard-server.js')
const expressApplicationServer = require('@userdashboard/express-application-server')
const fs = require('fs')
const http = require('http')
const Multiparty = require('multiparty')
const path = require('path')
const querystring = require('querystring')
const util = require('util')

const fileCache = {}
const errorPage = fs.readFileSync(path.join(__dirname, '/error.html')).toString()
const homePage = fs.readFileSync(path.join(__dirname, '/home.html')).toString()
const publicPage = fs.readFileSync(path.join(__dirname, '/public.html')).toString()
const indexPage = fs.readFileSync(path.join(__dirname, '/index.html')).toString()
const WhoIs = require('./whois.js')
const mimeTypes = {
  js: 'text/javascript',
  css: 'text/css',
  txt: 'text/plain',
  html: 'text/html',
  jpg: 'image/jpeg',
  png: 'image/png',
  ico: 'image/x-icon',
  svg: 'image/svg+xml'
}

let server
module.exports = {
  start: async (port, host) => {
    server = await http.createServer(receiveRequest).listen(port, host)
    console.log('ready')
  },
  stop: async () => {
    if (server) {
      server.close()
      server = null
    }
  }
}

const parsePostData = util.promisify((req, callback) => {
  if (req.headers &&
      req.headers['content-type'] &&
      req.headers['content-type'].indexOf('multipart/form-data') > -1) {
    return callback()
  }
  let body = ''
  req.on('data', (data) => {
    body += data
  })
  return req.on('end', () => {
    if (!body) {
      return callback()
    }
    return callback(null, body)
  })
})

const parseMultiPartData = util.promisify((req, callback) => {
  const form = new Multiparty.Form()
  return form.parse(req, async (error, fields, files) => {
    if (error) {
      return callback(error)
    }
    req.body = {}
    for (const field in fields) {
      req.body[field] = fields[field][0]
    }
    req.uploads = {}
    for (const field in files) {
      const file = files[field][0]
      if (!file.size) {
        continue
      }
      const extension = file.originalFilename.toLowerCase().split('.').pop()
      const type = extension === 'png' ? 'image/png' : 'image/jpeg'
      req.uploads[field] = {
        type,
        buffer: fs.readFileSync(file.path),
        name: file.originalFilename
      }
      fs.unlinkSync(file.path)
    }
    return callback()
  })
})

async function staticFile (req, res) {
  const extension = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase()
  const mimeType = mimeTypes[extension]
  if (!mimeType) {
    return throw500(req, res)
  }
  let blob = fileCache[filePath]
  if (blob) {
    res.setHeader('content-type', mimeType)
    return res.end(blob)
  }
  const filePath = path.join('./www', req.urlPath)
  if (!fs.existsSync(filePath)) {
    return throw404(req, res)
  }
  const stat = fs.statSync(filePath)
  if (stat.isDirectory()) {
    return throw404(req, res)
  }
  blob = fs.readFileSync(filePath)
  fileCache[filePath] = blob
  res.setHeader('content-type', mimeType)
  return res.end(blob)
}

async function receiveRequest (req, res) {
  req.urlPath = req.url.split('?')[0]
  if (req.urlPath === '/') {
    res.setHeader('content-type', 'text/html')
    return res.end(indexPage)
  }
  if (req.urlPath.startsWith('/public/')) {
    return staticFile(req, res)
  }
  await expressApplicationServer(req, res, async () => {
    if (req.verified) {
      req.accountid = req.headers['x-accountid']
      req.sessionid = req.headers['x-sessionid']
    }
    if (!req.accountid) {
      return throw511(req, res)
    }
    if (req.urlPath === '/home') {
      res.setHeader('content-type', 'text/html')
      if (global.publicDomain) {
        return res.end(homePage.replace('</html>', `<script>window.publicDomain = "${global.publicDomain}"</script></html>`))
      } else {
        return res.end(homePage)
      }
    }
    if (req.urlPath === '/whois.js') {
      const whois = await WhoIs.get(req)
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      return res.end(JSON.stringify(whois))
    }
    if (!req.urlPath.startsWith('/api/')) {
      return throw404(req, res)
    }
    if (!req.accountid) {
      return throw511(req, res)
    }
    if (req.urlPath.startsWith('/administrator/')) {
      const account = await dashboardServer.get(`/api/user/account?accountid=${req.accountid}`, req.accountid, req.sessionid)
      if (!account.administrator) {
        return throw500(req, res)
      }
    }
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT' || req.method === 'DELETE') {
      if (req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data;') > -1) {
        try {
          await parseMultiPartData(req)
        } catch (error) {
          return throw500(req, res)
        }
      }
      if (!req.body) {
        try {
          req.bodyRaw = await parsePostData(req)
        } catch (error) {
          return throw500(req, res)
        }
        if (req.bodyRaw) {
          req.body = querystring.parse(req.bodyRaw, '&', '=')
        }
      }
    }
    const apiPath = path.join(`./www`, req.urlPath)
    if (!fs.existsSync(apiPath)) {
      return throw404(req, res)
    }
    const api = require(apiPath)
    const method = req.method.toLowerCase()
    if (!api[method]) {
      return throw404(req, res)
    }
    let result
    try {
      result = await api[method](req)
    } catch (error) {
      return throw500(req, res)
    }
    if (!result) {
      return throw500(req, res)
    }
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify(result))
  })
}

function throw404 (req, res) {
  return throwError(req, res, 404)
}

function throw500 (req, res) {
  return throwError(req, res, 500)
}

function throw511 (req, res) {
  return throwError(req, res, 511)
}

function throwError(req, res, error) {
  if (req.urlPath.startsWith('/api/')) {
    res.writeHead(error, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(`{ "error": "An error ${error} ocurred" }`) 
  }
  res.setHeader('content-type', 'text/html')
  res.statusCode = error
  return res.end(errorPage)
}
