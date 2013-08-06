
var defer = require('result/defer')
var Result = require('result')
var finalize = require('weak')
var Stream = require('./')
var fs = require('fs')

module.exports = function(file, size){
	var result = new Result
	fs.open(file, 'r', function(e, fd){
		finalize(result.ref = {
			fd: fd,
			cursor: 0,
			size: size || 100
		}, cleanup)
		next.call(result)
	})
	return result
}

function next(){
	var chunk = this
	var ref = this.ref
	var n = ref.size
	this.ref = undefined
	fs.read(ref.fd, new Buffer(n), 0, n, ref.cursor, function(e, bytes, buf){
		if (e) {
			cleanup(ref, function(){
				chunk.error(e)
			})
		} else if (bytes < n) {
			cleanup(ref, function(e){
				if (e) chunk.error(e)
				else chunk.write(new Stream(buf.slice(0, bytes)))
			})
		} else {
			var tail = defer(next)
			ref.cursor += bytes
			tail.ref = ref
			chunk.write(new Stream(buf, tail))
		}
	})
}

function cleanup(file, fn){
	if (file.closed) return fn && fn(null)
	file.closed = true
	fs.close(file.fd, fn)
}