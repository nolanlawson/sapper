'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('./core.js');
var dev = require('./dev.js');
var build = require('./build.js');
var _export = require('./export.js');
require('fs');
require('path');
require('./chunk-7cffb8b5.js');
require('module');
require('./chunk-21b7786f.js');
require('string-hash');
require('sourcemap-codec');
require('./pretty-bytes.js');
require('tslib');
require('./chunk-abdec9a5.js');
require('http');
require('child_process');
require('./chunk-9618d369.js');
require('net');
require('./chunk-275bacad.js');
require('util');
require('assert');
require('events');
require('./chunk-930538e6.js');
require('./chunk-fb4e1119.js');
require('html-minifier');
require('constants');
require('stream');
require('url');
require('https');
require('zlib');

function find_page(pathname, cwd) {
    if (cwd === void 0) { cwd = 'src/routes'; }
    var pages = core.create_manifest_data(cwd).pages;
    for (var i = 0; i < pages.length; i += 1) {
        var page = pages[i];
        if (page.pattern.test(pathname)) {
            return page.parts[page.parts.length - 1].component.file;
        }
    }
}

exports.dev = dev.dev;
exports.build = build.build;
exports.export = _export.export;
exports.find_page = find_page;
//# sourceMappingURL=api.js.map
