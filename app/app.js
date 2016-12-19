import fs from 'fs'
import http from 'http'
import https from 'https'

import mysql from 'mysql'
import express from 'express'
import ProxyServer from 'http-proxy'

const { HTTP_HOST_PORT = 80 } = process.env
const { HTTPS_HOST_PORT = 443 } = process.env

const proxy = ProxyServer.createProxyServer({
  timeout: 10 * 60 * 1000,
  proxyTimeout: 10 * 60 * 1000,
  ssl: {
    key: fs.readFileSync(process.env.DOMAIN_PRIVATE_KEY),
    cert: fs.readFileSync(process.env.DOMAIN_CERTIFICATE)
  },
  secure: false
})

proxy.on('error', (err, req, res) => {
  console.error(err)
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  })
  res.end(err.toString())
})

const app = express()
app
  .get('/reload', (req, res, next) => {
    if (req.headers.host + req.url === process.env.PROXY_HOST + '/reload') {
      app.get('loadHosts')()
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      })
      res.end('OK')

      return
    }
    next()
  })
  .all('*', (req, res) => {
    let hosts = app.get('hosts')
    let host = req.headers.host
    let protocol = req.protocol
    let target = hosts['*'][protocol]

    if ((hosts[host] !== undefined) && (hosts[host][protocol] !== undefined)) {
      target = hosts[host][protocol]
    }

    console.log(host + req.url + '  ' + req.headers.referer + ' -> ' + (target))

    proxy.web(req, res, {target: target})
  })
  .set('hosts', {}) // map with hots definition
  .set('loadHosts', () => { // function for (re)load hosts definition
    let connection = mysql.createConnection(process.env.MYSQL_URL)
    let hosts = {}

    connection.connect()
    connection.query('SELECT * FROM hosts', (err, rows, fields) => {
      if (err) throw err

      rows.forEach((item) => {
        if (hosts[item.host] === undefined) {
          hosts[item.host] = {}
        }

        hosts[item.host][item.protocol] = `${item.protocol}://${item.proxy_host}:${item.proxy_port}`
      })

      app.set('hosts', hosts)
      console.log(app.get('hosts'))
    })
    connection.end()
  })

// Listen on HTTP port
http.createServer(app).listen(HTTP_HOST_PORT)

// Listen on HTTPS port
https.createServer({
  key: fs.readFileSync(process.env.DOMAIN_PRIVATE_KEY),
  cert: fs.readFileSync(process.env.DOMAIN_CERTIFICATE),
  ca: [fs.readFileSync(process.env.CA_CERTIFICATE)]
}, app).listen(HTTPS_HOST_PORT)

app.get('loadHosts')()
