/* eslint-env mocha */
global.applicationPath = __dirname
let applicationServer

module.exports = require('@userdashboard/organizations/test-helper.js')

before(async () => {
  console.log('starting application server', process.env.APPLICATION_SERVER_PORT, applicationServer)
  if (applicationServer) {
    return
  }
  applicationServer = require('../application-server/main.js')
  await applicationServer.start(process.env.APPLICATION_SERVER_PORT)
  global.applicationServer = `http://localhost:${process.env.APPLICATION_SERVER_PORT}`
  global.applicationServerToken = process.env.APPLICATION_SERVER_TOKEN
  console.log('screenshots before')
})

beforeEach(async () => {
  global.applicationServer = `http://localhost:${process.env.APPLICATION_SERVER_PORT}`
  global.applicationServerToken = process.env.APPLICATION_SERVER_TOKEN
  console.log('screenshots beforeEach')
})

after(async () => {
  if (applicationServer) {
    await applicationServer.stop()
    applicationServer = null
  }
})
