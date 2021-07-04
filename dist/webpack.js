'use strict';

var __chunk_5 = require('./chunk-abdec9a5.js');

var SERVER_FILE_EXT = process.env.SERVER_FILE_EXT || 'js';
var webpack = {
    dev: __chunk_5.dev,
    client: {
        entry: function () {
            return {
                main: __chunk_5.src + "/client"
            };
        },
        output: function () {
            return {
                path: __chunk_5.dest + "/client",
                filename: '[fullhash]/[name].js',
                chunkFilename: '[fullhash]/[name].[id].js',
                publicPath: "client/"
            };
        }
    },
    server: {
        entry: function () {
            return {
                server: __chunk_5.src + "/server"
            };
        },
        output: function () {
            return {
                path: __chunk_5.dest + "/server",
                filename: '[name].' + SERVER_FILE_EXT,
                chunkFilename: '[fullhash]/[name].[id].js',
                libraryTarget: 'commonjs2'
            };
        }
    },
    serviceworker: {
        entry: function () {
            return {
                'service-worker': __chunk_5.src + "/service-worker"
            };
        },
        output: function () {
            return {
                path: __chunk_5.dest,
                filename: '[name].js',
                chunkFilename: '[name].[id].[fullhash].js'
            };
        }
    }
};

module.exports = webpack;
//# sourceMappingURL=webpack.js.map
