/* eslint-env mocha */
let applicationServer

const TestHelper = module.exports = require('@userdashboard/organizations/test-helper.js')
TestHelper.defaultConfiguration.applicationServer = `http://localhost:${process.env.APPLICATION_SERVER_PORT}`
TestHelper.defaultConfiguration.applicationServerPort = process.env.APPLICATION_SERVER_PORT
TestHelper.defaultConfiguration.applicationServerToken = 'token'

before(async () => {
  if (applicationServer) {
    return
  }
  applicationServer = require('../application-server/main.js')
  await applicationServer.start(process.env.APPLICATION_SERVER_PORT)
})


after(async () => {
  if (applicationServer) {
    await applicationServer.stop()
    applicationServer = null
  }
})
