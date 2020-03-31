/* eslint-env mocha */
const assert = require('assert')
const childProcess = require('child_process')
global.applicationPath = __dirname
const fs = require('fs')
const pasteText = fs.readFileSync('./node_modules/@userdashboard/dashboard/readme.md').toString()
let applicationServer
const TestHelper = require('@userdashboard/organizations/test-helper.js')

before((callback) => {
  applicationServer = childProcess.exec('bash ../application-server/start-dev.sh')
  applicationServer.stderr.on('data', (error) => {
    console.log(error.toString())
  })
  applicationServer.stdout.on('data', (buffer) => {
    if (buffer.toString().indexOf('ready') > -1) {
      return callback()
    }
    console.log(buffer.toString())
  })  
})

after(async () => {
  if (applicationServer) {
    await applicationServer.kill()
    applicationServer = null
  }
})

describe('example-web-app', () => {
  it('user 1 registers', async () => {
    const req = TestHelper.createRequest('/')
    req.filename = '/src/www/integrations/user-creates-account.test.js'
    req.screenshots = [
      { click: '/account/register' },
      { 
        fill: '#submit-form', 
        body: {
          username: 'FirstUser',
          password: '12345678',
          confirm: '12345678'
        }
      }
    ]
    const result = await req.get()
    assert.strictEqual(1, 1)
  })

  it('user 1 creates post', async () => {
    const user = await TestHelper.createUser()
    const req = TestHelper.createRequest('/home')
    req.account = user.account
    req.session = user.session
    req.filename = '/src/www/integrations/user-creates-post.test.js'
    req.screenshots = [{ 
      fill: '#post-creator', 
      body: {
        'post-textarea': pasteText,
        customid: 'readme.md',
        language: 'MarkDown'
      }
    }]
    const result = await req.post()
    assert.strictEqual(1, 1)
  })

  it('user 1 creates organization', async () => {
    const user = await TestHelper.createUser()
    const req = TestHelper.createRequest('/home')
    req.account = user.account
    req.session = user.session
    req.filename = '/src/www/integrations/user-creates-organization.test.js'
    req.screenshots = [
      { hover: '#account-menu-container' },
      { click: '/account/organizations' },
      { click: '/account/organizations/create-organization' },
      {
        fill: '#submit-form',
        body: {
          name: 'Developers',
          email: 'organization@email.com',
          'display-name': 'pm',
          'display-email': 'pm@email.com'
        }
      }
    ]
    const result = await req.post()
    assert.strictEqual(1, 1)
  })

  it('user 1 creates invitation', async () => {
    const user = await TestHelper.createUser()
    const req = TestHelper.createRequest('/home')
    req.account = user.account
    req.session = user.session
    req.filename = '/src/www/integrations/user-creates-invitation.test.js'
    req.screenshots = [
      { hover: '#account-menu-container' },
      { click: '/account/organizations' },
      { click: '/account/organizations/create-organization' },
      {
        fill: '#submit-form',
        body: {
          name: 'Developers',
          email: 'organization@email.com'
        }
      },
      { click: '/account/organizations/create-invitation' },
      {
        fill: '#submit-form',
        body: {
          code: 'secret'
        }
      }
    ]
    const result = await req.post()
    assert.strictEqual(1, 1)
  })

  it('user 2 accepts invitation', async () => {
    const user = await TestHelper.createUser()
    global.userProfileFields = ['display-name', 'display-email']
    await TestHelper.createProfile(user, {
      'display-name': user.profile.firstName,
      'display-email': user.profile.contactEmail
    })
    await TestHelper.createOrganization(user, {
      email: 'organization@' + user.profile.displayEmail.split('@')[1],
      name: 'My organization',
      profileid: user.profile.profileid
    })
    await TestHelper.createInvitation(user)
    const user2 = await TestHelper.createUser()
    const req = TestHelper.createRequest('/')
    req.account = user2.account
    req.session = user2.session
    req.filename = '/src/www/integrations/user-accepts-invitation.test.js'
    req.screenshots = [
      { hover: '#account-menu-container' },
      { click: '/account/organizations' },
      { click: '/account/organizations/accept-invitation' },
      {
        fill: '#submit-form',
        body: {
          invitationid: user.invitation.invitationid,
          'secret-code': user.invitation.secretCode
        }
      }
    ]
    const result = await req.post()
    assert.strictEqual(1, 1)
  })

  it('user 2 creates shared post', async () => {
    const user = await TestHelper.createUser()
    global.userProfileFields = ['display-name', 'display-email']
    await TestHelper.createProfile(user, {
      'display-name': user.profile.firstName,
      'display-email': user.profile.contactEmail
    })
    await TestHelper.createOrganization(user, {
      email: 'organization@' + user.profile.displayEmail.split('@')[1],
      name: 'My organization',
      profileid: user.profile.profileid
    })
    await TestHelper.createInvitation(user)
    const user2 = await TestHelper.createUser()
    global.userProfileFields = ['display-name', 'display-email']
    await TestHelper.createProfile(user2, {
      'display-name': user2.profile.firstName,
      'display-email': user2.profile.contactEmail
    })
    await TestHelper.acceptInvitation(user2, user)
    const req = TestHelper.createRequest('/home')
    req.account = user2.account
    req.session = user2.session
    req.filename = '/src/www/integrations/user-creates-shared-post.test.js'
    req.screenshots = [
      { save: true }, 
      { 
        fill: '#post-creator', 
        body: {
          'post-textarea': pasteText,
          customid: 'readme.md',
          language: 'MarkDown',
          organization: 'My organization'
      }
    }]
    const result = await req.post()
    assert.strictEqual(1, 1)
  })

  it.only('user 1 views shared post', async () => {
    const user = await TestHelper.createUser()
    global.userProfileFields = ['display-name', 'display-email']
    await TestHelper.createProfile(user, {
      'display-name': user.profile.firstName,
      'display-email': user.profile.contactEmail
    })
    await TestHelper.createOrganization(user, {
      email: 'organization@' + user.profile.displayEmail.split('@')[1],
      name: 'My organization',
      profileid: user.profile.profileid
    })
    await TestHelper.createInvitation(user)
    const user2 = await TestHelper.createUser()
    global.userProfileFields = ['display-name', 'display-email']
    await TestHelper.createProfile(user2, {
      'display-name': user2.profile.firstName,
      'display-email': user2.profile.contactEmail
    })
    await TestHelper.acceptInvitation(user2, user)
    const req = TestHelper.createRequest('/home')
    req.account = user2.account
    req.session = user2.session
    req.body = {
      'post-textarea': pasteText,
      customid: 'readme.md',
      language: 'MarkDown',
      organization: 'My organization'
    }
    await req.post()
    const req2 = TestHelper.createRequest('/')
    req2.account = user.account
    req2.session = user.session
    req2.filename = '/src/www/integrations/user-views-shared-post.test.js'
    req2.screenshots = [
      { save: true },
      { hover: '#account-menu-container' },
      { click: '/account/organizations' },
      { click: '/account/organizations/create-organization' },
      {
        fill: '#submit-form',
        body: {
          name: 'Developers',
          email: 'organization@email.com'
        }
      }
    ]
    const result = await req2.get()
    assert.strictEqual(1, 1)
  })
})
