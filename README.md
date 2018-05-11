# access-manager
A one-stop solution for implementing authenticated and anonymous sessions with user handling and whitelisted ACL. Attaches itself to an express app as a middleware.

## Install

```sh
$ npm install access-manager
```

## Examples:

```JAVASCRIPT

const AccessManager = require('access-manager');
const accessManager = new AccessManager({
  mongoose: mongoose, // mongoose (connected)
  expressApp: app, // an express app
  aclImport:{
    file: '', // a valid file path, if left empty, example data will be used if import is run
    run: process.argv.includes('--import-acl-from-json') // example: node app --import-acl-from-json (switch to import file)
  },
   // You can add your own schemas for users, sessions and acl,
   // just add them at the properties: userSchema, sessionSchema, aclSchema
   // But note that some properties are required (more info to come)
   // An example of using a custom userSchema:
  userSchema: {
    firstName: {type: String, required:true},
    lastName: {type: String, required:true},
    email: {type: String, required:true, unique:true}, // required access manager property
    password: {type: String, required:true}, // required access manager property
    roles: [String]  // required access manager property
  }
});

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
