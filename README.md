# access-manager
A one-stop solution for implementing authenticated and anonymous sessions with user handling and whitelisted ACL. Attaches itself to an express app as a middleware.

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

```JAVASCRIPT
const AccessManager = require('access-manager');
const accessManager = new AccessManager({
  mongoose: mongoose, // mongoose (connected)
  expressApp: app // an express app
});
```

You can optionally add your own schemas (Schema Objects) for users, sessions and acl, at the properties: _userSchema, sessionSchema, aclSchema_

Some properties in the schemas are required by the access-manager. Those details can be found at the bottom of this document.

You will propably want to supply your own userSchema, an example of doing that:

```JAVASCRIPT
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

```JAVASCRIPT
// The models access manager uses are avaliable on access manager
const User = accessManager.models.user;

// Now access manager will do its work seamlessly in the background,
// but we need a user: (The example ACL will only allow anonymous users and super users create accounts)
app.post('/register', async (req, res)=>{
  // create user
  let user = await new User(req.body);
  await user.save();
  res.json({msg:'Registered'});
});

// To login (The example ACL will prevent you from logging in if you are already in)
app.post('/login', async (req, res)=>{
  // create login from user
  if(passwordsMatch){
    req.session.user = user._id;
    req.session.loggedIn = true;
    await req.session.save(); // save the state
    res.json({msg:'Logged in'});
  }else{
    res.json({msg:'Failed login'});
  }
});

// To logout (The example ACL will prevent you from logging out if you are already out)
app.all('/logout', async (req, res)=>{
  req.user = {}; // we clear the user
  req.session.loggedIn = false; // but we retain the session with a logged out state, since this is better for tracking, pratical and security reasons
  await req.session.save(); // save the state
  res.json({msg:'Logged out'});
});

// The example ACL would only allow this route on logged in users
app.get('/messages', async (req, res)=>{
  res.json({msg:'Here are your messages'});
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
    "methods (array of string with enum: ['GET', 'POST', 'PUT', 'DELETE', 'ALL'])

