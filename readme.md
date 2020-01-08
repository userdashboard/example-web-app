# Converting hastebin to a web app with user accounts and organizations

[Hastebin](https://github.com/seejohnrun/haste-server) is a 'pastebin' web application you post code and text to share.  The application has no user accounts, all posts are anonymous and publicly accessible via a generated URL.  This conversion is based on `hastebin`'s source code.

[Dashboard](https://github.com/userdashboard/dashboard) is a reusable interface for user account management with modules for more.  It runs separately to your web application, as users browse your Dashboard server they receive content from itself or your application server combined into a single website.  When Dashboard proxies an application server it includes user account and session information in the request headers.

When the conversion is complete `hastebin` will run with a Dashboard server and users will access it through the Dashboard server's URL, with registration and organizations provided by Dashboard.

## Part one:  Verifying Dashboard requests

The `hastebin` web server is compatible with Express so the `@userdashboard/express-application-server` middleware is added, it verifies requests come from your own dashboard server.  Adding it to the `server.js` requires binding it to each HTTP method.

    const applicationServer = require('@userdashboard/express-application-server')
    app.use(applicationServer)

The middleware only identifies if the request came from your dashboard server, it does not end requests if they are invalid.  In the `server.js` each request has to be modified to include a check and authorization error when accessed incorrectly.

    router.get('/raw/:id', (req, res) => {
      if (!req.verified) {
        res.setHeader('content-type', 'text/plain')
        res.statusCode = 511
        return res.end()
      }
      ...
    })
  
## Part two:  Extending the Hastebin Document API

The `document.js` provides an API for creating and retrieving documents from storage.  The `hastebin` project already supported reading and writing documents but it needs to also support deleting and listing and orgnaizations.

The `document.js` needs to support listing your posts:

    async function list (key, req) {
      const folder = `${basePath}/${key}`
      if (!fs.existsSync(folder)) {
        return null
      }
      const list = await fsa.readDir(`${basePath}/${key}`, 'utf8')
      if (!list || !list.length) {
        return null
      }
      for (const n in list) {
        list[n] = await load(list[n], req)
      }
      return list
    }
      
The `document.js` now needs to create posts with added metadata and indexing:

    async function create (req) {
      if (!req.body || !req.body.document || !req.body.document.length) {
        throw new Error('invalid-document')
      }
      if (req.body.organizationid) {
        if (req.body.organizationid) {
          let found = false
          const organizations = await dashboardServer.get(`/api/user/organizations/organizations?accountid=${req.accountid}&all=true`, req.accountid, req.sessionid)
          if (organizations && organizations.length) {
            for (const organization of organizations) {
              found = organization.organizationid === req.body.organizationid
              if (found) {
                break
              }
            }
          }
          if (!found) {
            throw new Error('invalid-document-owner')
          }
        }
      }
      if (global.maxLength && req.body.document.length > global.maxLength) {
        throw new Error('invalid-document-length')
      }
      if (req.body.customid) { 
        try {
          const existing = await load(req.body.customid, req)
          if (existing) {
            throw new Error('duplicate-document-id')
          }
        } catch (error) {
        }
      }
      const key = req.body.customid || await generateUniqueKey(req)
      const object = {
        accountid: req.accountid,
        created: Math.floor(new Date().getTime() / 1000),
        key: key
      }
      if (req.body.public) {
        object.public = true
      }
      if (req.body.organizationid) {
        object.organizationid = req.body.organizationid
      }
      if (req.body.language) {
        object.language = req.body.language
      }
      createFolder(`${basePath}`)
      await fsa.writeFile(`${basePath}/${md5(key)}`, JSON.stringify(object), 'utf8')
      await fsa.writeFile(`${basePath}/${md5(key)}.raw`, req.body.document)
      createFolder(`${basePath}/account/${req.accountid}`)
      await fsa.writeFile(`${basePath}/account/${req.accountid}/${key}`, JSON.stringify(object))
      if (req.body.organization) {
        createFolder(`${basePath}/organization/${object.organizationid}`)
        await fsa.writeFile(`${basePath}/organization/${object.organizationid}/${key}`, JSON.stringify(object))
      }
      return object
    }
      
The `document.js` needs to remove posts:
          
    async function remove (key, req) {
      const object = await load(key, req)
      if (object.accountid !== req.accountid) {
        throw new Error('invalid-document')
      }
      if (fs.existsSync(`${basePath}/account/${object.accountid}/${key}`)) {
        await fsa.unlink(`${basePath}/account/${object.accountid}/${key}`)
      }
      if (json.organizationid) {
        if (fs.existsSync(`${basePath}/organization/${object.organizationid}/${key}`)) {
          await fsa.unlink(`${basePath}/organization/${object.organizationid}/${key}`)
        }
      }
      await fsa.unlink(`${basePath}/${md5(key)}`)
    }

## Part three: Extending the Hastebin HTTP server

The HTTP API in `server.js` uses the document API in `document.js` to save and retrieve the user's posts from storage.  The `server.js` already supports creating and retrieving, it just needs additions for deleting and listing.  The original `hastebin` allowed access to all posts via public URL, we are retaining that as an optional setting.

Dashboard requires `/home` be the application's signed-in page.  An `index.html` is created for the guest landing page marketing the product.
        
    if (req.url === '/home' || req.url.startsWith('/home?')) {
      res.setHeader('content-type', 'text/html')
      res.end(homePage)
      return next()
    }

    if (req.url === '/' || req.url.startsWith('/?')) {
      res.setHeader('content-type', 'text/html')
      res.end(indexPage)
      return next()
    }
    
The `server.js` needs a route for listing documents:

    router.get('/documents', function (req, res) {
      if (!req.verified) {
        return dashboardError(res)
      }
      let list
      try {
        list = await Document.list(`account/${req.accountid}`, req)
      } catch (error) {
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      if (!list || !list.length) {
        return res.end('[]')
      }
      return res.end(JSON.stringify(list))
    })

The `server.js` needs a route for listing organization documents:
          
    router.get('/documents/organization/:id', function (req, res) {
      if (!req.verified) {
        return dashboardError(res)
      }
      let found = false
      const organizations = await dashboardServer.get(`/api/user/organizations/organizations?accountid=${req.accountid}&all=true`, req.accountid, req.sessionid)
      if (organizations && organizations.length) {
        for (const organization of organizations) {
          found = organization.organizationid === req.params.id
          if (found) {
            break
          }
        }
      }
      if (!found) {
        throw new Error('invalid-document-owner')
      }
      let list
      try {
        list = await Document.list(`organization/${req.params.id}`, req)
      } catch (error) {
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      if (!list || !list.length) {
        return res.end('[]')
      }
      return res.end(JSON.stringify(list))
    })
        
The `server.js` needs a route for deleting documents:

    router.delete('/documents/:id', function (req, res) {
      if (!req.verified) {
        return dashboardError(res)
      }
      const key = req.params.id.split('.')[0]
      let deleted
      try {
        deleted = await Document.handleDelete(key, req)
      } catch (error) {
      }
      if (!deleted) {
        res.writeHead(500, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)  
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end()
    })
    
The `server.js` needs a route for accessing public documents and a static page to render it in:

    const externalPage = fs.readFileSync(__dirname + '/external.html').toString()
    router.get('/document/public/:id', async (req, res) => {
      const key = req.params.id
      let result
      try {
        result = await Document.load(key, req)
      } catch (error) {
      }
      if (!result) {
        res.writeHead(404, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)
      }
      if(!result.public || req.headers.host !== global.publicDomain) {
        res.writeHead(500, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)
      }
      res.writeHead(200, { 'content-type': 'text/html' })
      result.document = result.document.toString()
      const tagged = externalPage.replace('<li>View public post</li>', '<li>View public post ' + key + '</li>')
      return res.end(`${tagged}
    <script>window.post = ${JSON.stringify(result)}</script>`)
    })
    
The `server.js` needs a route for downloading public documents:

    router.get('/document/:id/raw', async (req, res) => {
      const key = req.params.id
      let document
      try {
        document = await Document.load(key, req)
      } catch (error) {
      }
      if (!document) {
        res.writeHead(404, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)
      }
      if (!document.public || req.headers.host !== global.publicDomain) {
        res.writeHead(500, { 'content-type': 'application/json' })
        return res.end(`{ "message": "An invalid document was provided" }`)
      }
      res.writeHead(200, { 'content-type': 'text/plain' })
      return res.end(document.buffer.toString())
    })
    
The `server.js` needs a route for identifying the user in browser:

    if (req.url === '/whois.js') {
      const whois = {
        accountid: req.account.accountid,
        sessionid: req.session.sessionid
      }
      const organizations = await dashboardServer.get(`/api/user/organizations/organizations?accountid=${req.accountid}&all=true`, req.accountid, req.sessionid)
      if (organizations && organizations.length) {
        whois.organizations = organizations
      }
      res.setHeader('content-type', 'text/javascript')
      return res.end('window.user = ' + JSON.stringify(whois))
    }
    
## Part four:  Redesigning the HTML interface for users &amp; organizations
      
The original layout was a textarea, with a logo and strip of icons for saving/copying posts.  A new interface was created with the additional options.

Tabbed navigation was added to access creating new posts and the personal and organization post lists.  The navigation hides the organization link when not applicable.

    <menu>
      <button id="create-button">Create new post</button>
      <div><button id="list-button">My posts</button></div>
      <div><button id="organization-list-button">Organization posts</button></div>
    </menu>

Tables were added listing your posts and their general configuration, along with an optionally-concealed column showing if they are shared with your organization.

    <section id="list">
      <h2>Posts</h2>
      <table id="list-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Created</th>
            <th id="organization-column">Organization</th>
            <th>Public link</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
    <section id="organization-list">
      <h2>Organization posts</h2>
      <table id="organization-list-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>Key</th>
            <th>Public link</th>
            <th id="organization-column">Organization</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

Information was added to distinguishing between viewing your own post, your own post shared with an organization, and a post shared with an organization.

    <li id="view">
      <h2>Viewing my post <span id="postid-1"></span></h2>
    </li>
    <li id="view-organization">
      <h2>Viewing <span id="postid-2"></span> shared with organization</h2>
    </li>
    <li id="view-organization-post-owner">
      <h2>Viewing my post <span id="postid-3"></span> shared with organization</h2>
    </li>

Settings were added when creating posts to select a language, allow posts to be publicly accessible via URL, owned by an organization, and use custom keys.

    <button id="save">Save post</button>
    <input id="customid" type="text" value="" placeholder="random filename" size="5" />
    <select id="language">
      <option>Select language (default text)</option>
      <option value="bash">Bash</option>
      <option value="coffee">Coffee</option>
      <option value="cpp">C++</option>
      <option value="css">CSS</option>
      <option value="pas">Delphi</option>
      <option value="diff">Diff</option>
      <option value="erl">Erlang</option>
      <option value="go">Go</option>
      <option value="hs">Haskell</option>
      <option value=">HTML</option>
      <option value="ini">INI</option>
      <option value="java">Java</option>
      <option value="js">JavaScript</option>
      <option value="json">JSON</option>
      <option value="lisp">Lisp</option>
      <option value="lua">Lua</option>
      <option value="md">MarkDown</option>
      <option value="m">Objective C</option>
      <option value="php">PHP</option>
      <option value="pl">Perl</option>
      <option value="py">Python</option>
      <option value="rb">Ruby</option>
      <option value="scala">Scala</option>
      <option value="sm">SmallTalk</option>
      <option value="sql">SQL</option>
      <option value="swift">Swift</option>
      <option value="tex">Tex</option>
      <option value="txt">Text</option>
      <option value="vala">Vala</option>
      <option value="vbs">VBScript</option>
      <option value="xml">XML</option>
    </select>
    <label><input id="public" type="checkbox"> Publicly accessible</label>
    <select id="organization">
      <option>Optionally share with organization</option>
    </select>
    
## Part five:  JavaScript for the new interface

The HTML interface is controlled by JavaScript in `app.js`.  Since the HTML is primarily new markup it required mostly new code.

The `app.js` needs to list your documents and your organizations' on page load:

    function listPosts(organization) {
      var path = '/documents'
      if (organization) {
        path += '/' + organization
      }
      return send(path, null, 'GET', function (error, posts) {
        if (error) {
          return showMessage(error.message, 'error')
        }
        if (!window.user.organizations || !window.user.organizations.length) {
          document.getElementById('organization-column').style.display = 'none'
        }
        if (posts && posts.length) {
          for (i = 0, len = posts.length; i < len; i++) {
            renderPostRow(!organization, posts[i])
          }
        }
      })
    }

`app.js` needs to render your post lists to `home.html`'s list tables:

    function renderPostRow(personal, meta) {
      var table = document.getElementById(personal ? 'list-table' : 'organization-list-table')
      var row = table.insertRow(table.rows.length)
      var keyLink = document.createElement('a')
      keyLink.innerHTML = meta.key
      keyLink.onclick = loadDocument
      keyLink.href = '#'
      var keyCell = row.insertCell(0)
      keyCell.appendChild(keyLink)
      var createdCell = row.insertCell(1)
      createdCell.innerHTML = new Date(meta.created * 1000)
      var nextCell = 2
      if (personal && window.user.organizations && window.user.organizations.length) {
        var organizationCell = row.insertCell(2)
        if (meta.organizationid) {
          organizationCell.innerHTML = 'yes'
        }
        nextCell = 3
      }
      var publicCell = row.insertCell(nextCell)
      if (meta.public) {
        var publicLink = document.createElement('a')
        publicLink.href = 'https://' + window.publicDomain + '/document/' + window.user.dashboard.split('://')[1] + '/' + meta.key
        publicLink.innerHTML = 'yes'
        publicLink.target = '_blank'
        publicCell.appendChild(publicLink)
      }
      if (personal) {
        var deleteCell = row.insertCell(nextCell + 1)
        var deleteButton = document.createElement('button')
        deleteButton.innerHTML = 'delete'
        deleteButton.key = meta.key
        deleteButton.onclick = deletePost
        deleteCell.appendChild(deleteButton)
      }
    }

The `app.js` needs to delete posts:

    function deletePost(event) {
      var button = event.target
      var path = '/document/' + button.key
      return send(path, null, 'DELETE', function (error) {
        if (error) {
          return showMessage(error.message, 'error')
        }
        elements.box.style.display = 'none'
        elements.textarea.value = ''
        elements.textarea.style.display = 'block'
        elements.textarea.focus()
        removeLineNumbers()
        return showMessage(error.message, 'success')
      })
    }

The `app.js` needs to save posts:

    function saveNewDocument() {
      var postSettings = {}
      if (window.user.organizations && window.user.organizations.length) {
        if (elements.organization.selectedIndex > 0) {
          postSettings.organizationid = elements.organization.options[elements.organization.selectedIndex].value
        }
      }
      var public = elements.public = elements.public || document.getElementById('public')
      if (public.checked) {
        postSettings.public = true
      }
      if (elements.customid.value) {
        postSettings.customid = elements.customid.value
      }
      if (!elements.textarea.value || !elements.textarea.value.length) {
        return showMessage('No document to save', 'error')
      }
      if (elements.language.selectedIndex > 0) {
        postSettings.language = elements.language.options[elements.language.selectedIndex].value
      }
      postSettings.document = encodeURI(elements.textarea.value)
      return send('/document', postSettings, 'POST', function (error, result) {
        if (error) {
          return showMessage(error.message, 'error')
        }
        renderPostRow(!postSettings.organization, result)
        return showPostContents(result)
      })
    }

The `app.js` needs to disply posts when they are created and loaded from clicking links:

    function showPostContents(post) {
      if (!post.organizationid) {
        elements['view'].style.display = ''
        elements['view-organization'].style.display = 'none'
        elements['view-organization-post-owner'].style.display = 'none'
        elements['postid-1'].innerHTML = post.key
        elements['delete-1'].key = post.key
      } else if (post.accountid === window.user.accountid) {
        elements['view'].style.display = 'none'
        elements['view-organization'].style.display = 'none'
        elements['view-organization-post-owner'].style.display = ''
        elements['postid-3'].innerHTML = post.key
        elements['delete-3'].key = post.key
      } else {
        elements['view'].style.display = 'none'
        elements['view-organization'].style.display = ''
        elements['view-organization-post-owner'].style.display = 'none'
        elements['postid-2'].innerHTML = post.key
      }
      var high
      try {
        if (post.language === 'txt') {
          high = { value: htmlEscape(post.document) }
        }
        else if (post.language === 'html') {
          high = hljs.highlight('html', htmlEscape(post.document))
        }
        else if (post.language) {
          high = hljs.highlight(post.language, post.document)
        }
        else {
          high = hljs.highlightAuto(post.document)
        }
      } catch (error) {
        high = hljs.highlightAuto(post.document)
      }
      elements['post-preview'].firstChild.innerHTML = high.value
      elements['post-preview'].focus()
      addLineNumbers(post.document.split('\n').length)
      return showContent('post-content')
    }

The `app.js` needs to toggle interface elements depending on what you are viewing:

    function showContent(type) {
      // active content button
      elements['create-button'].className = type === 'post-creator' ? 'active' : ''
      elements['list-button'].className = type === 'list' ? 'active' : ''
      elements['organization-list-button'].className = type === 'organization-list' ? 'active' : ''
      // active content type
      elements['list'].style.display = type === 'list' ? 'block' : 'none'
      elements['organization-list'].style.display = type === 'organization-list' ? 'block' : 'none'
      elements['post-content'].style.display = type === 'post-content' ? 'block' : 'none'
      elements['post-creator'].style.display = type === 'post-creator' ? 'block' : 'none'
    }

## Part six: Setting up Dashboard

Dashboard accompanies application servers as a separate server.  It is set up with `NPM`.  The organizations module is added to extend Dashboard with more content and API routes.

    $ mkdir dashboard-server
    $ cd dashboard-server
    $ npm init
    $ npm install @userdashboard/dashboard
    $ npm install @userdashboard/organizations

The `package.json` needs to be configured with the module:

    "dashboard": {
      "modules": [ "@userdashboard/organizations" ]
    },
    
The environment needs to be configured and the Dashboard server started:

    $ DASHBOARD_SERVER="https://domain.com" \
      APPLICATION_SERVER=http://localhost:8001 \
      APPLICATION_SERVER_TOKEN="A shared secret" \
      PORT=8001 \
      DOMAIN="domain.com" \
      IP="0.0.0.0" \
      STORAGE_PATH=/tmp/connect \
      node main.js
      
The application server needs to be started, and the finished SaaS will be accessible at the dashboard server's URL `http://localhost:8000`

    $ DASHBOARD_SERVER="http://localhost:8000" \
      APPLICATION_SERVER=http://localhost:8001 \
      APPLICATION_SERVER_TOKEN="A shared secret" \
      PORT=8000 \
      DOMAIN="localhost:8000" \
      IP="0.0.0.0" \
      STORAGE_PATH=/tmp/connect \
      node main.js

### Hastebin attribution and copyright

https://github.com/seejohnrun/haste-server

## Author

John Crepezzi <john.crepezzi@gmail.com>

## License

(The MIT License)

Copyright © 2011-2012 John Crepezzi

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the ‘Software’), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED ‘AS IS’, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE

### Other components:

* jQuery: MIT/GPL license
* highlight.js: Copyright © 2006, Ivan Sagalaev
* highlightjs-coffeescript: WTFPL - Copyright © 2011, Dmytrii Nagirniak
