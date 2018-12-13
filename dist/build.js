'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = require('tslib');
var fs = require('fs');
var fs__default = _interopDefault(fs);
var path = require('path');
var path__default = _interopDefault(path);
var __chunk_3 = require('./chunk-275bacad.js');
var __chunk_7 = require('./chunk-fb4e1119.js');
var core = require('./core.js');
var __chunk_6 = require('./chunk-930538e6.js');
require('./chunk-21b7786f.js');
require('util');
require('assert');
require('events');
require('html-minifier');
require('./chunk-7cffb8b5.js');
require('module');
require('string-hash');
require('sourcemap-codec');
require('./pretty-bytes.js');
require('./chunk-abdec9a5.js');

function build(_a) {
    var _b = _a === void 0 ? {} : _a, cwd = _b.cwd, _c = _b.src, src = _c === void 0 ? 'src' : _c, _d = _b.routes, routes = _d === void 0 ? 'src/routes' : _d, _e = _b.output, output = _e === void 0 ? '__sapper__' : _e, _f = _b.static, static_files = _f === void 0 ? 'static' : _f, _g = _b.dest, dest = _g === void 0 ? '__sapper__/build' : _g, bundler = _b.bundler, _h = _b.legacy, legacy = _h === void 0 ? false : _h, _j = _b.oncompile, oncompile = _j === void 0 ? __chunk_3.noop : _j;
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var template, error, manifest_data, _k, client, server, serviceworker, client_result, build_info, client_1, client_result_1, server_stats, serviceworker_stats;
        return tslib_1.__generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    bundler = __chunk_6.validate_bundler(bundler);
                    cwd = path.resolve(cwd);
                    src = path.resolve(cwd, src);
                    dest = path.resolve(cwd, dest);
                    routes = path.resolve(cwd, routes);
                    output = path.resolve(cwd, output);
                    static_files = path.resolve(cwd, static_files);
                    dest = path.resolve(cwd, dest);
                    if (legacy && bundler === 'webpack') {
                        throw new Error("Legacy builds are not supported for projects using webpack");
                    }
                    __chunk_3.rimraf.sync(path.join(dest, '**/*'));
                    __chunk_3.mkdirp.sync(dest + "/client");
                    __chunk_6.copy_shimport(dest);
                    template = __chunk_6.read_template(src);
                    // remove this in a future version
                    if (template.indexOf('%sapper.base%') === -1) {
                        error = new Error("As of Sapper v0.10, your template.html file must include %sapper.base% in the <head>");
                        error.code = "missing-sapper-base";
                        throw error;
                    }
                    fs.writeFileSync(dest + "/template.html", __chunk_7.minify_html(template));
                    manifest_data = core.create_manifest_data(routes);
                    // create src/manifest/client.js and src/manifest/server.js
                    core.create_main_manifests({
                        bundler: bundler,
                        manifest_data: manifest_data,
                        cwd: cwd,
                        src: src,
                        dest: dest,
                        routes: routes,
                        output: output,
                        dev: false
                    });
                    return [4 /*yield*/, core.create_compilers(bundler, cwd, src, dest, true)];
                case 1:
                    _k = _l.sent(), client = _k.client, server = _k.server, serviceworker = _k.serviceworker;
                    return [4 /*yield*/, client.compile()];
                case 2:
                    client_result = _l.sent();
                    oncompile({
                        type: 'client',
                        result: client_result
                    });
                    build_info = client_result.to_json(manifest_data, { src: src, routes: routes, dest: dest });
                    if (!legacy) return [3 /*break*/, 5];
                    process.env.SAPPER_LEGACY_BUILD = 'true';
                    return [4 /*yield*/, core.create_compilers(bundler, cwd, src, dest, true)];
                case 3:
                    client_1 = (_l.sent()).client;
                    return [4 /*yield*/, client_1.compile()];
                case 4:
                    client_result_1 = _l.sent();
                    oncompile({
                        type: 'client (legacy)',
                        result: client_result_1
                    });
                    client_result_1.to_json(manifest_data, { src: src, routes: routes, dest: dest });
                    build_info.legacy_assets = client_result_1.assets;
                    delete process.env.SAPPER_LEGACY_BUILD;
                    _l.label = 5;
                case 5:
                    fs.writeFileSync(path.join(dest, 'build.json'), JSON.stringify(build_info));
                    return [4 /*yield*/, server.compile()];
                case 6:
                    server_stats = _l.sent();
                    oncompile({
                        type: 'server',
                        result: server_stats
                    });
                    if (!serviceworker) return [3 /*break*/, 8];
                    core.create_serviceworker_manifest({
                        manifest_data: manifest_data,
                        output: output,
                        client_files: client_result.chunks.map(function (chunk) { return "client/" + chunk.file; }),
                        static_files: static_files
                    });
                    return [4 /*yield*/, serviceworker.compile()];
                case 7:
                    serviceworker_stats = _l.sent();
                    oncompile({
                        type: 'serviceworker',
                        result: serviceworker_stats
                    });
                    _l.label = 8;
                case 8: return [2 /*return*/];
            }
        });
    });
}

exports.build = build;
//# sourceMappingURL=build.js.map
