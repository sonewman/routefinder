
var desc = require('macchiato')
var Router =  require('../').Router

desc('Router test', function () {

  desc.beforeEach(function () {
    this.router = new Router()
    this.next = this.stub()
    this.res = {}
  })
  
  desc.it('Should take a simple route mapping the callback', function (t) {
    var req = {
      method: 'GET'
      , url: '/simple/route'
    }

    this.router.get('/simple/route', function () {
      t.pass()
      t.end()
    })

    this.router.handle(req, this.res, this.next)
  })


  desc.it('Should take a route containing one params', function (t) {
    var req = {
      method: 'GET'
      , url: '/route/containing/param'
    }

    this.router.get('/route/containing/:param2', function (req, res, next) {
      t.deepEquals(req.params, { param2: 'param' })
      t.end()
    })

    this.router.handle(req, this.res, this.next)
  })

})
