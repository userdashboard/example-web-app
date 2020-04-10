# Example web app:  Pastebin

## Converting hastebin to a web app with user accounts and organizations

This example project started as a copy of [Hastebin](https://github.com/seejohnrun/haste-server).  It is a 'pastebin' website you post code and text to share.  The original Hastebin application has no user accounts, all posts are anonymous and publicly accessible via a generated URL.  It is a single-page web app using client-side JavaScript and a server-side API to manage documents posted by guests.

[Dashboard](https://github.com/userdashboard/dashboard) is a reusable interface for user account management with modules for more.  It runs separately to your web application, as users browse your Dashboard server they receive Dashboard content or your application server's content combined into a single website.

After integrating Dashboard the pastebin has user registrations, organizations, and documents can be private, public or shared with organization members.

### Application server structure

This example is a single-page app and the client-side JavaScript requires a HTTP API to manipulate data.   The API is split into users and for administrators with endpoints for listing, creating and deleting documents.  Application servers can be written in any language or stack.

Dashboard requires application servers provide at a minimum the `/` guest index page and a `/home` application home page.  This example project also serves static assets from the `/public` folder.  Dashboard skips authentication for requests to anything within `/public` so assets serve faster.

Dashboard's content can be styled by serving a `/public/content-additional.css` for forms and `/public/content-template.css` for full-page content like signing in.  This exmaple web app uses the `-additional.css` files to apply a consistent color scheme between application and dashboard content.

Requests made by your Dashboard server to your application server can be optionally verified using a shared signature.  This example confirms the requests are made from its Dashboard server.  If an application server isn't publicly accessible this may not be required.

User data is required to create posts and determine if you or an organization you are in can access posts.  This data is received in HTTP headers when Dashboard proxies the application server.  It could alternatively be fetched as required via Dashboard's APIs, but since this is a single-page app with just a few API routes the data is almost always required.

### Dashboard server structure

Dashboard is a web application.  It provides a server, user interface and APIs for basic account and session management for web application users and administrators.  Dashboard modules can add UI and API content.  This example project uses the `Organizations` module to allow users to create posts shared with groups of other users.  Dashboard modules are installed with `npm` and activated in the `package.json`.

The application server's API is sharing the `/api/user` and `/api/administrator` structure of Dashboard.  By default Dashboard APIs are not publicly accessible.  You can set `ALLOW_PUBLIC_API=true` in the environment but that exposes the entire Dashboard and module APIs to client-side access.  If you set `ALLOW_PUBLIC_API=true` and added `CORS` headers for cross-origin requests your APIs would be accessible from any permitted website. 

This example only wants the pastebin APIs to be publicly accessible, so a `server handler` is added to allow API requests if they are accessing the pastebin APIs.  Server handlers must be activated in the `package.json`.  They can be executed `before` or `after` authenticating the user or guest.  In this case the server handler is executing prior to authorization, it checks if you are accessing the `/api` and if so, it checks if Dashboard recognizes the route as one of its own API endpoints.  Any URL that Dashboard doesn't recognize is proxied from the application server.

This example supplements the data sent from Dashboard to the application server to include the full account and session objects and your complete organization, membership and subscription information.  This is added via a `proxy handler` that allows the request options to be modified prior to communicating with the application server.  Proxy handlers must be activated in the `package.json`, they are executed just before proxying the application server and may modify the proxy request object to include additional headers or other changes.

### Starting the dashboard and application servers

Both the dashboard and application servers must be started to access the web application.  Each of these servers runs indefinitely, waiting for requests to be made, so they will require their own terminal windows each left open.  To stop the servers press `<CTRL>` + `c` or close the terminal windows.  When both servers are running open `http://localhost:8207` in your web browser to access the application.

    # application server
    $ cd application-server
    $ npm install
    $ bash start-dev.sh

    # dashboard server
    $ cd dashboard-server
    $ npm install
    $ bash start-dev.sh
