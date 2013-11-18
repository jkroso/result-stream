
# result-stream

a linked list designed for working with [results](http://github.com/jkroso/result). Currently a bit of a WIP experiment looking for alternatives to nodes built in streams which are completely transient. That is to say you can't think of them as a list of values because you can only read them once and if other people are reading them they will affect you. The mental model you need to have for working with nodes streams then is like a work queue or a conveyor belt. Result streams are intended to be completely deterministic. That means any number of people can read from a result stream, any number of times and they will always see the same thing. Their mental model then is just that of a value. Because they are linked lists though rather than arrays its natural to process them recursively freeing up the start of the stream for garbage collection as your go. They can also be completely lazy too so the data you haven't process yet isn't sitting in memory. Ultimately then you get the same performance characteristics (give or take a small %) as node's transient streams while being much easier to work with. 

## Lazy evaluation

By using defered results we can make nice lazily evaluated streams. See the [examples](/examples/lazy.js). One common problem with using a lazy evaluation strategy while working with external resources such as files is when to close them down. Obviously you want to do that as soon as all consumers are finished reading but how to you detect that moment. If your reading a file and read to the end then you can just clean up then but what if your consumer stops reading part way through. You could use a generous timeout or ask consumers to explicitly call `close()` but both kind of suck. Node itself asks you to completely consume all resources. However, it turns out thanks to the [weak](https://npmjs.org/package/weak) package we can hook into the garbage collector to know exactly when nobody cares about our external resource. Lazy IO is no longer a leaky abstraction!

## Installation

_With [component](//github.com/component/component), [packin](//github.com/jkroso/packin) or [npm](//github.com/isaacs/npm)_  

	$ {package mananger} install jkroso/result-stream

then in your app:

```js
var Stream = require('result-stream')
```

## API

- [result-stream()](#result-stream)

### result-stream()

## Running the tests

Just run `make`
