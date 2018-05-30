const cookieParser = require('cookie-parser')();
const Session = new require('./session.js');
const Acl = new require('./acl.js');
const aclExampleFile = './example-acl.json';

module.exports = class AccessManager{
  constructor(options){
    this.options = options;
    this.mongoose = options.mongoose;
    this.selectSchemas();
    this.makeModels();
    if(process.argv.join().includes('--import-acl')){
      this.importAcl(); // import will shut down app when done
    }else{
      let session = new Session({model: this.models.session, userModel: this.models.user});
      let acl = new Acl({model: this.models.acl});
      let app = options.expressApp;
      app.use(cookieParser);
      app.use(session);
      app.use(acl);
    }
  }

  defaultSchemas(){
    return {
      session: {
        loggedIn: {type:Boolean, default:false},
        user: { type: this.mongoose.Schema.Types.ObjectId, ref: 'User' }
      },
      acl: {
        path: {type: String, unique: true},
        /*
          Below, an array of a child role schema so on any given path we can assign atomic rights like:
          path: 'news/*'
          roles: [
            {role: 'commenter', methods: 'POST'},
            {role: 'user', methods: 'GET'}
          ]
        */
        roles: [
          new this.mongoose.Schema({
            role: String,
            methods: [{type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'ALL', '*']}]
          })
        ]
      },
      user: {
        email: {type: String, required: true, unique: true},
        password: {type: String, required: true},
        roles: [String]
      }
    }
  }

  selectSchemas(){
    this.schemas = this.defaultSchemas();
    if(this.options.userSchema){
      this.schemas.user = this.options.userSchema;
    }
    if(this.options.sessionSchema){
      this.schemas.session = this.options.sessionSchema;
    }
    if(this.options.aclSchema){
      this.schemas.acl = this.options.aclSchema;
    }
  }

  makeModels(options){
    this.models = {
      user: this.mongoose.model('User', new this.mongoose.Schema(this.schemas.user)),
      session: this.mongoose.model('Session', new this.mongoose.Schema(this.schemas.session)),
      acl: this.mongoose.model('Acl', new this.mongoose.Schema(this.schemas.acl))
    };
  }

  async importAcl(){
    let jsonFile = aclExampleFile;
    let f = process.argv.join('$$$').split('--import-acl=');
    if(f[1]){
      jsonFile = f[1].split('$$$')[0];
    }
    let entries = require(jsonFile);
    if(!entries.push){
      console.error("Fatal error: Json file data not iterable, must be an array");
      process.exit(0);
    }
    console.info('To import %d ACL definitions from JSON', entries.length);
    // drop previous acl
    this.models.acl.collection.drop();
    // save to the db
    let i = 0;
    let errs = 0;
    for(let entry of entries){
      entry = await new this.models.acl(entry);
      let result = await entry.save();
      if(!result || !result._id){
        errs++;
        console.error('ACL import entry error', result, 'entry is', entry);
      }
      i++;
      if(i == entries.length){ // shutdown when we are done importing
        mongoose.connection.close(()=>{
          console.info('ACL import done, mongoose connection closed, %d definitions stored.', i - errs);
          if(errs > 0){
            console.info('%d definitions were not imported due to errors', errs);
          }
          process.exit(0);
        });
      }

    }

  }

}