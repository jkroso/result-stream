
var s = require('when/apply').sexpr
var lift = require('when/decorate')
var defer = require('result/defer')
var Result = require('result')
var when = require('when')

var call = Function.call

module.exports = Stream

function Stream(head, tail){
	this.value = head
	this._tail = tail || emptyStream
}

Stream.prototype.head = function(){
	return this.value
}

Stream.prototype.tail = function(){
	return this._tail
}

var emptyStream = new Stream

emptyStream.head = function(){
	throw new Error('Can\'t get the head of the empty stream')	
}

emptyStream.tail = function(){
	throw new Error('Can\'t get the tail of the empty stream')
}

Stream.nil = emptyStream

Stream.prototype.empty = function(){
	return this === emptyStream
}

var each = lift(function(stream, fn, ctx){
	if (stream !== emptyStream) {
		return when(stream.value, function(value){
			fn.call(ctx, value)	
			return each(stream.tail(), fn, ctx)
		})
	}
})

var reduce = lift(function(stream, fn, initial){
	if (initial === undefined) {
		if (stream === emptyStream) throw new Error('no initial value')
		initial = stream.value
		stream = stream.tail()
	}
	return innerReduce(initial, stream, fn)
})

var innerReduce = lift(function(curr, stream, accum){
	if (stream === emptyStream) return curr
	return innerReduce(when(stream.value, function(value){
		return accum(curr, value)
	}), stream.tail(), accum)
})

var item = lift(function(n, stream){
	if (n === 0) return stream.head()
	return when(stream.tail(), function(tail){
		return item(n - 1, tail)
	})
})

var limit = lift(function(n, stream){
	if (n === 0) return emptyStream
	if (this === emptyStream) return this
	return new Stream(stream.value, limit(n - 1, stream.tail()))
})

Stream.prototype.each = function(fn, ctx){
	return each(this, fn, ctx)
}

Stream.prototype.take = function(n){
	return limit(n, this)
}

Stream.prototype.item = function(n){
	return item(n, this)
}

Stream.prototype.reduce = function(fn, initial){
	return reduce(this, fn, initial)
}

Stream.prototype.length = function(){
	return reduce(this, inc, 0)
}

Stream.prototype.map = function(f){
	if (this === emptyStream) return this
	return new Stream(
		when(this.value, f),
		when(this.tail(), function(tail){
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
		this.value,
		when(this.tail(), function(tail){
			return tail.append(b)
		})
	)
}

Stream.prototype.combine = function(fn, that){
	if (this === emptyStream) return that
	if (that === emptyStream) return this
	return new Stream(
		s(fn, this.value, that.value),
		s(function(a, b){
			return a.combine(fn, b)
		}, this.tail(), that.tail())
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
	if (this === emptyStream) return this
	return s(function(val, tail){
		return ok(val)
			? new Stream(val, tail.filter(ok))
			: tail.filter(ok)
	}, this.value, this.tail())
}

Stream.prototype.drop = function(n){
	if (this === emptyStream) return this
	if (n === 0) return this
	return when(this.tail(), function(tail){
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

Stream.make = function(){
	if (!arguments.length) return emptyStream
	return new Stream(arguments[0], call.apply(Stream.make, arguments))
}

Stream.fromArray = function(array) {
	if (!array.length) return emptyStream
	return new Stream(array[0], Stream.fromArray(array.slice(1)))
}

Stream.range = function(low, high){
	if (low == null) low = 1
	if (low == high) return new Stream(low)
	// if high is undefined, there won't be an upper bound
	return new Stream(low, defer(function next(){
		return Stream.range(low + 1, high)
	}))
}

Stream.equals = lift(function(a, b){
	if (!(a instanceof Stream)) return false
	if (!(b instanceof Stream)) return false
	if (a === emptyStream) return b === emptyStream
	if (b === emptyStream) return false
	return s(function(av, bv){
		if (av !== bv) return false
		return Stream.equals(a.tail(), b.tail())
	}, a.value, b.value)
})