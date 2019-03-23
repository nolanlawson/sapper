'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

require('fs');
var __chunk_3 = require('./chunk-275bacad.js');
var constants = _interopDefault(require('constants'));
var Stream = require('stream');
var Stream__default = _interopDefault(Stream);
require('util');
require('assert');
var path = require('path');
var path__default = _interopDefault(path);
var __chunk_2 = require('./chunk-21b7786f.js');
var http = require('http');
var http__default = _interopDefault(http);
var url = require('url');
var https = _interopDefault(require('https'));
var zlib = _interopDefault(require('zlib'));
var tslib_1 = require('tslib');
var child_process = require('child_process');
var __chunk_1 = require('./chunk-9618d369.js');
var __chunk_7 = require('./chunk-fb4e1119.js');
var httpLinkHeader = require('http-link-header');
require('events');
require('net');
require('html-minifier');

var fs_1 = clone(__chunk_3.fs);

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: obj.__proto__ };
  else
    var copy = Object.create(null);

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
  });

  return copy
}

var origCwd = process.cwd;
var cwd = null;

var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;

process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process);
  return cwd
};
try {
  process.cwd();
} catch (er) {}

var chdir = process.chdir;
process.chdir = function(d) {
  cwd = null;
  chdir.call(process, d);
};

var polyfills = patch;

function patch (fs$$1) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs$$1);
  }

  // lutimes implementation, or no-op
  if (!fs$$1.lutimes) {
    patchLutimes(fs$$1);
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs$$1.chown = chownFix(fs$$1.chown);
  fs$$1.fchown = chownFix(fs$$1.fchown);
  fs$$1.lchown = chownFix(fs$$1.lchown);

  fs$$1.chmod = chmodFix(fs$$1.chmod);
  fs$$1.fchmod = chmodFix(fs$$1.fchmod);
  fs$$1.lchmod = chmodFix(fs$$1.lchmod);

  fs$$1.chownSync = chownFixSync(fs$$1.chownSync);
  fs$$1.fchownSync = chownFixSync(fs$$1.fchownSync);
  fs$$1.lchownSync = chownFixSync(fs$$1.lchownSync);

  fs$$1.chmodSync = chmodFixSync(fs$$1.chmodSync);
  fs$$1.fchmodSync = chmodFixSync(fs$$1.fchmodSync);
  fs$$1.lchmodSync = chmodFixSync(fs$$1.lchmodSync);

  fs$$1.stat = statFix(fs$$1.stat);
  fs$$1.fstat = statFix(fs$$1.fstat);
  fs$$1.lstat = statFix(fs$$1.lstat);

  fs$$1.statSync = statFixSync(fs$$1.statSync);
  fs$$1.fstatSync = statFixSync(fs$$1.fstatSync);
  fs$$1.lstatSync = statFixSync(fs$$1.lstatSync);

  // if lchmod/lchown do not exist, then make them no-ops
  if (!fs$$1.lchmod) {
    fs$$1.lchmod = function (path$$1, mode, cb) {
      if (cb) process.nextTick(cb);
    };
    fs$$1.lchmodSync = function () {};
  }
  if (!fs$$1.lchown) {
    fs$$1.lchown = function (path$$1, uid, gid, cb) {
      if (cb) process.nextTick(cb);
    };
    fs$$1.lchownSync = function () {};
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 60 seconds.

  // Set the timeout this long because some Windows Anti-Virus, such as Parity
  // bit9, may lock files for up to a minute, causing npm package install
  // failures. Also, take care to yield the scheduler. Windows scheduling gives
  // CPU to a busy looping process, which can cause the program causing the lock
  // contention to be starved of CPU by node, so the contention doesn't resolve.
  if (platform === "win32") {
    fs$$1.rename = (function (fs$rename) { return function (from, to, cb) {
      var start = Date.now();
      var backoff = 0;
      fs$rename(from, to, function CB (er) {
        if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 60000) {
          setTimeout(function() {
            fs$$1.stat(to, function (stater, st) {
              if (stater && stater.code === "ENOENT")
                fs$rename(from, to, CB);
              else
                cb(er);
            });
          }, backoff);
          if (backoff < 100)
            backoff += 10;
          return;
        }
        if (cb) cb(er);
      });
    }})(fs$$1.rename);
  }

  // if read() returns EAGAIN, then just try it again.
  fs$$1.read = (function (fs$read) { return function (fd, buffer, offset, length, position, callback_) {
    var callback;
    if (callback_ && typeof callback_ === 'function') {
      var eagCounter = 0;
      callback = function (er, _, __) {
        if (er && er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++;
          return fs$read.call(fs$$1, fd, buffer, offset, length, position, callback)
        }
        callback_.apply(this, arguments);
      };
    }
    return fs$read.call(fs$$1, fd, buffer, offset, length, position, callback)
  }})(fs$$1.read);

  fs$$1.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0;
    while (true) {
      try {
        return fs$readSync.call(fs$$1, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++;
          continue
        }
        throw er
      }
    }
  }})(fs$$1.readSync);
}

function patchLchmod (fs$$1) {
  fs$$1.lchmod = function (path$$1, mode, callback) {
    fs$$1.open( path$$1
           , constants.O_WRONLY | constants.O_SYMLINK
           , mode
           , function (err, fd) {
      if (err) {
        if (callback) callback(err);
        return
      }
      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      fs$$1.fchmod(fd, mode, function (err) {
        fs$$1.close(fd, function(err2) {
          if (callback) callback(err || err2);
        });
      });
    });
  };

  fs$$1.lchmodSync = function (path$$1, mode) {
    var fd = fs$$1.openSync(path$$1, constants.O_WRONLY | constants.O_SYMLINK, mode);

    // prefer to return the chmod error, if one occurs,
    // but still try to close, and report closing errors if they occur.
    var threw = true;
    var ret;
    try {
      ret = fs$$1.fchmodSync(fd, mode);
      threw = false;
    } finally {
      if (threw) {
        try {
          fs$$1.closeSync(fd);
        } catch (er) {}
      } else {
        fs$$1.closeSync(fd);
      }
    }
    return ret
  };
}

function patchLutimes (fs$$1) {
  if (constants.hasOwnProperty("O_SYMLINK")) {
    fs$$1.lutimes = function (path$$1, at, mt, cb) {
      fs$$1.open(path$$1, constants.O_SYMLINK, function (er, fd) {
        if (er) {
          if (cb) cb(er);
          return
        }
        fs$$1.futimes(fd, at, mt, function (er) {
          fs$$1.close(fd, function (er2) {
            if (cb) cb(er || er2);
          });
        });
      });
    };

    fs$$1.lutimesSync = function (path$$1, at, mt) {
      var fd = fs$$1.openSync(path$$1, constants.O_SYMLINK);
      var ret;
      var threw = true;
      try {
        ret = fs$$1.futimesSync(fd, at, mt);
        threw = false;
      } finally {
        if (threw) {
          try {
            fs$$1.closeSync(fd);
          } catch (er) {}
        } else {
          fs$$1.closeSync(fd);
        }
      }
      return ret
    };

  } else {
    fs$$1.lutimes = function (_a, _b, _c, cb) { if (cb) process.nextTick(cb); };
    fs$$1.lutimesSync = function () {};
  }
}

function chmodFix (orig) {
  if (!orig) return orig
  return function (target, mode, cb) {
    return orig.call(fs_1, target, mode, function (er) {
      if (chownErOk(er)) er = null;
      if (cb) cb.apply(this, arguments);
    })
  }
}

function chmodFixSync (orig) {
  if (!orig) return orig
  return function (target, mode) {
    try {
      return orig.call(fs_1, target, mode)
    } catch (er) {
      if (!chownErOk(er)) throw er
    }
  }
}


function chownFix (orig) {
  if (!orig) return orig
  return function (target, uid, gid, cb) {
    return orig.call(fs_1, target, uid, gid, function (er) {
      if (chownErOk(er)) er = null;
      if (cb) cb.apply(this, arguments);
    })
  }
}

function chownFixSync (orig) {
  if (!orig) return orig
  return function (target, uid, gid) {
    try {
      return orig.call(fs_1, target, uid, gid)
    } catch (er) {
      if (!chownErOk(er)) throw er
    }
  }
}


function statFix (orig) {
  if (!orig) return orig
  // Older versions of Node erroneously returned signed integers for
  // uid + gid.
  return function (target, cb) {
    return orig.call(fs_1, target, function (er, stats) {
      if (!stats) return cb.apply(this, arguments)
      if (stats.uid < 0) stats.uid += 0x100000000;
      if (stats.gid < 0) stats.gid += 0x100000000;
      if (cb) cb.apply(this, arguments);
    })
  }
}

function statFixSync (orig) {
  if (!orig) return orig
  // Older versions of Node erroneously returned signed integers for
  // uid + gid.
  return function (target) {
    var stats = orig.call(fs_1, target);
    if (stats.uid < 0) stats.uid += 0x100000000;
    if (stats.gid < 0) stats.gid += 0x100000000;
    return stats;
  }
}

// ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.
function chownErOk (er) {
  if (!er)
    return true

  if (er.code === "ENOSYS")
    return true

  var nonroot = !process.getuid || process.getuid() !== 0;
  if (nonroot) {
    if (er.code === "EINVAL" || er.code === "EPERM")
      return true
  }

  return false
}

var Stream$1 = Stream__default.Stream;

var legacyStreams = legacy;

function legacy (fs$$1) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path$$1, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path$$1, options);

    Stream$1.call(this);

    var self = this;

    this.path = path$$1;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs$$1.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    });
  }

  function WriteStream (path$$1, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path$$1, options);

    Stream$1.call(this);

    this.path = path$$1;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs$$1.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}

var gracefulFs = __chunk_3.createCommonjsModule(function (module) {
var queue = [];



function noop () {}

var debug = noop;
if (__chunk_3.require$$0.debuglog)
  debug = __chunk_3.require$$0.debuglog('gfs4');
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = __chunk_3.require$$0.format.apply(__chunk_3.require$$0, arguments);
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ');
    console.error(m);
  };

if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
  process.on('exit', function() {
    debug(queue);
    __chunk_3.require$$0$1.equal(queue.length, 0);
  });
}

module.exports = patch(fs_1);
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
  module.exports = patch(__chunk_3.fs);
}

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.
module.exports.close =
__chunk_3.fs.close = (function (fs$close) { return function (fd, cb) {
  return fs$close.call(__chunk_3.fs, fd, function (err) {
    if (!err)
      retry();

    if (typeof cb === 'function')
      cb.apply(this, arguments);
  })
}})(__chunk_3.fs.close);

module.exports.closeSync =
__chunk_3.fs.closeSync = (function (fs$closeSync) { return function (fd) {
  // Note that graceful-fs also retries when fs.closeSync() fails.
  // Looks like a bug to me, although it's probably a harmless one.
  var rval = fs$closeSync.apply(__chunk_3.fs, arguments);
  retry();
  return rval
}})(__chunk_3.fs.closeSync);

function patch (fs$$1) {
  // Everything that references the open() function needs to be in here
  polyfills(fs$$1);
  fs$$1.gracefulify = patch;
  fs$$1.FileReadStream = ReadStream;  // Legacy name.
  fs$$1.FileWriteStream = WriteStream;  // Legacy name.
  fs$$1.createReadStream = createReadStream;
  fs$$1.createWriteStream = createWriteStream;
  var fs$readFile = fs$$1.readFile;
  fs$$1.readFile = readFile;
  function readFile (path$$1, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$readFile(path$$1, options, cb)

    function go$readFile (path$$1, options, cb) {
      return fs$readFile(path$$1, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path$$1, options, cb]]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
          retry();
        }
      })
    }
  }

  var fs$writeFile = fs$$1.writeFile;
  fs$$1.writeFile = writeFile;
  function writeFile (path$$1, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$writeFile(path$$1, data, options, cb)

    function go$writeFile (path$$1, data, options, cb) {
      return fs$writeFile(path$$1, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path$$1, data, options, cb]]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
          retry();
        }
      })
    }
  }

  var fs$appendFile = fs$$1.appendFile;
  if (fs$appendFile)
    fs$$1.appendFile = appendFile;
  function appendFile (path$$1, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null;

    return go$appendFile(path$$1, data, options, cb)

    function go$appendFile (path$$1, data, options, cb) {
      return fs$appendFile(path$$1, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path$$1, data, options, cb]]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
          retry();
        }
      })
    }
  }

  var fs$readdir = fs$$1.readdir;
  fs$$1.readdir = readdir;
  function readdir (path$$1, options, cb) {
    var args = [path$$1];
    if (typeof options !== 'function') {
      args.push(options);
    } else {
      cb = options;
    }
    args.push(go$readdir$cb);

    return go$readdir(args)

    function go$readdir$cb (err, files) {
      if (files && files.sort)
        files.sort();

      if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
        enqueue([go$readdir, [args]]);
      else {
        if (typeof cb === 'function')
          cb.apply(this, arguments);
        retry();
      }
    }
  }

  function go$readdir (args) {
    return fs$readdir.apply(fs$$1, args)
  }

  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacyStreams(fs$$1);
    ReadStream = legStreams.ReadStream;
    WriteStream = legStreams.WriteStream;
  }

  var fs$ReadStream = fs$$1.ReadStream;
  ReadStream.prototype = Object.create(fs$ReadStream.prototype);
  ReadStream.prototype.open = ReadStream$open;

  var fs$WriteStream = fs$$1.WriteStream;
  WriteStream.prototype = Object.create(fs$WriteStream.prototype);
  WriteStream.prototype.open = WriteStream$open;

  fs$$1.ReadStream = ReadStream;
  fs$$1.WriteStream = WriteStream;

  function ReadStream (path$$1, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy();

        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
        that.read();
      }
    });
  }

  function WriteStream (path$$1, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this;
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy();
        that.emit('error', err);
      } else {
        that.fd = fd;
        that.emit('open', fd);
      }
    });
  }

  function createReadStream (path$$1, options) {
    return new ReadStream(path$$1, options)
  }

  function createWriteStream (path$$1, options) {
    return new WriteStream(path$$1, options)
  }

  var fs$open = fs$$1.open;
  fs$$1.open = open;
  function open (path$$1, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null;

    return go$open(path$$1, flags, mode, cb)

    function go$open (path$$1, flags, mode, cb) {
      return fs$open(path$$1, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path$$1, flags, mode, cb]]);
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments);
          retry();
        }
      })
    }
  }

  return fs$$1
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1]);
  queue.push(elem);
}

function retry () {
  var elem = queue.shift();
  if (elem) {
    debug('RETRY', elem[0].name, elem[1]);
    elem[0].apply(null, elem[1]);
  }
}
});
var gracefulFs_1 = gracefulFs.close;
var gracefulFs_2 = gracefulFs.closeSync;

var sander_cjs = __chunk_3.createCommonjsModule(function (module, exports) {

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }



var mkdirp = _interopDefault(__chunk_3.mkdirp$1);

var _rimraf = _interopDefault(__chunk_3.rimraf_1);

function resolvePath ( args ) {
	return __chunk_2.pathModule.resolve.apply( null, args );
}

function normaliseArguments ( args ) {
	var len = args.length;

	var buildingPath = true;
	var pathargs = [];
	var normalised = [ null ]; // null is a placeholder for the resolved path
	var i;

	for ( i = 0; i < len; i += 1 ) {
		if ( buildingPath && typeof args[i] === 'string' ) {
			pathargs[i] = args[i];
		} else {
			buildingPath = false;
			normalised.push( args[i] );
		}
	}

	normalised[0] = resolvePath( pathargs );

	return normalised;
}

function asyncMethod ( methodName ) {
	return function () {
		var args = normaliseArguments( arguments );

		return new Promise( function ( fulfil, reject ) {
			args.push( function ( err, result ) {
				if ( err ) {
					reject( err );
				} else {
					fulfil( result );
				}
			});

			gracefulFs[ methodName ].apply( gracefulFs, args );
		});
	};
}

function syncMethod ( methodName ) {
	return function () {
		var args = normaliseArguments( arguments );
		return gracefulFs[ methodName ].apply( gracefulFs, args );
	};
}

function asyncFileDescriptorMethod ( methodName ) {
	return function () {
		var arguments$1 = arguments;

		var args = [];
		var i = arguments.length;

		while ( i-- ) {
			args[i] = arguments$1[i];
		}

		return new Promise( function ( fulfil, reject ) {
			args.push( function ( err, result ) {
				if ( err ) {
					reject( err );
				} else {
					fulfil( result );
				}
			});

			gracefulFs[ methodName ].apply( gracefulFs, args );
		});
	};
}

function resolvePathAndOptions ( args ) {
	var options;
	var pathargs;

	if ( typeof args[ args.length - 1 ] === 'object' ) {
		options = args[ args.length - 1 ];

		var i = args.length - 1;
		pathargs = new Array( i );

		while ( i-- ) {
			pathargs[i] = args[i];
		}
	} else {
		options = {};
		pathargs = args;
	}

	var resolvedPath = __chunk_2.pathModule.resolve.apply( null, pathargs );

	return { options: options, resolvedPath: resolvedPath };
}

function createReadStream$1 () {
	var ref = resolvePathAndOptions( arguments );
	var resolvedPath = ref.resolvedPath;
	var options = ref.options;
	return gracefulFs.createReadStream( resolvedPath, options );
}

function createWriteStream$1 () {
	var ref = resolvePathAndOptions( arguments );
	var resolvedPath = ref.resolvedPath;
	var options = ref.options;

	mkdirp.sync( __chunk_2.pathModule.dirname( resolvedPath ) );
	return gracefulFs.createWriteStream( resolvedPath, options );
}

function exists$1 () {
	var target = resolvePath( arguments );

	return new Promise( function (fulfil) {
		gracefulFs.exists( target, function (exists$$1) { return fulfil( exists$$1 ); } );
	});
}

function existsSync$1 () {
	return gracefulFs.existsSync( resolvePath( arguments ) );
}

var rename = asyncMethod$1( 'rename' );
var link = asyncMethod$1( 'link' );

var renameSync = syncMethod$1( 'renameSync' );
var linkSync = syncMethod$1( 'linkSync' );

function asyncMethod$1 ( methodName ) {
	return function () {
		var src = resolvePath( arguments );

		return {
			to: function to () {
				var dest = resolvePath( arguments );

				return new Promise( function ( fulfil, reject ) {
					mkdirp( __chunk_2.pathModule.dirname( dest ), function (err) {
						if ( err ) {
							reject( err );
						} else {
							gracefulFs[ methodName ]( src, dest, function (err) {
								if ( err ) {
									reject( err );
								} else {
									fulfil();
								}
							});
						}
					});
				});
			}
		};
	};
}

function syncMethod$1 ( methodName ) {
	return function () {
		var src = resolvePath( arguments );

		return {
			to: function to () {
				var dest = resolvePath( arguments );

				mkdirp.sync( __chunk_2.pathModule.dirname( dest ) );
				return gracefulFs[ methodName ]( src, dest );
			}
		};
	};
}

function mkdir () {
	var dir = resolvePath( arguments );

	return new Promise( function ( fulfil, reject ) {
		mkdirp( dir, function (err) {
			if ( err ) {
				reject( err );
			} else {
				fulfil();
			}
		});
	});
}

function mkdirSync () {
	var dir = resolvePath( arguments );
	mkdirp.sync( dir );
}

function normaliseArguments$1 ( args ) {
	var options;
	var flags;
	var i;

	if ( typeof args[ args.length - 1 ] === 'object' ) {
		options = args[ args.length - 1 ];
		flags = args[ args.length - 2 ];
		i = args.length - 2;
	} else {
		options = {};
		flags = args[ args.length - 1 ];
		i = args.length - 1;
	}

	var pathargs = new Array( i );
	while ( i-- ) {
		pathargs[i] = args[i];
	}

	var resolvedPath = resolvePath( pathargs );

	return { resolvedPath: resolvedPath, options: options, flags: flags };
}

function bailIfExists ( src, flags, mode ) {
	var alreadyExists;

	try {
		gracefulFs.statSync( src );
		alreadyExists = true;
	} catch ( err ) {
		if ( err.code !== 'ENOENT' ) {
			throw err;
		}
	}

	if ( alreadyExists ) {
		// attempt the operation = that way, we get the intended error message
		// TODO can't we just do this in the first place?
		gracefulFs.openSync( src, flags, mode );
	}
}

function open$1 () {
	var ref = normaliseArguments$1( arguments );
	var src = ref.resolvedPath;
	var options = ref.options;
	var flags = ref.flags;

	if ( /^.x/.test( flags ) ) {
		bailIfExists( src, flags, options.mode );
	}

	return new Promise( function ( fulfil, reject ) {
		function open$$1 () {
			gracefulFs.open( src, flags, options.mode, function ( err, fd ) {
				if ( err ) {
					reject( err );
				} else {
					fulfil( fd );
				}
			});
		}

		// create dirs if necessary
		if ( /^[wa]/.test( flags ) ) {
			mkdirp( __chunk_2.pathModule.dirname( src ), function (err) {
				if ( err ) {
					reject( err );
				} else {
					open$$1();
				}
			});
		} else {
			open$$1();
		}
	});
}


function openSync$1 () {
	var ref = normaliseArguments$1( arguments );
	var src = ref.resolvedPath;
	var options = ref.options;
	var flags = ref.flags;

	if ( /^.x/.test( flags ) ) {
		bailIfExists( src, flags, options.mode );
	}

	// create dirs if necessary
	if ( /^[wa]/.test( flags ) ) {
		mkdirp.sync( __chunk_2.pathModule.dirname( src ) );
	}

	return gracefulFs.openSync( src, flags, options.mode );
}

function symlink$1 () {
	var src = resolvePath( arguments );

	return {
		to: function to () {
			var ref = resolvePathAndOptions( arguments );
			var options = ref.options;
			var dest = ref.resolvedPath;

			return new Promise( function ( fulfil, reject ) {
				mkdirp( __chunk_2.pathModule.dirname( dest ), function (err) {
					if ( err ) {
						reject( err );
					} else {
						gracefulFs.symlink( src, dest, options.type, function (err) {
							if ( err ) {
								reject( err );
							} else {
								fulfil();
							}
						});
					}
				});
			});
		}
	};
}

function symlinkSync$1 () {
	var src = resolvePath( arguments );

	return {
		to: function to () {
			var ref = resolvePathAndOptions( arguments );
			var options = ref.options;
			var dest = ref.resolvedPath;
			mkdirp.sync( __chunk_2.pathModule.dirname( dest ) );
			return gracefulFs.symlinkSync( src, dest, options.type );
		}
	};
}

var writeFile = asyncMethod$2( 'writeFile' );
var appendFile = asyncMethod$2( 'appendFile' );

var writeFileSync$1 = syncMethod$2( 'writeFileSync' );
var appendFileSync = syncMethod$2( 'appendFileSync' );

function normaliseArguments$2 ( args ) {
	args = Array.prototype.slice.call( args, 0 );
	var opts = {};

	if ( typeof args[ args.length - 1 ] === 'object' && !( args[ args.length - 1 ] instanceof Buffer ) ) {
		opts = args.pop();
	}

	return { opts: opts, data: args.pop(), dest: resolvePath( args ) };
}

function asyncMethod$2 ( methodName ) {
	return function () {
		var ref = normaliseArguments$2( arguments );
		var dest = ref.dest;
		var data = ref.data;
		var opts = ref.opts;

		return new Promise( function ( fulfil, reject ) {
			mkdirp( __chunk_2.pathModule.dirname( dest ), function (err) {
				if ( err ) {
					reject( err );
				} else {
					gracefulFs[ methodName ]( dest, data, opts, function (err) {
						if ( err ) {
							reject( err );
						} else {
							fulfil( data );
						}
					});
				}
			});
		});
	};
}

function syncMethod$2 ( methodName ) {
	return function () {
		var ref = normaliseArguments$2( arguments );
		var dest = ref.dest;
		var data = ref.data;

		mkdirp.sync( __chunk_2.pathModule.dirname( dest ) );
		return gracefulFs[ methodName ]( dest, data );
	};
}

function copydir () {
	var ref = resolvePathAndOptions( arguments );
	var src = ref.resolvedPath;
	var readOptions = ref.options;

	return {
		to: function to () {
			var ref = resolvePathAndOptions( arguments );
			var dest = ref.resolvedPath;
			var writeOptions = ref.options;

			function copydir ( src, dest, cb ) {
				mkdirp( dest, function (err) {
					if ( err ) { return cb( err ); }

					gracefulFs.readdir( src, function ( err, files ) {
						if ( err ) { return cb( err ); }

						var remaining = files.length;

						if ( !remaining ) { return cb(); }

						function check ( err ) {
							if ( err ) {
								return cb( err );
							}

							if ( !--remaining ) {
								cb();
							}
						}

						files.forEach( function ( filename ) {
							var srcpath = src + __chunk_2.pathModule.sep + filename;
							var destpath = dest + __chunk_2.pathModule.sep + filename;

							gracefulFs.stat( srcpath, function ( err, stats ) {
								var readStream, writeStream;

								if ( stats.isDirectory() ) {
									return copydir( srcpath, destpath, check );
								}

								readStream = gracefulFs.createReadStream( srcpath, readOptions );
								writeStream = gracefulFs.createWriteStream( destpath, writeOptions );

								readStream.on( 'error', cb );
								writeStream.on( 'error', cb );

								writeStream.on( 'close', check );

								readStream.pipe( writeStream );
							});
						});
					});
				});
			}

			return new Promise( function ( fulfil, reject ) {
				copydir( src, dest, function (err) {
					if ( err ) {
						reject( err );
					} else {
						fulfil();
					}
				});
			});
		}
	};
}

function copydirSync () {
	var ref = resolvePathAndOptions( arguments );
	var src = ref.resolvedPath;
	var readOptions = ref.options;

	return {
		to: function to () {
			var ref = resolvePathAndOptions( arguments );
			var dest = ref.resolvedPath;
			var writeOptions = ref.options;

			function copydir ( src, dest ) {
				mkdirp.sync( dest );

				gracefulFs.readdirSync( src ).forEach( function (filename) {
					var srcpath = src + __chunk_2.pathModule.sep + filename;
					var destpath = dest + __chunk_2.pathModule.sep + filename;

					if ( gracefulFs.statSync( srcpath ).isDirectory() ) {
						return copydir( srcpath, destpath );
					}

					var data = gracefulFs.readFileSync( srcpath, readOptions );
					gracefulFs.writeFileSync( destpath, data, writeOptions );
				});
			}

			copydir( src, dest );
		}
	};
}

function copyFile () {
	var ref = resolvePathAndOptions( arguments );
	var src = ref.resolvedPath;
	var readOptions = ref.options;

	return {
		to: function to () {
			var ref = resolvePathAndOptions( arguments );
			var dest = ref.resolvedPath;
			var writeOptions = ref.options;

			return new Promise( function ( fulfil, reject ) {
				mkdirp( __chunk_2.pathModule.dirname( dest ), function (err) {
					if ( err ) {
						reject( err );
					} else {
						var readStream = gracefulFs.createReadStream( src, readOptions );
						var writeStream = gracefulFs.createWriteStream( dest, writeOptions );

						readStream.on( 'error', reject );
						writeStream.on( 'error', reject );

						writeStream.on( 'close', fulfil );

						readStream.pipe( writeStream );
					}
				});
			});
		}
	};
}

function copyFileSync () {
	var ref = resolvePathAndOptions( arguments );
	var src = ref.resolvedPath;
	var readOptions = ref.options;

	return {
		to: function to () {
			var ref = resolvePathAndOptions( arguments );
			var dest = ref.resolvedPath;
			var writeOptions = ref.options;

			var data = gracefulFs.readFileSync( src, readOptions );

			mkdirp.sync( __chunk_2.pathModule.dirname( dest ) );
			gracefulFs.writeFileSync( dest, data, writeOptions );
		}
	};
}

function walk ( dir, callback ) {
	var results = [];

	__chunk_3.fs.readdir( dir, function ( err, files ) {
		if ( err ) { return callback( err ); }

		var pending = files.length;
		if ( !pending ) { return callback( null, results ); }

		files.forEach( function (file) {
			file = __chunk_2.pathModule.resolve( dir, file );

			__chunk_3.fs.stat( file, function ( err, stats ) {
				if ( stats && stats.isDirectory() ) {
					walk( file, function ( err, res ) {
						results = results.concat( res );
						if ( !--pending ) { callback( null, results ); }
					});
				} else {
					results.push( file );
					if ( !--pending ) { callback( null, results ); }
				}
			});
		});
	});
}

function lsr () {
	var basedir = resolvePath( arguments );

	return new Promise( function ( fulfil, reject ) {
		walk( basedir, function ( err, result ) {
			if ( err ) { return reject( err ); }

			// files should be relative to basedir
			var index = basedir.length + 1;
			var i = result.length;
			while ( i-- ) {
				result[i] = result[i].substring( index );
			}

			fulfil( result );
		});
	});
}

function lsrSync () {
	var basedir = resolvePath( arguments );

	var result = [];

	function processdir ( dir ) {
		__chunk_3.fs.readdirSync( dir ).forEach( function (file) {
			var filepath = dir + __chunk_2.pathModule.sep + file;

			if ( __chunk_3.fs.statSync( filepath ).isDirectory() ) {
				processdir( filepath );
			} else {
				result.push( filepath.replace( basedir + __chunk_2.pathModule.sep, '' ) );
			}
		});
	}

	processdir( basedir );
	return result;
}

function rimraf () {
	var target = resolvePath( arguments );

	return new Promise( function ( fulfil, reject ) {
		_rimraf( target, function (err) {
			if ( err ) {
				reject( err );
			} else {
				fulfil();
			}
		});
	});
}

function rimrafSync () {
	_rimraf.sync( resolvePath( arguments ) );
}

var isWindows = process.platform === 'win32';

function symlinkOrCopy$$1 () {
	var arguments$1 = arguments;

	if ( isWindows ) {
		var ref = resolvePathAndOptions( arguments );
		var src = ref.resolvedPath;

		var copyDirOrFileTo = stat$2( src )
			.then( function (stats) {
				return ( stats.isDirectory() ? copydir : copyFile )
					.apply( null, arguments$1 )
					.to;
			});

		return {
			to: function to () {
				var arguments$1 = arguments;

				return copyDirOrFileTo
					.then(function (fn) {
						return fn.apply(null, arguments$1);
					});
			}
		};
	}

	return symlink$1.apply( null, arguments );
}

function symlinkOrCopySync$$1 () {
	if ( isWindows ) {
		var ref = resolvePathAndOptions( arguments );
		var src = ref.resolvedPath;
		return ( statSync$2( src ).isDirectory() ? copydirSync : copyFileSync ).apply( null, arguments );
	}

	return symlinkSync$1.apply( null, arguments );
}

// standard async methods
var chmod = asyncMethod( 'chmod' );
var chown = asyncMethod( 'chown' );
var lchmod = asyncMethod( 'lchmod' );
var lchown = asyncMethod( 'lchown' );
var lstat = asyncMethod( 'lstat' );
var readdir$2 = asyncMethod( 'readdir' );
var readFile = asyncMethod( 'readFile' );
var readlink = asyncMethod( 'readlink' );
var realpath = asyncMethod( 'realpath' );
var rmdir = asyncMethod( 'rmdir' );
var stat$2 = asyncMethod( 'stat' );
var truncate = asyncMethod( 'truncate' );
var unlink = asyncMethod( 'unlink' );
var utimes = asyncMethod( 'utimes' );
var unwatchFile = asyncMethod( 'unwatchFile' );
var watch = asyncMethod( 'watch' );
var watchFile = asyncMethod( 'watchFile' );

// standard sync methods
var chmodSync = syncMethod( 'chmodSync' );
var chownSync = syncMethod( 'chownSync' );
var lchmodSync = syncMethod( 'lchmodSync' );
var lchownSync = syncMethod( 'lchownSync' );
var lstatSync = syncMethod( 'lstatSync' );
var readdirSync$2 = syncMethod( 'readdirSync' );
var readFileSync$1 = syncMethod( 'readFileSync' );
var readlinkSync = syncMethod( 'readlinkSync' );
var realpathSync = syncMethod( 'realpathSync' );
var rmdirSync = syncMethod( 'rmdirSync' );
var statSync$2 = syncMethod( 'statSync' );
var truncateSync = syncMethod( 'truncateSync' );
var unlinkSync = syncMethod( 'unlinkSync' );
var utimesSync = syncMethod( 'utimesSync' );

// file descriptor async methods
var close = asyncFileDescriptorMethod( 'close' );
var fchmod = asyncFileDescriptorMethod( 'fchmod' );
var fchown = asyncFileDescriptorMethod( 'fchown' );
var fstat = asyncFileDescriptorMethod( 'fstat' );
var fsync = asyncFileDescriptorMethod( 'fsync' );
var ftruncate = asyncFileDescriptorMethod( 'ftruncate' );
var futimes = asyncFileDescriptorMethod( 'futimes' );
var read = asyncFileDescriptorMethod( 'read' );

// file descriptor sync methods
var closeSync$1 = gracefulFs.closeSync;
var fchmodSync$1 = gracefulFs.fchmodSync;
var fchownSync$1 = gracefulFs.fchownSync;
var fstatSync$1 = gracefulFs.fstatSync;
var fsyncSync$1 = gracefulFs.fsyncSync;
var ftruncateSync$1 = gracefulFs.ftruncateSync;
var futimesSync$1 = gracefulFs.futimesSync;
var readSync$1 = gracefulFs.readSync;

exports.chmod = chmod;
exports.chown = chown;
exports.lchmod = lchmod;
exports.lchown = lchown;
exports.lstat = lstat;
exports.readdir = readdir$2;
exports.readFile = readFile;
exports.readlink = readlink;
exports.realpath = realpath;
exports.rmdir = rmdir;
exports.stat = stat$2;
exports.truncate = truncate;
exports.unlink = unlink;
exports.utimes = utimes;
exports.unwatchFile = unwatchFile;
exports.watch = watch;
exports.watchFile = watchFile;
exports.chmodSync = chmodSync;
exports.chownSync = chownSync;
exports.lchmodSync = lchmodSync;
exports.lchownSync = lchownSync;
exports.lstatSync = lstatSync;
exports.readdirSync = readdirSync$2;
exports.readFileSync = readFileSync$1;
exports.readlinkSync = readlinkSync;
exports.realpathSync = realpathSync;
exports.rmdirSync = rmdirSync;
exports.statSync = statSync$2;
exports.truncateSync = truncateSync;
exports.unlinkSync = unlinkSync;
exports.utimesSync = utimesSync;
exports.close = close;
exports.fchmod = fchmod;
exports.fchown = fchown;
exports.fstat = fstat;
exports.fsync = fsync;
exports.ftruncate = ftruncate;
exports.futimes = futimes;
exports.read = read;
exports.closeSync = closeSync$1;
exports.fchmodSync = fchmodSync$1;
exports.fchownSync = fchownSync$1;
exports.fstatSync = fstatSync$1;
exports.fsyncSync = fsyncSync$1;
exports.ftruncateSync = ftruncateSync$1;
exports.futimesSync = futimesSync$1;
exports.readSync = readSync$1;
exports.createReadStream = createReadStream$1;
exports.createWriteStream = createWriteStream$1;
exports.exists = exists$1;
exports.existsSync = existsSync$1;
exports.link = link;
exports.linkSync = linkSync;
exports.rename = rename;
exports.renameSync = renameSync;
exports.mkdir = mkdir;
exports.mkdirSync = mkdirSync;
exports.open = open$1;
exports.openSync = openSync$1;
exports.symlink = symlink$1;
exports.symlinkSync = symlinkSync$1;
exports.writeFile = writeFile;
exports.writeFileSync = writeFileSync$1;
exports.appendFile = appendFile;
exports.appendFileSync = appendFileSync;
exports.copydir = copydir;
exports.copydirSync = copydirSync;
exports.copyFile = copyFile;
exports.copyFileSync = copyFileSync;
exports.lsr = lsr;
exports.lsrSync = lsrSync;
exports.rimraf = rimraf;
exports.rimrafSync = rimrafSync;
exports.symlinkOrCopy = symlinkOrCopy$$1;
exports.symlinkOrCopySync = symlinkOrCopySync$$1;

});

__chunk_3.unwrapExports(sander_cjs);
var sander_cjs_1 = sander_cjs.chmod;
var sander_cjs_2 = sander_cjs.chown;
var sander_cjs_3 = sander_cjs.lchmod;
var sander_cjs_4 = sander_cjs.lchown;
var sander_cjs_5 = sander_cjs.lstat;
var sander_cjs_6 = sander_cjs.readdir;
var sander_cjs_7 = sander_cjs.readFile;
var sander_cjs_8 = sander_cjs.readlink;
var sander_cjs_9 = sander_cjs.realpath;
var sander_cjs_10 = sander_cjs.rmdir;
var sander_cjs_11 = sander_cjs.stat;
var sander_cjs_12 = sander_cjs.truncate;
var sander_cjs_13 = sander_cjs.unlink;
var sander_cjs_14 = sander_cjs.utimes;
var sander_cjs_15 = sander_cjs.unwatchFile;
var sander_cjs_16 = sander_cjs.watch;
var sander_cjs_17 = sander_cjs.watchFile;
var sander_cjs_18 = sander_cjs.chmodSync;
var sander_cjs_19 = sander_cjs.chownSync;
var sander_cjs_20 = sander_cjs.lchmodSync;
var sander_cjs_21 = sander_cjs.lchownSync;
var sander_cjs_22 = sander_cjs.lstatSync;
var sander_cjs_23 = sander_cjs.readdirSync;
var sander_cjs_24 = sander_cjs.readFileSync;
var sander_cjs_25 = sander_cjs.readlinkSync;
var sander_cjs_26 = sander_cjs.realpathSync;
var sander_cjs_27 = sander_cjs.rmdirSync;
var sander_cjs_28 = sander_cjs.statSync;
var sander_cjs_29 = sander_cjs.truncateSync;
var sander_cjs_30 = sander_cjs.unlinkSync;
var sander_cjs_31 = sander_cjs.utimesSync;
var sander_cjs_32 = sander_cjs.close;
var sander_cjs_33 = sander_cjs.fchmod;
var sander_cjs_34 = sander_cjs.fchown;
var sander_cjs_35 = sander_cjs.fstat;
var sander_cjs_36 = sander_cjs.fsync;
var sander_cjs_37 = sander_cjs.ftruncate;
var sander_cjs_38 = sander_cjs.futimes;
var sander_cjs_39 = sander_cjs.read;
var sander_cjs_40 = sander_cjs.closeSync;
var sander_cjs_41 = sander_cjs.fchmodSync;
var sander_cjs_42 = sander_cjs.fchownSync;
var sander_cjs_43 = sander_cjs.fstatSync;
var sander_cjs_44 = sander_cjs.fsyncSync;
var sander_cjs_45 = sander_cjs.ftruncateSync;
var sander_cjs_46 = sander_cjs.futimesSync;
var sander_cjs_47 = sander_cjs.readSync;
var sander_cjs_48 = sander_cjs.createReadStream;
var sander_cjs_49 = sander_cjs.createWriteStream;
var sander_cjs_50 = sander_cjs.exists;
var sander_cjs_51 = sander_cjs.existsSync;
var sander_cjs_52 = sander_cjs.link;
var sander_cjs_53 = sander_cjs.linkSync;
var sander_cjs_54 = sander_cjs.rename;
var sander_cjs_55 = sander_cjs.renameSync;
var sander_cjs_56 = sander_cjs.mkdir;
var sander_cjs_57 = sander_cjs.mkdirSync;
var sander_cjs_58 = sander_cjs.open;
var sander_cjs_59 = sander_cjs.openSync;
var sander_cjs_60 = sander_cjs.symlink;
var sander_cjs_61 = sander_cjs.symlinkSync;
var sander_cjs_62 = sander_cjs.writeFile;
var sander_cjs_63 = sander_cjs.writeFileSync;
var sander_cjs_64 = sander_cjs.appendFile;
var sander_cjs_65 = sander_cjs.appendFileSync;
var sander_cjs_66 = sander_cjs.copydir;
var sander_cjs_67 = sander_cjs.copydirSync;
var sander_cjs_68 = sander_cjs.copyFile;
var sander_cjs_69 = sander_cjs.copyFileSync;
var sander_cjs_70 = sander_cjs.lsr;
var sander_cjs_71 = sander_cjs.lsrSync;
var sander_cjs_72 = sander_cjs.rimraf;
var sander_cjs_73 = sander_cjs.rimrafSync;
var sander_cjs_74 = sander_cjs.symlinkOrCopy;
var sander_cjs_75 = sander_cjs.symlinkOrCopySync;

// Based on https://github.com/tmpvar/jsdom/blob/aa85b2abf07766ff7bf5c1f6daafb3726f2f2db5/lib/jsdom/living/blob.js
// (MIT licensed)

const BUFFER = Symbol('buffer');
const TYPE = Symbol('type');

class Blob {
	constructor() {
		this[TYPE] = '';

		const blobParts = arguments[0];
		const options = arguments[1];

		const buffers = [];

		if (blobParts) {
			const a = blobParts;
			const length = Number(a.length);
			for (let i = 0; i < length; i++) {
				const element = a[i];
				let buffer;
				if (element instanceof Buffer) {
					buffer = element;
				} else if (ArrayBuffer.isView(element)) {
					buffer = Buffer.from(element.buffer, element.byteOffset, element.byteLength);
				} else if (element instanceof ArrayBuffer) {
					buffer = Buffer.from(element);
				} else if (element instanceof Blob) {
					buffer = element[BUFFER];
				} else {
					buffer = Buffer.from(typeof element === 'string' ? element : String(element));
				}
				buffers.push(buffer);
			}
		}

		this[BUFFER] = Buffer.concat(buffers);

		let type = options && options.type !== undefined && String(options.type).toLowerCase();
		if (type && !/[^\u0020-\u007E]/.test(type)) {
			this[TYPE] = type;
		}
	}
	get size() {
		return this[BUFFER].length;
	}
	get type() {
		return this[TYPE];
	}
	slice() {
		const size = this.size;

		const start = arguments[0];
		const end = arguments[1];
		let relativeStart, relativeEnd;
		if (start === undefined) {
			relativeStart = 0;
		} else if (start < 0) {
			relativeStart = Math.max(size + start, 0);
		} else {
			relativeStart = Math.min(start, size);
		}
		if (end === undefined) {
			relativeEnd = size;
		} else if (end < 0) {
			relativeEnd = Math.max(size + end, 0);
		} else {
			relativeEnd = Math.min(end, size);
		}
		const span = Math.max(relativeEnd - relativeStart, 0);

		const buffer = this[BUFFER];
		const slicedBuffer = buffer.slice(relativeStart, relativeStart + span);
		const blob = new Blob([], { type: arguments[2] });
		blob[BUFFER] = slicedBuffer;
		return blob;
	}
}

Object.defineProperties(Blob.prototype, {
	size: { enumerable: true },
	type: { enumerable: true },
	slice: { enumerable: true }
});

Object.defineProperty(Blob.prototype, Symbol.toStringTag, {
	value: 'Blob',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * fetch-error.js
 *
 * FetchError interface for operational errors
 */

/**
 * Create FetchError instance
 *
 * @param   String      message      Error message for human
 * @param   String      type         Error type for machine
 * @param   String      systemError  For Node.js system error
 * @return  FetchError
 */
function FetchError(message, type, systemError) {
  Error.call(this, message);

  this.message = message;
  this.type = type;

  // when err.type is `system`, err.code contains system error code
  if (systemError) {
    this.code = this.errno = systemError.code;
  }

  // hide custom error implementation details from end-users
  Error.captureStackTrace(this, this.constructor);
}

FetchError.prototype = Object.create(Error.prototype);
FetchError.prototype.constructor = FetchError;
FetchError.prototype.name = 'FetchError';

let convert;
try {
	convert = require('encoding').convert;
} catch (e) {}

const INTERNALS = Symbol('Body internals');

/**
 * Body mixin
 *
 * Ref: https://fetch.spec.whatwg.org/#body
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
function Body(body) {
	var _this = this;

	var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
	    _ref$size = _ref.size;

	let size = _ref$size === undefined ? 0 : _ref$size;
	var _ref$timeout = _ref.timeout;
	let timeout = _ref$timeout === undefined ? 0 : _ref$timeout;

	if (body == null) {
		// body is undefined or null
		body = null;
	} else if (typeof body === 'string') ; else if (isURLSearchParams(body)) ; else if (body instanceof Blob) ; else if (Buffer.isBuffer(body)) ; else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') ; else if (ArrayBuffer.isView(body)) ; else if (body instanceof Stream__default) ; else {
		// none of the above
		// coerce to string
		body = String(body);
	}
	this[INTERNALS] = {
		body,
		disturbed: false,
		error: null
	};
	this.size = size;
	this.timeout = timeout;

	if (body instanceof Stream__default) {
		body.on('error', function (err) {
			_this[INTERNALS].error = new FetchError(`Invalid response body while trying to fetch ${_this.url}: ${err.message}`, 'system', err);
		});
	}
}

Body.prototype = {
	get body() {
		return this[INTERNALS].body;
	},

	get bodyUsed() {
		return this[INTERNALS].disturbed;
	},

	/**
  * Decode response as ArrayBuffer
  *
  * @return  Promise
  */
	arrayBuffer() {
		return consumeBody.call(this).then(function (buf) {
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		});
	},

	/**
  * Return raw response as Blob
  *
  * @return Promise
  */
	blob() {
		let ct = this.headers && this.headers.get('content-type') || '';
		return consumeBody.call(this).then(function (buf) {
			return Object.assign(
			// Prevent copying
			new Blob([], {
				type: ct.toLowerCase()
			}), {
				[BUFFER]: buf
			});
		});
	},

	/**
  * Decode response as json
  *
  * @return  Promise
  */
	json() {
		var _this2 = this;

		return consumeBody.call(this).then(function (buffer) {
			try {
				return JSON.parse(buffer.toString());
			} catch (err) {
				return Body.Promise.reject(new FetchError(`invalid json response body at ${_this2.url} reason: ${err.message}`, 'invalid-json'));
			}
		});
	},

	/**
  * Decode response as text
  *
  * @return  Promise
  */
	text() {
		return consumeBody.call(this).then(function (buffer) {
			return buffer.toString();
		});
	},

	/**
  * Decode response as buffer (non-spec api)
  *
  * @return  Promise
  */
	buffer() {
		return consumeBody.call(this);
	},

	/**
  * Decode response as text, while automatically detecting the encoding and
  * trying to decode to UTF-8 (non-spec api)
  *
  * @return  Promise
  */
	textConverted() {
		var _this3 = this;

		return consumeBody.call(this).then(function (buffer) {
			return convertBody(buffer, _this3.headers);
		});
	}

};

// In browsers, all properties are enumerable.
Object.defineProperties(Body.prototype, {
	body: { enumerable: true },
	bodyUsed: { enumerable: true },
	arrayBuffer: { enumerable: true },
	blob: { enumerable: true },
	json: { enumerable: true },
	text: { enumerable: true }
});

Body.mixIn = function (proto) {
	for (const name of Object.getOwnPropertyNames(Body.prototype)) {
		// istanbul ignore else: future proof
		if (!(name in proto)) {
			const desc = Object.getOwnPropertyDescriptor(Body.prototype, name);
			Object.defineProperty(proto, name, desc);
		}
	}
};

/**
 * Consume and convert an entire Body to a Buffer.
 *
 * Ref: https://fetch.spec.whatwg.org/#concept-body-consume-body
 *
 * @return  Promise
 */
function consumeBody() {
	var _this4 = this;

	if (this[INTERNALS].disturbed) {
		return Body.Promise.reject(new TypeError(`body used already for: ${this.url}`));
	}

	this[INTERNALS].disturbed = true;

	if (this[INTERNALS].error) {
		return Body.Promise.reject(this[INTERNALS].error);
	}

	// body is null
	if (this.body === null) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is string
	if (typeof this.body === 'string') {
		return Body.Promise.resolve(Buffer.from(this.body));
	}

	// body is blob
	if (this.body instanceof Blob) {
		return Body.Promise.resolve(this.body[BUFFER]);
	}

	// body is buffer
	if (Buffer.isBuffer(this.body)) {
		return Body.Promise.resolve(this.body);
	}

	// body is ArrayBuffer
	if (Object.prototype.toString.call(this.body) === '[object ArrayBuffer]') {
		return Body.Promise.resolve(Buffer.from(this.body));
	}

	// body is ArrayBufferView
	if (ArrayBuffer.isView(this.body)) {
		return Body.Promise.resolve(Buffer.from(this.body.buffer, this.body.byteOffset, this.body.byteLength));
	}

	// istanbul ignore if: should never happen
	if (!(this.body instanceof Stream__default)) {
		return Body.Promise.resolve(Buffer.alloc(0));
	}

	// body is stream
	// get ready to actually consume the body
	let accum = [];
	let accumBytes = 0;
	let abort = false;

	return new Body.Promise(function (resolve$$1, reject) {
		let resTimeout;

		// allow timeout on slow response body
		if (_this4.timeout) {
			resTimeout = setTimeout(function () {
				abort = true;
				reject(new FetchError(`Response timeout while trying to fetch ${_this4.url} (over ${_this4.timeout}ms)`, 'body-timeout'));
			}, _this4.timeout);
		}

		// handle stream error, such as incorrect content-encoding
		_this4.body.on('error', function (err) {
			reject(new FetchError(`Invalid response body while trying to fetch ${_this4.url}: ${err.message}`, 'system', err));
		});

		_this4.body.on('data', function (chunk) {
			if (abort || chunk === null) {
				return;
			}

			if (_this4.size && accumBytes + chunk.length > _this4.size) {
				abort = true;
				reject(new FetchError(`content size at ${_this4.url} over limit: ${_this4.size}`, 'max-size'));
				return;
			}

			accumBytes += chunk.length;
			accum.push(chunk);
		});

		_this4.body.on('end', function () {
			if (abort) {
				return;
			}

			clearTimeout(resTimeout);

			try {
				resolve$$1(Buffer.concat(accum));
			} catch (err) {
				// handle streams that have accumulated too much data (issue #414)
				reject(new FetchError(`Could not create Buffer from response body for ${_this4.url}: ${err.message}`, 'system', err));
			}
		});
	});
}

/**
 * Detect buffer encoding and convert to target encoding
 * ref: http://www.w3.org/TR/2011/WD-html5-20110113/parsing.html#determining-the-character-encoding
 *
 * @param   Buffer  buffer    Incoming buffer
 * @param   String  encoding  Target encoding
 * @return  String
 */
function convertBody(buffer, headers) {
	if (typeof convert !== 'function') {
		throw new Error('The package `encoding` must be installed to use the textConverted() function');
	}

	const ct = headers.get('content-type');
	let charset = 'utf-8';
	let res, str;

	// header
	if (ct) {
		res = /charset=([^;]*)/i.exec(ct);
	}

	// no charset in content type, peek at response body for at most 1024 bytes
	str = buffer.slice(0, 1024).toString();

	// html5
	if (!res && str) {
		res = /<meta.+?charset=(['"])(.+?)\1/i.exec(str);
	}

	// html4
	if (!res && str) {
		res = /<meta[\s]+?http-equiv=(['"])content-type\1[\s]+?content=(['"])(.+?)\2/i.exec(str);

		if (res) {
			res = /charset=(.*)/i.exec(res.pop());
		}
	}

	// xml
	if (!res && str) {
		res = /<\?xml.+?encoding=(['"])(.+?)\1/i.exec(str);
	}

	// found charset
	if (res) {
		charset = res.pop();

		// prevent decode issues when sites use incorrect encoding
		// ref: https://hsivonen.fi/encoding-menu/
		if (charset === 'gb2312' || charset === 'gbk') {
			charset = 'gb18030';
		}
	}

	// turn raw buffers into a single utf-8 buffer
	return convert(buffer, 'UTF-8', charset).toString();
}

/**
 * Detect a URLSearchParams object
 * ref: https://github.com/bitinn/node-fetch/issues/296#issuecomment-307598143
 *
 * @param   Object  obj     Object to detect by type or brand
 * @return  String
 */
function isURLSearchParams(obj) {
	// Duck-typing as a necessary condition.
	if (typeof obj !== 'object' || typeof obj.append !== 'function' || typeof obj.delete !== 'function' || typeof obj.get !== 'function' || typeof obj.getAll !== 'function' || typeof obj.has !== 'function' || typeof obj.set !== 'function') {
		return false;
	}

	// Brand-checking and more duck-typing as optional condition.
	return obj.constructor.name === 'URLSearchParams' || Object.prototype.toString.call(obj) === '[object URLSearchParams]' || typeof obj.sort === 'function';
}

/**
 * Clone body given Res/Req instance
 *
 * @param   Mixed  instance  Response or Request instance
 * @return  Mixed
 */
function clone$1(instance) {
	let p1, p2;
	let body = instance.body;

	// don't allow cloning a used body
	if (instance.bodyUsed) {
		throw new Error('cannot clone body after it is used');
	}

	// check that body is a stream and not form-data object
	// note: we can't clone the form-data object without having it as a dependency
	if (body instanceof Stream__default && typeof body.getBoundary !== 'function') {
		// tee instance body
		p1 = new Stream.PassThrough();
		p2 = new Stream.PassThrough();
		body.pipe(p1);
		body.pipe(p2);
		// set instance body to teed body and return the other teed body
		instance[INTERNALS].body = p1;
		body = p2;
	}

	return body;
}

/**
 * Performs the operation "extract a `Content-Type` value from |object|" as
 * specified in the specification:
 * https://fetch.spec.whatwg.org/#concept-bodyinit-extract
 *
 * This function assumes that instance.body is present.
 *
 * @param   Mixed  instance  Response or Request instance
 */
function extractContentType(instance) {
	const body = instance.body;

	// istanbul ignore if: Currently, because of a guard in Request, body
	// can never be null. Included here for completeness.

	if (body === null) {
		// body is null
		return null;
	} else if (typeof body === 'string') {
		// body is string
		return 'text/plain;charset=UTF-8';
	} else if (isURLSearchParams(body)) {
		// body is a URLSearchParams
		return 'application/x-www-form-urlencoded;charset=UTF-8';
	} else if (body instanceof Blob) {
		// body is blob
		return body.type || null;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return null;
	} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		return null;
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		return null;
	} else if (typeof body.getBoundary === 'function') {
		// detect form data input from form-data module
		return `multipart/form-data;boundary=${body.getBoundary()}`;
	} else {
		// body is stream
		// can't really do much about this
		return null;
	}
}

/**
 * The Fetch Standard treats this as if "total bytes" is a property on the body.
 * For us, we have to explicitly get it with a function.
 *
 * ref: https://fetch.spec.whatwg.org/#concept-body-total-bytes
 *
 * @param   Body    instance   Instance of Body
 * @return  Number?            Number of bytes, or null if not possible
 */
function getTotalBytes(instance) {
	const body = instance.body;

	// istanbul ignore if: included for completion

	if (body === null) {
		// body is null
		return 0;
	} else if (typeof body === 'string') {
		// body is string
		return Buffer.byteLength(body);
	} else if (isURLSearchParams(body)) {
		// body is URLSearchParams
		return Buffer.byteLength(String(body));
	} else if (body instanceof Blob) {
		// body is blob
		return body.size;
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		return body.length;
	} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		return body.byteLength;
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		return body.byteLength;
	} else if (body && typeof body.getLengthSync === 'function') {
		// detect form data input from form-data module
		if (body._lengthRetrievers && body._lengthRetrievers.length == 0 || // 1.x
		body.hasKnownLength && body.hasKnownLength()) {
			// 2.x
			return body.getLengthSync();
		}
		return null;
	} else {
		// body is stream
		// can't really do much about this
		return null;
	}
}

/**
 * Write a Body to a Node.js WritableStream (e.g. http.Request) object.
 *
 * @param   Body    instance   Instance of Body
 * @return  Void
 */
function writeToStream(dest, instance) {
	const body = instance.body;


	if (body === null) {
		// body is null
		dest.end();
	} else if (typeof body === 'string') {
		// body is string
		dest.write(body);
		dest.end();
	} else if (isURLSearchParams(body)) {
		// body is URLSearchParams
		dest.write(Buffer.from(String(body)));
		dest.end();
	} else if (body instanceof Blob) {
		// body is blob
		dest.write(body[BUFFER]);
		dest.end();
	} else if (Buffer.isBuffer(body)) {
		// body is buffer
		dest.write(body);
		dest.end();
	} else if (Object.prototype.toString.call(body) === '[object ArrayBuffer]') {
		// body is ArrayBuffer
		dest.write(Buffer.from(body));
		dest.end();
	} else if (ArrayBuffer.isView(body)) {
		// body is ArrayBufferView
		dest.write(Buffer.from(body.buffer, body.byteOffset, body.byteLength));
		dest.end();
	} else {
		// body is stream
		body.pipe(dest);
	}
}

// expose Promise
Body.Promise = global.Promise;

/**
 * headers.js
 *
 * Headers class offers convenient helpers
 */

const invalidTokenRegex = /[^\^_`a-zA-Z\-0-9!#$%&'*+.|~]/;
const invalidHeaderCharRegex = /[^\t\x20-\x7e\x80-\xff]/;

function validateName(name) {
	name = `${name}`;
	if (invalidTokenRegex.test(name)) {
		throw new TypeError(`${name} is not a legal HTTP header name`);
	}
}

function validateValue(value) {
	value = `${value}`;
	if (invalidHeaderCharRegex.test(value)) {
		throw new TypeError(`${value} is not a legal HTTP header value`);
	}
}

/**
 * Find the key in the map object given a header name.
 *
 * Returns undefined if not found.
 *
 * @param   String  name  Header name
 * @return  String|Undefined
 */
function find(map, name) {
	name = name.toLowerCase();
	for (const key in map) {
		if (key.toLowerCase() === name) {
			return key;
		}
	}
	return undefined;
}

const MAP = Symbol('map');
class Headers {
	/**
  * Headers class
  *
  * @param   Object  headers  Response headers
  * @return  Void
  */
	constructor() {
		let init = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;

		this[MAP] = Object.create(null);

		if (init instanceof Headers) {
			const rawHeaders = init.raw();
			const headerNames = Object.keys(rawHeaders);

			for (const headerName of headerNames) {
				for (const value of rawHeaders[headerName]) {
					this.append(headerName, value);
				}
			}

			return;
		}

		// We don't worry about converting prop to ByteString here as append()
		// will handle it.
		if (init == null) ; else if (typeof init === 'object') {
			const method = init[Symbol.iterator];
			if (method != null) {
				if (typeof method !== 'function') {
					throw new TypeError('Header pairs must be iterable');
				}

				// sequence<sequence<ByteString>>
				// Note: per spec we have to first exhaust the lists then process them
				const pairs = [];
				for (const pair of init) {
					if (typeof pair !== 'object' || typeof pair[Symbol.iterator] !== 'function') {
						throw new TypeError('Each header pair must be iterable');
					}
					pairs.push(Array.from(pair));
				}

				for (const pair of pairs) {
					if (pair.length !== 2) {
						throw new TypeError('Each header pair must be a name/value tuple');
					}
					this.append(pair[0], pair[1]);
				}
			} else {
				// record<ByteString, ByteString>
				for (const key of Object.keys(init)) {
					const value = init[key];
					this.append(key, value);
				}
			}
		} else {
			throw new TypeError('Provided initializer must be an object');
		}
	}

	/**
  * Return combined header value given name
  *
  * @param   String  name  Header name
  * @return  Mixed
  */
	get(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key === undefined) {
			return null;
		}

		return this[MAP][key].join(', ');
	}

	/**
  * Iterate over all headers
  *
  * @param   Function  callback  Executed for each item with parameters (value, name, thisArg)
  * @param   Boolean   thisArg   `this` context for callback function
  * @return  Void
  */
	forEach(callback) {
		let thisArg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;

		let pairs = getHeaders(this);
		let i = 0;
		while (i < pairs.length) {
			var _pairs$i = pairs[i];
			const name = _pairs$i[0],
			      value = _pairs$i[1];

			callback.call(thisArg, value, name, this);
			pairs = getHeaders(this);
			i++;
		}
	}

	/**
  * Overwrite header values given name
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	set(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		this[MAP][key !== undefined ? key : name] = [value];
	}

	/**
  * Append a value onto existing header
  *
  * @param   String  name   Header name
  * @param   String  value  Header value
  * @return  Void
  */
	append(name, value) {
		name = `${name}`;
		value = `${value}`;
		validateName(name);
		validateValue(value);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			this[MAP][key].push(value);
		} else {
			this[MAP][name] = [value];
		}
	}

	/**
  * Check for header name existence
  *
  * @param   String   name  Header name
  * @return  Boolean
  */
	has(name) {
		name = `${name}`;
		validateName(name);
		return find(this[MAP], name) !== undefined;
	}

	/**
  * Delete all header values given name
  *
  * @param   String  name  Header name
  * @return  Void
  */
	delete(name) {
		name = `${name}`;
		validateName(name);
		const key = find(this[MAP], name);
		if (key !== undefined) {
			delete this[MAP][key];
		}
	}

	/**
  * Return raw headers (non-spec api)
  *
  * @return  Object
  */
	raw() {
		return this[MAP];
	}

	/**
  * Get an iterator on keys.
  *
  * @return  Iterator
  */
	keys() {
		return createHeadersIterator(this, 'key');
	}

	/**
  * Get an iterator on values.
  *
  * @return  Iterator
  */
	values() {
		return createHeadersIterator(this, 'value');
	}

	/**
  * Get an iterator on entries.
  *
  * This is the default iterator of the Headers object.
  *
  * @return  Iterator
  */
	[Symbol.iterator]() {
		return createHeadersIterator(this, 'key+value');
	}
}
Headers.prototype.entries = Headers.prototype[Symbol.iterator];

Object.defineProperty(Headers.prototype, Symbol.toStringTag, {
	value: 'Headers',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Headers.prototype, {
	get: { enumerable: true },
	forEach: { enumerable: true },
	set: { enumerable: true },
	append: { enumerable: true },
	has: { enumerable: true },
	delete: { enumerable: true },
	keys: { enumerable: true },
	values: { enumerable: true },
	entries: { enumerable: true }
});

function getHeaders(headers) {
	let kind = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'key+value';

	const keys = Object.keys(headers[MAP]).sort();
	return keys.map(kind === 'key' ? function (k) {
		return k.toLowerCase();
	} : kind === 'value' ? function (k) {
		return headers[MAP][k].join(', ');
	} : function (k) {
		return [k.toLowerCase(), headers[MAP][k].join(', ')];
	});
}

const INTERNAL = Symbol('internal');

function createHeadersIterator(target, kind) {
	const iterator = Object.create(HeadersIteratorPrototype);
	iterator[INTERNAL] = {
		target,
		kind,
		index: 0
	};
	return iterator;
}

const HeadersIteratorPrototype = Object.setPrototypeOf({
	next() {
		// istanbul ignore if
		if (!this || Object.getPrototypeOf(this) !== HeadersIteratorPrototype) {
			throw new TypeError('Value of `this` is not a HeadersIterator');
		}

		var _INTERNAL = this[INTERNAL];
		const target = _INTERNAL.target,
		      kind = _INTERNAL.kind,
		      index = _INTERNAL.index;

		const values = getHeaders(target, kind);
		const len = values.length;
		if (index >= len) {
			return {
				value: undefined,
				done: true
			};
		}

		this[INTERNAL].index = index + 1;

		return {
			value: values[index],
			done: false
		};
	}
}, Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())));

Object.defineProperty(HeadersIteratorPrototype, Symbol.toStringTag, {
	value: 'HeadersIterator',
	writable: false,
	enumerable: false,
	configurable: true
});

/**
 * Export the Headers object in a form that Node.js can consume.
 *
 * @param   Headers  headers
 * @return  Object
 */
function exportNodeCompatibleHeaders(headers) {
	const obj = Object.assign({ __proto__: null }, headers[MAP]);

	// http.request() only supports string as Host header. This hack makes
	// specifying custom Host header possible.
	const hostHeaderKey = find(headers[MAP], 'Host');
	if (hostHeaderKey !== undefined) {
		obj[hostHeaderKey] = obj[hostHeaderKey][0];
	}

	return obj;
}

/**
 * Create a Headers object from an object of headers, ignoring those that do
 * not conform to HTTP grammar productions.
 *
 * @param   Object  obj  Object of headers
 * @return  Headers
 */
function createHeadersLenient(obj) {
	const headers = new Headers();
	for (const name of Object.keys(obj)) {
		if (invalidTokenRegex.test(name)) {
			continue;
		}
		if (Array.isArray(obj[name])) {
			for (const val of obj[name]) {
				if (invalidHeaderCharRegex.test(val)) {
					continue;
				}
				if (headers[MAP][name] === undefined) {
					headers[MAP][name] = [val];
				} else {
					headers[MAP][name].push(val);
				}
			}
		} else if (!invalidHeaderCharRegex.test(obj[name])) {
			headers[MAP][name] = [obj[name]];
		}
	}
	return headers;
}

const INTERNALS$1 = Symbol('Response internals');

/**
 * Response class
 *
 * @param   Stream  body  Readable stream
 * @param   Object  opts  Response options
 * @return  Void
 */
class Response {
	constructor() {
		let body = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
		let opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		Body.call(this, body, opts);

		const status = opts.status || 200;

		this[INTERNALS$1] = {
			url: opts.url,
			status,
			statusText: opts.statusText || http.STATUS_CODES[status],
			headers: new Headers(opts.headers)
		};
	}

	get url() {
		return this[INTERNALS$1].url;
	}

	get status() {
		return this[INTERNALS$1].status;
	}

	/**
  * Convenience property representing if the request ended normally
  */
	get ok() {
		return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
	}

	get statusText() {
		return this[INTERNALS$1].statusText;
	}

	get headers() {
		return this[INTERNALS$1].headers;
	}

	/**
  * Clone this response
  *
  * @return  Response
  */
	clone() {
		return new Response(clone$1(this), {
			url: this.url,
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			ok: this.ok
		});
	}
}

Body.mixIn(Response.prototype);

Object.defineProperties(Response.prototype, {
	url: { enumerable: true },
	status: { enumerable: true },
	ok: { enumerable: true },
	statusText: { enumerable: true },
	headers: { enumerable: true },
	clone: { enumerable: true }
});

Object.defineProperty(Response.prototype, Symbol.toStringTag, {
	value: 'Response',
	writable: false,
	enumerable: false,
	configurable: true
});

const INTERNALS$2 = Symbol('Request internals');

/**
 * Check if a value is an instance of Request.
 *
 * @param   Mixed   input
 * @return  Boolean
 */
function isRequest(input) {
	return typeof input === 'object' && typeof input[INTERNALS$2] === 'object';
}

/**
 * Request class
 *
 * @param   Mixed   input  Url or Request instance
 * @param   Object  init   Custom options
 * @return  Void
 */
class Request {
	constructor(input) {
		let init = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		let parsedURL;

		// normalize input
		if (!isRequest(input)) {
			if (input && input.href) {
				// in order to support Node.js' Url objects; though WHATWG's URL objects
				// will fall into this branch also (since their `toString()` will return
				// `href` property anyway)
				parsedURL = url.parse(input.href);
			} else {
				// coerce input to a string before attempting to parse
				parsedURL = url.parse(`${input}`);
			}
			input = {};
		} else {
			parsedURL = url.parse(input.url);
		}

		let method = init.method || input.method || 'GET';
		method = method.toUpperCase();

		if ((init.body != null || isRequest(input) && input.body !== null) && (method === 'GET' || method === 'HEAD')) {
			throw new TypeError('Request with GET/HEAD method cannot have body');
		}

		let inputBody = init.body != null ? init.body : isRequest(input) && input.body !== null ? clone$1(input) : null;

		Body.call(this, inputBody, {
			timeout: init.timeout || input.timeout || 0,
			size: init.size || input.size || 0
		});

		const headers = new Headers(init.headers || input.headers || {});

		if (init.body != null) {
			const contentType = extractContentType(this);
			if (contentType !== null && !headers.has('Content-Type')) {
				headers.append('Content-Type', contentType);
			}
		}

		this[INTERNALS$2] = {
			method,
			redirect: init.redirect || input.redirect || 'follow',
			headers,
			parsedURL
		};

		// node-fetch-only options
		this.follow = init.follow !== undefined ? init.follow : input.follow !== undefined ? input.follow : 20;
		this.compress = init.compress !== undefined ? init.compress : input.compress !== undefined ? input.compress : true;
		this.counter = init.counter || input.counter || 0;
		this.agent = init.agent || input.agent;
	}

	get method() {
		return this[INTERNALS$2].method;
	}

	get url() {
		return url.format(this[INTERNALS$2].parsedURL);
	}

	get headers() {
		return this[INTERNALS$2].headers;
	}

	get redirect() {
		return this[INTERNALS$2].redirect;
	}

	/**
  * Clone this request
  *
  * @return  Request
  */
	clone() {
		return new Request(this);
	}
}

Body.mixIn(Request.prototype);

Object.defineProperty(Request.prototype, Symbol.toStringTag, {
	value: 'Request',
	writable: false,
	enumerable: false,
	configurable: true
});

Object.defineProperties(Request.prototype, {
	method: { enumerable: true },
	url: { enumerable: true },
	headers: { enumerable: true },
	redirect: { enumerable: true },
	clone: { enumerable: true }
});

/**
 * Convert a Request to Node.js http request options.
 *
 * @param   Request  A Request instance
 * @return  Object   The options object to be passed to http.request
 */
function getNodeRequestOptions(request) {
	const parsedURL = request[INTERNALS$2].parsedURL;
	const headers = new Headers(request[INTERNALS$2].headers);

	// fetch step 1.3
	if (!headers.has('Accept')) {
		headers.set('Accept', '*/*');
	}

	// Basic fetch
	if (!parsedURL.protocol || !parsedURL.hostname) {
		throw new TypeError('Only absolute URLs are supported');
	}

	if (!/^https?:$/.test(parsedURL.protocol)) {
		throw new TypeError('Only HTTP(S) protocols are supported');
	}

	// HTTP-network-or-cache fetch steps 2.4-2.7
	let contentLengthValue = null;
	if (request.body == null && /^(POST|PUT)$/i.test(request.method)) {
		contentLengthValue = '0';
	}
	if (request.body != null) {
		const totalBytes = getTotalBytes(request);
		if (typeof totalBytes === 'number') {
			contentLengthValue = String(totalBytes);
		}
	}
	if (contentLengthValue) {
		headers.set('Content-Length', contentLengthValue);
	}

	// HTTP-network-or-cache fetch step 2.11
	if (!headers.has('User-Agent')) {
		headers.set('User-Agent', 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)');
	}

	// HTTP-network-or-cache fetch step 2.15
	if (request.compress) {
		headers.set('Accept-Encoding', 'gzip,deflate');
	}
	if (!headers.has('Connection') && !request.agent) {
		headers.set('Connection', 'close');
	}

	// HTTP-network fetch step 4.2
	// chunked encoding is handled by Node.js

	return Object.assign({}, parsedURL, {
		method: request.method,
		headers: exportNodeCompatibleHeaders(headers),
		agent: request.agent
	});
}

/**
 * Fetch function
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */
function fetch(url$$1, opts) {

	// allow custom promise
	if (!fetch.Promise) {
		throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
	}

	Body.Promise = fetch.Promise;

	// wrap http.request into fetch
	return new fetch.Promise(function (resolve$$1, reject) {
		// build request object
		const request = new Request(url$$1, opts);
		const options = getNodeRequestOptions(request);

		const send = (options.protocol === 'https:' ? https : http__default).request;

		// send request
		const req = send(options);
		let reqTimeout;

		function finalize() {
			req.abort();
			clearTimeout(reqTimeout);
		}

		if (request.timeout) {
			req.once('socket', function (socket) {
				reqTimeout = setTimeout(function () {
					reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
					finalize();
				}, request.timeout);
			});
		}

		req.on('error', function (err) {
			reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
			finalize();
		});

		req.on('response', function (res) {
			clearTimeout(reqTimeout);

			const headers = createHeadersLenient(res.headers);

			// HTTP fetch step 5
			if (fetch.isRedirect(res.statusCode)) {
				// HTTP fetch step 5.2
				const location = headers.get('Location');

				// HTTP fetch step 5.3
				const locationURL = location === null ? null : url.resolve(request.url, location);

				// HTTP fetch step 5.5
				switch (request.redirect) {
					case 'error':
						reject(new FetchError(`redirect mode is set to error: ${request.url}`, 'no-redirect'));
						finalize();
						return;
					case 'manual':
						// node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
						if (locationURL !== null) {
							headers.set('Location', locationURL);
						}
						break;
					case 'follow':
						// HTTP-redirect fetch step 2
						if (locationURL === null) {
							break;
						}

						// HTTP-redirect fetch step 5
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 6 (counter increment)
						// Create a new Request object.
						const requestOpts = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: request.body
						};

						// HTTP-redirect fetch step 9
						if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
							reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 11
						if (res.statusCode === 303 || (res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST') {
							requestOpts.method = 'GET';
							requestOpts.body = undefined;
							requestOpts.headers.delete('content-length');
						}

						// HTTP-redirect fetch step 15
						resolve$$1(fetch(new Request(locationURL, requestOpts)));
						finalize();
						return;
				}
			}

			// prepare response
			let body = res.pipe(new Stream.PassThrough());
			const response_options = {
				url: request.url,
				status: res.statusCode,
				statusText: res.statusMessage,
				headers: headers,
				size: request.size,
				timeout: request.timeout
			};

			// HTTP-network fetch step 12.1.1.3
			const codings = headers.get('Content-Encoding');

			// HTTP-network fetch step 12.1.1.4: handle content codings

			// in following scenarios we ignore compression support
			// 1. compression support is disabled
			// 2. HEAD request
			// 3. no Content-Encoding header
			// 4. no content response (204)
			// 5. content not modified response (304)
			if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
				resolve$$1(new Response(body, response_options));
				return;
			}

			// For Node v6+
			// Be less strict when decoding compressed responses, since sometimes
			// servers send slightly invalid responses that are still accepted
			// by common browsers.
			// Always using Z_SYNC_FLUSH is what cURL does.
			const zlibOptions = {
				flush: zlib.Z_SYNC_FLUSH,
				finishFlush: zlib.Z_SYNC_FLUSH
			};

			// for gzip
			if (codings == 'gzip' || codings == 'x-gzip') {
				body = body.pipe(zlib.createGunzip(zlibOptions));
				resolve$$1(new Response(body, response_options));
				return;
			}

			// for deflate
			if (codings == 'deflate' || codings == 'x-deflate') {
				// handle the infamous raw deflate response from old servers
				// a hack for old IIS and Apache servers
				const raw = res.pipe(new Stream.PassThrough());
				raw.once('data', function (chunk) {
					// see http://stackoverflow.com/questions/37519828
					if ((chunk[0] & 0x0F) === 0x08) {
						body = body.pipe(zlib.createInflate());
					} else {
						body = body.pipe(zlib.createInflateRaw());
					}
					resolve$$1(new Response(body, response_options));
				});
				return;
			}

			// otherwise, use response as-is
			resolve$$1(new Response(body, response_options));
		});

		writeToStream(req, request);
	});
}
/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */
fetch.isRedirect = function (code) {
	return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
};

// expose Promise
fetch.Promise = global.Promise;

function queue(max) {
    if (max === void 0) { max = 4; }
    var items = []; // TODO
    var pending = 0;
    var closed = false;
    var fulfil_closed;
    function dequeue() {
        if (pending === 0 && items.length === 0) {
            if (fulfil_closed)
                fulfil_closed();
        }
        if (pending >= max)
            return;
        if (items.length === 0)
            return;
        pending += 1;
        var _a = items.shift(), fn = _a.fn, fulfil = _a.fulfil, reject = _a.reject;
        var promise = fn();
        try {
            promise.then(fulfil, reject).then(function () {
                pending -= 1;
                dequeue();
            });
        }
        catch (err) {
            reject(err);
            pending -= 1;
            dequeue();
        }
        dequeue();
    }
    return {
        add: function (fn) {
            if (closed) {
                throw new Error("Cannot add to a closed queue");
            }
            return new Promise(function (fulfil, reject) {
                items.push({ fn: fn, fulfil: fulfil, reject: reject });
                dequeue();
            });
        },
        close: function () {
            closed = true;
            return new Promise(function (fulfil, reject) {
                if (pending === 0) {
                    fulfil();
                }
                else {
                    fulfil_closed = fulfil;
                }
            });
        }
    };
}

function clean_html(html) {
    return html
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gm, '')
        .replace(/(<script[\s\S]*?>)[\s\S]*?<\/script>/gm, '$1</' + 'script>')
        .replace(/(<style[\s\S]*?>)[\s\S]*?<\/style>/gm, '$1</' + 'style>')
        .replace(/<!--[\s\S]*?-->/gm, '');
}

function resolve(from, to) {
    return url.parse(url.resolve(from, to));
}
function _export(_a) {
    var _b = _a === void 0 ? {} : _a, cwd = _b.cwd, _c = _b.static, static_files = _c === void 0 ? 'static' : _c, _d = _b.build_dir, build_dir = _d === void 0 ? '__sapper__/build' : _d, _e = _b.export_dir, export_dir = _e === void 0 ? '__sapper__/export' : _e, _f = _b.basepath, basepath = _f === void 0 ? '' : _f, _g = _b.timeout, timeout = _g === void 0 ? 5000 : _g, _h = _b.oninfo, oninfo = _h === void 0 ? __chunk_3.noop : _h, _j = _b.onfile, onfile = _j === void 0 ? __chunk_3.noop : _j;
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        function save(path$$1, status, type, body) {
            var pathname = resolve(origin, path$$1).pathname;
            var file = decodeURIComponent(pathname.slice(1));
            if (saved.has(file))
                return;
            saved.add(file);
            var is_html = type === 'text/html';
            if (is_html) {
                if (pathname !== '/service-worker-index.html') {
                    file = file === '' ? 'index.html' : file + "/index.html";
                }
                body = __chunk_7.minify_html(body);
            }
            onfile({
                file: file,
                size: body.length,
                status: status
            });
            sander_cjs_63(export_dir, file, body);
        }
        function handle(url$$1) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var pathname, timeout_deferred, the_timeout, r, type, body, range, link, cleaned, q, promise, base_match, base_href, base, match, pattern, _loop_1, location;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            pathname = url$$1.pathname;
                            if (pathname !== '/service-worker-index.html') {
                                pathname = pathname.replace(root.pathname, '') || '/';
                            }
                            if (seen.has(pathname))
                                return [2 /*return*/];
                            seen.add(pathname);
                            timeout_deferred = new __chunk_1.Deferred();
                            the_timeout = setTimeout(function () {
                                timeout_deferred.reject(new Error("Timed out waiting for " + url$$1.href));
                            }, timeout);
                            return [4 /*yield*/, Promise.race([
                                    fetch(url$$1.href, {
                                        redirect: 'manual'
                                    }),
                                    timeout_deferred.promise
                                ])];
                        case 1:
                            r = _a.sent();
                            clearTimeout(the_timeout); // prevent it hanging at the end
                            type = r.headers.get('Content-Type');
                            return [4 /*yield*/, r.text()];
                        case 2:
                            body = _a.sent();
                            range = ~~(r.status / 100);
                            if (!(range === 2)) return [3 /*break*/, 4];
                            if (!(type === 'text/html')) return [3 /*break*/, 4];
                            link = httpLinkHeader.parse(r.headers.get('Link') || '');
                            link.refs.forEach(function (ref) {
                                if (ref.rel === 'preload') {
                                    body = body.replace('</head>', "<link rel=\"preload\" as=" + JSON.stringify(ref.as) + " href=" + JSON.stringify(ref.uri) + "></head>");
                                }
                            });
                            if (!(pathname !== '/service-worker-index.html')) return [3 /*break*/, 4];
                            cleaned = clean_html(body);
                            q = queue(8);
                            promise = void 0;
                            base_match = /<base ([\s\S]+?)>/m.exec(cleaned);
                            base_href = base_match && get_href(base_match[1]);
                            base = resolve(url$$1.href, base_href);
                            match = void 0;
                            pattern = /<a ([\s\S]+?)>/gm;
                            _loop_1 = function () {
                                var attrs = match[1];
                                var href = get_href(attrs);
                                if (href) {
                                    var url_1 = resolve(base.href, href);
                                    if (url_1.protocol === protocol && url_1.host === host) {
                                        promise = q.add(function () { return handle(url_1); });
                                    }
                                }
                            };
                            while (match = pattern.exec(cleaned)) {
                                _loop_1();
                            }
                            return [4 /*yield*/, promise];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            if (!(range === 3)) return [3 /*break*/, 6];
                            location = r.headers.get('Location');
                            type = 'text/html';
                            body = "<script>window.location.href = \"" + location.replace(origin, '') + "\"</script>";
                            return [4 /*yield*/, handle(resolve(root.href, location))];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6:
                            save(pathname, r.status, type, body);
                            return [2 /*return*/];
                    }
                });
            });
        }
        var defaultPort, port, protocol, host, origin, root, proc, seen, saved;
        return tslib_1.__generator(this, function (_k) {
            switch (_k.label) {
                case 0:
                    basepath = basepath.replace(/^\//, '');
                    cwd = path.resolve(cwd);
                    static_files = path.resolve(cwd, static_files);
                    build_dir = path.resolve(cwd, build_dir);
                    export_dir = path.resolve(cwd, export_dir, basepath);
                    // Prep output directory
                    sander_cjs_73(export_dir);
                    sander_cjs_67(static_files).to(export_dir);
                    sander_cjs_67(build_dir, 'client').to(export_dir, 'client');
                    if (sander_cjs_51(build_dir, 'service-worker.js')) {
                        sander_cjs_69(build_dir, 'service-worker.js').to(export_dir, 'service-worker.js');
                    }
                    if (sander_cjs_51(build_dir, 'service-worker.js.map')) {
                        sander_cjs_69(build_dir, 'service-worker.js.map').to(export_dir, 'service-worker.js.map');
                    }
                    defaultPort = process.env.PORT ? parseInt(process.env.PORT) : 3000;
                    return [4 /*yield*/, __chunk_1.find(defaultPort)];
                case 1:
                    port = _k.sent();
                    protocol = 'http:';
                    host = "localhost:" + port;
                    origin = protocol + "//" + host;
                    root = resolve(origin, basepath);
                    if (!root.href.endsWith('/'))
                        root.href += '/';
                    oninfo({
                        message: "Crawling " + root.href
                    });
                    proc = child_process.fork(path.resolve(build_dir + "/server/server.js"), [], {
                        cwd: cwd,
                        env: Object.assign({
                            PORT: port,
                            NODE_ENV: 'production',
                            SAPPER_EXPORT: 'true'
                        }, process.env)
                    });
                    seen = new Set();
                    saved = new Set();
                    proc.on('message', function (message) {
                        if (!message.__sapper__ || message.event !== 'file')
                            return;
                        save(message.url, message.status, message.type, message.body);
                    });
                    return [2 /*return*/, __chunk_1.wait(port)
                            .then(function () { return handle(root); })
                            .then(function () { return handle(resolve(root.href, 'service-worker-index.html')); })
                            .then(function () { return proc.kill(); })
                            .catch(function (err) {
                            proc.kill();
                            throw err;
                        })];
            }
        });
    });
}
function get_href(attrs) {
    var match = /href\s*=\s*(?:"(.*?)"|'(.+?)'|([^\s>]+))/.exec(attrs);
    return match[1] || match[2] || match[3];
}

exports.export = _export;
//# sourceMappingURL=export.js.map
