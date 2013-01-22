var Q       = require("q"),
    url     = require("url"),
    fs      = require("fs"),
    cradle  = require("cradle");


var SetupHelper = function(worker, config) {
  worker.name = config.name;
  worker.config = config;
  var setup = new Setup(worker);
  return setup.assureSetupation().fail( setup._handleError );
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

Setup.prototype.assureSetupation = function() {
  return this.readGlobalConfig().then( this.readWorkerConfig.bind(this) );
};

Setup.prototype.readGlobalConfig = function() {
  var defer = Q.defer();

  this.worker.couch.database('modules').get('global_config', function(error, object) {
    if (error) {
      error.context = 'readGlobalConfig';
      defer.reject(error);
      return;
    }

    this.setGlobalConfig(object.config);
    defer.resolve();
  }.bind(this));

  return defer.promise;
};

Setup.prototype.readWorkerConfig = function() {
  var defer = Q.defer();

  this.worker.couch.database('modules').get(this.worker.name, function(error, object) {
    if (error) {
      if (error.reason === "missing" || error.reason === "deleted") {

        this._log("/modules/%s not yet setup", this.worker.name);
        this.worker.install()
        .then(this.createConfigInModulesDatabase.bind(this))
        .then( defer.resolve ).fail( defer.reject );

      } else {
        error.context = 'assureSetupation';
        defer.reject(error);
        return defer.promise;
      }
    } else {

      // already setup
      this._log("/modules/%s already setup.", this.worker.name);
      this.setWorkerConfig(object.config);
      defer.resolve();

    }
  }.bind(this));

  return defer.promise;
};

Setup.prototype.setGlobalConfig = function(object) {
  this.worker.config.app = object;
};

Setup.prototype.setWorkerConfig = function(object) {
  this.worker.config.user = object;
};

//    - create object in /modules
Setup.prototype.createConfigInModulesDatabase = function() {
  this._log('creatinging object in modules database ...');

  var doc = {
    "_id"       : this.worker.name,
    "createdAt" : new Date(),
    "updatedAt" : new Date(),
    "config"    : {}
  };
  this.setWorkerConfig(doc.config);

  return promisify( this.worker.couch.database('modules'), 'save', 'createConfigInModulesDatabase' )( doc );
};

Setup.prototype._handleError = function(error) {
  this._log("Something went wrong ... ");
  this._log("%j", error);
};

Setup.prototype._log = function(message) {
  message = "["+this.worker.name+"Worker setup] " + message;
  console.log.apply(null, arguments);
};

module.exports = SetupHelper;