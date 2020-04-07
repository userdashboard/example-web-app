global.keyLength = parseInt(process.env.KEY_LENGTH || '10', 10)
global.maxLength = parseInt(process.env.MAX_LENGTH || '9999999', 10)
global.publicDomain = process.env.PUBLIC_DOMAIN || false

let server
module.exports = {
  start: async (port) => {
    server = require('./src/server.js')
    port = port || process.env.APPLICATION_SERVER_PORT || process.env.PORT || 3000
    await server.start(port, process.env.HOST || 'localhost')
  },
  stop: async () =>{ 
    server.stop()
  }
}

if (process.env.START_APPLICATION_SERVER !== 'false') {
  module.exports.start()
}