const dashboard = require('@userdashboard/dashboard')

module.exports = {
  start: (dirname) => {
    global.applicationPath = dirname || __dirname
    dashboard.start()
    delete (global.sitemap['/public/home.svg'])
    delete (global.sitemap['/public/extended.svg'])
  },
  stop: () => {
    dashboard.stop()
  }
}

module.exports.start(__dirname)