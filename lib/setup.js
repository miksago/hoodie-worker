var url     = require("url"),
    fs      = require("fs"),
    cradle  = require("cradle");


var SetupHelper = function(worker, config) {
  worker.name = config.name;
  worker.config = config;
  var setup = new Setup(worker);
  return setup.assureInstallation().fail( setup.handleError.bind(setup) );
};

var Setup = function(worker) {
  this.worker = worker;
  this.initCouchConnection();
};

Setup.prototype.initCouchConnection = function() {
  var options = url.parse(this.worker.config.server);

  if (this.worker.config.admin) {
    options.auth = {
      username: this.worker.config.admin.user,
      password: this.worker.config.admin.pass
    };
  }
  this.worker.couch = new(cradle.Connection)(options);
};

Setup.prototype.assureInstallation = function() {
  return this.readGlobalConfig() //.then( this.readWorkerConfig.bind(this) );
  // return this.readGlobalConfig().then( this.readWorkerConfig.bind(this) );
};

Setup.prototype.readGlobalConfig = function() {
  var get   = this.worker.promisify( this.worker.couch.database('modules'), 'get');

  return get('global_config').then( this.setGlobalConfig.bind(this) )
};

Setup.prototype.readWorkerConfig = function() {
  var get = this.worker.promisify( this.worker.couch.database('modules'), 'get')
  
  return get(this.worker.name)
  .then(
    this.setWorkerConfig.bind(this),
    this._handleReadWorkerConfigError.bind(this)
  );
};

Setup.prototype._handleReadWorkerConfigError = function(error) {
  if (error.reason === "missing" || error.reason === "deleted") {

    this.log("/modules/%s not yet setup", this.worker.name);
    return this.worker.install()
    .then( this.createConfigInModulesDatabase.bind(this) )

  } else {
    return this.worker.rejectWith(error);
  }
}

Setup.prototype.setGlobalConfig = function(object) {
  this.worker.config.app = object.config;
};

Setup.prototype.setWorkerConfig = function(object) {
  this.worker.config.user = object.config;
};

//    - create object in /modules
Setup.prototype.createConfigInModulesDatabase = function() {

  var doc = {
    "_id"       : this.worker.name,
    "createdAt" : new Date(),
    "updatedAt" : new Date(),
    "config"    : {}
  };
  var save = this.worker.promisify( this.worker.couch.database('modules'), 'save')
  this.setWorkerConfig(doc.config);

  this.log('creatinging object in modules database ...');
  return save( doc );
};

Setup.prototype.handleError = function(error) {
  this.log("Something went wrong ... ");
  this.log("%j", error);
};

Setup.prototype.log = function(message) {
  message = "["+this.worker.name+"Worker setup] " + message;
  console.log.apply(null, arguments);
};

module.exports = SetupHelper;