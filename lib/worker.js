var setup        = require("./setup.js");
var when         = require("when/debug");
var promisify    = require("when-promisify");
var util         = require('util');
var EventEmitter = require('events').EventEmitter;

function Worker(config) {}
util.inherits(Worker, EventEmitter);

// 
// promise FTW!
// 
Worker.prototype.when = when

Worker.prototype.setup = function(config) {
  return setup(this, config);
};
Worker.prototype.install = function() {
  return this.when.resolve();
};


// 
// promisify!
// 
Worker.prototype.promisify = promisify;

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
  var messageArgs, errorLines;

  messageArgs = Array.prototype.slice.call(arguments, 1)
  if (messageArgs.length) {
    messageArgs[0] = "error: " + messageArgs[0]
  } else {
    messageArgs.push('error')
  }

  

  console.log("") // add blank line before error
  this.log.apply( this, messageArgs)
  errorLines = JSON.stringify(error, '', '  ').split(/\n/)

  for (var i = 0; i < errorLines.length; i++) {
    this.log(errorLines[i]);
  }
  console.log("") // add blank line after error

  return this.when.reject(error);
};
Worker.prototype.handleErrorWithMessage = function(message) {
  var args = Array.prototype.slice.call(arguments)
  return function(error) {
    args.unshift(error)
    return this.handleError.apply( this, args)
  }.bind(this);
};

module.exports = Worker;