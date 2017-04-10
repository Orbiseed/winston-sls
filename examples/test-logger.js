var winston = require('winston');
var SLS = require('../winston-sls');

// Copy the options.js.example file in this directory, name it options.js
// and add in your AWS credentials.
winston.add(winston.transports.SLS, {
  accessKeyId: "在阿里云申请",
  secretAccessKey: "在阿里云申请",
  endpoint: 'http://cn-hangzhou.log.aliyuncs.com',
  apiVersion: '2015-06-01',
  projectName: '在SLS控制台创建',
  logStoreName: '在SLS控制台创建',
  timeout: 2000,    // 可选
  handleExceptions: true
});

// do an info log
winston.log('info', 'Hello distributed log files!', function (err) {
  console.log(err, 'First message logged');
});

// do another info log
winston.info('Hello again distributed logs', function (err) {
  console.log(err, 'Second message logged');
});

// log with metadata
winston.info('With some metadata', {  }, function (err) {
  console.log(err, 'Third message logged');
});

winston.info('With some metadata, topic', { topic: 'vv' }, function (err) {
  console.log(err, 'Third message logged');
});

winston.info('With some metadata, source', { source: '127.0.0.1' }, function (err) {
  console.log(err, 'Third message logged');
});
