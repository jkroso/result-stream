#!/usr/bin/env node --expose_gc --trace_gc --trace_gc_verbose --trace_gc_ignore_scavenger

var read = require('../read-file')
var Stream = require('../')

Stream.item(0, read(__filename, 2)).read(function(src){
	console.log('is executable = %s', '#!' == src)
	// if you put logging statements in the file
	// readers garbage collection hook you should
	// see it is called before the process exits.
	// This means we were able to read just the first
	// chunk of the stream without any memory or
	// resource leaks
	setTimeout(gc) // force garbage collection
})