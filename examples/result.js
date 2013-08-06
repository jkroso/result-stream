
var Stream = require('..')
var Result = require('result')

function delay(value){
	var result = new Result
	setTimeout(function(){
		result.write(value)
	}, Math.random() * 10)
	return result
}

new Stream(delay(1), delay(new Stream(2, new Stream(delay(3))))).print().read()