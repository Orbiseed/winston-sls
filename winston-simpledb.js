var util = require('util');
var aliyun = require('aliyun-sdk');
var simpledb = require('awssum/lib/aliyun/simpledb');
var winston = require('winston');
var UUID = require('uuid-js');
var common = require();

// --------------------------------------------------------------------------------------------------------------------

//
// ### function SimpleDB (options)
// Constructor for the SimpleDB transport object.
//
var SimpleDB = exports.SimpleDB = function (options) {
  options = options || {};

  // need the accessKeyId
  if (!options.accessKeyId) {
    throw new Error("Required: accessKeyId for the aliyun account to log for.");
  }

  // need the secretAccessKey
  if (!options.secretAccessKey) {
    throw new Error("Required: secretAccessKey for the aliyun account being used.");
  }

  // need the projectName
  if (!options.projectName) {
    throw new Error("Required: projectName (or projectName generator) to log to.");
  }

  // need the endpoint
  if (!options.endpoint) {
    throw new Error("Required: endpoint the domain is in.");
  }

  // Winston Options
  this.name = 'sls';
  this.level = options.level || 'info';

  // SimpleDB Options
  if (options.projectName) {
    this.projectName = options.projectName;
  }
  this.itemName = this.itemName || 'timestamp';
  if (options.itemName) {
    this.itemName = options.itemName;
  }

  // create the SimpleDB instance
  this.sdb = new aliyun.SLS({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    endpoint: options.endpoint,
    apiVersion: '2015-06-01'

    //以下是可选配置
    , httpOptions: {
      timeout: 2000
    }
  });
};

//
// Inherit from `winston.Transport` to take advantage of base functionality.
//
util.inherits(SimpleDB, winston.Transport);

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
SimpleDB.prototype.log = function (level, msg, meta, callback) {
  if (this.silent) {
    return callback(null, true);
  }

  var self = this;
  var output = [
    {
      key: 'level',
      value: level
    },
    {
      key: 'message',
      value: stringify(msg) || ''
    }
  ];

  sls.putLogs({
    //必选字段
    projectName: this.projectName,
    logStoreName: this.logStoreName,
    logGroup: {
      logs: [{
        time: Math.floor(new Date().getTime() / 1000),
        contents: output
      }],
      topic: meta || meta.topic || '',
      source: meta || meta.source || ''
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
// Add SimpleDB to the transports defined by winston.
//
winston.transports.SimpleDB = SimpleDB;
