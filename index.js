
/*!
 * vhost
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

/**
 * vhost:
 *
 *   Setup vhost for the given `hostname` and `server`.
 *
 *     connect()
 *       .use(connect.vhost('foo.com', fooApp))
 *       .use(connect.vhost('bar.com', barApp))
 *       .use(connect.vhost('*.com', mainApp))
 *
 *  The `server` may be a Connect server, a callable function,
 *  or a regular Node `http.Server`.
 *
 * @param {string|RegExp} hostname
 * @param {function|Server} server
 * @return {Function}
 * @api public
 */

module.exports = function vhost(hostname, server){
  if (!hostname) {
    throw new TypeError('argument hostname is required')
  }

  if (!server) {
    throw new Error('argument server is required')
  }

  // create a handle for the server
  var handle = createHandle(server)

  // create regular expression for hostname
  var regexp = hostregexp(hostname)

  return function vhost(req, res, next){
    var hostname = hostnameof(req)

    if (!hostname) {
      return next()
    }

    var match = regexp.exec(hostname)

    if (!match) {
      return next()
    }

    // populate
    req.vhost = data(match)

    // handle
    handle(req, res, next)
  };
};

/**
 * Create handle to server.
 *
 * @param {function|Server} server
 * @return {function}
 * @api private
 */

function createHandle(server){
  if (typeof server === 'function') {
    // callable servers are the handle
    return server
  } else if (typeof server.emit === 'function') {
    // emit request event on server
    return function handle(req, res) {
      server.emit('request', req, res)
    }
  }

  throw new TypeError('argument server is unsupported')
}

/**
 * Create the value for req.vhost from a RegExp match.
 *
 * @param (object} match
 * @return {object}
 * @api private
 */

function data(match){
  var obj = Object.create(null)

  obj.hostname = match.input
  obj.length = match.length - 1

  for (var i = 1; i < match.length; i++) {
    obj[i - 1] = match[i]
  }

  return obj
}

/**
 * Get hostname of request.
 *
 * @param (object} req
 * @return {string}
 * @api private
 */

function hostnameof(req){
  var host = req.headers.host

  if (!host) {
    return
  }

  var offset = host[0] === '['
    ? host.indexOf(']') + 1
    : 0
  var index = host.indexOf(':', offset)

  return index !== -1
    ? host.substring(0, index)
    : host
}

/**
 * Determine if object is RegExp.
 *
 * @param (object} val
 * @return {boolean}
 * @api private
 */

function isregexp(val){
  return Object.prototype.toString.call(val) === '[object RegExp]'
}

/**
 * Generate RegExp for given hostname value.
 *
 * @param (string|RegExp} val
 * @api private
 */

function hostregexp(val){
  var source = !isregexp(val)
    ? String(val).replace(/([.+?^=!:${}()|\[\]\/\\])/g, '\\$1').replace(/\*/g, '([^\.]+)')
    : val.source

  // force leading anchor matching
  if (source[0] !== '^') {
    source = '^' + source
  }

  // force trailing anchor matching
  source = source.replace(/(\\*)(.)$/, function(s, b, c){
    return c !== '$' || b.length % 2 === 1
      ? s + '$'
      : s
  })

  return new RegExp(source, 'i')
}
