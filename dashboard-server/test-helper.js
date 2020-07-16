/* eslint-env mocha */
global.applicationPath = __dirname
let applicationServer

before(async () => {
  console.log('starting application server', process.env.APPLICATION_SERVER_PORT, applicationServer)
  if (applicationServer) {
    return
  }
  applicationServer = require('../application-server/main.js')
  await applicationServer.start(process.env.APPLICATION_SERVER_PORT)
})

beforeEach(async () => {
  global.applicationServer = `http://localhost:${process.env.APPLICATION_SERVER_PORT}`
})

after(async () => {
  if (applicationServer) {
    await applicationServer.stop()
    applicationServer = null
  }
})

module.exports = require('@userdashboard/organizations/test-helper.js')
