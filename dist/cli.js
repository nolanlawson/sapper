'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = require('tslib');
var fs = require('fs');
var fs__default = _interopDefault(fs);
var path = require('path');
var path__default = _interopDefault(path);
var __chunk_4 = require('./chunk-7cffb8b5.js');

const EQQ = /\s|=/;
const FLAG = /^-{1,2}/;
const PREFIX = /^--no-/i;

function isBool(any) {
	return typeof any === 'boolean';
}

function toArr(any) {
	return Array.isArray(any) ? any : any == null ? [] : [any];
}

function toString(any) {
	return any == null || any === true ? '' : String(any);
}

function toBool(any) {
	return any === 'false' ? false : Boolean(any);
}

function toNum(any) {
	let x = Number(any);
	return !isBool(any) && (x * 0 === 0) ? x : any;
}

function getAlibi(names, arr) {
	if (arr.length === 0) return arr;
	let k, i = 0, len = arr.length, vals = [];
	for (; i < len; i++) {
		k = arr[i];
		vals.push(k);
		if (names[k] !== void 0) {
			vals = vals.concat(names[k]);
		}
	}
	return vals;
}

function typecast(key, val, strings, booleans) {
	if (strings.indexOf(key) !== -1) return toString(val);
	if (booleans.indexOf(key) !== -1) return toBool(val);
	return toNum(val);
}

var lib = function(args, opts) {
	args = args || [];
	opts = opts || {};

	opts.string = toArr(opts.string);
	opts.boolean = toArr(opts.boolean);

	const aliases = {};
	let k, i, j, x, y, len, type;

	if (opts.alias !== void 0) {
		for (k in opts.alias) {
			aliases[k] = toArr(opts.alias[k]);
			len = aliases[k].length; // save length
			for (i = 0; i < len; i++) {
				x = aliases[k][i]; // alias's key name
				aliases[x] = [k]; // set initial array
				for (j = 0; j < len; j++) {
					if (x !== aliases[k][j]) {
						aliases[x].push(aliases[k][j]);
					}
				}
			}
		}
	}

	if (opts.default !== void 0) {
		for (k in opts.default) {
			type = typeof opts.default[k];
			opts[type] = (opts[type] || []).concat(k);
		}
	}

	// apply to all aliases
	opts.string = getAlibi(aliases, opts.string);
	opts.boolean = getAlibi(aliases, opts.boolean);

	let idx = 0;
	const out = { _: [] };

	while (args[idx] !== void 0) {
		let incr = 1;
		const val = args[idx];

		if (val === '--') {
			out._ = out._.concat(args.slice(idx + 1));
			break;
		} else if (!FLAG.test(val)) {
			out._.push(val);
		} else if (PREFIX.test(val)) {
			out[val.replace(PREFIX, '')] = false;
		} else {
			let tmp;
			const segs = val.split(EQQ);
			const isGroup = segs[0].charCodeAt(1) !== 45; // '-'

			const flag = segs[0].substr(isGroup ? 1 : 2);
			len = flag.length;
			const key = isGroup ? flag[len - 1] : flag;

			if (opts.unknown !== void 0 && aliases[key] === void 0) {
				return opts.unknown(segs[0]);
			}

			if (segs.length > 1) {
				tmp = segs[1];
			} else {
				tmp = args[idx + 1] || true;
				FLAG.test(tmp) ? (tmp = true) : (incr = 2);
			}

			if (isGroup && len > 1) {
				for (i = len - 1; i--; ) {
					k = flag[i]; // all but last key
					out[k] = typecast(k, true, opts.string, opts.boolean);
				}
			}

			const value = typecast(key, tmp, opts.string, opts.boolean);
			out[key] = out[key] !== void 0 ? toArr(out[key]).concat(value) : value;

			// handle discarded args when dealing with booleans
			if (isBool(value) && !isBool(tmp) && tmp !== 'true' && tmp !== 'false') {
				out._.push(tmp);
			}
		}

		idx += incr;
	}

	if (opts.default !== void 0) {
		for (k in opts.default) {
			if (out[k] === void 0) {
				out[k] = opts.default[k];
			}
		}
	}

	for (k in out) {
		if (aliases[k] === void 0) continue;
		y = out[k];
		len = aliases[k].length;
		for (i = 0; i < len; i++) {
			out[aliases[k][i]] = y; // assign value
		}
	}

	return out;
};

/*!
 * repeat-string <https://github.com/jonschlinkert/repeat-string>
 *
 * Copyright (c) 2014-2015, Jon Schlinkert.
 * Licensed under the MIT License.
 */

/**
 * Results cache
 */

var res = '';
var cache;

/**
 * Expose `repeat`
 */

var repeatString = repeat;

/**
 * Repeat the given `string` the specified `number`
 * of times.
 *
 * **Example:**
 *
 * ```js
 * var repeat = require('repeat-string');
 * repeat('A', 5);
 * //=> AAAAA
 * ```
 *
 * @param {String} `string` The string to repeat
 * @param {Number} `number` The number of times to repeat the string
 * @return {String} Repeated string
 * @api public
 */

function repeat(str, num) {
  if (typeof str !== 'string') {
    throw new TypeError('expected a string');
  }

  // cover common, quick use cases
  if (num === 1) return str;
  if (num === 2) return str + str;

  var max = str.length * num;
  if (cache !== str || typeof cache === 'undefined') {
    cache = str;
    res = '';
  } else if (res.length >= max) {
    return res.substr(0, max);
  }

  while (max > res.length && num > 1) {
    if (num & 1) {
      res += str;
    }

    num >>= 1;
    str += str;
  }

  res += str;
  res = res.substr(0, max);
  return res;
}

var padRight = function padLeft(val, num, str) {
  var padding = '';
  var diff = num - val.length;

  // Breakpoints based on benchmarks to use the fastest approach
  // for the given number of zeros
  if (diff <= 5 && !str) {
    padding = '00000';
  } else if (diff <= 25 && !str) {
    padding = '000000000000000000000000000';
  } else {
    return val + repeatString(str || '0', diff);
  }

  return val + padding.slice(0, diff);
};

const GAP = 4;
const __ = '  ';
const ALL = '__all__';
const DEF = '__default__';
const NL = '\n';

function format(arr) {
	if (!arr.length) return '';
	let len = maxLen( arr.map(x => x[0]) ) + GAP;
	let join = a => padRight(a[0], len, ' ') + a[1] + (a[2] == null ? '' : `  (default ${a[2]})`);
	return arr.map(join);
}

function maxLen(arr) {
  let c=0, d=0, l=0, i=arr.length;
  if (i) while (i--) {
    d = arr[i].length;
    if (d > c) {
      l = i; c = d;
    }
  }
  return arr[l].length;
}

function noop(s) {
	return s;
}

function section(str, arr, fn) {
	if (!arr || !arr.length) return '';
	let i=0, out='';
	out += (NL + __ + str);
	for (; i < arr.length; i++) {
		out += (NL + __ + __ + fn(arr[i]));
	}
	return out + NL;
}

var help = function (bin, tree, key) {
	let out='', cmd=tree[key], pfx=`$ ${bin}`, all=tree[ALL];
	let prefix = s => `${pfx} ${s}`;

	// update ALL & CMD options
	all.options.push(['-h, --help', 'Displays this message']);
	cmd.options = (cmd.options || []).concat(all.options);

	// write options placeholder
	(cmd.options.length > 0) && (cmd.usage += ' [options]');

	// description ~> text only; usage ~> prefixed
	out += section('Description', cmd.describe, noop);
	out += section('Usage', [cmd.usage], prefix);

	if (key === DEF) {
		// General help :: print all non-internal commands & their 1st line of text
		let cmds = Object.keys(tree).filter(k => !/__/.test(k));
		let text = cmds.map(k => [k, (tree[k].describe || [''])[0]]);
		out += section('Available Commands', format(text), noop);

		out += (NL + __ + 'For more info, run any command with the `--help` flag');
		cmds.slice(0, 2).forEach(k => {
			out += (NL + __ + __ + `${pfx} ${k} --help`);
		});
		out += NL;
	}

	out += section('Options', format(cmd.options), noop);
	out += section('Examples', cmd.examples.map(prefix), noop);

	return out;
};

var error = function (bin, str, num=1) {
	let out = section('ERROR', [str], noop);
	out += (NL + __ + `Run \`$ ${bin} --help\` for more info.` + NL);
	console.error(out);
	process.exit(num);
};

// Strips leading `-|--` & extra space(s)
var parse = function (str) {
	return (str || '').split(/^-{1,2}|,|\s+-{1,2}|\s+/).filter(Boolean);
};

// @see https://stackoverflow.com/a/18914855/3577474
var sentences = function (str) {
	return (str || '').replace(/([.?!])\s*(?=[A-Z])/g, '$1|').split('|');
};

var utils = {
	help: help,
	error: error,
	parse: parse,
	sentences: sentences
};

const ALL$1 = '__all__';
const DEF$1 = '__default__';

class Sade {
	constructor(name) {
		this.tree = {};
		this.name = name;
		this.ver = '0.0.0';
		this.default = '';
		// set internal shapes;
		this.command(ALL$1);
		this.command(`${DEF$1} <command>`)
			.option('-v, --version', 'Displays current version');
		this.curr = ''; // reset
	}

	command(str, desc, opts) {
		let cmd=[], usage=[], rgx=/(\[|<)/;
		// All non-([|<) are commands
		str.split(/\s+/).forEach(x => {
			(rgx.test(x.charAt(0)) ? usage : cmd).push(x);
		});

		// Back to string~!
		cmd = cmd.join(' ');

		if (cmd in this.tree) {
			throw new Error(`Command already exists: ${cmd}`);
		}

		this.curr = cmd;
		(opts && opts.default) && (this.default=cmd);

		!~cmd.indexOf('__') && usage.unshift(cmd); // re-include `cmd`
		usage = usage.join(' '); // to string

		this.tree[cmd] = { usage, options:[], alias:{}, default:{}, examples:[] };
		desc && this.describe(desc);

		return this;
	}

	describe(str) {
		this.tree[this.curr || DEF$1].describe = Array.isArray(str) ? str : utils.sentences(str);
		return this;
	}

	option(str, desc, val) {
		let cmd = this.tree[ this.curr || ALL$1 ];

		let [flag, alias] = utils.parse(str);
		(alias && alias.length > 1) && ([flag, alias]=[alias, flag]);

		str = `--${flag}`;
		if (alias && alias.length > 0) {
			str = `-${alias}, ${str}`;
			let old = cmd.alias[alias];
			cmd.alias[alias] = (old || []).concat(flag);
		}

		let arr = [str, desc || ''];

		if (val !== void 0) {
			arr.push(val);
			cmd.default[flag] = val;
		}

		cmd.options.push(arr);
		return this;
	}

	action(handler) {
		this.tree[ this.curr || DEF$1 ].handler = handler;
		return this;
	}

	example(str) {
		this.tree[ this.curr || DEF$1 ].examples.push(str);
		return this;
	}

	version(str) {
		this.ver = str;
		return this;
	}

	parse(arr, opts={}) {
		let offset = 2; // argv slicer
		let alias = { h:'help', v:'version' };
		let argv = lib(arr.slice(offset), { alias });
		let bin = this.name;

		// Loop thru possible command(s)
		let tmp, name='';
		let i=1, len=argv._.length + 1;
		for (; i < len; i++) {
			tmp = argv._.slice(0, i).join(' ');
			if (this.tree[tmp] !== void 0) {
				name=tmp; offset=(i + 2); // argv slicer
			}
		}

		let cmd = this.tree[name];
		let isVoid = (cmd === void 0);

		if (isVoid) {
			if (this.default) {
				name = this.default;
				cmd = this.tree[name];
				arr.unshift(name);
				offset++;
			} else if (name) {
				return utils.error(bin, `Invalid command: ${name}`);
			} //=> else: cmd not specified, wait for now...
		}

		if (argv.version) {
			return console.log(`${bin}, ${this.ver}`);
		}

		if (argv.help) {
			return this.help(!isVoid && name);
		}

		if (cmd === void 0) {
			return utils.error(bin, 'No command specified.');
		}

		let all = this.tree[ALL$1];
		// merge all objects :: params > command > all
		opts.alias = Object.assign(all.alias, cmd.alias, opts.alias);
		opts.default = Object.assign(all.default, cmd.default, opts.default);

		let vals = lib(arr.slice(offset), opts);
		let segs = cmd.usage.split(/\s+/);
		let reqs = segs.filter(x => x.charAt(0)==='<');
		let args = vals._.splice(0, reqs.length);

		if (args.length < reqs.length) {
			name && (bin += ` ${name}`); // for help text
			return utils.error(bin, 'Insufficient arguments!');
		}

		segs.filter(x => x.charAt(0)==='[').forEach(_ => {
			args.push(vals._.shift()); // adds `undefined` per [slot] if no more
		});

		args.push(vals); // flags & co are last
		let handler = cmd.handler;
		return opts.lazy ? { args, name, handler } : handler.apply(null, args);
	}

	help(str) {
		console.log(
			utils.help(this.name, this.tree, str || DEF$1)
		);
	}
}

var lib$1 = str => new Sade(str);

var version = "0.24.1";

var _this = undefined;
var prog = lib$1('sapper').version(version);
if (process.argv[2] === 'start') {
    // remove this in a future version
    console.error(__chunk_4.colors.bold.red("'sapper start' has been removed"));
    console.error("Use 'node [build_dir]' instead");
    process.exit(1);
}
var start = Date.now();
prog.command('dev')
    .describe('Start a development server')
    .option('-p, --port', 'Specify a port')
    .option('-o, --open', 'Open a browser window')
    .option('--dev-port', 'Specify a port for development server')
    .option('--hot', 'Use hot module replacement (requires webpack)', true)
    .option('--live', 'Reload on changes if not using --hot', true)
    .option('--bundler', 'Specify a bundler (rollup or webpack)')
    .option('--cwd', 'Current working directory', '.')
    .option('--src', 'Source directory', 'src')
    .option('--routes', 'Routes directory', 'src/routes')
    .option('--static', 'Static files directory', 'static')
    .option('--output', 'Sapper output directory', '__sapper__')
    .option('--build-dir', 'Development build directory', '__sapper__/dev')
    .action(function (opts) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
    var dev, watcher, first_1;
    var _this = this;
    return tslib_1.__generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve(require("./dev.js"))];
            case 1:
                dev = (_a.sent()).dev;
                try {
                    watcher = dev({
                        cwd: opts.cwd,
                        src: opts.src,
                        routes: opts.routes,
                        static: opts.static,
                        output: opts.output,
                        dest: opts['build-dir'],
                        port: opts.port,
                        'dev-port': opts['dev-port'],
                        live: opts.live,
                        hot: opts.hot,
                        bundler: opts.bundler
                    });
                    first_1 = true;
                    watcher.on('stdout', function (data) {
                        process.stdout.write(data);
                    });
                    watcher.on('stderr', function (data) {
                        process.stderr.write(data);
                    });
                    watcher.on('ready', function (event) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                        var exec;
                        return tslib_1.__generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!first_1) return [3 /*break*/, 3];
                                    console.log(__chunk_4.colors.bold.cyan("> Listening on http://localhost:" + event.port));
                                    if (!opts.open) return [3 /*break*/, 2];
                                    return [4 /*yield*/, Promise.resolve(require('child_process'))];
                                case 1:
                                    exec = (_a.sent()).exec;
                                    exec("open http://localhost:" + event.port);
                                    _a.label = 2;
                                case 2:
                                    first_1 = false;
                                    _a.label = 3;
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    watcher.on('invalid', function (event) {
                        var changed = event.changed.map(function (filename) { return path.relative(process.cwd(), filename); }).join(', ');
                        console.log("\n" + __chunk_4.colors.bold.cyan(changed) + " changed. rebuilding...");
                    });
                    watcher.on('error', function (event) {
                        console.log(__chunk_4.colors.red("\u2717 " + event.type));
                        console.log(__chunk_4.colors.red(event.message));
                    });
                    watcher.on('fatal', function (event) {
                        console.log(__chunk_4.colors.bold.red("> " + event.message));
                        if (event.log)
                            console.log(event.log);
                    });
                    watcher.on('build', function (event) {
                        if (event.errors.length) {
                            console.log(__chunk_4.colors.bold.red("\u2717 " + event.type));
                            event.errors.filter(function (e) { return !e.duplicate; }).forEach(function (error) {
                                if (error.file)
                                    console.log(__chunk_4.colors.bold(error.file));
                                console.log(error.message);
                            });
                            var hidden = event.errors.filter(function (e) { return e.duplicate; }).length;
                            if (hidden > 0) {
                                console.log(hidden + " duplicate " + (hidden === 1 ? 'error' : 'errors') + " hidden\n");
                            }
                        }
                        else if (event.warnings.length) {
                            console.log(__chunk_4.colors.bold.yellow("\u2022 " + event.type));
                            event.warnings.filter(function (e) { return !e.duplicate; }).forEach(function (warning) {
                                if (warning.file)
                                    console.log(__chunk_4.colors.bold(warning.file));
                                console.log(warning.message);
                            });
                            var hidden = event.warnings.filter(function (e) { return e.duplicate; }).length;
                            if (hidden > 0) {
                                console.log(hidden + " duplicate " + (hidden === 1 ? 'warning' : 'warnings') + " hidden\n");
                            }
                        }
                        else {
                            console.log(__chunk_4.colors.bold.green("\u2714 " + event.type) + " " + __chunk_4.colors.gray("(" + __chunk_4.format_milliseconds(event.duration) + ")"));
                        }
                    });
                }
                catch (err) {
                    console.log(__chunk_4.colors.bold.red("> " + err.message));
                    process.exit(1);
                }
                return [2 /*return*/];
        }
    });
}); });
prog.command('build [dest]')
    .describe('Create a production-ready version of your app')
    .option('-p, --port', 'Default of process.env.PORT', '3000')
    .option('--bundler', 'Specify a bundler (rollup or webpack, blank for auto)')
    .option('--legacy', 'Create separate legacy build')
    .option('--cwd', 'Current working directory', '.')
    .option('--src', 'Source directory', 'src')
    .option('--routes', 'Routes directory', 'src/routes')
    .option('--output', 'Sapper output directory', '__sapper__')
    .example("build custom-dir -p 4567")
    .action(function (dest, opts) {
    if (dest === void 0) { dest = '__sapper__/build'; }
    return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var launcher, err_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("> Building...");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _build(opts.bundler, opts.legacy, opts.cwd, opts.src, opts.routes, opts.output, dest)];
                case 2:
                    _a.sent();
                    launcher = path.resolve(dest, 'index.js');
                    fs.writeFileSync(launcher, ("\n\t\t\t\t// generated by sapper build at " + new Date().toISOString() + "\n\t\t\t\tprocess.env.NODE_ENV = process.env.NODE_ENV || 'production';\n\t\t\t\tprocess.env.PORT = process.env.PORT || " + (opts.port || 3000) + ";\n\n\t\t\t\tconsole.log('Starting server on port ' + process.env.PORT);\n\t\t\t\trequire('./server/server.js');\n\t\t\t").replace(/^\t+/gm, '').trim());
                    console.error("\n> Finished in " + __chunk_4.elapsed(start) + ". Type " + __chunk_4.colors.bold.cyan("node " + dest) + " to run the app.");
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.log("" + __chunk_4.colors.bold.red("> " + err_1.message));
                    process.exit(1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
});
prog.command('export [dest]')
    .describe('Export your app as static files (if possible)')
    .option('--build', '(Re)build app before exporting', true)
    .option('--basepath', 'Specify a base path')
    .option('--timeout', 'Milliseconds to wait for a page (--no-timeout to disable)', 5000)
    .option('--legacy', 'Create separate legacy build')
    .option('--bundler', 'Specify a bundler (rollup or webpack, blank for auto)')
    .option('--cwd', 'Current working directory', '.')
    .option('--src', 'Source directory', 'src')
    .option('--routes', 'Routes directory', 'src/routes')
    .option('--static', 'Static files directory', 'static')
    .option('--output', 'Sapper output directory', '__sapper__')
    .option('--build-dir', 'Intermediate build directory', '__sapper__/build')
    .action(function (dest, opts) {
    if (dest === void 0) { dest = '__sapper__/export'; }
    return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var _export, pb_1, err_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    if (!opts.build) return [3 /*break*/, 2];
                    console.log("> Building...");
                    return [4 /*yield*/, _build(opts.bundler, opts.legacy, opts.cwd, opts.src, opts.routes, opts.output, opts['build-dir'])];
                case 1:
                    _a.sent();
                    console.error("\n> Built in " + __chunk_4.elapsed(start));
                    _a.label = 2;
                case 2: return [4 /*yield*/, Promise.resolve(require("./export.js"))];
                case 3:
                    _export = (_a.sent()).export;
                    return [4 /*yield*/, Promise.resolve(require("./pretty-bytes.js"))];
                case 4:
                    pb_1 = (_a.sent()).default;
                    return [4 /*yield*/, _export({
                            cwd: opts.cwd,
                            static: opts.static,
                            build_dir: opts['build-dir'],
                            export_dir: dest,
                            basepath: opts.basepath,
                            timeout: opts.timeout,
                            oninfo: function (event) {
                                console.log(__chunk_4.colors.bold.cyan("> " + event.message));
                            },
                            onfile: function (event) {
                                var size_color = event.size > 150000 ? __chunk_4.colors.bold.red : event.size > 50000 ? __chunk_4.colors.bold.yellow : __chunk_4.colors.bold.gray;
                                var size_label = size_color(__chunk_4.left_pad(pb_1(event.size), 10));
                                var file_label = event.status === 200
                                    ? event.file
                                    : __chunk_4.colors.bold[event.status >= 400 ? 'red' : 'yellow']("(" + event.status + ") " + event.file);
                                console.log(size_label + "   " + file_label);
                            }
                        })];
                case 5:
                    _a.sent();
                    console.error("\n> Finished in " + __chunk_4.elapsed(start) + ". Type " + __chunk_4.colors.bold.cyan("npx serve " + dest) + " to run the app.");
                    return [3 /*break*/, 7];
                case 6:
                    err_2 = _a.sent();
                    console.error(__chunk_4.colors.bold.red("> " + err_2.message));
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
});
prog.parse(process.argv);
function _build(bundler, legacy, cwd, src, routes, output, dest) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var build;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve(require("./build.js"))];
                case 1:
                    build = (_a.sent()).build;
                    return [4 /*yield*/, build({
                            bundler: bundler,
                            legacy: legacy,
                            cwd: cwd,
                            src: src,
                            routes: routes,
                            dest: dest,
                            oncompile: function (event) {
                                var banner = "built " + event.type;
                                var c = __chunk_4.colors.cyan;
                                var warnings = event.result.warnings;
                                if (warnings.length > 0) {
                                    banner += " with " + warnings.length + " " + (warnings.length === 1 ? 'warning' : 'warnings');
                                    c = __chunk_4.colors.yellow;
                                }
                                console.log();
                                console.log(c("\u250C\u2500" + __chunk_4.repeat('─', banner.length) + "\u2500\u2510"));
                                console.log(c("\u2502 " + __chunk_4.colors.bold(banner) + " \u2502"));
                                console.log(c("\u2514\u2500" + __chunk_4.repeat('─', banner.length) + "\u2500\u2518"));
                                console.log(event.result.print());
                            }
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=cli.js.map
