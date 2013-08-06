
var Stream = require('..')

var ints = new Stream(1, new Stream(2, new Stream(3)))

console.log(ints.item(0))
console.log(ints.item(1))
console.log(ints.item(2))
ints.print()