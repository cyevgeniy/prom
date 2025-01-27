"use strict";

const PENDING = 1
const FULFILLED = 2
const REJECTED = 3

function isFunction(x) {
  return x && typeof x === 'function'
}

function isObject(x) {
  return x && typeof x === 'object'
}

function runAsync(fn) {
  setTimeout(fn, 0)
}

class Prom {
  constructor(fn) {
    // Initially, promise is in pending state
    this.state = PENDING
    this.value = undefined
    this.fulfillQueue = []
    this.rejectQueue = []

    const self = this

    if (fn) {
      fn((value) => {
          resolvePromise(self, value);
      }, (reason)  => {
          self.reject(reason);
      });
    }  
  }

  setState(state, value) {
    if (this.state !== PENDING) return

    this.state = state
    this.value = value

    this.processQueue()
  }

  fulfill(value) {
    this.setState(FULFILLED, value)
  }

  reject(reason) {
   this.setState(REJECTED, reason)
  }

  then(onFulfilled, onRejected) {
    const prom = new Prom()

    this.fulfillQueue.push({promise: prom, fn: isFunction(onFulfilled) ? onFulfilled : undefined})
    this.rejectQueue.push({promise: prom, fn: isFunction(onRejected) ? onRejected : undefined})

    this.processQueue()

    return prom
  }

  processQueue() {
    if (this.state === PENDING) return

    const toProcess = this.state === FULFILLED ? this.fulfillQueue : this.rejectQueue

    const self = this

    for(;toProcess.length > 0;) {
      const item = toProcess.shift()

      let toRun
      if (self.state === FULFILLED) {
        toRun = item.fn === undefined ? (val) => val : item.fn
      }

      if (self.state === REJECTED) {
        toRun = item.fn === undefined ? (reason) => {throw reason} : item.fn
      }

      self.execCallback(item.promise, toRun)
    }
  }

  execCallback(promise, fn) {
    const self = this
    runAsync(() => {
      try {
        const x = fn.call(undefined, self.value)
        resolvePromise(promise, x)
      } catch(e) {
        promise.reject(e)
      }
    })
  }
}

function resolvePromise(promise, x) {
  if (promise === x)
    promise.reject(new TypeError('New type error'))

  if (x instanceof Prom) {
    x.then(
      resolve => {
        promise.fulfill(resolve)
      },
      reject => {
        promise.reject(reject)
      }
    )

    return
  }

  if (isObject(x) || isFunction(x)) {
    let then

    try {
      then = x.then
    } catch(e) {
      promise.reject(e)
      return
    }

    if (isFunction(then)) {
      let called = false
      try {
        then.call(
          x,
          y => {
            if (called) return

            resolvePromise(promise, y)
            called = true
          },
          r => {
            if (called) return

            promise.reject(r)
            called = true
          }
        )
      } catch(e) {
        if (!called)
          promise.reject(e)
      }
    } else {
      promise.fulfill(x)
    }
  } else {
    promise.fulfill(x)
  }
}

module.exports = {
  Prom: Prom,
  deferred: function () {
    var resolve, reject;

    return {
        promise: new Prom(function (rslv, rjct) {
            resolve = rslv;
            reject = rjct;
        }),
        resolve: resolve,
        reject: reject
    };
}
}
