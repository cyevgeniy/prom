let promisesAplusTests = require("promises-aplus-tests")
let {resolved, rejected, deferred } = require('./prom.js')


promisesAplusTests({resolved, rejected, deferred}, function (err) {
  console.log('All done!')
});
