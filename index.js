
var s = require('lift-result/sexpr')
var defer = require('result/defer')
var lazy = require('lazy-property')
var lift = require('lift-result')
var Result = require('result')
var call = Function.call
var when = Result.when

module.exports = Stream

/**
 * the Stream constructor
 *
 * @param {Any} head
 * @param {Stream} [tail]
 */

function Stream(head, tail){
	this.head = head
	this.tail = tail || emptyStream
}

/**
 * The empty stream. Pretty much an EOF marker
 */

var emptyStream = new Stream

lazy(emptyStream, 'head', function(){
	throw new Error('Can\'t get the head of the empty stream')
})

lazy(emptyStream, 'tail', function(){
	throw new Error('Can\'t get the tail of the empty stream')
})

Stream.nil = emptyStream

/**
 * call `fn` with each value in `stream`
 *
 * @param {Stream} stream
 * @param {Function} fn
 * @param {Any} [ctx]
 * @return {Promise<null>}
 */

var each = lift(function(stream, fn, ctx){
	if (stream !== emptyStream) {
		return when(stream.head, function(value){
			fn.call(ctx, value)
			return each(stream.tail, fn, ctx)
		})
	}
})

/**
 * loop through the stream passing the return value of each
 * iteration as input to the next
 *
 * @param {Stream} stream
 * @param {Function} fn
 * @param {Any} [initial]
 * @return {Any}
 */

var reduce = lift(function(stream, fn, initial){
	if (initial === undefined) {
		if (stream === emptyStream) throw new Error('no initial value')
		initial = stream.head
		stream = stream.tail
	}
	return innerReduce(initial, stream, fn)
})

/**
 * a version of reduce which gets to assume it gets
 * passed and initial value
 *
 * @param {Any} curr
 * @param {Stream} stream
 * @param {Function} accum
 * @return {Any}
 * @api private
 */

var innerReduce = lift(function(curr, stream, accum){
	if (stream === emptyStream) return curr
	return innerReduce(when(stream.head, function(value){
		return accum(curr, value)
	}), stream.tail, accum)
})

/**
 * get the `n`th item in `stream`
 *
 * @param {Number} n
 * @param {Stream} stream
 * @return {Any}
 */

var item = lift(function(n, stream){
	if (n === 0) return stream.head
	return when(stream.tail, function(tail){
		return item(n - 1, tail)
	})
})

/**
 * ensure `stream` ends after `n` nodes
 *
 * @param {Number} n
 * @param {Stream} stream
 * @return {Stream}
 */

var limit = lift(function(n, stream){
	if (n === 0) return emptyStream
	if (this === emptyStream) return this
	return new Stream(stream.head, limit(n - 1, stream.tail))
})

Stream.prototype.each = function(fn, ctx){
	return each.plain(this, fn, ctx)
}

Stream.prototype.take = function(n){
	return limit.plain(n, this)
}

Stream.prototype.item = function(n){
	return item.plain(n, this)
}

Stream.prototype.reduce = function(fn, initial){
	return reduce(this, fn, initial)
}

lazy(Stream.prototype, 'length', function(){
	return reduce(this, inc, 0)
})

Stream.prototype.map = function(f){
	if (this === emptyStream) return this
	return new Stream(
		when(this.head, f),
		when(this.tail, function(tail){
			return tail.map(f)
		})
	)
}

Stream.prototype.add = function(s){
	return this.combine(add, s)
}

function inc(n){
	return n + 1
}

function add(x, y){
	return x + y
}

Stream.prototype.toArray = function(){
	return this.reduce(function(array, item){
		array.push(item)
		return array
	}, [])
}

Stream.prototype.append = function(b){
	if (this === emptyStream) return b
	return new Stream(
		this.head,
		when(this.tail, function(tail){
			return tail.append(b)
		})
	)
}

Stream.prototype.combine = function(fn, that){
	if (this === emptyStream) return that
	if (that === emptyStream) return this
	return new Stream(
		s(fn, this.head, that.head),
		s(function(a, b){
			return a.combine(fn, b)
		}, this.tail, that.tail)
	)
}

Stream.prototype.concatmap = function(fn){
	return this.reduce(function(a, x){
		return a.append(fn(x))
	}, new Stream)
}

Stream.prototype.sum = function(){
	return this.reduce(add, 0)
}

Stream.prototype.scale = function(factor){
	return this.map(function(x){
		return factor * x
	})
}

Stream.prototype.filter = function(ok){
	return Stream.filter(ok, this)
}

Stream.filter = lift(function filter(ok, stream){
	if (stream === emptyStream) return stream
	return s(function(val, tail){
		return ok(val)
			? new Stream(val, filter(ok, tail))
			: filter(ok, tail)
	}, stream.head, stream.tail)
})

Stream.prototype.drop = function(n){
	if (this === emptyStream) return this
	if (n === 0) return this
	return when(this.tail, function(tail){
		return tail.drop(n - 1)
	})
}

Stream.prototype.member = function(x){
	return this.reduce(function(yes, cand){
		return yes || x === cand
	})
}

Stream.prototype.print = function(n){
	var target = typeof n == 'number'
		?	this.take(n)
		: this
	return target.each(function(x) {
		console.log(x)
	})
}

Stream.prototype.toString = function(){
	if (this === emptyStream) return '[stream null]'
	return '[stream ' + this.reduce(function(a, b){
		return a + ',' + b
	}) + ']'
}

Stream.each = each
Stream.reduce = reduce
Stream.item = item
Stream.limit = limit

Stream.ones = function(){
	return new Stream(1, defer(Stream.ones))
}

Stream.ints = function(){
	var n = 1
	function next(){
		return new Stream(n++, defer(next))
	}
	return next()
}

/**
 * create a Stream containing `arguments`
 *
 * @param {Any} ...
 * @return {Stream}
 */

Stream.make = function(){
	return Stream.fromArray(arguments)
}

/**
 * create a Stream from an Array
 *
 * @param {Array} array
 * @return {Stream}
 */

Stream.fromArray = function(array) {
	var stream = emptyStream
	var i = array.length
	while (i--) stream = new Stream(array[i], stream)
	return stream
}

/**
 * create a stream of numbers from `low` to `high`. If
 * `high` is ommited then the stream will be Infinite
 *
 * @param {Number} low
 * @param {Number} [high]
 * @return {Stream}
 */

Stream.range = function(low, high){
	if (low == null) low = 1
	if (low == high) return new Stream(low)
	// if high is undefined, there won't be an upper bound
	return new Stream(low, defer(function next(){
		return Stream.range(low + 1, high)
	}))
}

/**
 * check if stream `a` is equivilent to `b`
 *
 * @param {Stream} a
 * @param {Stream} b
 * @return {Boolean}
 */

Stream.equals = lift(function(a, b){
	if (a === emptyStream) return b === emptyStream
	if (b === emptyStream) return false
	return s(function(av, bv){
		if (av !== bv) return false
		return Stream.equals(a.tail, b.tail)
	}, a.head, b.head)
})
