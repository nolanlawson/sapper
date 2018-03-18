'use strict';

var __chunk2_js = require('./chunk2.js');
require('./chunk1.js');

var webpack = {
    dev: __chunk2_js.dev(),
    client: {
        entry: function () {
            return {
                main: __chunk2_js.locations.app() + "/client"
            };
        },
        output: function () {
            return {
                path: __chunk2_js.locations.dest() + "/client",
                filename: '[hash]/[name].js',
                chunkFilename: '[hash]/[name].[id].js',
                publicPath: "client/"
            };
        }
    },
    server: {
        entry: function () {
            return {
                server: __chunk2_js.locations.app() + "/server"
            };
        },
        output: function () {
            return {
                path: __chunk2_js.locations.dest(),
                filename: '[name].js',
                chunkFilename: '[hash]/[name].[id].js',
                libraryTarget: 'commonjs2'
            };
        }
    },
    serviceworker: {
        entry: function () {
            return {
                'service-worker': __chunk2_js.locations.app() + "/service-worker"
            };
        },
        output: function () {
            return {
                path: __chunk2_js.locations.dest(),
                filename: '[name].js',
                chunkFilename: '[name].[id].[hash].js'
            };
        }
    }
};

module.exports = webpack;
//# sourceMappingURL=./webpack.ts.js.map
