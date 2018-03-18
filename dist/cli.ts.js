'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var tslib_1 = require('tslib');
var sade = _interopDefault(require('sade'));
var clorox = require('clorox');
var prettyMs = _interopDefault(require('pretty-ms'));
require('./chunk1.js');

var version = "0.9.6";

var _this = undefined;
var prog = sade('sapper').version(version);
prog.command('dev')
    .describe('Start a development server')
    .option('-p, --port', 'Specify a port')
    .option('-o, --open', 'Open a browser window')
    .action(function (opts) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
    var dev;
    return tslib_1.__generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve(require("./dev.ts.js"))];
            case 1:
                dev = (_a.sent()).dev;
                dev(opts);
                return [2 /*return*/];
        }
    });
}); });
prog.command('build [dest]')
    .describe('Create a production-ready version of your app')
    .action(function (dest) {
    if (dest === void 0) { dest = 'build'; }
    return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var start, build, err_1;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("> Building...");
                    process.env.NODE_ENV = 'production';
                    process.env.SAPPER_DEST = dest;
                    start = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve(require("./build.ts.js"))];
                case 2:
                    build = (_a.sent()).build;
                    return [4 /*yield*/, build()];
                case 3:
                    _a.sent();
                    console.error("\n> Finished in " + elapsed(start) + ". Type " + clorox.bold.cyan(dest === 'build' ? 'npx sapper start' : "npx sapper start " + dest) + " to run the app.");
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error(err_1 ? err_1.details || err_1.stack || err_1.message || err_1 : 'Unknown error');
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
});
prog.command('start [dir]')
    .describe('Start your app')
    .option('-p, --port', 'Specify a port')
    .option('-o, --open', 'Open a browser window')
    .action(function (dir, opts) {
    if (dir === void 0) { dir = 'build'; }
    return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var start;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.resolve(require("./start.ts.js"))];
                case 1:
                    start = (_a.sent()).start;
                    start(dir, opts);
                    return [2 /*return*/];
            }
        });
    });
});
prog.command('export [dest]')
    .describe('Export your app as static files (if possible)')
    .option('--basepath', 'Specify a base path')
    .action(function (dest, opts) {
    if (dest === void 0) { dest = 'export'; }
    return tslib_1.__awaiter(_this, void 0, void 0, function () {
        var start, build, exporter, err_2;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("> Building...");
                    process.env.NODE_ENV = 'production';
                    process.env.SAPPER_DEST = '.sapper/.export';
                    start = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, Promise.resolve(require("./build.ts.js"))];
                case 2:
                    build = (_a.sent()).build;
                    return [4 /*yield*/, build()];
                case 3:
                    _a.sent();
                    console.error("\n> Built in " + elapsed(start) + ". Crawling site...");
                    return [4 /*yield*/, Promise.resolve(require("./export.ts.js"))];
                case 4:
                    exporter = (_a.sent()).exporter;
                    return [4 /*yield*/, exporter(dest, opts)];
                case 5:
                    _a.sent();
                    console.error("\n> Finished in " + elapsed(start) + ". Type " + clorox.bold.cyan("npx serve " + dest) + " to run the app.");
                    return [3 /*break*/, 7];
                case 6:
                    err_2 = _a.sent();
                    console.error(err_2 ? err_2.details || err_2.stack || err_2.message || err_2 : 'Unknown error');
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
});
// TODO upgrade
prog.parse(process.argv);
function elapsed(start) {
    return prettyMs(Date.now() - start);
}
//# sourceMappingURL=./cli.ts.js.map
