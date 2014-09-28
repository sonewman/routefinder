
var url = require('url')
var querystring = require('querystring')


module.exports = function (options) {
  var r = new Router(options)
  return r.handle
}

function Handle(params, callback) {
  this.params = params
  this.callback = callback
}

function RouteHandler() {
  this.handles = []
}

RouteHandler.prototype.add = function (params, callback) {
  this.handles.push(new Handle(params, callback))
}

RouteHandler.prototype.handle = function (request, params) {
  var handles = this.handles
  var handlesLen = handles.length
  var paramsLen = params.length
  var paramKey
  var paramValue
  var matchedParams
  var matchedRoute
  var handleParams
  var handleParamsLen
  var handle
  var i = 0
  var j

  for (; i < handlesLen; i++) {
    handle = handles[i]
    handleParams = handle.params
    handleParamsLen = handleParams.length

    if (handleParamsLen === paramsLen) {
      matchedRoute = true
      matchedParams = {}

      for (j = 0; j < handleParamsLen; j++) {
        paramKey = handleParams[j]
        paramValue = params[j]

        if (paramKey.no === paramValue.no) {
          matchedParams[paramKey.name] = paramValue.value
        } else {
          matchedRoute = false
          break
        }
      }

      if (matchedRoute) {
        request.req.params = matchedParams
        handle.callback(request.req, request.res, request.next)
      }
    }
  }
}

var paramKey = '#param'
var handleKey = '#handle'

function onHandle(handles, path, request, no, params) {
  var step = path.shift()
  var handler

  if (step) {
    no++
    handler = handles[step]
    if (!handler && handles[paramKey]) {
      handler = handles[paramKey]
      params.push({
        value: step
        , no: no
      })
    }

    // Route existed
    if (handler) onHandle(handler, path, request, no, params)

  } else {
    handler = handles[handleKey]

    // not sure if this would not happen
    if (handler) {
      handler.handle(request, params)
    }

  }
}

function getParamName(part) {
  var c = part[0]
  return (c === ':' || c === '*') && part.substr(1)
}

function addStep(handles, path, params, no, fn) {
  var handle
  var step = path.shift()
  var paramName

  if (step) {

    no++
    paramName = getParamName(step)
    if (paramName) {
      params.push({
        name: paramName
        , no: no
      })
      step = paramKey
    }

    handle = handles[step] || (handles[step] = {})
    addStep(handle, path, params, no, fn)
  } else {
    handle = handles[handleKey]
      || (handles[handleKey] = new RouteHandler())

    handle.add(params, fn)
  }
}

function Router(options) {
  if (!(this instanceof Router))
    return new Router(options)

  var methods = this._methods = {}

  // create handle method which is bound to itself
  this.handle = function (req, res, next) {
    var method = req.method
    var u = req.url
    var splitOnQuery = u.split('?')

    req.query = querystring.parse(splitOnQuery[1])
    u = splitOnQuery[0]

    var params = []
    var request = {
      req: req
      , res: res
      , next: next
    }

    var handles = methods[method]
    if (u[0] === '/') u = u.substr(1)
    if (handles) onHandle(handles, u.split('/'), request, 0, params)
  }
}

module.exports.Router = Router

Router.prototype.route = function (method, path, fn) {
  method = method.toUpperCase()
  var handles = this._methods[method]
    || (this._methods[method] = {})

  var params = []
  if (path[0] === '/') path = path.substr(1)
  addStep(handles, path.split('/'), params, 0, fn)
}

;[
  'get'
  , 'post'
  , 'put'
  , 'delete'
  , 'options'
  , 'connect'
].forEach(function (verb) {
  Object.defineProperty(Router.prototype, verb, {
    value: function (path, fn) {
      return this.route(verb, path, fn)
    }
  })
})

