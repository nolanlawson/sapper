'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = require('tslib');
var fs = require('fs');
var path = require('path');
var clorox = require('clorox');
var mkdirp = _interopDefault(require('mkdirp'));
var rimraf = _interopDefault(require('rimraf'));
var __chunk3_js = require('./chunk3.js');
var __core_ts_js = require('./core.ts.js');
var __chunk2_js = require('./chunk2.js');
require('./chunk1.js');

function build() {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var output, routes, _a, client, server, serviceworker, client_stats, server_stats, serviceworker_stats, template;
        return tslib_1.__generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    output = __chunk2_js.locations.dest();
                    mkdirp.sync(output);
                    rimraf.sync(path.join(output, '**/*'));
                    routes = __core_ts_js.create_routes();
                    // create app/manifest/client.js and app/manifest/server.js
                    __core_ts_js.create_main_manifests({ routes: routes });
                    _a = __core_ts_js.create_compilers(), client = _a.client, server = _a.server, serviceworker = _a.serviceworker;
                    return [4 /*yield*/, compile(client)];
                case 1:
                    client_stats = _b.sent();
                    console.log("" + clorox.inverse("\nbuilt client"));
                    console.log(client_stats.toString({ colors: true }));
                    fs.writeFileSync(path.join(output, 'client_info.json'), JSON.stringify(client_stats.toJson()));
                    return [4 /*yield*/, compile(server)];
                case 2:
                    server_stats = _b.sent();
                    console.log("" + clorox.inverse("\nbuilt server"));
                    console.log(server_stats.toString({ colors: true }));
                    if (!serviceworker) return [3 /*break*/, 4];
                    __core_ts_js.create_serviceworker_manifest({
                        routes: routes,
                        client_files: client_stats.toJson().assets.map(function (chunk) { return "client/" + chunk.name; })
                    });
                    return [4 /*yield*/, compile(serviceworker)];
                case 3:
                    serviceworker_stats = _b.sent();
                    console.log("" + clorox.inverse("\nbuilt service worker"));
                    console.log(serviceworker_stats.toString({ colors: true }));
                    _b.label = 4;
                case 4:
                    template = fs.readFileSync(__chunk2_js.locations.app() + "/template.html", 'utf-8');
                    fs.writeFileSync(output + "/template.html", __chunk3_js.minify_html(template));
                    return [2 /*return*/];
            }
        });
    });
}
function compile(compiler) {
    return new Promise(function (fulfil, reject) {
        compiler.run(function (err, stats) {
            if (err) {
                reject(err);
                process.exit(1);
            }
            if (stats.hasErrors()) {
                console.error(stats.toString({ colors: true }));
                reject(new Error("Encountered errors while building app"));
            }
            else {
                fulfil(stats);
            }
        });
    });
}

exports.build = build;
//# sourceMappingURL=./build.ts.js.map
