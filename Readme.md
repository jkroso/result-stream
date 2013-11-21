
# result-stream

A linked list designed for working with [results](http://github.com/jkroso/result). Currently a bit of a WIP experiment looking for alternatives to nodes built in streams which are completely transient. That is to say you can't think of them as a list of values because you can only read them once and if other people are reading them they will affect you. The mental model you need to have for working with nodes streams then is like a work queue or a conveyor belt. Result streams are intended to be completely deterministic. That means any number of people can read from a result stream, any number of times and they will always see the same thing. Their mental model then is just that of a value. Because they are linked lists though rather than arrays its natural to process them recursively freeing up the start of the stream for garbage collection as your go. They can also be completely lazy too so the data you haven't processed yet isn't sitting in memory. Ultimately then you get the same performance characteristics (give or take a small %) as node's transient streams while being much easier to work with.

## Lazy evaluation

By using defered results we can make nice lazily evaluated streams. See the [examples](/examples/lazy.js). One common problem with using a lazy evaluation strategy while working with external resources such as files is when to close them down. Obviously you want to do that as soon as all consumers are finished reading but how to you detect that moment. If your reading a file and read to the end then you can just clean up then but what if your consumer stops reading part way through. You could use a generous timeout or ask consumers to explicitly call `close()` but both kind of suck. Node itself asks you to completely consume all resources. However, it turns out thanks to the [weak](https://npmjs.org/package/weak) package we can hook into the garbage collector to know exactly when nobody cares about our external resource. Lazy IO is no longer a leaky abstraction!

## Installation

_With [component](//github.com/component/component), [packin](//github.com/jkroso/packin) or [npm](//github.com/isaacs/npm)_

	$ {package mananger} install jkroso/result-stream

then in your app:

```js
var Stream = require('result-stream')
```

## Example

Another name for a stream is a linked list. This is because they are just a bunch of nodes linked together to form a list. Each node is a pair, a value and the rest of the stream. i.e. `{ head: 1, tail: ... }`. The end of the stream is marked with a unique stream node declared the "null stream". Similar to the way the EOF character marks the end of a file. Stream nodes _can_ be just plain objects but its nicer to use a special class since it makes their type easier to distinguish and can have methods attached.

```js
var stream = new Stream(1, new Stream(2, new Stream(3)))
var hackStream = {head:1,tail:{head:2,tail:{head:3,tail:Stream.nil}}}
stream.head // => 1
stream.tail.head // => 2
stream.tail.tail.head // => 3
stream.tail.tail.tail // => Stream.nil
stream.reduce(add) // => 6
Stream.reduce(hackStream, add) // => 6
Stream.equals(hackStream, stream) // => true
function add(a, b){ return a + b }
```

## API

### Stream()

  the Stream constructor

```js
new Stream(1) // => { head: 1, tail: Stream.nil }
```

### Stream.nil

  The empty stream. Pretty much an EOF marker

### Stream.each(Stream, fn, [context])

  call `fn` with each value in `stream`

### Stream.take(n, stream)

  ensure `stream` ends after `n` nodes

```js
var firstTen = Stream.take(10, Stream.ints())
```

### Stream.reduce(stream, fn, [initial])

  loop through the stream passing the return value of each
  iteration as input to the next

```js
Stream.reduce(firstTen, add, 0) // => 55
```

### Stream.item(n, stream)

  get the `n`th item in `stream`

```js
Stream.item(1, firstTen)  // => 1
Stream.item(10, firstTen) // => 10
```

### Stream.filter

  create a stream filter by and `ok` function

```js
var evens = Stream.filter(function(n){ return n % 2 == 0 }, firstTen)
evens.head // => 2
evens.tail.head // => 4
```

### Stream.make(...)

  create a Stream containing `arguments`

### Stream.fromArray(array)

  create a Stream from an Array

### Stream.range(low, [high])

  create a stream of numbers from `low` to `high`. If
  `high` is omitted then the stream will be Infinite

### Stream.equals

  check if stream `a` is equivilent to `b`

## Running the tests

Just run `make`
