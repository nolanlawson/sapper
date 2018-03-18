'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = require('tslib');
var child_process = require('child_process');
var path = require('path');
var sander = require('sander');
var clorox = require('clorox');
var cheerio = _interopDefault(require('cheerio'));
var URL = _interopDefault(require('url-parse'));
var fetch = _interopDefault(require('node-fetch'));
var ports = require('port-authority');
var prettyBytes = _interopDefault(require('pretty-bytes'));
var __chunk3_js = require('./chunk3.js');
var __chunk2_js = require('./chunk2.js');
require('./chunk1.js');

function exporter(export_dir, _a) {
    var _b = _a.basepath, basepath = _b === void 0 ? '' : _b;
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        function handle(url) {
            return tslib_1.__awaiter(this, void 0, void 0, function () {
                var r, range, body, $, urls_1, base_1, _i, urls_2, url_1;
                return tslib_1.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fetch(url.href)];
                        case 1:
                            r = _a.sent();
                            range = ~~(r.status / 100);
                            if (range >= 4) {
                                console.log("" + clorox.red("> Received " + r.status + " response when fetching " + url.pathname));
                                return [2 /*return*/];
                            }
                            if (!(range === 2)) return [3 /*break*/, 6];
                            if (!(r.headers.get('Content-Type') === 'text/html')) return [3 /*break*/, 6];
                            return [4 /*yield*/, r.text()];
                        case 2:
                            body = _a.sent();
                            $ = cheerio.load(body);
                            urls_1 = [];
                            base_1 = new URL($('base').attr('href') || '/', url.href);
                            $('a[href]').each(function (i, $a) {
                                var url = new URL($a.attribs.href, base_1.href);
                                if (url.origin === origin && !seen.has(url.pathname)) {
                                    seen.add(url.pathname);
                                    urls_1.push(url);
                                }
                            });
                            _i = 0, urls_2 = urls_1;
                            _a.label = 3;
                        case 3:
                            if (!(_i < urls_2.length)) return [3 /*break*/, 6];
                            url_1 = urls_2[_i];
                            return [4 /*yield*/, handle(url_1)];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 3];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        var build_dir, port, origin, proc, seen, saved;
        return tslib_1.__generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    build_dir = __chunk2_js.locations.dest();
                    export_dir = path.join(export_dir, basepath);
                    // Prep output directory
                    sander.rimrafSync(export_dir);
                    sander.copydirSync('assets').to(export_dir);
                    sander.copydirSync(build_dir, 'client').to(export_dir, 'client');
                    if (sander.existsSync(build_dir, 'service-worker.js')) {
                        sander.copyFileSync(build_dir, 'service-worker.js').to(export_dir, 'service-worker.js');
                    }
                    if (sander.existsSync(build_dir, 'service-worker.js.map')) {
                        sander.copyFileSync(build_dir, 'service-worker.js.map').to(export_dir, 'service-worker.js.map');
                    }
                    return [4 /*yield*/, ports.find(3000)];
                case 1:
                    port = _c.sent();
                    origin = "http://localhost:" + port;
                    proc = child_process.fork(path.resolve(build_dir + "/server.js"), [], {
                        cwd: process.cwd(),
                        env: {
                            PORT: port,
                            NODE_ENV: 'production',
                            SAPPER_DEST: build_dir,
                            SAPPER_EXPORT: 'true'
                        }
                    });
                    seen = new Set();
                    saved = new Set();
                    proc.on('message', function (message) {
                        if (!message.__sapper__)
                            return;
                        var file = new URL(message.url, origin).pathname.slice(1);
                        var body = message.body;
                        if (saved.has(file))
                            return;
                        saved.add(file);
                        var is_html = message.type === 'text/html';
                        if (is_html) {
                            file = file === '' ? 'index.html' : file + "/index.html";
                            body = __chunk3_js.minify_html(body);
                        }
                        console.log(clorox.bold.cyan(file) + " " + clorox.gray("(" + prettyBytes(body.length) + ")"));
                        sander.writeFileSync(export_dir, file, body);
                    });
                    return [2 /*return*/, ports.wait(port)
                            .then(function () { return handle(new URL("/" + basepath, origin)); }) // TODO all static routes
                            .then(function () { return proc.kill(); })];
            }
        });
    });
}

exports.exporter = exporter;
//# sourceMappingURL=./export.ts.js.map
