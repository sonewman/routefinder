# Routefinder

Install:
```bash
$ npm i routefinder
```

Routerfinder is a simple http router which works in a similar way to Express' router.

The main difference is that Express' router relies on Regular Expressions to match routes to a callback handle.

Routerfinder constructs an internal routing tree object which reduces the time taken to match a route and improves performance considerably when there are a large amount of routes registered. This is because rather than looping through a large array of regular expressions calling each of them until a match, Routefinder breaks down the route and walks the tree for a matching route.

This is currently pre-minor release and could be subject to change and will continue to be develop over the next few weeks.

## Usage:
```javascript
var router = new require('routefinder').Router()

router.get('/my-route', function (req, res) {
  // do something
  res.statusCode = 200
  res.end('OK!')
})

require('http')
  .createServer(router.handle)
  .listen(8080)
```

## Planned features
I am planning to add capabilities so this can easily be added as router to express which will then be used under-the-hood by express instead of it's own router.
