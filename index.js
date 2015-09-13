'use strict';
var fs = require('fs');
var path = require('path');
var http = require('http');
var async = require('async');
var Stream = require('stream').Transform;
var chalk = require('chalk');

module.exports = (sub, cat, num) => {
  var url = 'http://www.reddit.com/r/' + 
  sub + '/' + 
  cat + '.json' + 
  '?limit=' + num;

  getPosts(url, getImage);
}

function getPosts(url, cb) {
  http.get(url, res => {
    var body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      try {
        var parsed = JSON.parse(body);
        async.each(parsed.data.children, cb);
      } catch (e) {
        console.log(e.message);
        return;
      }
    });
  }).on('error', err => console.error(err));
}

function getImage(post) {
  var url = post.data.url;
  var imgurImageRegex = /^https?\:\/\/(i\.)?imgur\.com\/([A-Z0-9]{5,8})((?:\.jpg)|(?:\.gifv)|(?:\.png)|(?:\.gif))?(?:\?1)?$/i;
  var imgurAlbumRegex = /^http\:\/\/imgur\.com\/a\/[a-zA-Z0-9]{5}/;
  var genericJpgOrPngRegex = /http:\/\/.*\/([^\/]+\.(jpg|png|gif))$/;
  var imgurImageMatch;
  var imgurAlbumMatch;
  var genericJpgOrPngMatch;
  var downloadUrl;
  var filename;
  var ext;
 
  if (imgurImageMatch = url.match(imgurImageRegex)) {
    downloadUrl = 'http://imgur.com/download/' + imgurImageMatch[2];
    ext = imgurImageMatch[3] || '.jpg';
    filename = imgurImageMatch[2] + ext;
  }
  else if (genericJpgOrPngMatch = url.match(genericJpgOrPngRegex)) {
    downloadUrl = url;
    filename = genericJpgOrPngMatch[1];
  }
  else if (imgurAlbumMatch = url.match(imgurAlbumRegex)) {
    console.log(url, chalk.cyan(' Imgur albums'), chalk.red(' not supported'));
    return;
  }
  else if (~url.indexOf('imgur.com/gallery')) {
    console.log(url, chalk.cyan(' Imgur galleries'), chalk.red(' not supported'));
    return;
  }
  else if (~url.indexOf('https')) {
    console.log(url, chalk.cyan(' https'), chalk.red(' not supported'));
    return;
  }
  else {
    console.log(url, chalk.red(' Unrecognized image url'));
    return;
  }

  http.request(downloadUrl, res => {
    var data = new Stream();
    res.on('data', chunk => data.push(chunk));
    res.on('end',
      () => fs.writeFile(filename, 
        data.read(), 
        () => console.log(url, chalk.green(' downloaded successfully'))
      )
    );
  }).end();
}
