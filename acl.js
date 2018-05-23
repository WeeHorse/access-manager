module.exports = class Acl{

  constructor(settings){
    this.AclModel = settings.model;
    return async (...args) => await this.acl(...args);
  }

  async acl(req, res, next){
    let roles = ['*']; // everyone always has the "*" (all) role
    // pick roles from session uses
    if(req.user._id){
      roles = [...roles, ...req.user.roles]; // concat in the user roles (using spread operator)
    }else{
      // add the non-authenticated role
      roles.push('anonymous');
    }

    // find ACL paths that maches roles
    let entries = await this.AclModel.find({
      //path: req.path,
      'roles.role':{$in: roles}
    });

    // new section to handle wildcard paths endings
    // (would have prefered a good regex mongoose query)
    entries = entries.filter( e => {
      // check for match with wildcard
      if(e.path.indexOf('*') == e.path.length - 1){ // wildcard end
        return req.path.indexOf(e.path.split('*')[0]) > -1;
      }else{ // find exact match
        return e.path == req.path;
      }
    });

    // now, do we have the proper method in any of our matched role(s)
    let remaining = [];
    for(let entry of entries){
      let remRoles = entry.roles.filter(role => {
        if(role.methods.includes('*') || role.methods.includes('ALL')){
          return true;
        }
        return role.methods.includes(req.method)
      });
      // console.log('path', req.path, 'req.method', req.method);
      // console.log('remRoles', remRoles);
      // console.log('req.user.roles', req.user.roles);
      if(remRoles.length > 0){
        remaining.push(entry);
      }
    }

    if(remaining.length > 0){
      // pass!
      next();
    }
    else{
      // reject! (we are not allowed here)
      res.status(403);
      res.send('Forbidden');
    }
  }

}