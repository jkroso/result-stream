
var read = require('../read-file')
var Stream = require('../')

Stream.reduce(read(__filename), function(str, chunk){
	return str + chunk
}, '').read(function(file){
	console.log(file.replace(/\n/g, '\n\t'))
})
