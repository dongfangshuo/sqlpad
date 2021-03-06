#!/usr/bin/env node

// Parse command line flags to see if anything special needs to happen
require('./lib/cli-flow.js')
var express = require('express')
const fs = require('fs')
var http = require('http')
var https = require('https')
var path = require('path')
var packageJson = require('./package.json')
var detectPort = require('detect-port')

/*  Env/Cli Config stuff
============================================================================= */
const config = require('./lib/config.js')
const BASE_URL = config.get('baseUrl')
const IP = config.get('ip')
const PORT = config.get('port')
const HTTPS_PORT = config.get('httpsPort')
const GOOGLE_CLIENT_ID = config.get('googleClientId')
const GOOGLE_CLIENT_SECRET = config.get('googleClientSecret')
const PUBLIC_URL = config.get('publicUrl')
const DEBUG = config.get('debug')
const PASSPHRASE = config.get('passphrase')
const CERT_PASSPHRASE = config.get('certPassphrase')
const KEY_PATH = config.get('keyPath')
const CERT_PATH = config.get('certPath')
const SYSTEMD_SOCKET = config.get('systemdSocket')

if (DEBUG) {
  console.log('Config Values:')
  console.log(config.getAllValues())
}

/*  Express setup
============================================================================= */
var bodyParser = require('body-parser')
var favicon = require('serve-favicon')
var cookieParser = require('cookie-parser')
var cookieSession = require('cookie-session')
var morgan = require('morgan')
var passport = require('passport')
var errorhandler = require('errorhandler')

var app = express()

app.locals.title = 'SQLPad'
app.locals.version = packageJson.version
app.set('env', DEBUG ? 'development' : 'production')

if (DEBUG) app.use(errorhandler())
app.use(favicon(path.join(__dirname, '/public/images/favicon.ico')))
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true
  })
)

app.use(cookieParser(PASSPHRASE)) // populates req.cookies with an object
app.use(cookieSession({ secret: PASSPHRASE }))
app.use(passport.initialize())
app.use(passport.session())
app.use(BASE_URL, express.static(path.join(__dirname, 'build')))
if (DEBUG) app.use(morgan('dev'))
app.use(function(req, res, next) {
  // Bootstrap res.locals with any common variables
  res.locals.message = null
  res.locals.navbarConnections = []
  res.locals.debug = null
  res.locals.query = null
  res.locals.queryMenu = false
  res.locals.session = req.session || null
  res.locals.pageTitle = ''
  res.locals.user = req.user
  res.locals.isAuthenticated = req.isAuthenticated()
  res.locals.baseUrl = BASE_URL
  next()
})

/*  Passport setup
============================================================================= */
require('./middleware/passport.js')

/*  Routes

    Generally try to follow the standard convention.
    But sometimes I don't though:

    create → POST    /collection
    read → GET       /collection[/id]
    update → PUT     /collection/id
    delete → DELETE  /collection/id
============================================================================= */
var routers = [
  require('./routes/homepage.js'),
  require('./routes/app.js'),
  require('./routes/version.js'),
  require('./routes/users.js'),
  require('./routes/forgot-password.js'),
  require('./routes/password-reset.js'),
  require('./routes/connections.js'),
  require('./routes/queries.js'),
  require('./routes/query-result.js'),
  require('./routes/download-results.js'), // streams result download to browser
  require('./routes/schema-info.js'),
  require('./routes/config-values.js'),
  require('./routes/tags.js'),
  require('./routes/signup-signin-signout.js')
]

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && PUBLIC_URL) {
  if (DEBUG) console.log('Enabling Google authentication Strategy.')
  routers.push(require('./routes/oauth.js'))
}

routers.forEach(function(router) {
  app.use(BASE_URL, router)
})

// for any missing api route, return a 404
app.use(BASE_URL + '/api/', function(req, res) {
  console.log('reached catch all api route')
  res.sendStatus(404)
})

// Anything else should render the client-side app
// Client-side routing will take care of things from here
// index-template.html generated by create-react-app must consider BASE_URL
const htmlPath = path.join(__dirname, '/build/index-template.html')
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8')
  const baseUrlHtml = html
    .replace(/="\/stylesheets/g, '="' + BASE_URL + '/stylesheets')
    .replace(/="\/javascripts/g, '="' + BASE_URL + '/javascripts')
    .replace(/="\/images/g, '="' + BASE_URL + '/images')
    .replace(/="\/fonts/g, '="' + BASE_URL + '/fonts')
    .replace(/="\/static/g, '="' + BASE_URL + '/static')
  app.use((req, res) => res.send(baseUrlHtml))
} else {
  console.error('\nNO FRONT END TEMPLATE DETECTED')
  console.error('If not running in dev mode please report this issue.\n')
}

function isFdObject(ob) {
  return ob && typeof ob.fd === 'number'
}

// When --systemd-socket is passed we will try to acquire the bound socket
// directly from Systemd.
//
// More info
//
// https://github.com/rickbergfalk/sqlpad/pull/185
// https://www.freedesktop.org/software/systemd/man/systemd.socket.html
// https://www.freedesktop.org/software/systemd/man/sd_listen_fds.html
function detectPortOrSystemd(port) {
  if (SYSTEMD_SOCKET) {
    const passedSocketCount = parseInt(process.env.LISTEN_FDS, 10) || 0

    // LISTEN_FDS contains number of sockets passed by Systemd. At least one
    // must be passed. The sockets are set to file descriptors starting from 3.
    // We just crab the first socket from fd 3 since sqlpad binds only one
    // port.
    if (passedSocketCount > 0) {
      console.log('Using port from Systemd')
      return Promise.resolve({ fd: 3 })
    } else {
      console.error(
        'Warning: Systemd socket asked but not found. Trying to bind port ' +
          port +
          ' manually'
      )
    }
  }

  return detectPort(port)
}

/*  Start the Server
============================================================================= */
require('./lib/db').load(function(err) {
  if (err) throw err

  // determine if key pair exists for certs
  if (KEY_PATH && CERT_PATH) {
    // https only
    console.log('Launching server with SSL')
    detectPortOrSystemd(HTTPS_PORT).then(function(_port) {
      if (!isFdObject(_port) && HTTPS_PORT !== _port) {
        console.log(
          '\nPort %d already occupied. Using port %d instead.',
          HTTPS_PORT,
          _port
        )
        // Persist the new port to the in-memory store. This is kinda hacky
        // Assign value to cliValue since it overrides all other values
        var ConfigItem = require('./models/ConfigItem.js')
        var portConfigItem = ConfigItem.findOneByKey('httpsPort')
        portConfigItem.cliValue = _port
        portConfigItem.computeEffectiveValue()
      }

      var privateKey = fs.readFileSync(KEY_PATH, 'utf8')
      var certificate = fs.readFileSync(CERT_PATH, 'utf8')
      var httpsOptions = {
        key: privateKey,
        cert: certificate,
        passphrase: CERT_PASSPHRASE
      }

      https.createServer(httpsOptions, app).listen(_port, IP, function() {
        console.log(
          '\nWelcome to ' +
            app.locals.title +
            '!. Visit https://' +
            (IP === '0.0.0.0' ? 'localhost' : IP) +
            ':' +
            _port +
            BASE_URL +
            ' to get started'
        )
      })
    })
  } else {
    // http only
    console.log('Launching server WITHOUT SSL')
    detectPortOrSystemd(PORT).then(function(_port) {
      if (!isFdObject(_port) && PORT !== _port) {
        console.log(
          '\nPort %d already occupied. Using port %d instead.',
          PORT,
          _port
        )
        // Persist the new port to the in-memory store. This is kinda hacky
        // Assign value to cliValue since it overrides all other values
        var ConfigItem = require('./models/ConfigItem.js')
        var portConfigItem = ConfigItem.findOneByKey('port')
        portConfigItem.cliValue = _port
        portConfigItem.computeEffectiveValue()
      }
      http.createServer(app).listen(_port, IP, function() {
        console.log(
          '\nWelcome to ' +
            app.locals.title +
            '!. Visit http://' +
            (IP === '0.0.0.0' ? 'localhost' : IP) +
            ':' +
            _port +
            BASE_URL +
            ' to get started'
        )
      })
    })
  }
})
