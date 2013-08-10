
var inherit = require('inherit')
var when = require('when')
var Stream = require('./')
var emptyStream = Stream.nil
var call = Function.call

inherit(LazyStream, Stream)

module.exports = LazyStream

function LazyStream(head, makeTail){
	this.value = head
	if (makeTail) this.makeTail = makeTail 
	else this._tail = emptyStream
}

LazyStream.prototype.head = function(){
	return this.value
}

LazyStream.prototype.tail = function(){
	if (this._tail) return this._tail
	return this._tail = this.makeTail()
}

LazyStream.prototype.append = function(b){
	if (this === emptyStream) return b
	var a = this
	return new LazyStream(this.value, function(){
		return when(a.tail(), function(tail){
			return tail.append(b)
		})
	})
}

LazyStream.ones = function(){
	return new LazyStream(1, LazyStream.ones)
}

LazyStream.ints = function(){
	return new LazyStream(1, function inc(){
		return new LazyStream(this.value + 1, inc)
	})
}

LazyStream.make = function(){
	if (!arguments.length) return emptyStream
	var args = arguments
	return new LazyStream(args[0], function(){
		return call.apply(LazyStream.make, args)
	})
}

LazyStream.fromArray = function(array) {
	if (!array.length) return emptyStream
	return new LazyStream(array[0], function(){
		return LazyStream.fromArray(array.slice(1))
	})
}

LazyStream.range = function(low, high){
	if (low == null) low = 1
	if (low == high) return new LazyStream(low)
	// if high is undefined, there won't be an upper bound
	return new LazyStream(low, function(){
		return LazyStream.range(low + 1, high)
	})
}

LazyStream.equals = Stream.equals