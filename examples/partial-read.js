#!/usr/bin/env node --expose_gc --trace_gc --trace_gc_verbose --trace_gc_ignore_scavenger

var read = require('../read-file')
var Stream = require('../')

Stream.item(2, read(__filename)).read(function(src){
	console.log(src+'')
	setTimeout(gc, 0)
})
