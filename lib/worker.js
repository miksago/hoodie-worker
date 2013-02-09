var setup        = require("./setup.js");
var when         = require("when");
var util         = require('util');
var EventEmitter = require('events').EventEmitter;

function Worker(config) {}
util.inherits(Worker, EventEmitter);

Worker.prototype.setup = function(config) {
  return setup(this, config);
};
Worker.prototype.install = function() {
  return this.when.resolve();
};

// 
// promise FTW!
// 
Worker.prototype.when = when

// 
// this.promisify(object, 'method', 'arg1', 'argn').then
// 
Worker.prototype.promisify = function(context, nodeAsyncFnName) {
  return function() {
    var defer = when.defer()
    var args  = Array.prototype.slice.call(arguments)
    var callback = function( error ) {
      if (error) {
        defer.reject(error)
        return
      }

      var cbArgs  = Array.prototype.slice.call(arguments)
      cbArgs.shift()

      defer.resolve.apply(null, cbArgs)
    }

    args.push( callback )
    context[nodeAsyncFnName].apply(context, args)

    return defer.promise
  };
};

// 
// helper for nicer logging
// 
Worker.prototype.log = function(message) {
  message = "[" + this.name + "Worker] " + message;
  console.log.apply(null, arguments);
};

//
// report errors nicely
//
Worker.prototype.handleError = function(error, message) {
  if (message) {
    message = "error: " +message
  } else {
    message = error
  }
  console.log("")
  this.log(message);
  this.log(JSON.stringify(error, '', '  '));
  console.log("")

  return this.when.reject(error);
};
Worker.prototype.handleErrorWithMessage = function(message) {
  return function(error) {
    return this.handleError(error, message)
  };
};

module.exports = Worker;