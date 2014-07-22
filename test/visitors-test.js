/*
 * Test visitors API
 */

var assert = require('should');
var db = require('../database');
var routes = process.env['LOBBY_APP_COV'] ? require('../routes-cov') : require('../routes/visitors');

describe('routes:', function() {

  describe('company_info()', function() {
    it("should provide a title and the index view name", function(done) {
    	console.log('implement this');
    })
  })
})