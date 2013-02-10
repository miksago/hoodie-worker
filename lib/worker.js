var setup        = require("./setup.js");
var when         = require("when");
var promisify    = require("promisify");
var util         = require('util');
var EventEmitter = require('events').EventEmitter;

function Worker(config) {}
util.inherits(Worker, EventEmitter);

// 
// promise FTW!
// 
Worker.prototype.when = when
Worker.prototype.promisify = promisify.node

Worker.prototype.setup = function(config) {
  return setup(this, config);
};
Worker.prototype.install = function() {
  return this.when.resolve();
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
    message = 'error'
  }

  this.log(message);
  var errorLines = JSON.stringify(error, '', '  ').split(/\n/)

  console.log("") // add blank line before error
  for (var i = 0; i < errorLines.length; i++) {
    this.log(errorLines[i]);
  }
  console.log("") // add blank line after error

  return this.when.reject(error);
};
Worker.prototype.handleErrorWithMessage = function(message) {
  return function(error) {
    return this.handleError(error, message)
  }.bind(this);
};

module.exports.Worker = Worker;