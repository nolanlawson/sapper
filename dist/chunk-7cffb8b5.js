'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var fs__default = _interopDefault(fs);
var path = require('path');
var path__default = _interopDefault(path);

function left_pad(str, len) {
    while (str.length < len)
        str = " " + str;
    return str;
}
function repeat(str, i) {
    var result = '';
    while (i--)
        result += str;
    return result;
}
function format_milliseconds(ms) {
    if (ms < 1000)
        return ms + "ms";
    if (ms < 60000)
        return (ms / 1000).toFixed(1) + "s";
    var minutes = ~~(ms / 60000);
    var seconds = Math.round((ms % 60000) / 1000);
    return minutes + "m" + (seconds < 10 ? '0' : '') + seconds + "s";
}
function elapsed(start) {
    return format_milliseconds(Date.now() - start);
}
function walk(cwd, dir, files) {
    if (dir === void 0) { dir = cwd; }
    if (files === void 0) { files = []; }
    fs.readdirSync(dir).forEach(function (file) {
        var resolved = path.resolve(dir, file);
        if (fs.statSync(resolved).isDirectory()) {
            walk(cwd, resolved, files);
        }
        else {
            files.push(posixify(path.relative(cwd, resolved)));
        }
    });
    return files;
}
function posixify(str) {
    return str.replace(/\\/g, '/');
}
var previous_contents = new Map();
function write_if_changed(file, code) {
    if (code !== previous_contents.get(file)) {
        previous_contents.set(file, code);
        fs.writeFileSync(file, code);
        fudge_mtime(file);
    }
}
function stringify(string, includeQuotes) {
    if (includeQuotes === void 0) { includeQuotes = true; }
    var quoted = JSON.stringify(string);
    return includeQuotes ? quoted : quoted.slice(1, -1);
}
function fudge_mtime(file) {
    // need to fudge the mtime so that webpack doesn't go doolally
    var _a = fs.statSync(file), atime = _a.atime, mtime = _a.mtime;
    fs.utimesSync(file, new Date(atime.getTime() - 999999), new Date(mtime.getTime() - 999999));
}
var reserved_words = new Set([
    'arguments',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'interface',
    'let',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
]);

const $ = { enabled:true };

const CODES = {
  // modifiers
  reset: fmt(0, 0),
  bold: fmt(1, 22),
  dim: fmt(2, 22),
  italic: fmt(3, 23),
  underline: fmt(4, 24),
  inverse: fmt(7, 27),
  hidden: fmt(8, 28),
  strikethrough: fmt(9, 29),
  // colors
  black: fmt(30, 39),
  red: fmt(31, 39),
  green: fmt(32, 39),
  yellow: fmt(33, 39),
  blue: fmt(34, 39),
  magenta: fmt(35, 39),
  cyan: fmt(36, 39),
  white: fmt(37, 39),
  gray: fmt(90, 39),
  // background colors
  bgBlack: fmt(40, 49),
  bgRed: fmt(41, 49),
  bgGreen: fmt(42, 49),
  bgYellow: fmt(43, 49),
  bgBlue: fmt(44, 49),
  bgMagenta: fmt(45, 49),
  bgCyan: fmt(46, 49),
  bgWhite: fmt(47, 49)
};

function fmt(x, y) {
	return {
		open: `\x1b[${x}m`,
		close: `\x1b[${y}m`,
		rgx: new RegExp(`\\x1b\\[${y}m`, 'g')
	}
}

function run(key, str) {
	let tmp = CODES[key];
	return tmp.open + str.replace(tmp.rgx, tmp.open) + tmp.close;
}

function exec(key, str) {
	str += '';
	if (!$.enabled) return str;
	let arr = this.keys;
	while (arr.length > 0) {
		str = run(arr.shift(), str);
	}
	this.keys.push(key);
	return str;
}

function attach(key) {
	let ctx = { keys:[key] };
	let fn = exec.bind(ctx, key);
	for (let k in CODES) {
		Reflect.defineProperty(fn, k, {
			get() {
				ctx.keys.push(k);
				return fn;
			}
		});
	}
	return fn;
}

for (let k in CODES) {
	$[k] = attach(k);
}

var kleur = $;

exports.posixify = posixify;
exports.stringify = stringify;
exports.walk = walk;
exports.write_if_changed = write_if_changed;
exports.colors = kleur;
exports.left_pad = left_pad;
exports.reserved_words = reserved_words;
exports.elapsed = elapsed;
exports.repeat = repeat;
exports.format_milliseconds = format_milliseconds;
//# sourceMappingURL=chunk-7cffb8b5.js.map
