module.exports = create
create.Router = Router

var querystring = require('querystring')
var methods = ['get', 'post', 'put', 'delete', 'options', 'connect', 'head'];

function create(options) {
  var r = new Router(options)
  return r.handle
}

function init(target, path) {
  target.fullPath = (path[0] === '/') ? path.substring(1) : path
  target.path = target.fullPath.split('/')
}

var proto = {}
proto.params = null
proto.callback = null
proto.fullPath = '/'
proto.path = null

function Handle(path, cb) {
  init(this, path)
  this.params = []
  this.callback = cb
}
Handle.prototype = Object.create(proto)

function Match(path) {
  var split = path.split('?')
  init(this, split[0] || '')
  this.queryString = split[1] || ''
  this.expectedParams = []
  this.params = {}
}
Match.prototype = Object.create(proto)

function tryMatchingParams(handleP, matchP) {
  var matched = {}
  for (var i = 0, l = handleP.length; i < l; i += 1) {
    var key = handleP[i]
    var value = matchP[i]

    if (key.index === value.index) matched[key.value] = value.value
    else return null
  }
  return matched
}

function Param(index, value) {
  this.index = index
  this.value = value
}

function setMatched(match, params, callback) {
  match.params = params
  match.callback = callback
  return match
}

function findMatch(handles, match) {
  for (var i = 0, l = handles.length; i < l; i += 1) {
    var handle = handles[i]
    var handleParams = handle.params
    var paramsLen = handleParams.length
    var expectedParams = match.expectedParams

    if (expectedParams.length === paramsLen) {
      if (paramsLen === 0) {
        return setMatched(match, matched, handle.callback)
      }

      var matched = tryMatchingParams(handle.params, expectedParams)
      if (matched !== null) {
        return setMatched(match, matched, handle.callback)
      }
    }
  }
}

var paramKey = '#param'
var starKey = '#star'
var handleKey = '#handle'

function walkTree(branches, match) {
  var path = match.path
  for (var i = 0, l = path.length; i < l; i += 1) {
    var key = path[i]
    var branch = branches[key]
    
    if (branch) {
      branches = branch
    } else if (branches[paramKey]) {
      branches = branches[paramKey]
      match.expectedParams.push(new Param(i, key))
    } else {
      return null
    }
  }

  var handles = branches[handleKey]
  if (!handles || handles.length === 0) return null
  else return findMatch(handles, match)
}

var COLON = 58
var STAR = 42

function addBranch(branches, handle) {
  var branch
  var path = handle.path

  for (var i = 0, l = path.length; i < l; i += 1) {
    var key = path[i]
    var c = key.charCodeAt(0)
    var name = undefined

    if (c === COLON) {
      name = key.substring(1)
      key = paramKey
    } else if (c === STAR) {
      name = key.substring(1)
      key = starKey
    }

    if (name !== undefined)
      handle.params.push(new Param(i, name))
    
    if (branches[key] === undefined) 
      branches[key] = {}

    branches = branches[key] 
  }
  
  var handles = branches[handleKey]
  if (handles !== undefined) handles.push(handle)
  else branches[handleKey] = [handle]
}

function createMethodMaps(map) {
  for (var i = 0, l = methods.length; i < l; i += 1)
    map[methods[i].toUpperCase()] = {}
  return map
}

function handle_(router, req, res, next) {
  var r = new Match(req.url)
  req.query = querystring.parse(r.queryString)
  var matched = walkTree(router._methods[req.method], r)

  if (matched) {
    req.params = matched.params
    matched.callback(req, res, next)
  } else if ('function' === typeof next) {
    next()
  }
}

function Router(options) {
  if (!(this instanceof Router))
    return new Router(options)

  var self = this
  self._methods = createMethodMaps({})

  // create handle method which is bound to itself
  self.handle = function (req, res, next) {
    handle_(self, req, res, next)
  }
}

Router.prototype.match = function (method, path) {
  return walkTree(this._methods[method], new Match(path))
}

Router.prototype.route = function (method, path, fn) {
  method = method.toUpperCase()
  addBranch(this._methods[method], new Handle(path, fn))
}

methods.forEach(function (verb) {
  Object.defineProperty(Router.prototype, verb, {
    value: function (path, fn) {
      return this.route(verb, path, fn)
    }
  })
})

