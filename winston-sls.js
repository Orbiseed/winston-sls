var util = require('util');
var aliyun = require('aliyun-sdk');
var winston = require('winston');

var SLS = module.exports = function (options) {
  options = options || {};

  if (!options.accessKeyId) {
    throw new Error("Required: accessKeyId");
  }

  if (!options.secretAccessKey) {
    throw new Error("Required: secretAccessKey");
  }

  if (!options.endpoint) {
    throw new Error("Required: endpoint");
  }

  if (!options.projectName) {
    throw new Error("Required: projectName");
  }

  if (!options.logStoreName) {
    throw new Error("Required: logStoreName");
  }

  this.name = options.name || 'sls';
  this.level = options.level || 'info';
  this.projectName =  options.projectName;
  this.logStoreName =  options.logStoreName;
  this.handleExceptions =  options.handleExceptions || false;
  this.exceptionsLevel =  options.exceptionsLevel || 'error';

  this.sls = new aliyun.SLS({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    endpoint: options.endpoint,
    apiVersion: options.apiVersion || '2015-06-01'
    , httpOptions: {
      timeout: options.timeout || 2000
    }
  });
};

//
// Inherit from `winston.Transport` to take advantage of base functionality.
//
util.inherits(SLS, winston.Transport);

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
SLS.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var self = this;

  // 在这种情况下，认为这不是 meta，而是 msg 的一部分
  if (meta && !meta.topic && !meta.source) {
    msg = stringify(msg) + ' ' + stringify(meta);
  }

  var output = [
    {
      key: 'level',
      value: level
    },
    {
      key: 'message',
      value: msg
    }
  ];

  this.sls.putLogs({
    //必选字段
    projectName: this.projectName,
    logStoreName: this.logStoreName,
    logGroup: {
      logs: [{
        time: Math.floor(new Date().getTime() / 1000),
        contents: output
      }],
      topic: (meta && meta.topic) || '',
      source: (meta && meta.source) || ''
    }
  }, function (err, data) {
    if (err) {
      self.emit('error', err);
      return;
    }

    self.emit('logged');
  });

  // intially, tell the caller that everything was fine
  callback(null, true);
};

const stringify = function (s) {
  return JSON.stringify(s, function (key, value) {
    if (value instanceof Buffer) {
      return value.toString('base64');
    }

    if (value instanceof Error) {
      return value.stack;
    }

    return value;
  })
};

//
// Add SLS to the transports defined by winston.
//
winston.transports.SLS = SLS;
