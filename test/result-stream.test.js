
var chai = require('./chai')
var is = chai.assert
var LazyStream = require('../lazy')
var Result = require('result')
var when = require('when')
var Stream = require('..')
var emptyStream = Stream.nil

describe('result-stream', function(){
	describe('Stream#head()', function(){
		it('should return the streams value', function(){
			new Stream(1).head().should.equal(1)
		})
	})

	describe('Stream#tail()', function(){
		it('should return the next stream node', function(){
			var tail = new Stream(2)
			new Stream(1, tail).tail().should.equal(tail)
		})
	})

	describe('the empty stream', function(){
		it('should throw when read', function(){
			(function(){
				emptyStream.head()
			}).should.throw()
		})

		it('should throw when accessing tail', function(){
			(function(){
				emptyStream.tail()
			}).should.throw()
		})
	})

	common(Stream)
})

function common(Stream){
	var ints
	var spy
	beforeEach(function(){
		ints = Stream.make(delay(1), 2, delay(3))
		spy = chai.spy()
	})

	function add(a, b){
		a.should.be.a('number')
		b.should.be.a('number')
		return a + b
	}

	function inc(n){
		n.should.be.a('number')
		return n + 1
	}

	describe('Stream#forEach()', function(){
		it('should iterate over each value', function(done){
			spy = chai.spy(inc)
			emptyStream.each(spy)
			spy.should.not.have.been.called
			ints.each(spy).then(function(){
				spy.should.have.been.called(3)
			}).node(done)
		})
	})

	describe('Stream#reduce()', function(){
		it('should reduce over each value', function(done){
			emptyStream.reduce(spy, 0)
			spy.should.not.have.been.called
			ints.reduce(add, 0).then(is.equal(6)).node(done)
		})

		it('should handle missing intial values', function(done){
			emptyStream.reduce(add).read(null, function(e){
				is.ok(e)
				ints.reduce(add).then(is.equal(6)).node(done)
			})
		})
	})

	describe('Stream#length()', function(){
		it('should return the number of items in the stream', function(done){
			is.equal(emptyStream.length(), 0)
			is.equal(ints.length(), 3).node(done)
		})
	})

	describe('Stream#item()', function(){
		it('should return the value of the nth item', function(done){
			is.equal(ints.item(2), 3).node(done)
		})
	})

	describe('Stream#map()', function(){
		it('should create a new stream mapped with `fn`', function(done){
			is.equal(ints.map(inc).reduce(add), 9).node(done)
		})

		it('should noop on emptyStream', function(){
			emptyStream.map(inc).should.equal(emptyStream)
		})
	})

	describe('Stream#member(el)', function(){
		it('should test for `el`', function(done){
			is.ok(ints.member(2)).node(done)
		})
	})

	describe('Stream#filter()', function(){
		it('should create a filtered stream', function(done){
			ints.filter(function(n){
				return n % 2 === 0
			}).then(function(ints){
				return is.deepEqual(ints.toArray(), [2])
			}).node(done) 
		})
	})

	describe('Stream#append(a, b)', function(){
		it('should create a new Stream with `b` at the end', function(done){
			var b = Stream.make(delay(4), 5)
			when(is.equal(ints.append(b).item(4), 5), done, done)
		})
	})

	describe('Stream#toArray()', function(){
		it('should return an array', function(done){
			is.deepEqual(ints.toArray(), [1, 2, 3]).node(done)
		})
	})

	describe('Stream#add()', function(){
		it('should combine streams a and b', function(done){
			is.equal(ints.add(ints).sum(), 12).node(done)
		})
	})

	describe('Stream#drop(n)', function(){
		it('should drop `n` values from the front of the stream', function(done){
			is.deepEqual(ints.drop(2).toArray(), [3]).node(done)
		})
	})

	describe('Stream.ones', function(){
		it('should return an Infinite stream of ones', function(){
			is.deepEqual(Stream.ones().take(4).toArray(), [1,1,1,1])
		})
	})

	describe('Stream.ints', function(){
		it('should return a Infinite stream of positive ints', function(){
			is.deepEqual(Stream.ints().take(5).toArray(), [1,2,3,4,5])
		})
	})

	describe('Stream.make', function(){
		it('should make a stream from arguments', function(){
			is.deepEqual(Stream.make(1,2,3).toArray(), [1,2,3])
		})
	})

	describe('Stream.range', function(){
		it('should make a stream of ints from `low` to `high`', function(){
			is.deepEqual(Stream.range(1,3).toArray(), [1,2,3])
		})
		
		it('max defaults to Infinity', function(){
			is.deepEqual(Stream.range(10).take(2).toArray(), [10,11])
		})
		
		it('defaults to the natural numbers', function(){
			is.deepEqual(Stream.range().take(2).toArray(), [1,2])
		})
	})

	describe('Stream.equals', function(){
		it('should compare stream', function(done){
			is.ok(Stream.equals(Stream.range(1,3), ints)).node(done)
		})
	})
}

describe('lazy-stream', function(){
	common(LazyStream)
})

if (typeof process != 'undefined') describe('read-file', function(){
	var read = require('../read-File')
	var fs = require('fs')
	var reduce = Stream.reduce
	var file = fs.readFileSync(__filename, 'utf8')

	it('should return a stream of Buffer chunks', function(done){
		is.equal(
			reduce(read(__filename), function(str, chunk){
				chunk.should.be.an.instanceOf(Buffer)
				return str + chunk
			}, ''),
			file
		).node(done)
	})

	it('should allow custom chunk sizes', function(done){
		var last = false
		is.equal(
			reduce(read(__filename, 200), function(str, chunk){
				last.should.be.false
				if (chunk.length < 200) last = true
				else chunk.should.have.a.lengthOf(200)
				return str + chunk
			}, ''),
			file
		).node(done)
	})

	it('should support partial reads', function(done){
		read(__filename, 2).then(function(stream){
			return is.equal(stream.head(), file.slice(0, 2))
		}).node(done)
	})
})

function delay(value){
	var result = new Result
	setTimeout(function(){
		if (value instanceof Error) result.error(value)
		else result.write(value)
	})
	return result
}