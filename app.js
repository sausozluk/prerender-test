var http = require('http');
var async = require('async');
var request = require('request');
var ProgressBar = require('progress');
var _ = require('lodash');
var config = require('./package').config;

var count = 0;
var repeat = config.repeat;
var bar = new ProgressBar('[:percent / :elapsedsec]:bar', {total: repeat});
var warnings = [];

var isDone = function (body) {
  return body.indexOf(config.match) > -1;
};

var doRequest = function (next) {
  var id = new Date().getTime() + '_' + count++;

  request({
    url: config.baseUrl + id,
    headers: {'User-Agent': config.agent},
    time: true
  }, function (err, res, body) {
    if (isDone(body)) {
      if (res.elapsedTime > config.responseTimeWarnLimit) {
        warnings.push('[WARNING] ' + id + ' (' + res.elapsedTime + 'ms)');
      }

      bar.tick();
      next(null, {id: id, time: res.elapsedTime});
    } else {
      next(new Error(id), null);
    }
  });
};

var requests = new Array(repeat).fill(doRequest);

async.series(requests, function (err, results) {
  if (err) {
    console.error('\n[ERROR]', err.message);
  } else {
    var success = {
      min: _.minBy(results, 'time'),
      max: _.maxBy(results, 'time'),
      sum: Math.round(_.sumBy(results, function (i) {
        return i.time / repeat;
      }))
    };

    if (warnings.length) {
      console.log('');
    }

    warnings.forEach(function (warn) {
      console.warn(warn);
    });

    console.log('\n[PASSED]\n');
    console.log('Min #', success.min.time + 'ms', '(' + success.min.id + ')');
    console.log('Max #', success.max.time + 'ms', '(' + success.max.id + ')');
    console.log('Sum #', success.sum + 'ms');
  }
});
