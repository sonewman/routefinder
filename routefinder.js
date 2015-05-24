module.exports = create
create.Router = Router

var querystring = require('querystring')
var methods = ['get', 'post', 'put', 'delete', 'options', 'connect', 'head'];

function create(options) {
  var r = new Router(options)
  return r.handle
}

function init(target, path) {
  target.fullPath = (path[0] === '/') ? path.substr(1) : path
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

function Branch() {
  this.handles = []
}

function tryMatchingParams(handleParams, matchParams) {
  var matched = {}

  for (var i = 0, l = handleParams.length; i < l; i += 1) {
    var paramKey = handleParams[i]
    var paramValue = matchParams[i]

    if (paramKey.no === paramValue.no)
      matched[paramKey.name] = paramValue.value
    else
      return null
  }
  return matched
}

Branch.prototype.findMatch = function (match) {
  var handles = this.handles

  for (var i = 0, l = handles.length; i < l; i += 1) {
    var handle = handles[i]
    var handleParams = handle.params
    var paramsLen = handleParams.length
    var expectedParams = match.expectedParams

    if (expectedParams.length === paramsLen) {
      var matched = tryMatchingParams(handle.params, expectedParams)
      if (matched !== null) {
        match.params = matched
        match.callback = handle.callback
        return match
      }
    }
  }
}

var paramKey = '#param'
var handleKey = '#handle'

function walkBranches(branches, key, match, no) {
  var branch = branches[key]
  if (!branch && branches[paramKey]) {
    branch = branches[paramKey]
    match.expectedParams.push({ value: key, no: no })
  }

  // Route existed
  if (branch) return walkTree(branch, match, no)
}

function callHandle(handler, match) {
  if (handler) return handler.findMatch(match)
}

function walkTree(branch, match, no) {
  var key = match.path[no]
  return key
    ? walkBranches(branch, key, match, no + 1)
    : callHandle(branch[handleKey], match)
}

function getParamName(part) {
  var c = part[0]
  return (c === ':' || c === '*') && part.substr(1)
}

function keyBranch(branches, key) {
  return branches[key] || (branches[key] = new Branch())
}

function addBranch(branches, handle, no) {
  var branch
  var key = handle.path[no]

  if (key) {
    no += 1
    var name = getParamName(key)
    if (name) {
      handle.params.push({ name: name, no: no })
      key = paramKey
    }

    branch = branches[key] || (branches[key] = {})
    addBranch(branch, handle, no)
  } else {
    keyBranch(branches, handleKey).handles.push(handle)
  }
}

function createMethodMaps(map) {
  for (var i = 0, l = methods.length; i < l; i += 1)
    map[methods[i].toUpperCase()] = {}
  return map
}

function handle_(router, req, res, next) {
  var method = req.method
  var u = req.url
  var splitOnQuery = u.split('?')
  u = splitOnQuery[0]
  req.query = querystring.parse(splitOnQuery[1])

  var matched = router.match(method, u)
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
  return walkTree(this._methods[method], new Match(path), 0)
}

Router.prototype.route = function (method, path, fn) {
  method = method.toUpperCase()
  addBranch(this._methods[method], new Handle(path, fn), 0)
}

methods.forEach(function (verb) {
  Object.defineProperty(Router.prototype, verb, {
    value: function (path, fn) {
      return this.route(verb, path, fn)
    }
  })
})

