const handleCallback = (resolve, reject, callback, r) => {
  try {
    resolve(callback(r));
  } catch (e) {
    reject(e);
  }
};
const promise = Symbol('promise');
const oncancel = Symbol('canceler');
Symbol.childPromise = Symbol('Symbol.childPromise');

export default class CancelablePromise {
  static all(iterable) {
    return new CancelablePromise((y, n) => {
      Promise.all(iterable).then(y, n);
    });
  }

  static race(iterable) {
    return new CancelablePromise((y, n) => {
      Promise.race(iterable).then(y, n);
    });
  }

  static reject(value) {
    return new CancelablePromise((y, n) => {
      Promise.reject(value).then(y, n);
    });
  }

  static resolve(value) {
    return new CancelablePromise((y, n) => {
      Promise.resolve(value).then(y, n);
    });
  }

  constructor(executor, canceler) {
    this[Symbol.childPromise] = this.constructor;
    this[promise] = new Promise(executor);
    this[oncancel] = canceler;
    Object.defineProperty(this, 'canceled', {
      value: false,
      configurable: true
    });
  }

  then(success, error) {
    const p = new this[Symbol.childPromise]((resolve, reject) => {
      this[promise].then(
        r => {
          if (this.canceled) {
            p.cancel();
          }
          if (success && !this.canceled) {
            handleCallback(resolve, reject, success, r);
          } else {
            resolve(r);
          }
        },
        r => {
          if (this.canceled) {
            p.cancel();
          }
          if (error && !this.canceled) {
            handleCallback(resolve, reject, error, r);
          } else {
            reject(r);
          }
        }
      );
    });
    return p;
  }

  catch(error) {
    return this.then(undefined, error);
  }

  cancel(...args) {
    if(!this.canceled) {
      this[oncancel](...args);
      Object.defineProperty(this, 'canceled', {
        value: true
      });
      return true;
    } else return false;
  }
}
