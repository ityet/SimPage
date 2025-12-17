
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname as __pathDirname } from 'path';

// Global variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
const require = createRequire(import.meta.url);

// Global require function
globalThis.require = require;
globalThis.__filename = __filename;
globalThis.__dirname = __dirname;

// Dynamic require handler
globalThis.__dynamicRequire = function(id) {
  try {
    return require(id);
  } catch (err) {
    if (err.code === 'ERR_REQUIRE_ESM') {
      // If the module is ESM, try using import()
      return import(id);
    }
    throw err;
  }
};

// Fix Buffer
if (typeof Buffer === 'undefined') {
  globalThis.Buffer = require('buffer').Buffer;
}

// Fix process
if (typeof process === 'undefined') {
  globalThis.process = require('process');
}

// Fix util.promisify
if (!Symbol.for('nodejs.util.promisify.custom')) {
  Symbol.for('nodejs.util.promisify.custom');
}


  
  
// ===== Fetch Proxy Injection (Production Mode Only) =====
// Inject fetch-proxy to intercept fetch calls
import __fetchProxyCrypto from 'node:crypto';

(function() {
  const __originalFetch = globalThis.fetch;

const uuid = '{{PAGES_PROXY_UUID}}';
const proxyHost = '{{PAGES_PROXY_HOST}}';

function _fetch(
  request,
  requestInit = {},
) {
  const { host } = getUrl(request);
  const cache = getHostCache(host);
  // if (cache && cache.needProxy && cache.expires > Date.now()) {
    setHostCache(host);
    return fetchByProxy(request, requestInit);
  // }
  // return fetchByOrigin(request, requestInit);
}

function getUrl(request) {
  const req = new Request(request);
  const url = new URL(req.url);
  return url;
}

function getHostCache(host) {
  return new Map(globalThis._FETCHCACHES || []).get(host);
}

function setHostCache(host) {
  const value = {
    needProxy: true,
    expires: Date.now() + 1000 * 60 * 60,
  };
  if (globalThis._FETCHCACHES) {
    globalThis._FETCHCACHES.set(host, value);
  } else {
    const cache = new Map([[host, value]]);
    Object.defineProperty(globalThis, '_FETCHCACHES', {
      value: cache,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

function bufferToHex(arr) {
  return Array.prototype.map
    .call(arr, (x) => (x >= 16 ? x.toString(16) : '0' + x.toString(16)))
    .join('');
}

function generateSign({ pathname, oeTimestamp }) {
  return md5(oeTimestamp+'-'+pathname+'-'+uuid);
}

async function generateHeaders(request) {
  const { host, pathname } = getUrl(request);
  const timestamp = Date.now().toString();
  const sign = generateSign({ pathname, oeTimestamp: timestamp });
  return {
    host,
    timestamp,
    sign,
  };
}

// MD5 hash function for Node.js environment
// Node.js crypto.subtle.digest doesn't support MD5, so we use crypto.createHash instead
// Note: __fetchProxyCrypto is imported at the top level using ESM import
function md5(text) {
  const hash = __fetchProxyCrypto.createHash('md5');
  hash.update(text, 'utf8');
  return hash.digest('hex');
}

/**
 * Try to request using the native fetch; if it fails, request via the proxy
 * @returns
 */
async function fetchByOrigin(
  request,
  requestInit = {},
) {
  try {
    const res = await __originalFetch(request, {
      eo: {
        timeoutSetting: {
          connectTimeout: 500,
        },
      },
      ...requestInit,
    });
    if (res.status > 300 || res.status < 200) throw new Error('need proxy');
    return res;
  } catch (error) {
    const { host } = getUrl(request);
    setHostCache(host);
    return fetchByProxy(request, requestInit);
  }
}

/**
 * Request via AI proxy
 * @returns
 */
async function fetchByProxy(
  request,
  requestInit,
) {
  const options = {};
  if (requestInit) {
    Object.assign(options, requestInit || {});
  }
  options.headers = new Headers(options.headers || {});
  const { host, timestamp, sign } = await generateHeaders(request);
  options.headers.append('oe-host', host);
  options.headers.append('oe-timestamp', timestamp);
  options.headers.append('oe-sign', sign);
  const originReq = new Request(request);
  const req = new Request(originReq.url.replace(host, proxyHost), {
    method: originReq.method,
    headers: originReq.headers,
    body: originReq.body,
  });
  return __originalFetch(req, options);
}
// Replace global fetch with _fetch from fetch-proxy
  if (typeof _fetch === 'function') {
    globalThis.fetch = _fetch;
    // Store original fetch for internal use
    globalThis.__originalFetch = __originalFetch;
  } else {
    console.warn('[runtime-shim] _fetch function not found, using original fetch');
  }
})();


  


var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var require_stdin = __commonJS({
  "<stdin>"(exports, module) {
    var _e, _t, _a;
    var hs = Object.create;
    var he = Object.defineProperty;
    var us = Object.getOwnPropertyDescriptor;
    var ds = Object.getOwnPropertyNames;
    var ps = Object.getPrototypeOf, gs = Object.prototype.hasOwnProperty;
    var b = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports), _s = (t, e) => {
      for (var s in e)
        he(t, s, { get: e[s], enumerable: true });
    }, Je = (t, e, s, r) => {
      if (e && typeof e == "object" || typeof e == "function")
        for (let n of ds(e))
          !gs.call(t, n) && n !== s && he(t, n, { get: () => e[n], enumerable: !(r = us(e, n)) || r.enumerable });
      return t;
    };
    var Y = (t, e, s) => (s = t != null ? hs(ps(t)) : {}, Je(e || !t || !t.__esModule ? he(s, "default", { value: t, enumerable: true }) : s, t)), ms = (t) => Je(he({}, "__esModule", { value: true }), t);
    var P = b((fn, et) => {
      "use strict";
      var Ze = ["nodebuffer", "arraybuffer", "fragments"], Qe = typeof Blob < "u";
      Qe && Ze.push("blob");
      et.exports = { BINARY_TYPES: Ze, EMPTY_BUFFER: Buffer.alloc(0), GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", hasBlob: Qe, kForOnEventAttribute: Symbol("kIsForOnEventAttribute"), kListener: Symbol("kListener"), kStatusCode: Symbol("status-code"), kWebSocket: Symbol("websocket"), NOOP: () => {
      } };
    });
    var re = b((hn, ue) => {
      "use strict";
      var { EMPTY_BUFFER: ys } = P(), Ce = Buffer[Symbol.species];
      function Ss(t, e) {
        if (t.length === 0)
          return ys;
        if (t.length === 1)
          return t[0];
        let s = Buffer.allocUnsafe(e), r = 0;
        for (let n = 0; n < t.length; n++) {
          let i = t[n];
          s.set(i, r), r += i.length;
        }
        return r < e ? new Ce(s.buffer, s.byteOffset, r) : s;
      }
      function tt(t, e, s, r, n) {
        for (let i = 0; i < n; i++)
          s[r + i] = t[i] ^ e[i & 3];
      }
      function st(t, e) {
        for (let s = 0; s < t.length; s++)
          t[s] ^= e[s & 3];
      }
      function Es(t) {
        return t.length === t.buffer.byteLength ? t.buffer : t.buffer.slice(t.byteOffset, t.byteOffset + t.length);
      }
      function Pe(t) {
        if (Pe.readOnly = true, Buffer.isBuffer(t))
          return t;
        let e;
        return t instanceof ArrayBuffer ? e = new Ce(t) : ArrayBuffer.isView(t) ? e = new Ce(t.buffer, t.byteOffset, t.byteLength) : (e = Buffer.from(t), Pe.readOnly = false), e;
      }
      ue.exports = { concat: Ss, mask: tt, toArrayBuffer: Es, toBuffer: Pe, unmask: st };
      if (!process.env.WS_NO_BUFFER_UTIL)
        try {
          let t = require("bufferutil");
          ue.exports.mask = function(e, s, r, n, i) {
            i < 48 ? tt(e, s, r, n, i) : t.mask(e, s, r, n, i);
          }, ue.exports.unmask = function(e, s) {
            e.length < 32 ? st(e, s) : t.unmask(e, s);
          };
        } catch {
        }
    });
    var it = b((un, nt) => {
      "use strict";
      var rt = Symbol("kDone"), Ne = Symbol("kRun"), Ae = class {
        constructor(e) {
          this[rt] = () => {
            this.pending--, this[Ne]();
          }, this.concurrency = e || 1 / 0, this.jobs = [], this.pending = 0;
        }
        add(e) {
          this.jobs.push(e), this[Ne]();
        }
        [Ne]() {
          if (this.pending !== this.concurrency && this.jobs.length) {
            let e = this.jobs.shift();
            this.pending++, e(this[rt]);
          }
        }
      };
      nt.exports = Ae;
    });
    var ie = b((dn, ct) => {
      "use strict";
      var ne = require("zlib"), ot = re(), xs = it(), { kStatusCode: at } = P(), bs = Buffer[Symbol.species], ws = Buffer.from([0, 0, 255, 255]), pe = Symbol("permessage-deflate"), N = Symbol("total-length"), K = Symbol("callback"), R = Symbol("buffers"), X = Symbol("error"), de, Ie = class {
        constructor(e, s, r) {
          if (this._maxPayload = r | 0, this._options = e || {}, this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024, this._isServer = !!s, this._deflate = null, this._inflate = null, this.params = null, !de) {
            let n = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
            de = new xs(n);
          }
        }
        static get extensionName() {
          return "permessage-deflate";
        }
        offer() {
          let e = {};
          return this._options.serverNoContextTakeover && (e.server_no_context_takeover = true), this._options.clientNoContextTakeover && (e.client_no_context_takeover = true), this._options.serverMaxWindowBits && (e.server_max_window_bits = this._options.serverMaxWindowBits), this._options.clientMaxWindowBits ? e.client_max_window_bits = this._options.clientMaxWindowBits : this._options.clientMaxWindowBits == null && (e.client_max_window_bits = true), e;
        }
        accept(e) {
          return e = this.normalizeParams(e), this.params = this._isServer ? this.acceptAsServer(e) : this.acceptAsClient(e), this.params;
        }
        cleanup() {
          if (this._inflate && (this._inflate.close(), this._inflate = null), this._deflate) {
            let e = this._deflate[K];
            this._deflate.close(), this._deflate = null, e && e(new Error("The deflate stream was closed while data was being processed"));
          }
        }
        acceptAsServer(e) {
          let s = this._options, r = e.find((n) => !(s.serverNoContextTakeover === false && n.server_no_context_takeover || n.server_max_window_bits && (s.serverMaxWindowBits === false || typeof s.serverMaxWindowBits == "number" && s.serverMaxWindowBits > n.server_max_window_bits) || typeof s.clientMaxWindowBits == "number" && !n.client_max_window_bits));
          if (!r)
            throw new Error("None of the extension offers can be accepted");
          return s.serverNoContextTakeover && (r.server_no_context_takeover = true), s.clientNoContextTakeover && (r.client_no_context_takeover = true), typeof s.serverMaxWindowBits == "number" && (r.server_max_window_bits = s.serverMaxWindowBits), typeof s.clientMaxWindowBits == "number" ? r.client_max_window_bits = s.clientMaxWindowBits : (r.client_max_window_bits === true || s.clientMaxWindowBits === false) && delete r.client_max_window_bits, r;
        }
        acceptAsClient(e) {
          let s = e[0];
          if (this._options.clientNoContextTakeover === false && s.client_no_context_takeover)
            throw new Error('Unexpected parameter "client_no_context_takeover"');
          if (!s.client_max_window_bits)
            typeof this._options.clientMaxWindowBits == "number" && (s.client_max_window_bits = this._options.clientMaxWindowBits);
          else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits == "number" && s.client_max_window_bits > this._options.clientMaxWindowBits)
            throw new Error('Unexpected or invalid parameter "client_max_window_bits"');
          return s;
        }
        normalizeParams(e) {
          return e.forEach((s) => {
            Object.keys(s).forEach((r) => {
              let n = s[r];
              if (n.length > 1)
                throw new Error(`Parameter "${r}" must have only a single value`);
              if (n = n[0], r === "client_max_window_bits") {
                if (n !== true) {
                  let i = +n;
                  if (!Number.isInteger(i) || i < 8 || i > 15)
                    throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
                  n = i;
                } else if (!this._isServer)
                  throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
              } else if (r === "server_max_window_bits") {
                let i = +n;
                if (!Number.isInteger(i) || i < 8 || i > 15)
                  throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
                n = i;
              } else if (r === "client_no_context_takeover" || r === "server_no_context_takeover") {
                if (n !== true)
                  throw new TypeError(`Invalid value for parameter "${r}": ${n}`);
              } else
                throw new Error(`Unknown parameter "${r}"`);
              s[r] = n;
            });
          }), e;
        }
        decompress(e, s, r) {
          de.add((n) => {
            this._decompress(e, s, (i, o) => {
              n(), r(i, o);
            });
          });
        }
        compress(e, s, r) {
          de.add((n) => {
            this._compress(e, s, (i, o) => {
              n(), r(i, o);
            });
          });
        }
        _decompress(e, s, r) {
          let n = this._isServer ? "client" : "server";
          if (!this._inflate) {
            let i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ne.Z_DEFAULT_WINDOWBITS : this.params[i];
            this._inflate = ne.createInflateRaw({ ...this._options.zlibInflateOptions, windowBits: o }), this._inflate[pe] = this, this._inflate[N] = 0, this._inflate[R] = [], this._inflate.on("error", Ts), this._inflate.on("data", lt);
          }
          this._inflate[K] = r, this._inflate.write(e), s && this._inflate.write(ws), this._inflate.flush(() => {
            let i = this._inflate[X];
            if (i) {
              this._inflate.close(), this._inflate = null, r(i);
              return;
            }
            let o = ot.concat(this._inflate[R], this._inflate[N]);
            this._inflate._readableState.endEmitted ? (this._inflate.close(), this._inflate = null) : (this._inflate[N] = 0, this._inflate[R] = [], s && this.params[`${n}_no_context_takeover`] && this._inflate.reset()), r(null, o);
          });
        }
        _compress(e, s, r) {
          let n = this._isServer ? "server" : "client";
          if (!this._deflate) {
            let i = `${n}_max_window_bits`, o = typeof this.params[i] != "number" ? ne.Z_DEFAULT_WINDOWBITS : this.params[i];
            this._deflate = ne.createDeflateRaw({ ...this._options.zlibDeflateOptions, windowBits: o }), this._deflate[N] = 0, this._deflate[R] = [], this._deflate.on("data", vs);
          }
          this._deflate[K] = r, this._deflate.write(e), this._deflate.flush(ne.Z_SYNC_FLUSH, () => {
            if (!this._deflate)
              return;
            let i = ot.concat(this._deflate[R], this._deflate[N]);
            s && (i = new bs(i.buffer, i.byteOffset, i.length - 4)), this._deflate[K] = null, this._deflate[N] = 0, this._deflate[R] = [], s && this.params[`${n}_no_context_takeover`] && this._deflate.reset(), r(null, i);
          });
        }
      };
      ct.exports = Ie;
      function vs(t) {
        this[R].push(t), this[N] += t.length;
      }
      function lt(t) {
        if (this[N] += t.length, this[pe]._maxPayload < 1 || this[N] <= this[pe]._maxPayload) {
          this[R].push(t);
          return;
        }
        this[X] = new RangeError("Max payload size exceeded"), this[X].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH", this[X][at] = 1009, this.removeListener("data", lt), this.reset();
      }
      function Ts(t) {
        if (this[pe]._inflate = null, this[X]) {
          this[K](this[X]);
          return;
        }
        t[at] = 1007, this[K](t);
      }
    });
    var J = b((pn, ge) => {
      "use strict";
      var { isUtf8: ft } = require("buffer"), { hasBlob: ks } = P(), Os = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0];
      function Ls(t) {
        return t >= 1e3 && t <= 1014 && t !== 1004 && t !== 1005 && t !== 1006 || t >= 3e3 && t <= 4999;
      }
      function Be(t) {
        let e = t.length, s = 0;
        for (; s < e; )
          if (!(t[s] & 128))
            s++;
          else if ((t[s] & 224) === 192) {
            if (s + 1 === e || (t[s + 1] & 192) !== 128 || (t[s] & 254) === 192)
              return false;
            s += 2;
          } else if ((t[s] & 240) === 224) {
            if (s + 2 >= e || (t[s + 1] & 192) !== 128 || (t[s + 2] & 192) !== 128 || t[s] === 224 && (t[s + 1] & 224) === 128 || t[s] === 237 && (t[s + 1] & 224) === 160)
              return false;
            s += 3;
          } else if ((t[s] & 248) === 240) {
            if (s + 3 >= e || (t[s + 1] & 192) !== 128 || (t[s + 2] & 192) !== 128 || (t[s + 3] & 192) !== 128 || t[s] === 240 && (t[s + 1] & 240) === 128 || t[s] === 244 && t[s + 1] > 143 || t[s] > 244)
              return false;
            s += 4;
          } else
            return false;
        return true;
      }
      function Cs(t) {
        return ks && typeof t == "object" && typeof t.arrayBuffer == "function" && typeof t.type == "string" && typeof t.stream == "function" && (t[Symbol.toStringTag] === "Blob" || t[Symbol.toStringTag] === "File");
      }
      ge.exports = { isBlob: Cs, isValidStatusCode: Ls, isValidUTF8: Be, tokenChars: Os };
      if (ft)
        ge.exports.isValidUTF8 = function(t) {
          return t.length < 24 ? Be(t) : ft(t);
        };
      else if (!process.env.WS_NO_UTF_8_VALIDATE)
        try {
          let t = require("utf-8-validate");
          ge.exports.isValidUTF8 = function(e) {
            return e.length < 32 ? Be(e) : t(e);
          };
        } catch {
        }
    });
    var qe = b((gn, mt) => {
      "use strict";
      var { Writable: Ps } = require("stream"), ht = ie(), { BINARY_TYPES: Ns, EMPTY_BUFFER: ut, kStatusCode: As, kWebSocket: Is } = P(), { concat: Re, toArrayBuffer: Bs, unmask: Rs } = re(), { isValidStatusCode: Ds, isValidUTF8: dt } = J(), _e2 = Buffer[Symbol.species], v = 0, pt = 1, gt = 2, _t2 = 3, De = 4, Me = 5, me = 6, Ue = class extends Ps {
        constructor(e = {}) {
          super(), this._allowSynchronousEvents = e.allowSynchronousEvents !== void 0 ? e.allowSynchronousEvents : true, this._binaryType = e.binaryType || Ns[0], this._extensions = e.extensions || {}, this._isServer = !!e.isServer, this._maxPayload = e.maxPayload | 0, this._skipUTF8Validation = !!e.skipUTF8Validation, this[Is] = void 0, this._bufferedBytes = 0, this._buffers = [], this._compressed = false, this._payloadLength = 0, this._mask = void 0, this._fragmented = 0, this._masked = false, this._fin = false, this._opcode = 0, this._totalPayloadLength = 0, this._messageLength = 0, this._fragments = [], this._errored = false, this._loop = false, this._state = v;
        }
        _write(e, s, r) {
          if (this._opcode === 8 && this._state == v)
            return r();
          this._bufferedBytes += e.length, this._buffers.push(e), this.startLoop(r);
        }
        consume(e) {
          if (this._bufferedBytes -= e, e === this._buffers[0].length)
            return this._buffers.shift();
          if (e < this._buffers[0].length) {
            let r = this._buffers[0];
            return this._buffers[0] = new _e2(r.buffer, r.byteOffset + e, r.length - e), new _e2(r.buffer, r.byteOffset, e);
          }
          let s = Buffer.allocUnsafe(e);
          do {
            let r = this._buffers[0], n = s.length - e;
            e >= r.length ? s.set(this._buffers.shift(), n) : (s.set(new Uint8Array(r.buffer, r.byteOffset, e), n), this._buffers[0] = new _e2(r.buffer, r.byteOffset + e, r.length - e)), e -= r.length;
          } while (e > 0);
          return s;
        }
        startLoop(e) {
          this._loop = true;
          do
            switch (this._state) {
              case v:
                this.getInfo(e);
                break;
              case pt:
                this.getPayloadLength16(e);
                break;
              case gt:
                this.getPayloadLength64(e);
                break;
              case _t2:
                this.getMask();
                break;
              case De:
                this.getData(e);
                break;
              case Me:
              case me:
                this._loop = false;
                return;
            }
          while (this._loop);
          this._errored || e();
        }
        getInfo(e) {
          if (this._bufferedBytes < 2) {
            this._loop = false;
            return;
          }
          let s = this.consume(2);
          if (s[0] & 48) {
            let n = this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3");
            e(n);
            return;
          }
          let r = (s[0] & 64) === 64;
          if (r && !this._extensions[ht.extensionName]) {
            let n = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
            e(n);
            return;
          }
          if (this._fin = (s[0] & 128) === 128, this._opcode = s[0] & 15, this._payloadLength = s[1] & 127, this._opcode === 0) {
            if (r) {
              let n = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
              e(n);
              return;
            }
            if (!this._fragmented) {
              let n = this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE");
              e(n);
              return;
            }
            this._opcode = this._fragmented;
          } else if (this._opcode === 1 || this._opcode === 2) {
            if (this._fragmented) {
              let n = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
              e(n);
              return;
            }
            this._compressed = r;
          } else if (this._opcode > 7 && this._opcode < 11) {
            if (!this._fin) {
              let n = this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN");
              e(n);
              return;
            }
            if (r) {
              let n = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
              e(n);
              return;
            }
            if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
              let n = this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");
              e(n);
              return;
            }
          } else {
            let n = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
            e(n);
            return;
          }
          if (!this._fin && !this._fragmented && (this._fragmented = this._opcode), this._masked = (s[1] & 128) === 128, this._isServer) {
            if (!this._masked) {
              let n = this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK");
              e(n);
              return;
            }
          } else if (this._masked) {
            let n = this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK");
            e(n);
            return;
          }
          this._payloadLength === 126 ? this._state = pt : this._payloadLength === 127 ? this._state = gt : this.haveLength(e);
        }
        getPayloadLength16(e) {
          if (this._bufferedBytes < 2) {
            this._loop = false;
            return;
          }
          this._payloadLength = this.consume(2).readUInt16BE(0), this.haveLength(e);
        }
        getPayloadLength64(e) {
          if (this._bufferedBytes < 8) {
            this._loop = false;
            return;
          }
          let s = this.consume(8), r = s.readUInt32BE(0);
          if (r > Math.pow(2, 21) - 1) {
            let n = this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");
            e(n);
            return;
          }
          this._payloadLength = r * Math.pow(2, 32) + s.readUInt32BE(4), this.haveLength(e);
        }
        haveLength(e) {
          if (this._payloadLength && this._opcode < 8 && (this._totalPayloadLength += this._payloadLength, this._totalPayloadLength > this._maxPayload && this._maxPayload > 0)) {
            let s = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
            e(s);
            return;
          }
          this._masked ? this._state = _t2 : this._state = De;
        }
        getMask() {
          if (this._bufferedBytes < 4) {
            this._loop = false;
            return;
          }
          this._mask = this.consume(4), this._state = De;
        }
        getData(e) {
          let s = ut;
          if (this._payloadLength) {
            if (this._bufferedBytes < this._payloadLength) {
              this._loop = false;
              return;
            }
            s = this.consume(this._payloadLength), this._masked && this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3] && Rs(s, this._mask);
          }
          if (this._opcode > 7) {
            this.controlMessage(s, e);
            return;
          }
          if (this._compressed) {
            this._state = Me, this.decompress(s, e);
            return;
          }
          s.length && (this._messageLength = this._totalPayloadLength, this._fragments.push(s)), this.dataMessage(e);
        }
        decompress(e, s) {
          this._extensions[ht.extensionName].decompress(e, this._fin, (n, i) => {
            if (n)
              return s(n);
            if (i.length) {
              if (this._messageLength += i.length, this._messageLength > this._maxPayload && this._maxPayload > 0) {
                let o = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
                s(o);
                return;
              }
              this._fragments.push(i);
            }
            this.dataMessage(s), this._state === v && this.startLoop(s);
          });
        }
        dataMessage(e) {
          if (!this._fin) {
            this._state = v;
            return;
          }
          let s = this._messageLength, r = this._fragments;
          if (this._totalPayloadLength = 0, this._messageLength = 0, this._fragmented = 0, this._fragments = [], this._opcode === 2) {
            let n;
            this._binaryType === "nodebuffer" ? n = Re(r, s) : this._binaryType === "arraybuffer" ? n = Bs(Re(r, s)) : this._binaryType === "blob" ? n = new Blob(r) : n = r, this._allowSynchronousEvents ? (this.emit("message", n, true), this._state = v) : (this._state = me, setImmediate(() => {
              this.emit("message", n, true), this._state = v, this.startLoop(e);
            }));
          } else {
            let n = Re(r, s);
            if (!this._skipUTF8Validation && !dt(n)) {
              let i = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
              e(i);
              return;
            }
            this._state === Me || this._allowSynchronousEvents ? (this.emit("message", n, false), this._state = v) : (this._state = me, setImmediate(() => {
              this.emit("message", n, false), this._state = v, this.startLoop(e);
            }));
          }
        }
        controlMessage(e, s) {
          if (this._opcode === 8) {
            if (e.length === 0)
              this._loop = false, this.emit("conclude", 1005, ut), this.end();
            else {
              let r = e.readUInt16BE(0);
              if (!Ds(r)) {
                let i = this.createError(RangeError, `invalid status code ${r}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE");
                s(i);
                return;
              }
              let n = new _e2(e.buffer, e.byteOffset + 2, e.length - 2);
              if (!this._skipUTF8Validation && !dt(n)) {
                let i = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
                s(i);
                return;
              }
              this._loop = false, this.emit("conclude", r, n), this.end();
            }
            this._state = v;
            return;
          }
          this._allowSynchronousEvents ? (this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = v) : (this._state = me, setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", e), this._state = v, this.startLoop(s);
          }));
        }
        createError(e, s, r, n, i) {
          this._loop = false, this._errored = true;
          let o = new e(r ? `Invalid WebSocket frame: ${s}` : s);
          return Error.captureStackTrace(o, this.createError), o.code = i, o[As] = n, o;
        }
      };
      mt.exports = Ue;
    });
    var $e = b((mn, Et) => {
      "use strict";
      var { Duplex: _n } = require("stream"), { randomFillSync: Ms } = require("crypto"), yt = ie(), { EMPTY_BUFFER: Us, kWebSocket: qs, NOOP: Ws } = P(), { isBlob: Z, isValidStatusCode: Fs } = J(), { mask: St, toBuffer: W } = re(), T = Symbol("kByteLength"), $s = Buffer.alloc(4), ye = 8 * 1024, F, Q = ye, O = 0, js = 1, Gs = 2, We = class t {
        constructor(e, s, r) {
          this._extensions = s || {}, r && (this._generateMask = r, this._maskBuffer = Buffer.alloc(4)), this._socket = e, this._firstFragment = true, this._compress = false, this._bufferedBytes = 0, this._queue = [], this._state = O, this.onerror = Ws, this[qs] = void 0;
        }
        static frame(e, s) {
          let r, n = false, i = 2, o = false;
          s.mask && (r = s.maskBuffer || $s, s.generateMask ? s.generateMask(r) : (Q === ye && (F === void 0 && (F = Buffer.alloc(ye)), Ms(F, 0, ye), Q = 0), r[0] = F[Q++], r[1] = F[Q++], r[2] = F[Q++], r[3] = F[Q++]), o = (r[0] | r[1] | r[2] | r[3]) === 0, i = 6);
          let l;
          typeof e == "string" ? (!s.mask || o) && s[T] !== void 0 ? l = s[T] : (e = Buffer.from(e), l = e.length) : (l = e.length, n = s.mask && s.readOnly && !o);
          let c = l;
          l >= 65536 ? (i += 8, c = 127) : l > 125 && (i += 2, c = 126);
          let a = Buffer.allocUnsafe(n ? l + i : i);
          return a[0] = s.fin ? s.opcode | 128 : s.opcode, s.rsv1 && (a[0] |= 64), a[1] = c, c === 126 ? a.writeUInt16BE(l, 2) : c === 127 && (a[2] = a[3] = 0, a.writeUIntBE(l, 4, 6)), s.mask ? (a[1] |= 128, a[i - 4] = r[0], a[i - 3] = r[1], a[i - 2] = r[2], a[i - 1] = r[3], o ? [a, e] : n ? (St(e, r, a, i, l), [a]) : (St(e, r, e, 0, l), [a, e])) : [a, e];
        }
        close(e, s, r, n) {
          let i;
          if (e === void 0)
            i = Us;
          else {
            if (typeof e != "number" || !Fs(e))
              throw new TypeError("First argument must be a valid error code number");
            if (s === void 0 || !s.length)
              i = Buffer.allocUnsafe(2), i.writeUInt16BE(e, 0);
            else {
              let l = Buffer.byteLength(s);
              if (l > 123)
                throw new RangeError("The message must not be greater than 123 bytes");
              i = Buffer.allocUnsafe(2 + l), i.writeUInt16BE(e, 0), typeof s == "string" ? i.write(s, 2) : i.set(s, 2);
            }
          }
          let o = { [T]: i.length, fin: true, generateMask: this._generateMask, mask: r, maskBuffer: this._maskBuffer, opcode: 8, readOnly: false, rsv1: false };
          this._state !== O ? this.enqueue([this.dispatch, i, false, o, n]) : this.sendFrame(t.frame(i, o), n);
        }
        ping(e, s, r) {
          let n, i;
          if (typeof e == "string" ? (n = Buffer.byteLength(e), i = false) : Z(e) ? (n = e.size, i = false) : (e = W(e), n = e.length, i = W.readOnly), n > 125)
            throw new RangeError("The data size must not be greater than 125 bytes");
          let o = { [T]: n, fin: true, generateMask: this._generateMask, mask: s, maskBuffer: this._maskBuffer, opcode: 9, readOnly: i, rsv1: false };
          Z(e) ? this._state !== O ? this.enqueue([this.getBlobData, e, false, o, r]) : this.getBlobData(e, false, o, r) : this._state !== O ? this.enqueue([this.dispatch, e, false, o, r]) : this.sendFrame(t.frame(e, o), r);
        }
        pong(e, s, r) {
          let n, i;
          if (typeof e == "string" ? (n = Buffer.byteLength(e), i = false) : Z(e) ? (n = e.size, i = false) : (e = W(e), n = e.length, i = W.readOnly), n > 125)
            throw new RangeError("The data size must not be greater than 125 bytes");
          let o = { [T]: n, fin: true, generateMask: this._generateMask, mask: s, maskBuffer: this._maskBuffer, opcode: 10, readOnly: i, rsv1: false };
          Z(e) ? this._state !== O ? this.enqueue([this.getBlobData, e, false, o, r]) : this.getBlobData(e, false, o, r) : this._state !== O ? this.enqueue([this.dispatch, e, false, o, r]) : this.sendFrame(t.frame(e, o), r);
        }
        send(e, s, r) {
          let n = this._extensions[yt.extensionName], i = s.binary ? 2 : 1, o = s.compress, l, c;
          typeof e == "string" ? (l = Buffer.byteLength(e), c = false) : Z(e) ? (l = e.size, c = false) : (e = W(e), l = e.length, c = W.readOnly), this._firstFragment ? (this._firstFragment = false, o && n && n.params[n._isServer ? "server_no_context_takeover" : "client_no_context_takeover"] && (o = l >= n._threshold), this._compress = o) : (o = false, i = 0), s.fin && (this._firstFragment = true);
          let a = { [T]: l, fin: s.fin, generateMask: this._generateMask, mask: s.mask, maskBuffer: this._maskBuffer, opcode: i, readOnly: c, rsv1: o };
          Z(e) ? this._state !== O ? this.enqueue([this.getBlobData, e, this._compress, a, r]) : this.getBlobData(e, this._compress, a, r) : this._state !== O ? this.enqueue([this.dispatch, e, this._compress, a, r]) : this.dispatch(e, this._compress, a, r);
        }
        getBlobData(e, s, r, n) {
          this._bufferedBytes += r[T], this._state = Gs, e.arrayBuffer().then((i) => {
            if (this._socket.destroyed) {
              let l = new Error("The socket was closed while the blob was being read");
              process.nextTick(Fe, this, l, n);
              return;
            }
            this._bufferedBytes -= r[T];
            let o = W(i);
            s ? this.dispatch(o, s, r, n) : (this._state = O, this.sendFrame(t.frame(o, r), n), this.dequeue());
          }).catch((i) => {
            process.nextTick(Vs, this, i, n);
          });
        }
        dispatch(e, s, r, n) {
          if (!s) {
            this.sendFrame(t.frame(e, r), n);
            return;
          }
          let i = this._extensions[yt.extensionName];
          this._bufferedBytes += r[T], this._state = js, i.compress(e, r.fin, (o, l) => {
            if (this._socket.destroyed) {
              let c = new Error("The socket was closed while data was being compressed");
              Fe(this, c, n);
              return;
            }
            this._bufferedBytes -= r[T], this._state = O, r.readOnly = false, this.sendFrame(t.frame(l, r), n), this.dequeue();
          });
        }
        dequeue() {
          for (; this._state === O && this._queue.length; ) {
            let e = this._queue.shift();
            this._bufferedBytes -= e[3][T], Reflect.apply(e[0], this, e.slice(1));
          }
        }
        enqueue(e) {
          this._bufferedBytes += e[3][T], this._queue.push(e);
        }
        sendFrame(e, s) {
          e.length === 2 ? (this._socket.cork(), this._socket.write(e[0]), this._socket.write(e[1], s), this._socket.uncork()) : this._socket.write(e[0], s);
        }
      };
      Et.exports = We;
      function Fe(t, e, s) {
        typeof s == "function" && s(e);
        for (let r = 0; r < t._queue.length; r++) {
          let n = t._queue[r], i = n[n.length - 1];
          typeof i == "function" && i(e);
        }
      }
      function Vs(t, e, s) {
        Fe(t, e, s), t.onerror(e);
      }
    });
    var Ct = b((yn, Lt) => {
      "use strict";
      var { kForOnEventAttribute: oe, kListener: je } = P(), xt = Symbol("kCode"), bt = Symbol("kData"), wt = Symbol("kError"), vt = Symbol("kMessage"), Tt = Symbol("kReason"), ee = Symbol("kTarget"), kt = Symbol("kType"), Ot = Symbol("kWasClean"), A = class {
        constructor(e) {
          this[ee] = null, this[kt] = e;
        }
        get target() {
          return this[ee];
        }
        get type() {
          return this[kt];
        }
      };
      Object.defineProperty(A.prototype, "target", { enumerable: true });
      Object.defineProperty(A.prototype, "type", { enumerable: true });
      var $ = class extends A {
        constructor(e, s = {}) {
          super(e), this[xt] = s.code === void 0 ? 0 : s.code, this[Tt] = s.reason === void 0 ? "" : s.reason, this[Ot] = s.wasClean === void 0 ? false : s.wasClean;
        }
        get code() {
          return this[xt];
        }
        get reason() {
          return this[Tt];
        }
        get wasClean() {
          return this[Ot];
        }
      };
      Object.defineProperty($.prototype, "code", { enumerable: true });
      Object.defineProperty($.prototype, "reason", { enumerable: true });
      Object.defineProperty($.prototype, "wasClean", { enumerable: true });
      var te = class extends A {
        constructor(e, s = {}) {
          super(e), this[wt] = s.error === void 0 ? null : s.error, this[vt] = s.message === void 0 ? "" : s.message;
        }
        get error() {
          return this[wt];
        }
        get message() {
          return this[vt];
        }
      };
      Object.defineProperty(te.prototype, "error", { enumerable: true });
      Object.defineProperty(te.prototype, "message", { enumerable: true });
      var ae = class extends A {
        constructor(e, s = {}) {
          super(e), this[bt] = s.data === void 0 ? null : s.data;
        }
        get data() {
          return this[bt];
        }
      };
      Object.defineProperty(ae.prototype, "data", { enumerable: true });
      var zs = { addEventListener(t, e, s = {}) {
        for (let n of this.listeners(t))
          if (!s[oe] && n[je] === e && !n[oe])
            return;
        let r;
        if (t === "message")
          r = function(i, o) {
            let l = new ae("message", { data: o ? i : i.toString() });
            l[ee] = this, Se(e, this, l);
          };
        else if (t === "close")
          r = function(i, o) {
            let l = new $("close", { code: i, reason: o.toString(), wasClean: this._closeFrameReceived && this._closeFrameSent });
            l[ee] = this, Se(e, this, l);
          };
        else if (t === "error")
          r = function(i) {
            let o = new te("error", { error: i, message: i.message });
            o[ee] = this, Se(e, this, o);
          };
        else if (t === "open")
          r = function() {
            let i = new A("open");
            i[ee] = this, Se(e, this, i);
          };
        else
          return;
        r[oe] = !!s[oe], r[je] = e, s.once ? this.once(t, r) : this.on(t, r);
      }, removeEventListener(t, e) {
        for (let s of this.listeners(t))
          if (s[je] === e && !s[oe]) {
            this.removeListener(t, s);
            break;
          }
      } };
      Lt.exports = { CloseEvent: $, ErrorEvent: te, Event: A, EventTarget: zs, MessageEvent: ae };
      function Se(t, e, s) {
        typeof t == "object" && t.handleEvent ? t.handleEvent.call(t, s) : t.call(e, s);
      }
    });
    var Ge = b((Sn, Pt) => {
      "use strict";
      var { tokenChars: le } = J();
      function L(t, e, s) {
        t[e] === void 0 ? t[e] = [s] : t[e].push(s);
      }
      function Hs(t) {
        let e = /* @__PURE__ */ Object.create(null), s = /* @__PURE__ */ Object.create(null), r = false, n = false, i = false, o, l, c = -1, a = -1, f = -1, h = 0;
        for (; h < t.length; h++)
          if (a = t.charCodeAt(h), o === void 0)
            if (f === -1 && le[a] === 1)
              c === -1 && (c = h);
            else if (h !== 0 && (a === 32 || a === 9))
              f === -1 && c !== -1 && (f = h);
            else if (a === 59 || a === 44) {
              if (c === -1)
                throw new SyntaxError(`Unexpected character at index ${h}`);
              f === -1 && (f = h);
              let _ = t.slice(c, f);
              a === 44 ? (L(e, _, s), s = /* @__PURE__ */ Object.create(null)) : o = _, c = f = -1;
            } else
              throw new SyntaxError(`Unexpected character at index ${h}`);
          else if (l === void 0)
            if (f === -1 && le[a] === 1)
              c === -1 && (c = h);
            else if (a === 32 || a === 9)
              f === -1 && c !== -1 && (f = h);
            else if (a === 59 || a === 44) {
              if (c === -1)
                throw new SyntaxError(`Unexpected character at index ${h}`);
              f === -1 && (f = h), L(s, t.slice(c, f), true), a === 44 && (L(e, o, s), s = /* @__PURE__ */ Object.create(null), o = void 0), c = f = -1;
            } else if (a === 61 && c !== -1 && f === -1)
              l = t.slice(c, h), c = f = -1;
            else
              throw new SyntaxError(`Unexpected character at index ${h}`);
          else if (n) {
            if (le[a] !== 1)
              throw new SyntaxError(`Unexpected character at index ${h}`);
            c === -1 ? c = h : r || (r = true), n = false;
          } else if (i)
            if (le[a] === 1)
              c === -1 && (c = h);
            else if (a === 34 && c !== -1)
              i = false, f = h;
            else if (a === 92)
              n = true;
            else
              throw new SyntaxError(`Unexpected character at index ${h}`);
          else if (a === 34 && t.charCodeAt(h - 1) === 61)
            i = true;
          else if (f === -1 && le[a] === 1)
            c === -1 && (c = h);
          else if (c !== -1 && (a === 32 || a === 9))
            f === -1 && (f = h);
          else if (a === 59 || a === 44) {
            if (c === -1)
              throw new SyntaxError(`Unexpected character at index ${h}`);
            f === -1 && (f = h);
            let _ = t.slice(c, f);
            r && (_ = _.replace(/\\/g, ""), r = false), L(s, l, _), a === 44 && (L(e, o, s), s = /* @__PURE__ */ Object.create(null), o = void 0), l = void 0, c = f = -1;
          } else
            throw new SyntaxError(`Unexpected character at index ${h}`);
        if (c === -1 || i || a === 32 || a === 9)
          throw new SyntaxError("Unexpected end of input");
        f === -1 && (f = h);
        let p = t.slice(c, f);
        return o === void 0 ? L(e, p, s) : (l === void 0 ? L(s, p, true) : r ? L(s, l, p.replace(/\\/g, "")) : L(s, l, p), L(e, o, s)), e;
      }
      function Ys(t) {
        return Object.keys(t).map((e) => {
          let s = t[e];
          return Array.isArray(s) || (s = [s]), s.map((r) => [e].concat(Object.keys(r).map((n) => {
            let i = r[n];
            return Array.isArray(i) || (i = [i]), i.map((o) => o === true ? n : `${n}=${o}`).join("; ");
          })).join("; ")).join(", ");
        }).join(", ");
      }
      Pt.exports = { format: Ys, parse: Hs };
    });
    var we = b((bn, $t) => {
      "use strict";
      var Ks = require("events"), Xs = require("https"), Js = require("http"), It = require("net"), Zs = require("tls"), { randomBytes: Qs, createHash: er } = require("crypto"), { Duplex: En, Readable: xn } = require("stream"), { URL: Ve } = require("url"), D = ie(), tr = qe(), sr = $e(), { isBlob: rr } = J(), { BINARY_TYPES: Nt, EMPTY_BUFFER: Ee, GUID: nr, kForOnEventAttribute: ze, kListener: ir, kStatusCode: or, kWebSocket: S, NOOP: Bt } = P(), { EventTarget: { addEventListener: ar, removeEventListener: lr } } = Ct(), { format: cr, parse: fr } = Ge(), { toBuffer: hr } = re(), ur = 30 * 1e3, Rt = Symbol("kAborted"), He = [8, 13], I = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"], dr = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/, g = class t extends Ks {
        constructor(e, s, r) {
          super(), this._binaryType = Nt[0], this._closeCode = 1006, this._closeFrameReceived = false, this._closeFrameSent = false, this._closeMessage = Ee, this._closeTimer = null, this._errorEmitted = false, this._extensions = {}, this._paused = false, this._protocol = "", this._readyState = t.CONNECTING, this._receiver = null, this._sender = null, this._socket = null, e !== null ? (this._bufferedAmount = 0, this._isServer = false, this._redirects = 0, s === void 0 ? s = [] : Array.isArray(s) || (typeof s == "object" && s !== null ? (r = s, s = []) : s = [s]), Dt(this, e, s, r)) : (this._autoPong = r.autoPong, this._isServer = true);
        }
        get binaryType() {
          return this._binaryType;
        }
        set binaryType(e) {
          Nt.includes(e) && (this._binaryType = e, this._receiver && (this._receiver._binaryType = e));
        }
        get bufferedAmount() {
          return this._socket ? this._socket._writableState.length + this._sender._bufferedBytes : this._bufferedAmount;
        }
        get extensions() {
          return Object.keys(this._extensions).join();
        }
        get isPaused() {
          return this._paused;
        }
        get onclose() {
          return null;
        }
        get onerror() {
          return null;
        }
        get onopen() {
          return null;
        }
        get onmessage() {
          return null;
        }
        get protocol() {
          return this._protocol;
        }
        get readyState() {
          return this._readyState;
        }
        get url() {
          return this._url;
        }
        setSocket(e, s, r) {
          let n = new tr({ allowSynchronousEvents: r.allowSynchronousEvents, binaryType: this.binaryType, extensions: this._extensions, isServer: this._isServer, maxPayload: r.maxPayload, skipUTF8Validation: r.skipUTF8Validation }), i = new sr(e, this._extensions, r.generateMask);
          this._receiver = n, this._sender = i, this._socket = e, n[S] = this, i[S] = this, e[S] = this, n.on("conclude", _r), n.on("drain", mr), n.on("error", yr), n.on("message", Sr), n.on("ping", Er), n.on("pong", xr), i.onerror = br, e.setTimeout && e.setTimeout(0), e.setNoDelay && e.setNoDelay(), s.length > 0 && e.unshift(s), e.on("close", qt), e.on("data", be), e.on("end", Wt), e.on("error", Ft), this._readyState = t.OPEN, this.emit("open");
        }
        emitClose() {
          if (!this._socket) {
            this._readyState = t.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
            return;
          }
          this._extensions[D.extensionName] && this._extensions[D.extensionName].cleanup(), this._receiver.removeAllListeners(), this._readyState = t.CLOSED, this.emit("close", this._closeCode, this._closeMessage);
        }
        close(e, s) {
          if (this.readyState !== t.CLOSED) {
            if (this.readyState === t.CONNECTING) {
              w(this, this._req, "WebSocket was closed before the connection was established");
              return;
            }
            if (this.readyState === t.CLOSING) {
              this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end();
              return;
            }
            this._readyState = t.CLOSING, this._sender.close(e, s, !this._isServer, (r) => {
              r || (this._closeFrameSent = true, (this._closeFrameReceived || this._receiver._writableState.errorEmitted) && this._socket.end());
            }), Ut(this);
          }
        }
        pause() {
          this.readyState === t.CONNECTING || this.readyState === t.CLOSED || (this._paused = true, this._socket.pause());
        }
        ping(e, s, r) {
          if (this.readyState === t.CONNECTING)
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          if (typeof e == "function" ? (r = e, e = s = void 0) : typeof s == "function" && (r = s, s = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== t.OPEN) {
            Ye(this, e, r);
            return;
          }
          s === void 0 && (s = !this._isServer), this._sender.ping(e || Ee, s, r);
        }
        pong(e, s, r) {
          if (this.readyState === t.CONNECTING)
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          if (typeof e == "function" ? (r = e, e = s = void 0) : typeof s == "function" && (r = s, s = void 0), typeof e == "number" && (e = e.toString()), this.readyState !== t.OPEN) {
            Ye(this, e, r);
            return;
          }
          s === void 0 && (s = !this._isServer), this._sender.pong(e || Ee, s, r);
        }
        resume() {
          this.readyState === t.CONNECTING || this.readyState === t.CLOSED || (this._paused = false, this._receiver._writableState.needDrain || this._socket.resume());
        }
        send(e, s, r) {
          if (this.readyState === t.CONNECTING)
            throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
          if (typeof s == "function" && (r = s, s = {}), typeof e == "number" && (e = e.toString()), this.readyState !== t.OPEN) {
            Ye(this, e, r);
            return;
          }
          let n = { binary: typeof e != "string", mask: !this._isServer, compress: true, fin: true, ...s };
          this._extensions[D.extensionName] || (n.compress = false), this._sender.send(e || Ee, n, r);
        }
        terminate() {
          if (this.readyState !== t.CLOSED) {
            if (this.readyState === t.CONNECTING) {
              w(this, this._req, "WebSocket was closed before the connection was established");
              return;
            }
            this._socket && (this._readyState = t.CLOSING, this._socket.destroy());
          }
        }
      };
      Object.defineProperty(g, "CONNECTING", { enumerable: true, value: I.indexOf("CONNECTING") });
      Object.defineProperty(g.prototype, "CONNECTING", { enumerable: true, value: I.indexOf("CONNECTING") });
      Object.defineProperty(g, "OPEN", { enumerable: true, value: I.indexOf("OPEN") });
      Object.defineProperty(g.prototype, "OPEN", { enumerable: true, value: I.indexOf("OPEN") });
      Object.defineProperty(g, "CLOSING", { enumerable: true, value: I.indexOf("CLOSING") });
      Object.defineProperty(g.prototype, "CLOSING", { enumerable: true, value: I.indexOf("CLOSING") });
      Object.defineProperty(g, "CLOSED", { enumerable: true, value: I.indexOf("CLOSED") });
      Object.defineProperty(g.prototype, "CLOSED", { enumerable: true, value: I.indexOf("CLOSED") });
      ["binaryType", "bufferedAmount", "extensions", "isPaused", "protocol", "readyState", "url"].forEach((t) => {
        Object.defineProperty(g.prototype, t, { enumerable: true });
      });
      ["open", "error", "close", "message"].forEach((t) => {
        Object.defineProperty(g.prototype, `on${t}`, { enumerable: true, get() {
          for (let e of this.listeners(t))
            if (e[ze])
              return e[ir];
          return null;
        }, set(e) {
          for (let s of this.listeners(t))
            if (s[ze]) {
              this.removeListener(t, s);
              break;
            }
          typeof e == "function" && this.addEventListener(t, e, { [ze]: true });
        } });
      });
      g.prototype.addEventListener = ar;
      g.prototype.removeEventListener = lr;
      $t.exports = g;
      function Dt(t, e, s, r) {
        let n = { allowSynchronousEvents: true, autoPong: true, protocolVersion: He[1], maxPayload: 104857600, skipUTF8Validation: false, perMessageDeflate: true, followRedirects: false, maxRedirects: 10, ...r, socketPath: void 0, hostname: void 0, protocol: void 0, timeout: void 0, method: "GET", host: void 0, path: void 0, port: void 0 };
        if (t._autoPong = n.autoPong, !He.includes(n.protocolVersion))
          throw new RangeError(`Unsupported protocol version: ${n.protocolVersion} (supported versions: ${He.join(", ")})`);
        let i;
        if (e instanceof Ve)
          i = e;
        else
          try {
            i = new Ve(e);
          } catch {
            throw new SyntaxError(`Invalid URL: ${e}`);
          }
        i.protocol === "http:" ? i.protocol = "ws:" : i.protocol === "https:" && (i.protocol = "wss:"), t._url = i.href;
        let o = i.protocol === "wss:", l = i.protocol === "ws+unix:", c;
        if (i.protocol !== "ws:" && !o && !l ? c = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"` : l && !i.pathname ? c = "The URL's pathname is empty" : i.hash && (c = "The URL contains a fragment identifier"), c) {
          let u = new SyntaxError(c);
          if (t._redirects === 0)
            throw u;
          xe(t, u);
          return;
        }
        let a = o ? 443 : 80, f = Qs(16).toString("base64"), h = o ? Xs.request : Js.request, p = /* @__PURE__ */ new Set(), _;
        if (n.createConnection = n.createConnection || (o ? gr : pr), n.defaultPort = n.defaultPort || a, n.port = i.port || a, n.host = i.hostname.startsWith("[") ? i.hostname.slice(1, -1) : i.hostname, n.headers = { ...n.headers, "Sec-WebSocket-Version": n.protocolVersion, "Sec-WebSocket-Key": f, Connection: "Upgrade", Upgrade: "websocket" }, n.path = i.pathname + i.search, n.timeout = n.handshakeTimeout, n.perMessageDeflate && (_ = new D(n.perMessageDeflate !== true ? n.perMessageDeflate : {}, false, n.maxPayload), n.headers["Sec-WebSocket-Extensions"] = cr({ [D.extensionName]: _.offer() })), s.length) {
          for (let u of s) {
            if (typeof u != "string" || !dr.test(u) || p.has(u))
              throw new SyntaxError("An invalid or duplicated subprotocol was specified");
            p.add(u);
          }
          n.headers["Sec-WebSocket-Protocol"] = s.join(",");
        }
        if (n.origin && (n.protocolVersion < 13 ? n.headers["Sec-WebSocket-Origin"] = n.origin : n.headers.Origin = n.origin), (i.username || i.password) && (n.auth = `${i.username}:${i.password}`), l) {
          let u = n.path.split(":");
          n.socketPath = u[0], n.path = u[1];
        }
        let m;
        if (n.followRedirects) {
          if (t._redirects === 0) {
            t._originalIpc = l, t._originalSecure = o, t._originalHostOrSocketPath = l ? n.socketPath : i.host;
            let u = r && r.headers;
            if (r = { ...r, headers: {} }, u)
              for (let [y, B] of Object.entries(u))
                r.headers[y.toLowerCase()] = B;
          } else if (t.listenerCount("redirect") === 0) {
            let u = l ? t._originalIpc ? n.socketPath === t._originalHostOrSocketPath : false : t._originalIpc ? false : i.host === t._originalHostOrSocketPath;
            (!u || t._originalSecure && !o) && (delete n.headers.authorization, delete n.headers.cookie, u || delete n.headers.host, n.auth = void 0);
          }
          n.auth && !r.headers.authorization && (r.headers.authorization = "Basic " + Buffer.from(n.auth).toString("base64")), m = t._req = h(n), t._redirects && t.emit("redirect", t.url, m);
        } else
          m = t._req = h(n);
        n.timeout && m.on("timeout", () => {
          w(t, m, "Opening handshake has timed out");
        }), m.on("error", (u) => {
          m === null || m[Rt] || (m = t._req = null, xe(t, u));
        }), m.on("response", (u) => {
          let y = u.headers.location, B = u.statusCode;
          if (y && n.followRedirects && B >= 300 && B < 400) {
            if (++t._redirects > n.maxRedirects) {
              w(t, m, "Maximum redirects exceeded");
              return;
            }
            m.abort();
            let d;
            try {
              d = new Ve(y, e);
            } catch {
              let q = new SyntaxError(`Invalid URL: ${y}`);
              xe(t, q);
              return;
            }
            Dt(t, d, s, r);
          } else
            t.emit("unexpected-response", m, u) || w(t, m, `Unexpected server response: ${u.statusCode}`);
        }), m.on("upgrade", (u, y, B) => {
          if (t.emit("upgrade", u), t.readyState !== g.CONNECTING)
            return;
          m = t._req = null;
          let d = u.headers.upgrade;
          if (d === void 0 || d.toLowerCase() !== "websocket") {
            w(t, y, "Invalid Upgrade header");
            return;
          }
          let Le = er("sha1").update(f + nr).digest("base64");
          if (u.headers["sec-websocket-accept"] !== Le) {
            w(t, y, "Invalid Sec-WebSocket-Accept header");
            return;
          }
          let q = u.headers["sec-websocket-protocol"], C;
          if (q !== void 0 ? p.size ? p.has(q) || (C = "Server sent an invalid subprotocol") : C = "Server sent a subprotocol but none was requested" : p.size && (C = "Server sent no subprotocol"), C) {
            w(t, y, C);
            return;
          }
          q && (t._protocol = q);
          let E = u.headers["sec-websocket-extensions"];
          if (E !== void 0) {
            if (!_) {
              w(t, y, "Server sent a Sec-WebSocket-Extensions header but no extension was requested");
              return;
            }
            let x;
            try {
              x = fr(E);
            } catch {
              w(t, y, "Invalid Sec-WebSocket-Extensions header");
              return;
            }
            let z = Object.keys(x);
            if (z.length !== 1 || z[0] !== D.extensionName) {
              w(t, y, "Server indicated an extension that was not requested");
              return;
            }
            try {
              _.accept(x[D.extensionName]);
            } catch {
              w(t, y, "Invalid Sec-WebSocket-Extensions header");
              return;
            }
            t._extensions[D.extensionName] = _;
          }
          t.setSocket(y, B, { allowSynchronousEvents: n.allowSynchronousEvents, generateMask: n.generateMask, maxPayload: n.maxPayload, skipUTF8Validation: n.skipUTF8Validation });
        }), n.finishRequest ? n.finishRequest(m, t) : m.end();
      }
      function xe(t, e) {
        t._readyState = g.CLOSING, t._errorEmitted = true, t.emit("error", e), t.emitClose();
      }
      function pr(t) {
        return t.path = t.socketPath, It.connect(t);
      }
      function gr(t) {
        return t.path = void 0, !t.servername && t.servername !== "" && (t.servername = It.isIP(t.host) ? "" : t.host), Zs.connect(t);
      }
      function w(t, e, s) {
        t._readyState = g.CLOSING;
        let r = new Error(s);
        Error.captureStackTrace(r, w), e.setHeader ? (e[Rt] = true, e.abort(), e.socket && !e.socket.destroyed && e.socket.destroy(), process.nextTick(xe, t, r)) : (e.destroy(r), e.once("error", t.emit.bind(t, "error")), e.once("close", t.emitClose.bind(t)));
      }
      function Ye(t, e, s) {
        if (e) {
          let r = rr(e) ? e.size : hr(e).length;
          t._socket ? t._sender._bufferedBytes += r : t._bufferedAmount += r;
        }
        if (s) {
          let r = new Error(`WebSocket is not open: readyState ${t.readyState} (${I[t.readyState]})`);
          process.nextTick(s, r);
        }
      }
      function _r(t, e) {
        let s = this[S];
        s._closeFrameReceived = true, s._closeMessage = e, s._closeCode = t, s._socket[S] !== void 0 && (s._socket.removeListener("data", be), process.nextTick(Mt, s._socket), t === 1005 ? s.close() : s.close(t, e));
      }
      function mr() {
        let t = this[S];
        t.isPaused || t._socket.resume();
      }
      function yr(t) {
        let e = this[S];
        e._socket[S] !== void 0 && (e._socket.removeListener("data", be), process.nextTick(Mt, e._socket), e.close(t[or])), e._errorEmitted || (e._errorEmitted = true, e.emit("error", t));
      }
      function At() {
        this[S].emitClose();
      }
      function Sr(t, e) {
        this[S].emit("message", t, e);
      }
      function Er(t) {
        let e = this[S];
        e._autoPong && e.pong(t, !this._isServer, Bt), e.emit("ping", t);
      }
      function xr(t) {
        this[S].emit("pong", t);
      }
      function Mt(t) {
        t.resume();
      }
      function br(t) {
        let e = this[S];
        e.readyState !== g.CLOSED && (e.readyState === g.OPEN && (e._readyState = g.CLOSING, Ut(e)), this._socket.end(), e._errorEmitted || (e._errorEmitted = true, e.emit("error", t)));
      }
      function Ut(t) {
        t._closeTimer = setTimeout(t._socket.destroy.bind(t._socket), ur);
      }
      function qt() {
        let t = this[S];
        this.removeListener("close", qt), this.removeListener("data", be), this.removeListener("end", Wt), t._readyState = g.CLOSING;
        let e;
        !this._readableState.endEmitted && !t._closeFrameReceived && !t._receiver._writableState.errorEmitted && (e = t._socket.read()) !== null && t._receiver.write(e), t._receiver.end(), this[S] = void 0, clearTimeout(t._closeTimer), t._receiver._writableState.finished || t._receiver._writableState.errorEmitted ? t.emitClose() : (t._receiver.on("error", At), t._receiver.on("finish", At));
      }
      function be(t) {
        this[S]._receiver.write(t) || this.pause();
      }
      function Wt() {
        let t = this[S];
        t._readyState = g.CLOSING, t._receiver.end(), this.end();
      }
      function Ft() {
        let t = this[S];
        this.removeListener("error", Ft), this.on("error", Bt), t && (t._readyState = g.CLOSING, this.destroy());
      }
    });
    var zt = b((vn, Vt) => {
      "use strict";
      var wn = we(), { Duplex: wr } = require("stream");
      function jt(t) {
        t.emit("close");
      }
      function vr() {
        !this.destroyed && this._writableState.finished && this.destroy();
      }
      function Gt(t) {
        this.removeListener("error", Gt), this.destroy(), this.listenerCount("error") === 0 && this.emit("error", t);
      }
      function Tr(t, e) {
        let s = true, r = new wr({ ...e, autoDestroy: false, emitClose: false, objectMode: false, writableObjectMode: false });
        return t.on("message", function(i, o) {
          let l = !o && r._readableState.objectMode ? i.toString() : i;
          r.push(l) || t.pause();
        }), t.once("error", function(i) {
          r.destroyed || (s = false, r.destroy(i));
        }), t.once("close", function() {
          r.destroyed || r.push(null);
        }), r._destroy = function(n, i) {
          if (t.readyState === t.CLOSED) {
            i(n), process.nextTick(jt, r);
            return;
          }
          let o = false;
          t.once("error", function(c) {
            o = true, i(c);
          }), t.once("close", function() {
            o || i(n), process.nextTick(jt, r);
          }), s && t.terminate();
        }, r._final = function(n) {
          if (t.readyState === t.CONNECTING) {
            t.once("open", function() {
              r._final(n);
            });
            return;
          }
          t._socket !== null && (t._socket._writableState.finished ? (n(), r._readableState.endEmitted && r.destroy()) : (t._socket.once("finish", function() {
            n();
          }), t.close()));
        }, r._read = function() {
          t.isPaused && t.resume();
        }, r._write = function(n, i, o) {
          if (t.readyState === t.CONNECTING) {
            t.once("open", function() {
              r._write(n, i, o);
            });
            return;
          }
          t.send(n, o);
        }, r.on("end", vr), r.on("error", Gt), r;
      }
      Vt.exports = Tr;
    });
    var Yt = b((Tn, Ht) => {
      "use strict";
      var { tokenChars: kr } = J();
      function Or(t) {
        let e = /* @__PURE__ */ new Set(), s = -1, r = -1, n = 0;
        for (n; n < t.length; n++) {
          let o = t.charCodeAt(n);
          if (r === -1 && kr[o] === 1)
            s === -1 && (s = n);
          else if (n !== 0 && (o === 32 || o === 9))
            r === -1 && s !== -1 && (r = n);
          else if (o === 44) {
            if (s === -1)
              throw new SyntaxError(`Unexpected character at index ${n}`);
            r === -1 && (r = n);
            let l = t.slice(s, r);
            if (e.has(l))
              throw new SyntaxError(`The "${l}" subprotocol is duplicated`);
            e.add(l), s = r = -1;
          } else
            throw new SyntaxError(`Unexpected character at index ${n}`);
        }
        if (s === -1 || r !== -1)
          throw new SyntaxError("Unexpected end of input");
        let i = t.slice(s, n);
        if (e.has(i))
          throw new SyntaxError(`The "${i}" subprotocol is duplicated`);
        return e.add(i), e;
      }
      Ht.exports = { parse: Or };
    });
    var ts = b((On, es) => {
      "use strict";
      var Lr = require("events"), ve = require("http"), { Duplex: kn } = require("stream"), { createHash: Cr } = require("crypto"), Kt = Ge(), j = ie(), Pr = Yt(), Nr = we(), { GUID: Ar, kWebSocket: Ir } = P(), Br = /^[+/0-9A-Za-z]{22}==$/, Xt = 0, Jt = 1, Qt = 2, Ke = class extends Lr {
        constructor(e, s) {
          if (super(), e = { allowSynchronousEvents: true, autoPong: true, maxPayload: 100 * 1024 * 1024, skipUTF8Validation: false, perMessageDeflate: false, handleProtocols: null, clientTracking: true, verifyClient: null, noServer: false, backlog: null, server: null, host: null, path: null, port: null, WebSocket: Nr, ...e }, e.port == null && !e.server && !e.noServer || e.port != null && (e.server || e.noServer) || e.server && e.noServer)
            throw new TypeError('One and only one of the "port", "server", or "noServer" options must be specified');
          if (e.port != null ? (this._server = ve.createServer((r, n) => {
            let i = ve.STATUS_CODES[426];
            n.writeHead(426, { "Content-Length": i.length, "Content-Type": "text/plain" }), n.end(i);
          }), this._server.listen(e.port, e.host, e.backlog, s)) : e.server && (this._server = e.server), this._server) {
            let r = this.emit.bind(this, "connection");
            this._removeListeners = Rr(this._server, { listening: this.emit.bind(this, "listening"), error: this.emit.bind(this, "error"), upgrade: (n, i, o) => {
              this.handleUpgrade(n, i, o, r);
            } });
          }
          e.perMessageDeflate === true && (e.perMessageDeflate = {}), e.clientTracking && (this.clients = /* @__PURE__ */ new Set(), this._shouldEmitClose = false), this.options = e, this._state = Xt;
        }
        address() {
          if (this.options.noServer)
            throw new Error('The server is operating in "noServer" mode');
          return this._server ? this._server.address() : null;
        }
        close(e) {
          if (this._state === Qt) {
            e && this.once("close", () => {
              e(new Error("The server is not running"));
            }), process.nextTick(ce, this);
            return;
          }
          if (e && this.once("close", e), this._state !== Jt)
            if (this._state = Jt, this.options.noServer || this.options.server)
              this._server && (this._removeListeners(), this._removeListeners = this._server = null), this.clients ? this.clients.size ? this._shouldEmitClose = true : process.nextTick(ce, this) : process.nextTick(ce, this);
            else {
              let s = this._server;
              this._removeListeners(), this._removeListeners = this._server = null, s.close(() => {
                ce(this);
              });
            }
        }
        shouldHandle(e) {
          if (this.options.path) {
            let s = e.url.indexOf("?");
            if ((s !== -1 ? e.url.slice(0, s) : e.url) !== this.options.path)
              return false;
          }
          return true;
        }
        handleUpgrade(e, s, r, n) {
          s.on("error", Zt);
          let i = e.headers["sec-websocket-key"], o = e.headers.upgrade, l = +e.headers["sec-websocket-version"];
          if (e.method !== "GET") {
            G(this, e, s, 405, "Invalid HTTP method");
            return;
          }
          if (o === void 0 || o.toLowerCase() !== "websocket") {
            G(this, e, s, 400, "Invalid Upgrade header");
            return;
          }
          if (i === void 0 || !Br.test(i)) {
            G(this, e, s, 400, "Missing or invalid Sec-WebSocket-Key header");
            return;
          }
          if (l !== 13 && l !== 8) {
            G(this, e, s, 400, "Missing or invalid Sec-WebSocket-Version header", { "Sec-WebSocket-Version": "13, 8" });
            return;
          }
          if (!this.shouldHandle(e)) {
            fe(s, 400);
            return;
          }
          let c = e.headers["sec-websocket-protocol"], a = /* @__PURE__ */ new Set();
          if (c !== void 0)
            try {
              a = Pr.parse(c);
            } catch {
              G(this, e, s, 400, "Invalid Sec-WebSocket-Protocol header");
              return;
            }
          let f = e.headers["sec-websocket-extensions"], h = {};
          if (this.options.perMessageDeflate && f !== void 0) {
            let p = new j(this.options.perMessageDeflate, true, this.options.maxPayload);
            try {
              let _ = Kt.parse(f);
              _[j.extensionName] && (p.accept(_[j.extensionName]), h[j.extensionName] = p);
            } catch {
              G(this, e, s, 400, "Invalid or unacceptable Sec-WebSocket-Extensions header");
              return;
            }
          }
          if (this.options.verifyClient) {
            let p = { origin: e.headers[`${l === 8 ? "sec-websocket-origin" : "origin"}`], secure: !!(e.socket.authorized || e.socket.encrypted), req: e };
            if (this.options.verifyClient.length === 2) {
              this.options.verifyClient(p, (_, m, u, y) => {
                if (!_)
                  return fe(s, m || 401, u, y);
                this.completeUpgrade(h, i, a, e, s, r, n);
              });
              return;
            }
            if (!this.options.verifyClient(p))
              return fe(s, 401);
          }
          this.completeUpgrade(h, i, a, e, s, r, n);
        }
        completeUpgrade(e, s, r, n, i, o, l) {
          if (!i.readable || !i.writable)
            return i.destroy();
          if (i[Ir])
            throw new Error("server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration");
          if (this._state > Xt)
            return fe(i, 503);
          let a = ["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${Cr("sha1").update(s + Ar).digest("base64")}`], f = new this.options.WebSocket(null, void 0, this.options);
          if (r.size) {
            let h = this.options.handleProtocols ? this.options.handleProtocols(r, n) : r.values().next().value;
            h && (a.push(`Sec-WebSocket-Protocol: ${h}`), f._protocol = h);
          }
          if (e[j.extensionName]) {
            let h = e[j.extensionName].params, p = Kt.format({ [j.extensionName]: [h] });
            a.push(`Sec-WebSocket-Extensions: ${p}`), f._extensions = e;
          }
          this.emit("headers", a, n), i.write(a.concat(`\r
`).join(`\r
`)), i.removeListener("error", Zt), f.setSocket(i, o, { allowSynchronousEvents: this.options.allowSynchronousEvents, maxPayload: this.options.maxPayload, skipUTF8Validation: this.options.skipUTF8Validation }), this.clients && (this.clients.add(f), f.on("close", () => {
            this.clients.delete(f), this._shouldEmitClose && !this.clients.size && process.nextTick(ce, this);
          })), l(f, n);
        }
      };
      es.exports = Ke;
      function Rr(t, e) {
        for (let s of Object.keys(e))
          t.on(s, e[s]);
        return function() {
          for (let r of Object.keys(e))
            t.removeListener(r, e[r]);
        };
      }
      function ce(t) {
        t._state = Qt, t.emit("close");
      }
      function Zt() {
        this.destroy();
      }
      function fe(t, e, s, r) {
        s = s || ve.STATUS_CODES[e], r = { Connection: "close", "Content-Type": "text/html", "Content-Length": Buffer.byteLength(s), ...r }, t.once("finish", t.destroy), t.end(`HTTP/1.1 ${e} ${ve.STATUS_CODES[e]}\r
` + Object.keys(r).map((n) => `${n}: ${r[n]}`).join(`\r
`) + `\r
\r
` + s);
      }
      function G(t, e, s, r, n, i) {
        if (t.listenerCount("wsClientError")) {
          let o = new Error(n);
          Error.captureStackTrace(o, G), t.emit("wsClientError", o, s, e);
        } else
          fe(s, r, n, i);
      }
    });
    var ln = {};
    _s(ln, { PagesAI: () => Oe, buildApiMeta: () => en });
    module.exports = ms(ln);
    var Dr = Y(zt(), 1), Mr = Y(qe(), 1), Ur = Y($e(), 1), ss = Y(we(), 1), qr = Y(ts(), 1);
    var rs = ss.default;
    var Wr = "https://pages-api.cloud.tencent.com", Fr = "https://pages-api.edgeone.ai", $r = [Wr, Fr], Te = "/v1", ke = class {
      baseUrl;
      baseSelectionPromise;
      apiToken;
      defaultEngineModelType;
      defaultTtsVoiceId;
      appId;
      requestMeta;
      baseCandidates;
      debugLog;
      constructor(e) {
        if (!e.apiToken)
          throw new Error("PAGES_API_TOKEN is required");
        this.baseUrl = null, this.baseSelectionPromise = null, this.apiToken = e.apiToken.trim(), this.defaultEngineModelType = e.defaultEngineModelType, this.defaultTtsVoiceId = e.defaultTtsVoiceId, this.appId = e.appId, this.requestMeta = e.requestMeta || {}, this.baseCandidates = Vr(e.baseUrls), this.debugLog = typeof e.debugLog == "function" ? e.debugLog : null;
      }
      async signAsr(e = {}) {
        var _a2;
        let s = await this.request(Te, { Action: "SignPagesAiAsr", EngineModelType: e.engineModelType || this.defaultEngineModelType, VoiceId: e.voiceId, ApiToken: this.apiToken, ...this.requestMeta, ...this.appId !== void 0 ? { AppId: this.appId } : {} });
        if (!((_a2 = s == null ? void 0 : s.Asr) == null ? void 0 : _a2.websocketUrl)) {
          let r = is(s);
          throw new Error(`ASR signature response is invalid${r ? `: ${r}` : ""}`);
        }
        return s.Asr;
      }
      async signTts(e, s = {}) {
        var _a2, _b, _c;
        let r = (e || "").trim();
        if (!r)
          throw new Error("TTS text is empty");
        let n = await this.request(Te, { Action: "SignPagesAiTts", ApiToken: this.apiToken, VoiceId: s.voiceId || this.defaultTtsVoiceId, Text: r, ...this.requestMeta, ...this.appId !== void 0 ? { AppId: this.appId } : {} });
        if (!((_a2 = n.Tts) == null ? void 0 : _a2.headers) || !((_b = n.Tts) == null ? void 0 : _b.endpoint) || !((_c = n.Tts) == null ? void 0 : _c.payload)) {
          let i = is(n);
          throw new Error(`TTS signature response is invalid${i ? `: ${i}` : ""}`);
        }
        return n.Tts;
      }
      async completeLlm(e) {
        var _a2;
        let r = (_a2 = await this.callLlmEndpoint({ ApiToken: this.apiToken, ...this.requestMeta, ...this.appId !== void 0 ? { AppId: this.appId } : {}, Messages: e })) == null ? void 0 : _a2.Content;
        if (typeof r != "string" || !r.trim())
          throw new Error("LLM response missing content");
        return r;
      }
      async callLlmEndpoint(e) {
        return this.request(Te, { ...e, Action: "CompletePagesAiLlm" });
      }
      async request(e, s) {
        let r = await this.ensureBaseUrl(), n = new URL(e, r), i;
        M(this.debugLog, "pages-ai:http:request", { url: n.toString(), payload: s, headers: { "Content-Type": "application/json", Authorization: zr(`Bearer ${this.apiToken}`) } });
        try {
          i = await fetch(n.toString(), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiToken}` }, body: JSON.stringify(s) });
        } catch (a) {
          throw M(this.debugLog, "pages-ai:http:error", { url: n.toString(), error: (a == null ? void 0 : a.message) || String(a) }), new Error((a == null ? void 0 : a.message) || String(a));
        }
        let o = await i.text();
        M(this.debugLog, "pages-ai:http:response", { url: n.toString(), status: i.status, statusText: i.statusText, headers: os(i.headers), body: o });
        let l = {};
        try {
          l = o ? JSON.parse(o) : {};
        } catch {
          l = {};
        }
        let c = jr(l);
        if (!i.ok) {
          let a = Gr(c) || i.statusText || "Request failed";
          throw new Error(`[${i.status}] ${a}`);
        }
        return c || {};
      }
      async ensureBaseUrl() {
        if (this.baseUrl)
          return this.baseUrl;
        if (this.baseSelectionPromise)
          return this.baseSelectionPromise;
        this.baseSelectionPromise = this.detectBaseUrl();
        try {
          let e = await this.baseSelectionPromise;
          return this.baseUrl = e, e;
        } finally {
          this.baseSelectionPromise = null;
        }
      }
      async detectBaseUrl() {
        M(this.debugLog, "pages-ai:http:detect-base", { candidates: this.baseCandidates });
        let e = await Promise.all(this.baseCandidates.map((n) => this.probeBase(n))), s = e.find((n) => n.ok);
        if (M(this.debugLog, "pages-ai:http:detect-base:result", { probes: e, winner: (s == null ? void 0 : s.base) || null }), s == null ? void 0 : s.base)
          return s.base;
        let r = e.map((n) => `${n.base}: ${n.reason || "Unknown error"}`).join("; ");
        throw new Error(`All endpoints failed: ${r}`);
      }
      async probeBase(e) {
        let s = new URL(Te, e);
        M(this.debugLog, "pages-ai:http:probe:request", { base: e, url: s.toString() });
        try {
          let r = await fetch(s.toString(), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiToken}` }, body: JSON.stringify({ Action: "TokenPing" }) }), n = await r.text();
          M(this.debugLog, "pages-ai:http:probe:response", { base: e, status: r.status, statusText: r.statusText, headers: os(r.headers), body: n });
          let i = {};
          try {
            i = n ? JSON.parse(n) : {};
          } catch {
            i = {};
          }
          if (!r.ok)
            return { base: e, ok: false, reason: `[${r.status}] ${r.statusText || "Request failed"}` };
          let o = (i == null ? void 0 : i.Code) ?? (i == null ? void 0 : i.code), l = (i == null ? void 0 : i.Message) ?? (i == null ? void 0 : i.message) ?? "";
          if (o === 109 || typeof l == "string" && l.toLowerCase().includes("region")) {
            let a = [o, l].filter(Boolean).join(": ");
            return { base: e, ok: false, reason: a || "Token not allowed for this region" };
          }
          return { base: e, ok: true };
        } catch (r) {
          return M(this.debugLog, "pages-ai:http:probe:error", { base: e, url: s.toString(), error: (r == null ? void 0 : r.message) || String(r) }), { base: e, ok: false, reason: (r == null ? void 0 : r.message) || String(r) };
        }
      }
    };
    function ns(t) {
      let e = (t || "").trim(), s = e && /^[a-z]+:\/\//i.test(e) ? e : `https://${e}`;
      return s.endsWith("/") ? s : `${s}/`;
    }
    function jr(t) {
      if (t && typeof t == "object") {
        if (t.Data && typeof t.Data == "object")
          return t.Data.Response && typeof t.Data.Response == "object" ? t.Data.Response : t.Data;
        if (t.Response && typeof t.Response == "object")
          return t.Response;
      }
      return t || {};
    }
    function Gr(t) {
      if (!t || typeof t != "object")
        return "";
      let e = t.Error || t.error;
      return (e == null ? void 0 : e.Message) ? e.Message : typeof e == "string" ? e : t.message || t.Message || "";
    }
    function is(t) {
      try {
        return JSON.stringify(t);
      } catch {
        return "";
      }
    }
    function Vr(t) {
      let e = $r.map(ns), s = (t || []).map(ns).filter((i) => !!i), r = /* @__PURE__ */ new Set(), n = [];
      return [...s, ...e].forEach((i) => {
        !i || r.has(i) || (r.add(i), n.push(i));
      }), n.length ? n : e;
    }
    function M(t, e, s) {
      if (t)
        try {
          t(e, s);
        } catch {
        }
    }
    function zr(t) {
      if (!t)
        return t;
      let e = Math.min(6, Math.floor(t.length / 3));
      return `${t.slice(0, e)}***${t.slice(-e)}`;
    }
    function os(t) {
      if (!t)
        return {};
      if (typeof t.entries == "function")
        return Array.from(t.entries()).reduce((r, [n, i]) => (r[n] = i, r), {});
      let e = {};
      return Object.entries(t).forEach(([s, r]) => {
        e[s.toLowerCase()] = r;
      }), e;
    }
    var Xe = Y(require("https")), Hr = Xe.default.request.bind(Xe.default);
    function as(t, e = {}, s = null) {
      let { endpoint: r, payload: n, headers: i } = t;
      if (!n)
        throw new Error("TTS payload missing");
      let { signal: o } = e;
      if (o == null ? void 0 : o.aborted)
        throw new Error("Aborted");
      let l = { ...i, "Content-Length": (i == null ? void 0 : i["Content-Length"]) ?? Buffer.byteLength(n) };
      U(s, "pages-ai:tts:sse:request", { endpoint: r, headers: l, payload: n });
      let c = null, a = false, f = null, h = [], p = null, _ = () => {
        p && (p(), p = null);
      }, m = (d) => {
        a || (h.push(d), _());
      }, u = () => {
        a || (a = true, _());
      }, y = (d) => {
        a || (f = d instanceof Error ? d : new Error(String(d)), a = true, _());
      }, B = { async next() {
        if (h.length)
          return { value: h.shift(), done: false };
        if (f)
          throw f;
        if (a)
          return { value: void 0, done: true };
        if (await new Promise((d) => {
          p = d;
        }), h.length)
          return { value: h.shift(), done: false };
        if (f)
          throw f;
        return { value: void 0, done: true };
      }, async return() {
        if (u(), c)
          try {
            c.destroy();
          } catch {
          }
        return { value: void 0, done: true };
      }, [Symbol.asyncIterator]() {
        return this;
      } };
      return c = Hr({ hostname: r, port: 443, path: "/", method: "POST", signal: o, headers: l }, (d) => {
        if (U(s, "pages-ai:tts:sse:response", { endpoint: r, statusCode: d.statusCode, statusMessage: d.statusMessage, headers: d.headers }), !(d.headers["content-type"] || "").toLowerCase().includes("text/event-stream")) {
          let E = "";
          d.on("data", (x) => {
            E += x.toString();
          }), d.on("end", () => {
            var _a2, _b;
            let x = `TTS request failed with status ${d.statusCode ?? ""}`.trim();
            if (E)
              try {
                let k = (_b = (_a2 = JSON.parse(E)) == null ? void 0 : _a2.Response) == null ? void 0 : _b.Error;
                (k == null ? void 0 : k.Message) ? x = `${k.Code || "Error"}: ${k.Message}` : x = `${x}: ${E.slice(0, 200)}`;
              } catch {
                x = `${x}: ${E.slice(0, 200)}`;
              }
            U(s, "pages-ai:tts:sse:error-response", { endpoint: r, statusCode: d.statusCode, statusMessage: d.statusMessage, headers: d.headers, body: E }), y(new Error(x));
          }), d.on("error", y);
          return;
        }
        let C = "";
        d.on("data", (E) => {
          C += E.toString();
          let x = C.split(`
`);
          C = x.pop() || "";
          for (let z of x)
            if (z.startsWith("data:")) {
              let k = z.slice(5).trim();
              if (k)
                try {
                  m({ data: k }), U(s, "pages-ai:tts:sse:event", { endpoint: r, data: Yr(k) });
                } catch (H) {
                  let fs = H instanceof Error ? H.message : String(H);
                  console.error("\u89E3\u6790 SSE \u6570\u636E\u5931\u8D25:", fs);
                }
            }
        }), d.on("end", () => {
          U(s, "pages-ai:tts:sse:end", { endpoint: r }), u();
        }), d.on("error", (E) => {
          U(s, "pages-ai:tts:sse:error", { endpoint: r, message: E instanceof Error ? E.message : String(E) }), y(E);
        });
      }), c.on("error", (d) => {
        U(s, "pages-ai:tts:sse:request-error", { endpoint: r, message: d instanceof Error ? d.message : String(d) }), y(d);
      }), o && o.addEventListener("abort", () => {
        U(s, "pages-ai:tts:sse:aborted", { endpoint: r }), y(new Error("Aborted")), c == null ? void 0 : c.destroy(new Error("Aborted"));
      }, { once: true }), c.write(n), c.end(), B;
    }
    function U(t, e, s) {
      if (t)
        try {
          t(e, s);
        } catch {
        }
    }
    function Yr(t) {
      return !t || t.length <= 200 ? t : { preview: t.slice(0, 200), length: t.length };
    }
    var Kr = 251195406, Xr = "16k_zh_en", Jr = void 0, Zr = ["https://pages-api.cloud.tencent.com", "https://pages-api.edgeone.ai"], ls = { Version: "2022-09-01", Region: "ch", Language: "zh", RequestId: "111", ClientIp: "1.1.1.1", ApiModule: "teo", RequestSource: "API", CamContext: "hall", AccountArea: "0", Uin: "100000043181", SubAccountUin: "100000043181", Timestamp: "111" }, cs = false, Oe = (_a = class {
      constructor(e) {
        __publicField(this, "asr");
        __publicField(this, "llm");
        __publicField(this, "tts");
        __privateAdd(this, _e, void 0);
        __privateAdd(this, _t, void 0);
        if (!(e == null ? void 0 : e.apiToken))
          throw new Error("apiToken is required to initialize PagesAI");
        let s = Qr(e), r = nn(s.debugLogger);
        __privateSet(this, _t, r), __privateSet(this, _e, new ke({ apiToken: s.apiToken, defaultEngineModelType: s.engineModelType, defaultTtsVoiceId: s.ttsVoiceId, appId: s.appId, baseUrls: s.apiBaseUrls, requestMeta: s.apiMeta, debugLog: r })), this.asr = se(tn(__privateGet(this, _e), r)), this.llm = se(sn(__privateGet(this, _e), r)), this.tts = se(rn(__privateGet(this, _e), r)), se(this);
      }
    }, _e = new WeakMap(), _t = new WeakMap(), _a);
    function Qr(t) {
      return { apiToken: t.apiToken, engineModelType: Xr, ttsVoiceId: Jr, appId: Kr, apiBaseUrls: Zr, apiMeta: ls, debugLogger: cs ? t.debugLogger : null };
    }
    function en() {
      return { ...ls };
    }
    function tn(t, e) {
      return { async createSocket() {
        try {
          let s = await t.signAsr();
          V(e, "pages-ai:asr:sign", s);
          let r = new rs(s.websocketUrl, { perMessageDeflate: false, headers: s.headers });
          return r.on("open", () => V(e, "pages-ai:asr:socket:open", { url: s.websocketUrl })), r.on("close", (n, i) => {
            var _a2;
            return V(e, "pages-ai:asr:socket:close", { url: s.websocketUrl, code: n, reason: (_a2 = i == null ? void 0 : i.toString) == null ? void 0 : _a2.call(i) });
          }), r.on("error", (n) => V(e, "pages-ai:asr:socket:error", { url: s.websocketUrl, message: (n == null ? void 0 : n.message) || String(n) })), r.on("message", (n) => V(e, "pages-ai:asr:socket:message", { url: s.websocketUrl, message: on(n) })), se({ socket: r, engineModelType: s.engineModelType, voiceId: s.voiceId });
        } catch (s) {
          let r = s instanceof Error ? s.message : String(s);
          throw new Error(`ASR runtime not configured: ${r}`);
        }
      } };
    }
    function sn(t, e) {
      return { async complete(s) {
        if (!Array.isArray(s) || !s.length)
          throw new Error("LLM messages are empty");
        return V(e, "pages-ai:llm:complete", { messages: s }), t.completeLlm(s);
      } };
    }
    function rn(t, e) {
      return { async synthesize(s, r = {}) {
        let n = (s || "").trim();
        if (!n)
          throw new Error("TTS text is empty");
        V(e, "pages-ai:tts:synthesize", { text: n });
        let i = await t.signTts(n);
        return as(i, { signal: r == null ? void 0 : r.signal }, e);
      } };
    }
    function se(t) {
      if (!t || typeof t != "object" || Object.isFrozen(t))
        return t;
      let e = Object.getPrototypeOf(t);
      return !(e === Object.prototype || e === null) && !Array.isArray(t) || (Object.freeze(t), Object.getOwnPropertyNames(t).forEach((r) => {
        let n = t[r];
        n && typeof n == "object" && !Object.isFrozen(n) && se(n);
      })), t;
    }
    function nn(t) {
      return cs && typeof t == "function" ? (e, s) => {
        try {
          t(e, s);
        } catch {
        }
      } : null;
    }
    function V(t, e, s) {
      t && t(e, s);
    }
    function on(t) {
      return t == null || typeof t == "string" ? t : Buffer.isBuffer(t) ? { type: "buffer", length: t.length, preview: t.toString("utf8", 0, Math.min(128, t.length)) } : typeof t.toString == "function" ? t.toString() : t;
    }
    function an() {
      if (typeof globalThis > "u")
        return;
      let t = globalThis;
      t.PagesAI || Object.defineProperty(t, "PagesAI", { configurable: false, enumerable: false, writable: false, value: Oe });
    }
    an();
  }
});
export default require_stdin();

var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob)
      BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
      kListener: Symbol("kListener"),
      kStatusCode: Symbol("status-code"),
      kWebSocket: Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0)
        return EMPTY_BUFFER;
      if (list.length === 1)
        return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data))
        return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48)
            _mask(source, mask, output, offset, length);
          else
            bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32)
            _unmask(buffer, mask);
          else
            bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = Symbol("kDone");
    var kRun = Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency)
          return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = Symbol("permessage-deflate");
    var kTotalLength = Symbol("total-length");
    var kCallback = Symbol("callback");
    var kBuffers = Symbol("buffers");
    var kError = Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       * @param {Boolean} [isServer=false] Create the instance in either server or
       *     client mode
       * @param {Number} [maxPayload=0] The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin)
          this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO)
          return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length)
          return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored)
          cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented)
          this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126)
          this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127)
          this._state = GET_PAYLOAD_LENGTH_64;
        else
          this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked)
          this._state = GET_MASK;
        else
          this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err)
            return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO)
            this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module.exports = Receiver;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1)
          target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask)
          return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking)
          return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin)
          this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {Buffer[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function")
        cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function")
          callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = Symbol("kCode");
    var kData = Symbol("kData");
    var kError = Symbol("kError");
    var kMessage = Symbol("kMessage");
    var kReason = Symbol("kReason");
    var kTarget = Symbol("kTarget");
    var kType = Symbol("kType");
    var kWasClean = Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0)
        dest[name] = [elem];
      else
        dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1)
              start = i;
            else if (!mustUnescape)
              mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1)
                start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1)
              end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1)
              end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1)
        end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations))
          configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values))
                values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http2 = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type))
          return;
        this._binaryType = type;
        if (this._receiver)
          this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket)
          return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout)
          socket.setTimeout(0);
        if (socket.setNoDelay)
          socket.setNoDelay();
        if (head.length > 0)
          socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED)
          return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err)
            return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0)
          mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain)
          this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number")
          data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED)
          return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute])
              return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function")
            return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener;
    WebSocket.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http2.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost)
              delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted])
          return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING)
          return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt)
          websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket)
          websocket._sender._bufferedBytes += length;
        else
          websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0)
        return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005)
        websocket.close();
      else
        websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused)
        websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong)
        websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket.CLOSED)
        return;
      if (websocket.readyState === WebSocket.OPEN) {
        websocket._readyState = WebSocket.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data))
          ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed)
          return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed)
          return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called)
            callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy)
          ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null)
          return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted)
            duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused)
          ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http2 = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http2.createServer((req, res) => {
            const body = http2.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true)
          options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server)
          return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb)
          this.once("close", cb);
        if (this._state === CLOSING)
          return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server2 = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server2.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path)
            return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 8 && version !== 13) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info))
            return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable)
          return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING)
          return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer;
    function addListeners(server2, map) {
      for (const event of Object.keys(map))
        server2.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server2.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server2) {
      server2._state = CLOSED;
      server2.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http2.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http2.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server2, req, socket, code, message) {
      if (server2.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server2.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports, module) {
    "use strict";
    var WebSocket = require_websocket();
    WebSocket.createWebSocketStream = require_stream();
    WebSocket.Server = require_websocket_server();
    WebSocket.Receiver = require_receiver();
    WebSocket.Sender = require_sender();
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocket.Server;
    module.exports = WebSocket;
  }
});

// <stdin>
import http from "http";
var env = {
  "EDGEONE_PAGES_ACCELERATION_AREA": "overseas",
  "VSCODE_CRASH_REPORTER_PROCESS_TYPE": "extensionHost",
  "NODE": "/Applications/ServBay/package/node/22/22.21.1/bin/node",
  "INIT_CWD": "/Users/edy/Documents/vscodeProjects/SimPage",
  "SHELL": "/bin/zsh",
  "TMPDIR": "/var/folders/xx/jn55z4hd5pz9pb261dhs850r0000gn/T/",
  "npm_config_global_prefix": "/Applications/ServBay/package/node/22/22.21.1",
  "MallocNanoZone": "0",
  "ORIGINAL_XDG_CURRENT_DESKTOP": "undefined",
  "COLOR": "0",
  "npm_config_registry": "https://registry.npmmirror.com",
  "npm_config_noproxy": "",
  "npm_config_local_prefix": "/Users/edy/Documents/vscodeProjects/SimPage",
  "USER": "edy",
  "COMMAND_MODE": "unix2003",
  "npm_config_globalconfig": "/Applications/ServBay/package/node/22/22.21.1/etc/npmrc",
  "SSH_AUTH_SOCK": "/private/tmp/com.apple.launchd.DgOpY2DmzW/Listeners",
  "__CF_USER_TEXT_ENCODING": "0x1F5:0x19:0x34",
  "npm_execpath": "/Applications/ServBay/package/node/22/22.21.1/lib/node_modules/npm/bin/npm-cli.js",
  "ELECTRON_RUN_AS_NODE": "1",
  "PATH": "/Users/edy/.npm/_npx/00df61ab4d846258/node_modules/.bin:/Users/edy/Documents/vscodeProjects/SimPage/node_modules/.bin:/Users/edy/Documents/vscodeProjects/node_modules/.bin:/Users/edy/Documents/node_modules/.bin:/Users/edy/node_modules/.bin:/Users/node_modules/.bin:/node_modules/.bin:/Applications/ServBay/package/node/22/22.21.1/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin:/Users/edy/.npm/_npx/9bafde27a2dc1a65/node_modules/.bin:/Users/edy/Documents/vscodeProjects/SimPage/node_modules/.bin:/Users/edy/Documents/vscodeProjects/node_modules/.bin:/Users/edy/Documents/node_modules/.bin:/Users/edy/node_modules/.bin:/Users/node_modules/.bin:/node_modules/.bin:/Applications/ServBay/package/node/22/22.21.1/lib/node_modules/npm/node_modules/@npmcli/run-script/lib/node-gyp-bin:/Applications/ServBay/package/ollama:/Applications/ServBay/script/alias:/Applications/ServBay/bin:/Applications/ServBay/sbin:/Applications/ServBay/script:/Applications/ServBay/package/python/current/Python.framework/Versions/Current/bin:/Applications/ServBay/package/node/current/bin:/Applications/ServBay/package/go/current/bin:/Applications/ServBay/package/openjdk/current/bin:/Applications/ServBay/package/rust/current/bin:/Applications/ServBay/package/ruby/current/bin:/Applications/ServBay/package/dotnetsdk/current:/Applications/ServBay/package/dotnetsdk/current/tools:/Users/edy/.dotnet/tools:/Applications/ServBay/package/mono/current:/Applications/IntelliJ IDEA.app/Contents/plugins/maven/lib/maven3/bin:/Users/edy/.codebuddy/bin:/Users/edy/.codebuddy/bin:/Users/edy/.local/bin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/usr/local/corplink/mdm/opt/corplink-mdm/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/sbin:/Users/edy/.nvm/versions/node/*/bin:/Users/edy/.local/bin:/Applications/ServBay/package/ollama:/Applications/ServBay/script/alias:/Applications/ServBay/bin:/Applications/ServBay/sbin:/Applications/ServBay/script:/Applications/ServBay/package/python/current/Python.framework/Versions/Current/bin:/Applications/ServBay/package/node/current/bin:/Applications/ServBay/package/go/current/bin:/Applications/ServBay/package/openjdk/current/bin:/Applications/ServBay/package/rust/current/bin:/Applications/ServBay/package/ruby/current/bin:/Applications/ServBay/package/dotnetsdk/current:/Applications/ServBay/package/dotnetsdk/current/tools:/Users/edy/.dotnet/tools:/Applications/ServBay/package/mono/current:/Applications/IntelliJ IDEA.app/Contents/plugins/maven/lib/maven3/bin:/Users/edy/.codebuddy/bin",
  "MAVEN_HOME": "/Applications/IntelliJ IDEA.app/Contents/plugins/maven/lib/maven3",
  "npm_package_json": "/Users/edy/Documents/vscodeProjects/SimPage/package.json",
  "__CFBundleIdentifier": "com.tencent.codebuddycn",
  "npm_config_init_module": "/Users/edy/.npm-init.js",
  "npm_config_userconfig": "/Users/edy/.npmrc",
  "PWD": "/Users/edy/Documents/vscodeProjects/SimPage",
  "npm_command": "exec",
  "VSCODE_HANDLES_UNCAUGHT_ERRORS": "true",
  "VSCODE_ESM_ENTRYPOINT": "vs/workbench/api/node/extensionHostProcess",
  "EDITOR": "vi",
  "npm_lifecycle_event": "npx",
  "npm_package_name": "simpage-worker",
  "PGHOST": "/Applications/ServBay/tmp",
  "XPC_FLAGS": "0x0",
  "npm_config_npm_version": "10.9.4",
  "npm_config_node_gyp": "/Applications/ServBay/package/node/22/22.21.1/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js",
  "XPC_SERVICE_NAME": "application.com.tencent.codebuddycn.45957477.45957482",
  "npm_package_version": "1.1.0",
  "HOME": "/Users/edy",
  "SHLVL": "3",
  "VSCODE_NLS_CONFIG": '{"userLocale":"zh-cn","osLocale":"zh-cn","resolvedLanguage":"zh-cn","defaultMessagesFile":"/Applications/CodeBuddy CN.app/Contents/Resources/app/out/nls.messages.json","languagePack":{"translationsConfigFile":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn/tcf.json","messagesFile":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn/5639732ceec8bdff0a6e8d288b9a7af6934a3ef4-fce7caa7023dbd26b88d1c98694982f741645ea4/nls.messages.json","corruptMarkerFile":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn/corrupted.info"},"locale":"zh-cn","availableLanguages":{"*":"zh-cn"},"_languagePackId":"3efb5196290944c3f1ed073ef4db07a5.zh-cn","_languagePackSupport":true,"_translationsConfigFile":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn/tcf.json","_cacheRoot":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn","_resolvedLanguagePackCoreLocation":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn/5639732ceec8bdff0a6e8d288b9a7af6934a3ef4-fce7caa7023dbd26b88d1c98694982f741645ea4","_corruptedFile":"/Users/edy/Library/Application Support/CodeBuddy CN/clp/3efb5196290944c3f1ed073ef4db07a5.zh-cn/corrupted.info"}',
  "LOGNAME": "edy",
  "npm_config_cache": "/Users/edy/.npm",
  "npm_lifecycle_script": "edgeone",
  "VSCODE_CODE_CACHE_PATH": "/Users/edy/Library/Application Support/CodeBuddy CN/CachedData/5639732ceec8bdff0a6e8d288b9a7af6934a3ef4-fce7caa7023dbd26b88d1c98694982f741645ea4",
  "VSCODE_IPC_HOOK": "/Users/edy/Library/Application Support/CodeBuddy CN/1.10-main.sock",
  "CODEBUDDY_COPILOT_INTERNET_ENVIRONMENT": "selfhosted",
  "VSCODE_PID": "96067",
  "npm_config_user_agent": "npm/10.9.4 node/v22.21.1 darwin arm64 workspaces/false",
  "EDGEONE_PAGES_PROJECT_NAME": "ityetts",
  "VSCODE_CWD": "/",
  "VSCODE_L10N_BUNDLE_LOCATION": "file:///Applications/CodeBuddy%20CN.app/Contents/Resources/app/extensions/vscode-language-pack-zh-hans/translations/extensions/vscode.markdown-language-features.i18n.json",
  "npm_config_prefix": "/Applications/ServBay/package/node/22/22.21.1",
  "npm_node_execpath": "/Applications/ServBay/package/node/22/22.21.1/bin/node",
  "EDGEONE_PAGES_API_TOKEN": "50a4fe080c5054b01270d87a2ed7668f"
};
Object.assign(env, process.env || {});
delete env.TENCENTCLOUD_UIN;
delete env.TENCENTCLOUD_APPID;
try {
  process.removeAllListeners("uncaughtException");
  process.removeAllListeners("unhandledRejection");
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason);
  });
} catch (error) {
  console.error("Uncaught Exception:", error);
}
var port = 9e3;
var EdgeoneBodyParser = class {
  /**
   * Parse request body according to Content-Type, strictly following Edgeone rules
   * @param {Buffer} buffer Raw request body data
   * @param {string} contentType Content-Type header
   * @returns Parsed data
   */
  static parseBodyByContentType(buffer, contentType = "") {
    if (!buffer || buffer.length === 0) {
      return void 0;
    }
    const normalizedContentType = contentType.split(";")[0].trim().toLowerCase();
    switch (normalizedContentType) {
      case "application/json":
        try {
          const text = buffer.toString("utf-8");
          return JSON.parse(text);
        } catch (error) {
          throw new Error(`Invalid JSON in request body: ${error.message}`);
        }
      case "application/x-www-form-urlencoded":
        const formText = buffer.toString("utf-8");
        const params = new URLSearchParams(formText);
        const result = {};
        for (const [key, value] of params) {
          result[key] = value;
        }
        return result;
      case "text/plain":
        return buffer.toString("utf-8");
      case "application/octet-stream":
        return buffer;
      default:
        return buffer;
    }
  }
  /**
   * Parse URL query parameters
   * @param {string} url Full URL or query string
   * @returns {Object} Parsed query parameters object
   */
  static parseQuery(url) {
    if (!url)
      return {};
    const queryStart = url.indexOf("?");
    const queryString = queryStart >= 0 ? url.substring(queryStart + 1) : url;
    if (!queryString)
      return {};
    const params = {};
    const pairs = queryString.split("&");
    for (const pair of pairs) {
      if (!pair)
        continue;
      const equalIndex = pair.indexOf("=");
      let key, value;
      if (equalIndex === -1) {
        key = pair;
        value = true;
      } else if (equalIndex === 0) {
        continue;
      } else {
        key = pair.substring(0, equalIndex);
        value = pair.substring(equalIndex + 1);
        if (value === "") {
          value = "";
        }
      }
      if (key) {
        try {
          const decodedKey = decodeURIComponent(key);
          let decodedValue;
          if (typeof value === "boolean") {
            decodedValue = value;
          } else {
            decodedValue = decodeURIComponent(value);
            if (decodedValue === "true") {
              decodedValue = true;
            } else if (decodedValue === "false") {
              decodedValue = false;
            } else if (decodedValue === "null") {
              decodedValue = null;
            } else if (decodedValue === "undefined") {
              decodedValue = void 0;
            } else if (/^-?d+$/.test(decodedValue)) {
              const num = parseInt(decodedValue, 10);
              if (!isNaN(num) && num.toString() === decodedValue) {
                decodedValue = num;
              }
            } else if (/^-?d*.d+$/.test(decodedValue)) {
              const num = parseFloat(decodedValue);
              if (!isNaN(num) && num.toString() === decodedValue) {
                decodedValue = num;
              }
            }
          }
          if (params[decodedKey] !== void 0) {
            if (Array.isArray(params[decodedKey])) {
              params[decodedKey].push(decodedValue);
            } else {
              params[decodedKey] = [params[decodedKey], decodedValue];
            }
          } else {
            params[decodedKey] = decodedValue;
          }
        } catch (error) {
          if (typeof value === "boolean") {
            params[key] = value;
          } else {
            params[key] = value || "";
          }
        }
      }
    }
    return params;
  }
  /**
   * Parse Cookie header
   * @param {string} cookieHeader Cookie header string
   * @returns {Object} Parsed cookies object
   */
  static parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader || typeof cookieHeader !== "string") {
      return cookies;
    }
    cookieHeader.split(";").forEach((cookie) => {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex > 0) {
        const name = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        try {
          cookies[name] = decodeURIComponent(value);
        } catch (error) {
          cookies[name] = value;
        }
      }
    });
    return cookies;
  }
  /**
   * Read the full request body data from the stream
   */
  static async readBodyFromStream(req, maxSize = 50 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      if (req.readableEnded || req.destroyed) {
        resolve(Buffer.alloc(0));
        return;
      }
      if (req._bodyBuffer !== void 0) {
        resolve(req._bodyBuffer);
        return;
      }
      const chunks = [];
      let totalSize = 0;
      const cleanup = () => {
        req.removeListener("data", onData);
        req.removeListener("end", onEnd);
        req.removeListener("error", onError);
      };
      const onData = (chunk) => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          cleanup();
          reject(new Error(`Request body too large. Max size: ${maxSize} bytes`));
          return;
        }
        chunks.push(chunk);
      };
      const onEnd = () => {
        cleanup();
        const buffer = Buffer.concat(chunks);
        req._bodyBuffer = buffer;
        resolve(buffer);
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      req.on("data", onData);
      req.on("end", onEnd);
      req.on("error", onError);
      if (req.readable && !req.readableFlowing) {
        req.resume();
      }
    });
  }
};
function createEdgeoneCompatibleRequest(originalReq, isFramework = false) {
  const method = (originalReq.method || "GET").toUpperCase();
  const protocol = originalReq.headers["x-forwarded-proto"] || "http";
  const host = originalReq.headers.host || "localhost";
  const url = protocol + "://" + host + (originalReq.url || "/");
  const headerPairs = [];
  for (const key in originalReq.headers) {
    const v = originalReq.headers[key];
    if (typeof v === "string") {
      headerPairs.push([key, v]);
    } else if (Array.isArray(v)) {
      headerPairs.push([key, v.join(", ")]);
    } else if (v != null) {
      headerPairs.push([key, String(v)]);
    }
  }
  const init = {
    method,
    headers: new Headers(headerPairs)
  };
  if (method !== "GET" && method !== "HEAD") {
    init.duplex = "half";
    init.body = originalReq;
  }
  const request = new Request(url, init);
  let parsedBodyCache = void 0;
  let parsedBodyReady = false;
  let parsedBodyError = null;
  const contentType = request.headers.get("content-type") || "";
  const preloadBody = async () => {
    if (method === "GET" || method === "HEAD") {
      parsedBodyCache = void 0;
      parsedBodyReady = true;
      return;
    }
    try {
      const clone = request.clone();
      const ab = await clone.arrayBuffer();
      const buf = Buffer.from(ab);
      request._rawBodyBuffer = buf;
      parsedBodyCache = EdgeoneBodyParser.parseBodyByContentType(buf, contentType);
      parsedBodyReady = true;
    } catch (err) {
      parsedBodyError = err;
      parsedBodyReady = true;
    }
  };
  request._bodyPreloadPromise = preloadBody();
  if (!("cookies" in request)) {
    Object.defineProperty(request, "cookies", {
      get() {
        return EdgeoneBodyParser.parseCookies(request.headers.get("cookie") || "");
      },
      configurable: true,
      enumerable: true
    });
  }
  if (!("query" in request)) {
    Object.defineProperty(request, "query", {
      get() {
        return EdgeoneBodyParser.parseQuery(request.url || "");
      },
      configurable: true,
      enumerable: true
    });
  }
  Object.defineProperty(request, "body", {
    get() {
      if (parsedBodyReady) {
        if (parsedBodyError)
          throw parsedBodyError;
        return parsedBodyCache;
      }
      return new Promise((resolve, reject) => {
        (async () => {
          try {
            await request._bodyPreloadPromise;
            if (parsedBodyError)
              return reject(parsedBodyError);
            resolve(parsedBodyCache);
          } catch (e) {
            reject(e);
          }
        })();
      });
    },
    configurable: true,
    enumerable: true
  });
  return request;
}
async function handleResponse(res, response, passHeaders = {}) {
  var _a, _b, _c;
  const startTime = Date.now();
  if (!response) {
    const requestId = passHeaders["functions-request-id"] || "";
    res.writeHead(404, {
      "Functions-Request-Id": requestId,
      "eo-pages-inner-scf-status": "404",
      "eo-pages-inner-status-intercept": "true"
    });
    res.end(JSON.stringify({
      error: "Not Found",
      message: "The requested path does not exist"
    }));
    const endTime = Date.now();
    console.log(`Pages response status: 404`);
    return;
  }
  try {
    if (response instanceof Response) {
      const requestId = passHeaders["functions-request-id"] || "";
      const responseStatus = response.status;
      const headers = Object.fromEntries(response.headers);
      headers["Functions-Request-Id"] = requestId;
      if (!headers["eo-pages-inner-scf-status"]) {
        headers["eo-pages-inner-scf-status"] = String(responseStatus);
      }
      if (!headers["eo-pages-inner-status-intercept"]) {
        headers["eo-pages-inner-status-intercept"] = "false";
      }
      if (response.headers.get("eop-client-geo")) {
        response.headers.delete("eop-client-geo");
      }
      const isStream = response.body && (((_a = response.headers.get("content-type")) == null ? void 0 : _a.includes("text/event-stream")) || ((_b = response.headers.get("transfer-encoding")) == null ? void 0 : _b.includes("chunked")) || response.body instanceof ReadableStream || typeof response.body.pipe === "function" || response.headers.get("x-content-type-stream") === "true");
      if (isStream) {
        const streamHeaders = {
          ...headers
        };
        if ((_c = response.headers.get("content-type")) == null ? void 0 : _c.includes("text/event-stream")) {
          streamHeaders["Content-Type"] = "text/event-stream";
        }
        res.writeHead(response.status, streamHeaders);
        if (typeof response.body.pipe === "function") {
          response.body.pipe(res);
        } else {
          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done)
                break;
              if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
                res.write(value);
              } else {
                const chunk = new TextDecoder().decode(value);
                res.write(chunk);
              }
            }
          } finally {
            reader.releaseLock();
            res.end();
          }
        }
      } else {
        res.writeHead(response.status, headers);
        const body = await response.text();
        res.end(body);
      }
    } else {
      const requestId = passHeaders["functions-request-id"] || "";
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Functions-Request-Id": requestId,
        "eo-pages-inner-scf-status": "200",
        "eo-pages-inner-status-intercept": "false"
      });
      res.end(JSON.stringify(response));
    }
  } catch (error) {
    const requestId = passHeaders["functions-request-id"] || "";
    res.writeHead(502, {
      "Functions-Request-Id": requestId,
      "eo-pages-inner-scf-status": "502",
      "eo-pages-inner-status-intercept": "true"
    });
    res.end(JSON.stringify({
      error: "Internal Server Error",
      message: error.message
    }));
  } finally {
    const endTime = Date.now();
    console.log(`Pages response status: ${(response == null ? void 0 : response.status) || "unknown"}`);
  }
}
var server = http.createServer(async (req, res) => {
  try {
    const requestStartTime = Date.now();
    const geoStr = decodeURIComponent(req.headers["eo-connecting-geo"]) || "";
    const geo = geoStr ? (() => {
      const result = {};
      const matches = geoStr.match(/[a-z_]+="[^"]*"|[a-z_]+=[A-Za-z0-9.-]+/g) || [];
      matches.forEach((match) => {
        const [key, value] = match.split("=", 2);
        result[key] = value.replace(/^"|"$/g, "");
      });
      return result;
    })() : {};
    const newGeo = {
      asn: geo.asn,
      countryName: geo.nation_name,
      countryCodeAlpha2: geo.region_code && geo.region_code.split("-")[0],
      countryCodeNumeric: geo.nation_numeric,
      regionName: geo.region_name,
      regionCode: geo.region_code,
      cityName: geo.city_name,
      latitude: geo.latitude,
      longitude: geo.longitude,
      cisp: geo.network_operator
    };
    const safeGeo = {};
    for (const [key, value] of Object.entries(newGeo)) {
      if (value !== void 0 && value !== null) {
        if (typeof value === "string" && /[一-鿿]/.test(value)) {
          safeGeo[key] = Buffer.from(value, "utf8").toString("utf8");
        } else {
          safeGeo[key] = value;
        }
      }
    }
    req.headers["eo-connecting-geo"] = safeGeo;
    let context = {};
    let enhancedRequest = {};
    req.headers["functions-request-id"] = req.headers["x-scf-request-id"] || "";
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    let fullPath = "";
    if (req.headers.host === "localhost:9000") {
      fullPath = pathname;
    } else {
      const host = req.headers["eo-pages-host"];
      const xForwardedProto = req.headers["x-forwarded-proto"];
      fullPath = (xForwardedProto || "https") + "://" + host + req.url;
      if (fullPath.endsWith("?")) {
        fullPath = fullPath.slice(0, -1);
      }
    }
    console.log("\n");
    console.log(`Pages request path: ${fullPath}`);
    let response = null;
    if (pathname.startsWith("/api/")) {
      enhancedRequest = createEdgeoneCompatibleRequest(req, false);
      if (enhancedRequest._bodyPreloadPromise) {
        try {
          await enhancedRequest._bodyPreloadPromise;
        } catch (error) {
          console.warn("Body preload failed:", error.message);
        }
      }
      context = {
        request: enhancedRequest,
        env,
        // Use injected environment variables
        params: {},
        uuid: req.headers["eo-log-uuid"] || "",
        server: {
          region: req.headers["x-scf-region"] || "",
          requestId: req.headers["x-scf-request-id"] || ""
        },
        clientIp: req.headers["eo-connecting-ip"] || "",
        geo: safeGeo
      };
      for (const key in req.headers) {
        if (key.startsWith("x-scf-")) {
          delete req.headers[key];
        }
        if (key.startsWith("x-cube-")) {
          delete req.headers[key];
        }
      }
      const routeMatch = pathname.slice("/api/".length);
      const cleanPath = routeMatch.startsWith("/") ? routeMatch.slice(1) : routeMatch;
      if (!cleanPath) {
        return;
      }
      const params = {};
      params["default"] = cleanPath.split("/");
      context.params = params;
      const mod_0 = (() => {
        var EdgeOneKVStorage = class {
          constructor(env2) {
            this.env = env2 || {};
            this.NAMESPACE = {
              NAVIGATION: "navigation_data",
              SESSIONS: "session_data",
              CONFIG: "config_data"
            };
            this.DEFAULT_TTL = 30 * 24 * 60 * 60;
            this.SESSION_TTL = 12 * 60 * 60;
            console.log("Initializing EdgeOne Pages KV Storage");
          }
          async cleanupExpiredSessions() {
            try {
              const now = Date.now();
              const sessionsData = await this.getKVData(this.NAMESPACE.SESSIONS, {});
              let cleanedCount = 0;
              for (const [token, sessionData] of Object.entries(sessionsData)) {
                if (sessionData.expires && now > sessionData.expires) {
                  delete sessionsData[token];
                  cleanedCount++;
                }
              }
              if (cleanedCount > 0) {
                await this.setKVData(this.NAMESPACE.SESSIONS, sessionsData);
                console.log(`Cleaned ${cleanedCount} expired sessions from KV storage`);
              }
            } catch (error) {
              console.error("Error during session cleanup:", error);
            }
          }
          // KV存储辅助函数方法
          async getKVData(key, defaultValue = null) {
            try {
              if (this.env && this.env.KV_NAMESPACE) {
                const value = await this.env.KV_NAMESPACE.get(key);
                return value ? JSON.parse(value) : defaultValue;
              }
              if (typeof globalThis !== "undefined" && globalThis.kvStorage) {
                const item = globalThis.kvStorage.get(key);
                if (item) {
                  if (item.expires && Date.now() > item.expires) {
                    globalThis.kvStorage.delete(key);
                    return defaultValue;
                  }
                  return JSON.parse(item.value);
                }
              }
              return defaultValue;
            } catch (error) {
              console.error(`Error getting KV data for key ${key}:`, error);
              return defaultValue;
            }
          }
          async setKVData(key, value, options = {}) {
            try {
              const ttl = options.ttl || this.DEFAULT_TTL;
              const jsonValue = JSON.stringify(value);
              if (this.env && this.env.KV_NAMESPACE) {
                await this.env.KV_NAMESPACE.put(key, jsonValue, {
                  expirationTtl: ttl
                });
                console.log(`Successfully stored data to KV with key: ${key}`);
                return true;
              }
              if (typeof globalThis !== "undefined") {
                if (!globalThis.kvStorage) {
                  globalThis.kvStorage = /* @__PURE__ */ new Map();
                }
                globalThis.kvStorage.set(key, {
                  value: jsonValue,
                  expires: ttl ? Date.now() + ttl * 1e3 : null
                });
                console.log(`Stored data in global storage with key: ${key}`);
                return true;
              }
              return false;
            } catch (error) {
              console.error(`Error setting KV data for key ${key}:`, error);
              return false;
            }
          }
          async getExternalData() {
            try {
              const externalUrl = "https://down.ityet.com:99/file/navigation.json";
              console.log("Fetching navigation data from external URL:", externalUrl);
              const response2 = await fetch(externalUrl, {
                headers: {
                  "User-Agent": "SimPage-EdgeOne/1.0",
                  "Accept": "application/json",
                  "Cache-Control": "no-cache"
                }
              });
              if (response2.ok) {
                const data = await response2.json();
                console.log("Successfully fetched navigation data from external URL");
                return data;
              } else {
                console.log("External fetch failed, status:", response2.status);
                return null;
              }
            } catch (error) {
              console.log("External fetch error:", error.message);
              return null;
            }
          }
          async readFullData() {
            try {
              console.log("Reading navigation data from KV storage");
              const kvData = await this.getKVData(this.NAMESPACE.NAVIGATION);
              if (kvData) {
                console.log("Successfully read navigation data from KV");
                return kvData;
              }
              console.log("No KV data found, trying external URL...");
              const externalData = await this.getExternalData();
              if (externalData) {
                await this.setKVData(this.NAMESPACE.NAVIGATION, externalData);
                console.log("Stored external data to KV storage");
                return externalData;
              }
              console.log("No external data found, using default data...");
              const defaultData = await this.createDefaultData();
              await this.setKVData(this.NAMESPACE.NAVIGATION, defaultData);
              return defaultData;
            } catch (error) {
              console.error("\u8BFB\u53D6\u5BFC\u822A\u6570\u636E\u5931\u8D25:", error);
              console.log("Using default data as fallback");
              const defaultData = await this.createDefaultData();
              try {
                await this.setKVData(this.NAMESPACE.NAVIGATION, defaultData);
              } catch (e) {
                console.error("Failed to store default data:", e);
              }
              return defaultData;
            }
          }
          async writeFullData(fullData) {
            try {
              console.log("Writing navigation data to KV storage");
              const success = await this.setKVData(this.NAMESPACE.NAVIGATION, fullData);
              if (success) {
                console.log("Successfully wrote navigation data to KV storage");
                return;
              } else {
                throw new Error("Failed to write to KV storage");
              }
            } catch (error) {
              console.error("\u5199\u5165\u5BFC\u822A\u6570\u636E\u5931\u8D25:", error);
              throw new Error(`\u5199\u5165\u6570\u636E\u5931\u8D25: ${error.message}`);
            }
          }
          async getSession(token) {
            try {
              console.log("Getting session for token:", token.substring(0, 10) + "...");
              const sessionsData = await this.getKVData(this.NAMESPACE.SESSIONS, {});
              const sessionData = sessionsData[token];
              if (sessionData) {
                if (sessionData.expires && Date.now() > sessionData.expires) {
                  delete sessionsData[token];
                  await this.setKVData(this.NAMESPACE.SESSIONS, sessionsData);
                  console.log("Session expired and removed from KV");
                  return null;
                }
                console.log("Session found in KV storage");
                return sessionData.value;
              }
              console.log("Session not found");
              return null;
            } catch (error) {
              console.error("\u83B7\u53D6\u4F1A\u8BDD\u5931\u8D25:", error);
              return null;
            }
          }
          async setSession(token, value, options = {}) {
            try {
              console.log("Setting session for token:", token.substring(0, 10) + "...");
              const sessionData = {
                value,
                expires: options && options.ttl ? Date.now() + options.ttl * 1e3 : null
              };
              const sessionsData = await this.getKVData(this.NAMESPACE.SESSIONS, {});
              sessionsData[token] = sessionData;
              const success = await this.setKVData(this.NAMESPACE.SESSIONS, sessionsData, {
                ttl: this.SESSION_TTL
              });
              if (success) {
                console.log("Session stored in KV storage");
              } else {
                console.log("Failed to store session in KV, continuing anyway");
              }
              return;
            } catch (error) {
              console.error("\u8BBE\u7F6E\u4F1A\u8BDD\u5931\u8D25:", error);
              throw new Error(`\u8BBE\u7F6E\u4F1A\u8BDD\u5931\u8D25: ${error.message}`);
            }
          }
          getBaseUrl(request) {
            if (request && request.url) {
              try {
                const url2 = new URL(request.url);
                return `${url2.protocol}//${url2.host}`;
              } catch (error) {
                console.error("Error parsing request URL:", error);
              }
            }
            return "https://nav.itmax.cn";
          }
          async createDefaultData() {
            const DEFAULT_ADMIN_PASSWORD = "admin123";
            const {
              passwordHash,
              passwordSalt
            } = await this.hashPassword(DEFAULT_ADMIN_PASSWORD);
            const defaultData = {
              settings: {
                siteName: "Navs",
                siteLogo: "\u{1F390}",
                greeting: "",
                footer: "** LeoNavs ** \u4E0D\u65AD\u5B66\u4E60\uFF0C\u4E0D\u65AD\u5C1D\u8BD5\uFF0C\u4E0D\u65AD\u8FDB\u6B65\uFF01\uFF01",
                weather: {
                  city: "\u676D\u5DDE"
                }
              },
              apps: [{
                id: "f479451e-579d-4ca1-be9e-31bc7d708cae",
                name: "\u7FA4\u6656QC",
                url: "https://mumupudding.quickconnect.cn/",
                description: "\u7FA4\u6656quickconnect,\u5176\u5B83\u81EA\u5B9A\u4E49\u57DF\u540Dnas.itmax|ityet.cn|only.ydns.eu|igogo.dns.navy",
                icon: "\u{1F5A5}\uFE0F"
              }, {
                id: "e879451e-579d-4ca1-be9e-31bc7d708cae",
                name: "ITmax\u77ED\u94FE\u63A5",
                url: "https://dwz.ityet.com/",
                description: "ITyet\u77ED\u94FE\u63A5",
                icon: "\u{1F3E0}"
              }, {
                id: "f779451e-579d-4ca1-be9e-31bc7d708cae",
                name: "Omnibox",
                url: "https://omni.ityet.com/",
                description: "\u7535\u5F71\u52A8\u6F2B\u8D44\u6E90\u7AD9\uFF0C\u652F\u6301\u7F51\u76D8\u641C\u7D22",
                icon: "\u{1F37F}"
              }],
              bookmarks: [{
                id: "bookmark-oschina",
                name: "\u5F00\u6E90\u4E2D\u56FD",
                url: "https://www.oschina.net/",
                description: "\u805A\u7126\u5F00\u6E90\u4FE1\u606F\u4E0E\u6280\u672F\u793E\u533A\u3002",
                icon: "\u{1F310}",
                category: "\u6280\u672F\u793E\u533A"
              }, {
                id: "bookmark-sspai",
                name: "\u5C11\u6570\u6D3E",
                url: "https://sspai.com/",
                description: "\u5173\u6CE8\u6548\u7387\u5DE5\u5177\u4E0E\u751F\u6D3B\u65B9\u5F0F\u7684\u5A92\u4F53\u3002",
                icon: "\u{1F4F0}",
                category: "\u6548\u7387\u4E0E\u751F\u6D3B"
              }, {
                id: "bookmark-zhihu",
                name: "\u77E5\u4E4E",
                url: "https://www.zhihu.com/",
                description: "\u95EE\u7B54\u4E0E\u77E5\u8BC6\u5206\u4EAB\u793E\u533A\u3002",
                icon: "\u2753",
                category: "\u77E5\u8BC6\u5B66\u4E60"
              }],
              stats: {
                visitorCount: 0
              },
              admin: {
                passwordHash,
                passwordSalt
              }
            };
            console.log("Created default data with admin password:", DEFAULT_ADMIN_PASSWORD);
            return defaultData;
          }
          async hashPassword(password) {
            const salt = new Uint8Array(16);
            crypto.getRandomValues(salt);
            const saltHex = this.bufferToHex(salt);
            const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), {
              name: "PBKDF2"
            }, false, ["deriveBits"]);
            const derivedBits = await crypto.subtle.deriveBits({
              name: "PBKDF2",
              salt,
              iterations: 1e5,
              hash: "SHA-256"
            }, keyMaterial, 512);
            const hashHex = this.bufferToHex(new Uint8Array(derivedBits));
            return {
              passwordHash: hashHex,
              passwordSalt: saltHex
            };
          }
          bufferToHex(buffer) {
            return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
          }
        };
        var storage = null;
        function getStorage(env2) {
          if (!storage) {
            storage = new EdgeOneKVStorage(env2);
            if (typeof setInterval !== "undefined") {
              setInterval(() => {
                storage.cleanupExpiredSessions();
              }, 10 * 60 * 1e3);
            }
          }
          return storage;
        }
        var BASE_DEFAULT_SETTINGS = Object.freeze({
          siteName: "SimPage",
          siteLogo: "",
          greeting: "",
          footer: ""
        });
        var DEFAULT_STATS = Object.freeze({
          visitorCount: 0
        });
        var DEFAULT_WEATHER_CONFIG = Object.freeze({
          city: "\u5317\u4EAC"
        });
        var SESSION_TTL_SECONDS = 12 * 60 * 60;
        var AUTH_HEADER_PREFIX = "Bearer ";
        async function handleLogin(request, env2) {
          const body = await request.json().catch(() => null);
          const password = typeof (body == null ? void 0 : body.password) === "string" ? body.password : "";
          if (!password) {
            return jsonResponse({
              success: false,
              message: "\u8BF7\u8F93\u5165\u5BC6\u7801\u3002"
            }, 400);
          }
          const storage2 = getStorage(env2);
          const fullData = await storage2.readFullData();
          const admin = fullData.admin;
          if (!admin || !admin.passwordSalt || !admin.passwordHash) {
            return jsonResponse({
              success: false,
              message: "\u767B\u5F55\u529F\u80FD\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002"
            }, 500);
          }
          const isMatch = await verifyPassword(password, admin.passwordSalt, admin.passwordHash);
          if (!isMatch) {
            return jsonResponse({
              success: false,
              message: "\u5BC6\u7801\u9519\u8BEF\u3002"
            }, 401);
          }
          const token = generateToken();
          await storage2.setSession(token, "active", {
            ttl: SESSION_TTL_SECONDS
          });
          return jsonResponse({
            success: true,
            token
          });
        }
        async function handleGetData(request, env2) {
          try {
            const storage2 = getStorage(env2);
            const data = await incrementVisitorCountAndReadData(storage2);
            return jsonResponse(data);
          } catch (error) {
            console.error("Error in handleGetData:", error);
            return jsonResponse({
              success: false,
              message: `Error fetching data: ${error.message}`,
              stack: error.stack
            }, 500);
          }
        }
        async function handleGetWeather(request, env2) {
          var _a;
          try {
            const storage2 = getStorage(env2);
            const fullData = await storage2.readFullData();
            const weatherSettings = normaliseWeatherSettingsValue((_a = fullData.settings) == null ? void 0 : _a.weather);
            let cities = weatherSettings.city;
            if (!Array.isArray(cities) || cities.length === 0) {
              cities = [DEFAULT_WEATHER_CONFIG.city];
            }
            const weatherPromises = cities.map((city) => fetchOpenMeteoWeather(city).then((weather) => ({
              ...weather,
              city,
              success: true
            })).catch((error) => {
              console.error(`\u83B7\u53D6\u57CE\u5E02 ${city} \u7684\u5929\u6C14\u4FE1\u606F\u5931\u8D25\uFF1A`, error);
              return {
                city,
                success: false,
                message: error.message
              };
            }));
            const results = await Promise.all(weatherPromises);
            const successfulWeatherData = results.filter((r) => r.success);
            if (successfulWeatherData.length === 0 && results.length > 0) {
              const firstError = results.find((r) => !r.success);
              const errorMessage = (firstError == null ? void 0 : firstError.message) || "\u65E0\u6CD5\u83B7\u53D6\u4EFB\u4F55\u57CE\u5E02\u7684\u5929\u6C14\u4FE1\u606F\u3002";
              return jsonResponse({
                success: false,
                message: errorMessage
              }, 502);
            }
            return jsonResponse({
              success: true,
              data: successfulWeatherData
            });
          } catch (error) {
            const statusCode = error.statusCode || 502;
            return jsonResponse({
              success: false,
              message: error.message
            }, statusCode);
          }
        }
        async function handleGetAdminData(request, env2) {
          var _a;
          const storage2 = getStorage(env2);
          const fullData = await storage2.readFullData();
          const data = sanitiseData(fullData);
          const weather = normaliseWeatherSettingsValue((_a = fullData.settings) == null ? void 0 : _a.weather);
          const cityString = Array.isArray(weather.city) ? weather.city.join(" ") : weather.city;
          data.settings.weather = {
            city: cityString
          };
          return jsonResponse({
            success: true,
            data
          });
        }
        async function handleDataUpdate(request, env2) {
          try {
            const {
              apps,
              bookmarks,
              settings
            } = await request.json();
            const normalisedApps = normaliseCollection(apps, {
              label: "\u5E94\u7528",
              type: "apps"
            });
            const normalisedBookmarks = normaliseCollection(bookmarks, {
              label: "\u4E66\u7B7E",
              type: "bookmarks"
            });
            const normalisedSettings = normaliseSettingsInput(settings);
            const storage2 = getStorage(env2);
            const existing = await storage2.readFullData();
            const payload = {
              settings: normalisedSettings,
              apps: normalisedApps,
              bookmarks: normalisedBookmarks,
              stats: existing.stats,
              admin: existing.admin
            };
            await storage2.writeFullData(payload);
            return jsonResponse({
              success: true,
              data: sanitiseData(payload)
            });
          } catch (error) {
            return jsonResponse({
              success: false,
              message: error.message
            }, 400);
          }
        }
        async function handlePasswordUpdate(request, env2) {
          const body = await request.json().catch(() => null);
          const currentPassword = typeof (body == null ? void 0 : body.currentPassword) === "string" ? body.currentPassword : "";
          const newPasswordRaw = typeof (body == null ? void 0 : body.newPassword) === "string" ? body.newPassword : "";
          if (!currentPassword) {
            return jsonResponse({
              success: false,
              message: "\u8BF7\u8F93\u5165\u5F53\u524D\u5BC6\u7801\u3002"
            }, 400);
          }
          const cleanNewPassword = newPasswordRaw.trim();
          if (!cleanNewPassword || cleanNewPassword.length < 6) {
            return jsonResponse({
              success: false,
              message: "\u65B0\u5BC6\u7801\u957F\u5EA6\u81F3\u5C11\u4E3A 6 \u4F4D\u3002"
            }, 400);
          }
          const storage2 = getStorage(env2);
          const fullData = await storage2.readFullData();
          const admin = fullData.admin;
          if (!admin || !admin.passwordHash || !admin.passwordSalt) {
            return jsonResponse({
              success: false,
              message: "\u5BC6\u7801\u4FEE\u6539\u529F\u80FD\u6682\u4E0D\u53EF\u7528\u3002"
            }, 500);
          }
          const isMatch = await verifyPassword(currentPassword, admin.passwordSalt, admin.passwordHash);
          if (!isMatch) {
            return jsonResponse({
              success: false,
              message: "\u5F53\u524D\u5BC6\u7801\u4E0D\u6B63\u786E\u3002"
            }, 401);
          }
          const isSameAsOld = await verifyPassword(cleanNewPassword, admin.passwordSalt, admin.passwordHash);
          if (isSameAsOld) {
            return jsonResponse({
              success: false,
              message: "\u65B0\u5BC6\u7801\u4E0D\u80FD\u4E0E\u5F53\u524D\u5BC6\u7801\u76F8\u540C\u3002"
            }, 400);
          }
          const {
            passwordHash,
            passwordSalt
          } = await hashPassword(cleanNewPassword);
          const updatedData = {
            ...fullData,
            admin: {
              passwordHash,
              passwordSalt
            }
          };
          await storage2.writeFullData(updatedData);
          return jsonResponse({
            success: true,
            message: "\u5BC6\u7801\u5DF2\u66F4\u65B0\uFF0C\u4E0B\u6B21\u767B\u5F55\u8BF7\u4F7F\u7528\u65B0\u5BC6\u7801\u3002"
          });
        }
        function handleFetchLogo(request, env2) {
          try {
            const {
              searchParams
            } = new URL(request.url);
            const targetUrl = searchParams.get("targetUrl");
            if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
              return jsonResponse({
                success: false,
                message: "\u7F3A\u5C11\u6709\u6548\u7684 targetUrl \u53C2\u6570"
              }, 400);
            }
            let domain = targetUrl.trim().replace(/^(https?:\/\/)?/, "");
            domain = domain.split("/")[0];
            if (!domain) {
              return jsonResponse({
                success: false,
                message: "\u65E0\u6CD5\u4ECE\u94FE\u63A5\u4E2D\u63D0\u53D6\u57DF\u540D\u3002"
              }, 400);
            }
            const logoUrl = `https://icon.ooo/${domain}`;
            return jsonResponse({
              success: true,
              logoUrl
            });
          } catch (error) {
            console.error("\u751F\u6210 Logo \u94FE\u63A5\u65F6\u53D1\u751F\u5185\u90E8\u9519\u8BEF:", error);
            return jsonResponse({
              success: false,
              message: "\u751F\u6210 Logo \u94FE\u63A5\u5931\u8D25"
            }, 500);
          }
        }
        async function handleNavigationProxy() {
          try {
            const externalUrl = "https://down.ityet.com:99/file/navigation.json";
            console.log("Proxying navigation data from:", externalUrl);
            const response2 = await fetch(externalUrl, {
              headers: {
                "User-Agent": "SimPage-EdgeOne/1.0",
                "Accept": "application/json",
                "Cache-Control": "no-cache"
              }
            });
            if (!response2.ok) {
              console.error("External fetch failed:", response2.status, response2.statusText);
              return jsonResponse({
                success: false,
                message: `\u5916\u90E8\u6570\u636E\u83B7\u53D6\u5931\u8D25: ${response2.status} ${response2.statusText}`
              }, response2.status);
            }
            const data = await response2.json();
            console.log("Successfully proxied navigation data");
            return jsonResponse({
              success: true,
              data
            });
          } catch (error) {
            console.error("Navigation proxy error:", error);
            return jsonResponse({
              success: false,
              message: `\u4EE3\u7406\u8BF7\u6C42\u5931\u8D25: ${error.message}`
            }, 500);
          }
        }
        async function requireAuth(request, env2) {
          const raw = request.headers.get("authorization");
          if (!raw || !raw.startsWith(AUTH_HEADER_PREFIX)) {
            console.log("No authorization header or invalid format");
            return jsonResponse({
              success: false,
              message: "\u8BF7\u767B\u5F55\u540E\u518D\u6267\u884C\u6B64\u64CD\u4F5C\u3002"
            }, 401);
          }
          const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
          if (!token) {
            console.log("Empty token in authorization header");
            return jsonResponse({
              success: false,
              message: "\u8BF7\u767B\u5F55\u540E\u518D\u6267\u884C\u6B64\u64CD\u4F5C\u3002"
            }, 401);
          }
          const storage2 = getStorage(env2);
          const session = await storage2.getSession(token);
          if (!session) {
            console.log("Session not found or expired for token:", token.substring(0, 10) + "...");
            return jsonResponse({
              success: false,
              message: "\u767B\u5F55\u72B6\u6001\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u3002"
            }, 401);
          }
          console.log("Session validated successfully for token:", token.substring(0, 10) + "...");
        }
        async function incrementVisitorCountAndReadData(storage2) {
          var _a;
          const fullData = await storage2.readFullData();
          const sanitised = sanitiseData(fullData);
          const currentCount = ((_a = fullData.stats) == null ? void 0 : _a.visitorCount) || 0;
          const nextVisitorCount = currentCount + 1;
          sanitised.visitorCount = nextVisitorCount;
          const updatedData = {
            ...fullData,
            stats: {
              ...fullData.stats,
              visitorCount: nextVisitorCount
            }
          };
          storage2.writeFullData(updatedData).catch((error) => {
            console.error("Failed to update visitor count:", error);
          });
          return sanitised;
        }
        async function handleRequest(request, env2, runtime, clientIp, context2 = null) {
          const url2 = new URL(request.url);
          const path = url2.pathname;
          const method = request.method;
          console.log(`${method} ${path} - ${clientIp}`);
          try {
            if (method === "OPTIONS") {
              return new Response(null, {
                status: 200,
                headers: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                  "Access-Control-Allow-Headers": "Content-Type, Authorization"
                }
              });
            }
            if (path === "/api/login" && method === "POST") {
              return await handleLogin(request, env2);
            }
            if (path === "/api/data" && method === "GET") {
              return await handleGetData(request, env2);
            }
            if (path === "/api/weather" && method === "GET") {
              return await handleGetWeather(request, env2);
            }
            if (path === "/api/admin/data" && method === "GET") {
              const authResult = await requireAuth(request, env2);
              if (authResult)
                return authResult;
              return await handleGetAdminData(request, env2);
            }
            if ((path === "/api/admin/data" || path === "/api/data") && method === "PUT") {
              const authResult = await requireAuth(request, env2);
              if (authResult)
                return authResult;
              return await handleDataUpdate(request, env2);
            }
            if (path === "/api/admin/password" && method === "POST") {
              const authResult = await requireAuth(request, env2);
              if (authResult)
                return authResult;
              return await handlePasswordUpdate(request, env2);
            }
            if (path === "/api/fetch-logo" && method === "GET") {
              const authResult = await requireAuth(request, env2);
              if (authResult)
                return authResult;
              return handleFetchLogo(request, env2);
            }
            if (path === "/api/proxy/navigation" && method === "GET") {
              return await handleNavigationProxy();
            }
            return new Response("Not Found", {
              status: 404
            });
          } catch (error) {
            console.error("Unhandled error:", error);
            const errorResponse = {
              success: false,
              message: error.message,
              stack: error.stack
            };
            return new Response(JSON.stringify(errorResponse, null, 2), {
              status: 500,
              headers: {
                "Content-Type": "application/json;charset=UTF-8"
              }
            });
          }
        }
        async function onRequest(context2) {
          const {
            request,
            params: params2,
            env: env2
          } = context2;
          let clientIp = "unknown";
          clientIp = request.headers.get("eo-connecting-ip");
          if (!clientIp) {
            const forwardedFor = request.headers.get("x-forwarded-for");
            if (forwardedFor) {
              clientIp = forwardedFor.split(",")[0].trim();
            }
          }
          return await handleRequest(request, env2, "edgeone-pages", clientIp, context2);
        }
        var stdin_default = {
          async fetch(request, env2, ctx) {
            let clientIp = "unknown";
            clientIp = request.headers.get("cf-connecting-ip");
            if (!clientIp) {
              const forwardedFor = request.headers.get("x-forwarded-for");
              if (forwardedFor) {
                clientIp = forwardedFor.split(",")[0].trim();
              }
            }
            return await handleRequest(request, env2, "cloudflare-workers", clientIp, {
              request,
              env: env2,
              ctx
            });
          }
        };
        function sanitiseData(fullData) {
          var _a, _b, _c;
          const defaults = createDefaultSettings();
          const sourceSettings = fullData.settings || defaults;
          const weather = normaliseWeatherSettingsValue(sourceSettings.weather);
          return {
            settings: {
              siteName: sourceSettings.siteName || defaults.siteName,
              siteLogo: sourceSettings.siteLogo || defaults.siteLogo,
              greeting: sourceSettings.greeting || defaults.greeting,
              footer: normaliseFooterValue(sourceSettings.footer),
              weather: {
                city: weather.city
              }
            },
            apps: ((_a = fullData.apps) == null ? void 0 : _a.map((item) => ({
              ...item
            }))) || [],
            bookmarks: ((_b = fullData.bookmarks) == null ? void 0 : _b.map((item) => ({
              ...item
            }))) || [],
            visitorCount: ((_c = fullData.stats) == null ? void 0 : _c.visitorCount) || DEFAULT_STATS.visitorCount,
            config: {
              weather: {
                defaultCity: DEFAULT_WEATHER_CONFIG.city
              }
            }
          };
        }
        function normaliseSettingsInput(input) {
          const siteName = typeof (input == null ? void 0 : input.siteName) === "string" ? input.siteName.trim() : "";
          if (!siteName)
            throw new Error("\u7F51\u7AD9\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\u3002");
          return {
            siteName,
            siteLogo: typeof (input == null ? void 0 : input.siteLogo) === "string" ? input.siteLogo.trim() : "",
            greeting: typeof (input == null ? void 0 : input.greeting) === "string" ? input.greeting.trim() : "",
            footer: normaliseFooterValue(input == null ? void 0 : input.footer),
            weather: normaliseWeatherSettingsInput(input == null ? void 0 : input.weather)
          };
        }
        function normaliseCollection(value, {
          label,
          type
        }) {
          if (!Array.isArray(value))
            throw new Error(`${label} \u6570\u636E\u683C\u5F0F\u4E0D\u6B63\u786E\uFF0C\u5E94\u4E3A\u6570\u7EC4\u3002`);
          const seen = /* @__PURE__ */ new Set();
          return value.map((item) => {
            const normalised = normaliseItem(item, type);
            if (seen.has(normalised.id)) {
              normalised.id = crypto.randomUUID();
            }
            seen.add(normalised.id);
            return normalised;
          });
        }
        function normaliseItem(input, type) {
          if (!input || typeof input !== "object")
            throw new Error("\u6570\u636E\u9879\u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
          const name = String(input.name || "").trim();
          const url2 = String(input.url || "").trim();
          if (!name)
            throw new Error("\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A\u3002");
          if (!url2)
            throw new Error("\u94FE\u63A5\u4E0D\u80FD\u4E3A\u7A7A\u3002");
          const payload = {
            id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : crypto.randomUUID(),
            name,
            url: ensureUrlProtocol(url2),
            description: typeof input.description === "string" ? input.description.trim() : "",
            icon: typeof input.icon === "string" ? input.icon.trim() : ""
          };
          if (type === "bookmarks") {
            payload.category = typeof input.category === "string" ? input.category.trim() : "";
          }
          return payload;
        }
        function normaliseFooterValue(value) {
          if (typeof value !== "string")
            return "";
          const normalised = value.replace(/\r\n?/g, "\n");
          return normalised.trim() ? normalised : "";
        }
        function normaliseWeatherSettingsValue(input) {
          const fallback = createDefaultWeatherSettings();
          let value = {
            ...fallback
          };
          if (input && typeof input === "object") {
            if (typeof input.city === "string" && input.city.trim()) {
              value.city = input.city.trim().split(/\s+/).filter(Boolean);
            } else if (Array.isArray(input.city)) {
              value.city = input.city.map((c) => String(c).trim()).filter(Boolean);
            }
          }
          if (!value.city || value.city.length === 0) {
            value.city = fallback.city;
          }
          return value;
        }
        function normaliseWeatherSettingsInput(rawWeather) {
          if (!rawWeather || typeof rawWeather !== "object") {
            return createDefaultWeatherSettings();
          }
          const citySource = rawWeather.city;
          let cities = [];
          if (typeof citySource === "string") {
            cities = citySource.split(/\s+/).filter(Boolean);
          } else if (Array.isArray(citySource)) {
            cities = citySource.map((c) => String(c).trim()).filter(Boolean);
          }
          if (cities.length === 0) {
            throw new Error("\u5929\u6C14\u57CE\u5E02\u4E0D\u80FD\u4E3A\u7A7A\u3002");
          }
          return {
            city: cities
          };
        }
        function createDefaultSettings() {
          return {
            ...BASE_DEFAULT_SETTINGS,
            weather: createDefaultWeatherSettings()
          };
        }
        function createDefaultWeatherSettings() {
          return {
            city: [DEFAULT_WEATHER_CONFIG.city]
          };
        }
        function generateToken() {
          return crypto.randomUUID();
        }
        function ensureUrlProtocol(url2) {
          if (/^https?:\/\//i.test(url2))
            return url2;
          return `https://${url2}`;
        }
        async function hashPassword(password) {
          const salt = new Uint8Array(16);
          crypto.getRandomValues(salt);
          const saltHex = bufferToHex(salt);
          const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), {
            name: "PBKDF2"
          }, false, ["deriveBits"]);
          const derivedBits = await crypto.subtle.deriveBits(
            {
              name: "PBKDF2",
              salt,
              iterations: 1e5,
              hash: "SHA-256"
            },
            keyMaterial,
            512
            // 64 bytes
          );
          const hashHex = bufferToHex(new Uint8Array(derivedBits));
          return {
            passwordHash: hashHex,
            passwordSalt: saltHex
          };
        }
        async function verifyPassword(password, saltHex, expectedHashHex) {
          const salt = hexToBuffer(saltHex);
          const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), {
            name: "PBKDF2"
          }, false, ["deriveBits"]);
          const derivedBits = await crypto.subtle.deriveBits({
            name: "PBKDF2",
            salt,
            iterations: 1e5,
            hash: "SHA-256"
          }, keyMaterial, 512);
          const actualHashHex = bufferToHex(new Uint8Array(derivedBits));
          return timingSafeEqual(expectedHashHex, actualHashHex);
        }
        var WEATHER_API_TIMEOUT_MS = 5e3;
        var GEOLOCATION_MAX_RETRIES = 3;
        var GEOLOCATION_RETRY_DELAY_BASE_MS = 300;
        async function fetchAndCache(url2) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), WEATHER_API_TIMEOUT_MS);
          try {
            const response2 = await fetch(url2, {
              signal: controller.signal,
              headers: {
                "Accept": "application/json",
                "Accept-Encoding": "identity",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            });
            if (!response2.ok) {
              throw createWeatherError(`API\u8BF7\u6C42\u5931\u8D25: ${response2.status}`, response2.status);
            }
            return await response2.json();
          } finally {
            clearTimeout(timeoutId);
          }
        }
        async function geocodeCity(cityName) {
          var _a;
          const url2 = new URL("https://geocoding-api.open-meteo.com/v1/search");
          url2.searchParams.set("name", cityName);
          url2.searchParams.set("count", "1");
          url2.searchParams.set("language", "zh");
          url2.searchParams.set("format", "json");
          let lastError = null;
          for (let attempt = 0; attempt < GEOLOCATION_MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) {
                const delay = GEOLOCATION_RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
              const payload = await fetchAndCache(url2);
              if (!((_a = payload == null ? void 0 : payload.results) == null ? void 0 : _a[0])) {
                throw createWeatherError(`\u672A\u627E\u5230\u57CE\u5E02"${cityName}"\u7684\u5730\u7406\u4F4D\u7F6E\u4FE1\u606F\u3002`, 404);
              }
              const {
                latitude,
                longitude,
                name
              } = payload.results[0];
              if (typeof latitude !== "number" || typeof longitude !== "number") {
                throw createWeatherError("\u5730\u7406\u4F4D\u7F6E\u4FE1\u606F\u65E0\u6548\u3002");
              }
              return {
                latitude,
                longitude,
                name: name || cityName
              };
            } catch (error) {
              lastError = error;
              if ((error == null ? void 0 : error.statusCode) >= 400 && error.statusCode < 500) {
                throw error;
              }
              console.warn(`geocodeCity failed (attempt ${attempt + 1}/${GEOLOCATION_MAX_RETRIES}), retrying...`, error.message);
            }
          }
          throw lastError || createWeatherError("\u5730\u7406\u7F16\u7801\u670D\u52A1\u83B7\u53D6\u5931\u8D25\uFF0C\u4E14\u6240\u6709\u91CD\u8BD5\u5747\u544A\u5931\u8D25\u3002", 502);
        }
        async function fetchOpenMeteoWeather(cityName) {
          const location = await geocodeCity(cityName);
          const url2 = new URL("https://api.open-meteo.com/v1/forecast");
          url2.searchParams.set("latitude", String(location.latitude));
          url2.searchParams.set("longitude", String(location.longitude));
          url2.searchParams.set("current_weather", "true");
          url2.searchParams.set("timezone", "auto");
          const payload = await fetchAndCache(url2);
          const current = payload == null ? void 0 : payload.current_weather;
          if (!current || typeof current !== "object") {
            throw createWeatherError("\u5929\u6C14\u6570\u636E\u683C\u5F0F\u5F02\u5E38\u3002");
          }
          return {
            text: getWeatherDescription(Number(current.weathercode)),
            temperature: Number(current.temperature),
            windspeed: Number(current.windspeed),
            weathercode: Number(current.weathercode),
            time: current.time || null
          };
        }
        function createWeatherError(message, statusCode = 502) {
          const error = new Error(message);
          error.statusCode = statusCode;
          return error;
        }
        function getWeatherDescription(code) {
          const map = {
            0: "\u6674\u5929",
            1: "\u6674\u6717",
            2: "\u591A\u4E91",
            3: "\u9634\u5929",
            45: "\u96FE",
            48: "\u51BB\u96FE",
            51: "\u5C0F\u96E8",
            53: "\u4E2D\u96E8",
            55: "\u5927\u96E8",
            56: "\u5C0F\u51BB\u96E8",
            57: "\u51BB\u96E8",
            61: "\u5C0F\u96E8",
            63: "\u4E2D\u96E8",
            65: "\u5927\u96E8",
            66: "\u5C0F\u51BB\u96E8",
            67: "\u51BB\u96E8",
            71: "\u5C0F\u96EA",
            73: "\u4E2D\u96EA",
            75: "\u5927\u96EA",
            77: "\u96EA\u7C92",
            80: "\u9635\u96E8",
            81: "\u4E2D\u9635\u96E8",
            82: "\u5927\u9635\u96E8",
            85: "\u5C0F\u9635\u96EA",
            86: "\u5927\u9635\u96EA",
            95: "\u96F7\u96E8",
            96: "\u96F7\u96E8\u4F34\u51B0\u96F9",
            99: "\u96F7\u96E8\u4F34\u5927\u51B0\u96F9"
          };
          return map[code] || "\u672A\u77E5";
        }
        function jsonResponse(data, status = 200) {
          const headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          };
          return new Response(JSON.stringify(data), {
            status,
            headers
          });
        }
        function bufferToHex(buffer) {
          return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        function hexToBuffer(hex) {
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
          }
          return bytes.buffer;
        }
        function timingSafeEqual(a, b) {
          if (a.length !== b.length) {
            return false;
          }
          let diff = 0;
          for (let i = 0; i < a.length; i++) {
            diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
          }
          return diff === 0;
        }
        return {
          onRequest: typeof onRequest !== "undefined" ? onRequest : void 0,
          onRequestGet: typeof onRequestGet !== "undefined" ? onRequestGet : void 0,
          onRequestPost: typeof onRequestPost !== "undefined" ? onRequestPost : void 0,
          onRequestPut: typeof onRequestPut !== "undefined" ? onRequestPut : void 0,
          onRequestDelete: typeof onRequestDelete !== "undefined" ? onRequestDelete : void 0,
          onRequestPatch: typeof onRequestPatch !== "undefined" ? onRequestPatch : void 0,
          onRequestHead: typeof onRequestHead !== "undefined" ? onRequestHead : void 0,
          onRequestOptions: typeof onRequestOptions !== "undefined" ? onRequestOptions : void 0
        };
      })();
      try {
        const handler = (() => {
          const method = req.method;
          if (method === "GET" && mod_0.onRequestGet) {
            return mod_0.onRequestGet;
          } else if (method === "POST" && mod_0.onRequestPost) {
            return mod_0.onRequestPost;
          } else if (method === "PUT" && mod_0.onRequestPut) {
            return mod_0.onRequestPut;
          } else if (method === "DELETE" && mod_0.onRequestDelete) {
            return mod_0.onRequestDelete;
          } else if (method === "PATCH" && mod_0.onRequestPatch) {
            return mod_0.onRequestPatch;
          } else if (method === "HEAD" && mod_0.onRequestHead) {
            return mod_0.onRequestHead;
          } else if (method === "OPTIONS" && mod_0.onRequestOptions) {
            return mod_0.onRequestOptions;
          } else {
            return mod_0.onRequest;
          }
        })();
        if (handler) {
          response = await handler(context);
          if (response && typeof response === "object" && response.websocket) {
            console.log("[WebSocket] WebSocket configuration detected for:", pathname);
            const upgradeHeader = req.headers["upgrade"];
            if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
              console.log("[WebSocket] Executing WebSocket handshake...");
              try {
                const { WebSocketServer } = require_ws();
                const wss = new WebSocketServer({ noServer: true });
                wss.on("connection", (ws, request) => {
                  console.log("[WebSocket] Connection established");
                  if (response.websocket.onopen) {
                    try {
                      response.websocket.onopen(ws, request);
                    } catch (error) {
                      console.error("[WebSocket] Error in onopen:", error);
                    }
                  }
                  ws.on("message", (data, isBinary) => {
                    if (response.websocket.onmessage) {
                      try {
                        response.websocket.onmessage(ws, data, isBinary);
                      } catch (error) {
                        console.error("[WebSocket] Error in onmessage:", error);
                        ws.close(1011, "Internal error");
                      }
                    }
                  });
                  ws.on("close", (code, reason) => {
                    if (response.websocket.onclose) {
                      try {
                        response.websocket.onclose(ws, code, reason);
                      } catch (error) {
                        console.error("[WebSocket] Error in onclose:", error);
                      }
                    }
                  });
                  ws.on("error", (error) => {
                    if (response.websocket.onerror) {
                      try {
                        response.websocket.onerror(ws, error);
                      } catch (err) {
                        console.error("[WebSocket] Error in onerror:", err);
                      }
                    } else {
                      console.error("[WebSocket] Connection error:", error);
                    }
                  });
                });
                wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
                  wss.emit("connection", ws, req);
                });
                console.log("[WebSocket] Handshake complete, connection established");
                return;
              } catch (wsError) {
                console.error("[WebSocket] Handshake error:", wsError);
                response = new Response(JSON.stringify({
                  error: "WebSocket Handshake Failed",
                  message: wsError.message
                }), {
                  status: 500,
                  headers: {
                    "Content-Type": "application/json"
                  }
                });
              }
            } else {
              response = new Response("WebSocket endpoint. Use ws:// protocol to connect.", {
                status: 426,
                headers: {
                  "Content-Type": "text/plain",
                  "Upgrade": "websocket"
                }
              });
            }
          }
        }
      } catch (handlerError) {
        console.log("Pages response status: ", 502);
        response = new Response(JSON.stringify({
          error: "Internal Server Error",
          message: handlerError.message
        }), {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            // 'Functions-Request-Id': context.server ? context.server.requestId : '',
            "eo-pages-inner-scf-status": "502",
            "eo-pages-inner-status-intercept": "true"
          }
        });
      }
      const requestEndTime2 = Date.now();
      await handleResponse(res, response, {
        "functions-request-id": context.server ? context.server.requestId : ""
      });
      return;
    }
    if (!response) {
      response = new Response(JSON.stringify({
        error: "Not Found",
        message: "The requested path does not exist"
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const requestEndTime = Date.now();
    if (!res.headers) {
      res.headers = {};
    }
    await handleResponse(res, response, {
      "functions-request-id": context.server ? context.server.requestId : ""
    });
  } catch (error) {
    console.error("server error", error);
    res.writeHead(502, {
      "Content-Type": "application/json",
      "Functions-Request-Id": req.headers["x-scf-request-id"] || "",
      "eo-pages-inner-scf-status": "502",
      "eo-pages-inner-status-intercept": "true"
    });
    res.end(JSON.stringify({
      error: "Internal Server Error",
      code: "FUNCTION_INVOCATION_FAILED",
      message: error.message,
      trace: error.stack
    }));
  }
});
server.headersTimeout = 0;
server.requestTimeout = 0;
server.listen(port, () => {
});
export {
  server
};
