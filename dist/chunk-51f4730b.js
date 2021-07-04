'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = require('fs');
var fs__default = _interopDefault(fs);

var WEBPACK_CONFIG_FILE = process.env.WEBPACK_CONFIG_FILE || 'webpack.config.js';
function validate_bundler(bundler) {
    if (!bundler) {
        bundler = (fs.existsSync('rollup.config.js') ? 'rollup' :
            fs.existsSync(WEBPACK_CONFIG_FILE) ? 'webpack' :
                null);
        if (!bundler) {
            // TODO remove in a future version
            deprecate_dir('rollup');
            deprecate_dir('webpack');
            throw new Error("Could not find rollup.config.js or webpack.config.js");
        }
    }
    if (bundler !== 'rollup' && bundler !== 'webpack') {
        throw new Error("'" + bundler + "' is not a valid option for --bundler \u2014 must be either 'rollup' or 'webpack'");
    }
    return bundler;
}
function deprecate_dir(bundler) {
    try {
        var stats = fs.statSync(bundler);
        if (!stats.isDirectory())
            return;
    }
    catch (err) {
        // do nothing
        return;
    }
    // TODO link to docs, once those docs exist
    throw new Error("As of Sapper 0.21, build configuration should be placed in a single " + bundler + ".config.js file");
}

function copy_shimport(dest) {
    var shimport_version = require('shimport/package.json').version;
    fs.writeFileSync(dest + "/client/shimport@" + shimport_version + ".js", fs.readFileSync(require.resolve('shimport/index.js')));
}

function read_template(dir) {
    try {
        return fs.readFileSync(dir + "/template.html", 'utf-8');
    }
    catch (err) {
        if (fs.existsSync("app/template.html")) {
            throw new Error("As of Sapper 0.21, the default folder structure has been changed:\n  app/    --> src/\n  routes/ --> src/routes/\n  assets/ --> static/");
        }
        throw err;
    }
}

exports.validate_bundler = validate_bundler;
exports.copy_shimport = copy_shimport;
exports.read_template = read_template;
//# sourceMappingURL=chunk-51f4730b.js.map
