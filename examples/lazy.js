
var defer = require('result/defer')
var Stream = require('..')

var n = 0
function ints(){
	return new Stream(++n, defer(ints))
}

ints().take(9).print().read()