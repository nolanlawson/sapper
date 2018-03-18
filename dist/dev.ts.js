'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = require('tslib');
var fs = require('fs');
var path = require('path');
var clorox = require('clorox');
var child_process = require('child_process');
var http = require('http');
var mkdirp = _interopDefault(require('mkdirp'));
var rimraf = _interopDefault(require('rimraf'));
var format_messages = _interopDefault(require('webpack-format-messages'));
var prettyMs = _interopDefault(require('pretty-ms'));
var ports = require('port-authority');
var __chunk2_js = require('./chunk2.js');
var __core_ts_js = require('./core.ts.js');
require('./chunk1.js');

function deferred() {
    var d = {};
    d.promise = new Promise(function (fulfil, reject) {
        d.fulfil = fulfil;
        d.reject = reject;
    });
    return d;
}
function create_hot_update_server(port, interval) {
    if (interval === void 0) { interval = 10000; }
    var clients = new Set();
    var server = http.createServer(function (req, res) {
        if (req.url !== '/__sapper__')
            return;
        req.socket.setKeepAlive(true);
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
            'Content-Type': 'text/event-stream;charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            // While behind nginx, event stream should not be buffered:
            // http://nginx.org/docs/http/ngx_http_proxy_module.html#proxy_buffering
            'X-Accel-Buffering': 'no'
        });
        res.write('\n');
        clients.add(res);
        req.on('close', function () {
            clients["delete"](res);
        });
    });
    server.listen(port);
    function send(data) {
        clients.forEach(function (client) {
            client.write("data: " + JSON.stringify(data) + "\n\n");
        });
    }
    setInterval(function () {
        send(null);
    }, interval);
    return { send: send };
}
function dev(opts) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        function restart_build(filename) {
            if (restarting)
                return;
            restarting = true;
            build = {
                unique_warnings: new Set(),
                unique_errors: new Set()
            };
            process.nextTick(function () {
                restarting = false;
            });
            console.log("\n" + clorox.bold.cyan(path.relative(process.cwd(), filename)) + " changed. rebuilding...");
        }
        function watch(compiler, _a) {
            var name = _a.name, _b = _a.invalid, invalid = _b === void 0 ? noop : _b, _c = _a.error, error = _c === void 0 ? noop : _c, result = _a.result;
            compiler.hooks.invalid.tap('sapper', function (filename) {
                invalid(filename);
            });
            compiler.watch({}, function (err, stats) {
                if (err) {
                    console.log("" + clorox.red("\u2717 " + name));
                    console.log("" + clorox.red(err.message));
                    error(err);
                }
                else {
                    var messages = format_messages(stats);
                    var info = stats.toJson();
                    if (messages.errors.length > 0) {
                        console.log("" + clorox.bold.red("\u2717 " + name));
                        var filtered = messages.errors.filter(function (message) {
                            return !build.unique_errors.has(message);
                        });
                        filtered.forEach(function (message) {
                            build.unique_errors.add(message);
                            console.log(message);
                        });
                        var hidden = messages.errors.length - filtered.length;
                        if (hidden > 0) {
                            console.log(hidden + " duplicate " + (hidden === 1 ? 'error' : 'errors') + " hidden\n");
                        }
                    }
                    else {
                        if (messages.warnings.length > 0) {
                            console.log("" + clorox.bold.yellow("\u2022 " + name));
                            var filtered = messages.warnings.filter(function (message) {
                                return !build.unique_warnings.has(message);
                            });
                            filtered.forEach(function (message) {
                                build.unique_warnings.add(message);
                                console.log(message + "\n");
                            });
                            var hidden = messages.warnings.length - filtered.length;
                            if (hidden > 0) {
                                console.log(hidden + " duplicate " + (hidden === 1 ? 'warning' : 'warnings') + " hidden\n");
                            }
                        }
                        else {
                            console.log(clorox.bold.green("\u2714 " + name) + " " + clorox.gray("(" + prettyMs(info.time) + ")"));
                        }
                        result(info);
                    }
                }
            });
        }
        var port, dir, dev_port, routes, hot_update_server, proc, deferreds, restarting, build, compilers, first, watch_serviceworker;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.NODE_ENV = 'development';
                    port = opts.port || +process.env.PORT;
                    if (!port) return [3 /*break*/, 2];
                    return [4 /*yield*/, ports.check(port)];
                case 1:
                    if (!(_a.sent())) {
                        console.log("" + clorox.bold.red("> Port " + port + " is unavailable"));
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, ports.find(3000)];
                case 3:
                    port = _a.sent();
                    _a.label = 4;
                case 4:
                    dir = __chunk2_js.locations.dest();
                    rimraf.sync(dir);
                    mkdirp.sync(dir);
                    return [4 /*yield*/, ports.find(10000)];
                case 5:
                    dev_port = _a.sent();
                    routes = __core_ts_js.create_routes();
                    __core_ts_js.create_main_manifests({ routes: routes, dev_port: dev_port });
                    hot_update_server = create_hot_update_server(dev_port);
                    watch_files(__chunk2_js.locations.routes() + "/**/*", ['add', 'unlink'], function () {
                        var routes = __core_ts_js.create_routes();
                        __core_ts_js.create_main_manifests({ routes: routes, dev_port: dev_port });
                    });
                    watch_files(__chunk2_js.locations.app() + "/template.html", ['change'], function () {
                        hot_update_server.send({
                            action: 'reload'
                        });
                    });
                    process.on('exit', function () {
                        // sometimes webpack crashes, so we need to kill our children
                        if (proc)
                            proc.kill();
                    });
                    deferreds = {
                        server: deferred(),
                        client: deferred()
                    };
                    restarting = false;
                    build = {
                        unique_warnings: new Set(),
                        unique_errors: new Set()
                    };
                    compilers = __core_ts_js.create_compilers();
                    watch(compilers.server, {
                        name: 'server',
                        invalid: function (filename) {
                            restart_build(filename);
                            // TODO print message
                            deferreds.server = deferred();
                        },
                        result: function (info) {
                            // TODO log compile errors/warnings
                            fs.writeFileSync(path.join(dir, 'server_info.json'), JSON.stringify(info, null, '  '));
                            deferreds.client.promise.then(function () {
                                function restart() {
                                    ports.wait(port).then(deferreds.server.fulfil);
                                }
                                if (proc) {
                                    proc.kill();
                                    proc.on('exit', restart);
                                }
                                else {
                                    restart();
                                }
                                proc = child_process.fork(dir + "/server.js", [], {
                                    cwd: process.cwd(),
                                    env: Object.assign({
                                        PORT: port
                                    }, process.env)
                                });
                            });
                        }
                    });
                    first = true;
                    watch(compilers.client, {
                        name: 'client',
                        invalid: function (filename) {
                            restart_build(filename);
                            deferreds.client = deferred();
                            // TODO we should delete old assets. due to a webpack bug
                            // i don't even begin to comprehend, this is apparently
                            // quite difficult
                        },
                        result: function (info) {
                            fs.writeFileSync(path.join(dir, 'client_info.json'), JSON.stringify(info, null, '  '));
                            deferreds.client.fulfil();
                            var client_files = info.assets.map(function (chunk) { return "client/" + chunk.name; });
                            deferreds.server.promise.then(function () {
                                hot_update_server.send({
                                    status: 'completed'
                                });
                                if (first) {
                                    first = false;
                                    console.log("" + clorox.bold.cyan("> Listening on http://localhost:" + port));
                                    if (opts.open)
                                        child_process.exec("open http://localhost:" + port);
                                }
                            });
                            __core_ts_js.create_serviceworker_manifest({
                                routes: __core_ts_js.create_routes(),
                                client_files: client_files
                            });
                            watch_serviceworker();
                        }
                    });
                    watch_serviceworker = compilers.serviceworker
                        ? function () {
                            watch_serviceworker = noop;
                            watch(compilers.serviceworker, {
                                name: 'service worker',
                                result: function (info) {
                                    fs.writeFileSync(path.join(dir, 'serviceworker_info.json'), JSON.stringify(info, null, '  '));
                                }
                            });
                        }
                        : noop;
                    return [2 /*return*/];
            }
        });
    });
}
function noop() { }
function watch_files(pattern, events, callback) {
    var chokidar = require('chokidar');
    var watcher = chokidar.watch(pattern, {
        persistent: true,
        ignoreInitial: true
    });
    events.forEach(function (event) {
        watcher.on(event, callback);
    });
}

exports.dev = dev;
//# sourceMappingURL=./dev.ts.js.map
