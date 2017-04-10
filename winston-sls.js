let util = require('util');
let aliyun = require('aliyun-sdk');
let winston = require('winston');

let SLS = module.exports = function (options) {
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
  this.logInterval = options.logInterval || 2000;
  this.buffer = [];

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

  let self = this;

  {
    msg = stringify(msg);

    // 在这种情况下，认为这不是 meta，而是 msg 的一部分
    if (meta && !meta.topic && !meta.source) {
      if (Object.keys(meta).length === 0 && meta.constructor === Object) {
        // 如果 meta 是一个 {} 则什么都不做
      }
      else {
        msg = msg + ' ' + stringify(meta);
      }
    }

    let logGroup = {
      logs: [{
        time: Math.floor(new Date().getTime() / 1000),
        contents: [
          {
            key: 'level',
            value: level
          },
          {
            key: 'message',
            value: msg
          }
        ]
      }],
      topic: (meta && meta.topic) || '',
      source: (meta && meta.source) || ''
    };

    let i;
    for (i = 0; i < this.buffer.length; i++) {
      let item = this.buffer[i];
      // 有匹配的
      if (item.topic === logGroup.topic && item.source === logGroup.source) {
        item.logs = item.logs.concat(logGroup.logs);
        break;
      }
    }
    // 没有匹配的
    if (i >= this.buffer.length) {
      this.buffer.push(logGroup);
    }
  }

  let putLogs = function () {
    if (self.timeoutId) return;

    if (!self.buffer.length) return;

    self.timeoutId = setTimeout(function () {
      while (self.buffer.length) {
        let logGroup = self.buffer.pop();
        self.sls.putLogs({
          //必选字段
          projectName: self.projectName,
          logStoreName: self.logStoreName,
          logGroup: logGroup
        }, function (err, data) {
          // console.log(err, data);
          self.timeoutId = null;

          if (err) {
            self.emit('error', err);
            return;
          }

          self.emit('logged');
        });
      }
    }, this.logInterval);
  };

  putLogs();

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
