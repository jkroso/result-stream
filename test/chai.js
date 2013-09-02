
var lift = require('lift-result')
var curry = require('curryable')
var chai = require('chai')

global.should = chai.should()
global.expect = chai.expect
global.assert = chai.assert
chai.use(require('chai-spies'))

var assert = global.assert
for (var k in assert) {
	var fn = assert[k]
	assert[k] = curry(lift(fn), fn.length - 1)
}

chai.Assertion.includeStack = true

module.exports = chai