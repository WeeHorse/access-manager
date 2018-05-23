# access-manager

© WeeHorse 2018, MIT license

## Authentication, Sessions and ACL
Access Manager is a one-stop solution for implementing authenticated and anonymous sessions with user handling and whitelisted ACL. Keeps the same session regardless of authenticated state. Attaches itself to an express app as a middleware.

## Install

```sh
$ npm install access-manager
```

### Install ACL data

If you want some example data or wish to import your ACL from file, use the --import-acl switch when you start your app with access manager (for the first time). Note that your app will shut down once the import is done.

Use example data: (see below)

```sh
$ node app --import-acl
```

Or provide your own file:

```sh
$ node app --import-acl=file.json
```

The ACL data installs into the acl collection. _Obviously you're free to populate the acl collection anyway you see fit._

#### The example ACL data:

```javascript
[
  {"path":"/rest/admin*", "roles":[ {"role": "admin", "methods": ["ALL"]}, {"role": "super", "methods": ["ALL"]} ]},
  {"path":"/rest/login", "roles":[ {"role": "anonymous", "methods": ["POST"]} ]},
  {"path":"/rest/logout", "roles":[ {"role": "user", "methods": ["GET","POST"]} ]},
  {"path":"/rest/news*", "roles":[ {"role": "*", "methods": ["GET"]} ]},
  {"path":"/rest/messages*", "roles":[ {"role": "user", "methods": ["GET","POST","DELETE"]} ]},
  {"path":"/rest/user", "roles":[ {"role": "user", "methods": ["GET"]} ]},
  {"path":"/rest/register", "roles":[ {"role": "anonymous", "methods": ["POST"]}, {"role": "super", "methods": ["POST"]} ]}
]
```

__It works like this:__ Only the paths detailed above are valid paths together with the correct user role and method, all other paths will be blocked with 403 Forbidden. _You may end any path with a wildcard *, letting traffic through on all subpaths._


## Examples of access-manager usage:

### Typical init with basic dependencies

```javascript
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/some_database');

// IMPORTANT - if you don't want to block frontend files with access-manager, serve them before access-manager:
app.use(express.static('../client/'));

const AccessManager = require('access-manager');
const accessManager = new AccessManager({
  mongoose: mongoose, // mongoose (connected)
  expressApp: app // an express app
});
```

### Configuration

You can optionally add your own schemas (Schema Objects) for users, sessions and acl, at the properties: userSchema, sessionSchema, aclSchema

Some properties in the schemas are required by the access-manager. Those details can be found at the bottom of this document.

You will propably want to supply your own userSchema, an example of doing that:

```javascript
const accessManager = new AccessManager({
  mongoose: mongoose,
  expressApp: app,
  userSchema: {
    firstName: {type: String, required:true},
    lastName: {type: String, required:true},
    email: {type: String, required:true, unique:true}, // required access manager property
    password: {type: String, required:true}, // required access manager property
    roles: [String]  // required access manager property
  }
```

__The models access manager uses are then avaliable from access manager:__

```javascript
const User = accessManager.models.user;
```

__Now access manager will do its work seamlessly in the background,
but we need a user, so here's a registration route:__

_The example ACL will only allow anonymous users and super users create accounts_

```javascript
app.post('/rest/register', async (req, res)=>{
  // encrypt password
  req.body.password = await bcrypt.hash(req.body.password, saltRounds);
  // create user
  let user = await new User(req.body);
  await user.save();
  res.json({msg:'Registered'});
});
```

__And login:__

_The example ACL will prevent this route if you are already logged in_

```javascript
app.post('/rest/login', async (req, res)=>{
  // find user
  let user = await User.findOne({email: req.body.email});
  // passwords match?
  if(user && await bcrypt.compare(req.body.password, user.password)){
    req.session.user = user._id;
    req.session.loggedIn = true;
    await req.session.save(); // save the state
    res.json({msg:'Logged in'});
  }else{
    res.json({msg:'Failed login'});
  }
});
```

__To logout:__

_The example ACL will prevent this route if you are already logged out_

```javascript
app.all('/rest/logout', async (req, res)=>{
  req.user = {}; // we clear the user
  req.session.loggedIn = false; // but we retain the session with a logged out state, since this is better for tracking, pratical and security reasons
  await req.session.save(); // save the state
  res.json({msg:'Logged out'});
});
```

__A restricted example route:__

_The example ACL will only allow this route on logged in users_

```javascript
app.get('/rest/messages', async (req, res)=>{
  res.json({msg:'Here are your messages'});
});
```

__The current user route:__

_The example ACL will only allow this route on logged in users_

```javascript
app.get('/rest/user', (req, res)=>{
  // check if there is a logged-in user and return that user
  let response;
  if(req.user._id){
    response = req.user; // reply with the user object
    response.password = '******'; // but do not send the password back
  }else{
    response = {message: 'Not logged in'};
  }
  res.json(response);
});
```

__Wildcard route (that takes any method) so we can test that the ACL blocks anything not allowed):__

```javascript
app.all('*', (req, res)=>{
  res.json({params: req.params, body: req.body}); // just echo whatever we send
});
```

__Don't forget...__

```javascript
app.listen(3000,()=>{
  console.log("Remember Mystery science theatre 3000!");
});
```

## Access manager schemas requirements

The schemas used in access manager must contain the properties detailed below. If you don't supply your own schemas these are the defaults:

_The mininum required userSchema:_

```javascript
    {
      email: {type: String, required:true, unique:true},
      password: {type: String, required:true},
      roles: [String]
    }
```

_The mininum required sessionSchema:_

```javascript
    {
      loggedIn: {type:Boolean, default:false},
      user: { type: this.mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
```

_The mininum required aclSchema:_

```javascript
    {
      path: {type: String, unique: true},
      roles: [
        new this.mongoose.Schema({
          role: String,
          methods: [{type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'ALL', '*']}]
        })
      ]
    }
```


