# access-manager

© WeeHorse 2018, MIT license

## Authentication, Sessions and ACL
Access Manager is a one-stop solution for implementing authenticated and anonymous sessions with user handling and whitelisted ACL. Keeps the same session regardless of authenticated state. Attaches itself to an express app as a middleware.

## Install

```sh
$ npm install access-manager
```

### Install ACL data

Use the switch when you start your app with access manager for the first time. (Note that your app will shut down once the import is done.)

Use example data: (example-acl.json)

```sh
$ node app --import-acl
```

Or provide your own file:

```sh
$ node app --import-acl=file.json
```


## Examples:

### Typical init with basic dependencies

```javascript
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/some_database');

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
app.post('/register', async (req, res)=>{
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
app.post('/login', async (req, res)=>{
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
app.all('/logout', async (req, res)=>{
  req.user = {}; // we clear the user
  req.session.loggedIn = false; // but we retain the session with a logged out state, since this is better for tracking, pratical and security reasons
  await req.session.save(); // save the state
  res.json({msg:'Logged out'});
});
```

__A restricted example route:__

_The example ACL will only allow this route on logged in users_

```javascript
app.get('/messages', async (req, res)=>{
  res.json({msg:'Here are your messages'});
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

The schemas used in access manager must contain the properties detailed below. (If you don't supply your own schemas these are the defaults)

The userSchema must have the properties:

    "email" (string),
    "password" (string)
    "roles" (array of strings)

The sessionSchema must have the properties:

    "loggedIn" (bool)
    "user" (reference)

The aclSchema must have the properties:

  	"path" (string)
  	"roles" (array of child schema containing):
   		"role (string)
   		"methods (array of string with enum:
   			['GET', 'POST', 'PUT', 'DELETE', 'ALL'])


