'use strict';

var __chunk_5 = require('./chunk-abdec9a5.js');

var rollup = {
    dev: __chunk_5.dev,
    client: {
        input: function () {
            return __chunk_5.src + "/client.js";
        },
        output: function () {
            var dir = __chunk_5.dest + "/client";
            if (process.env.SAPPER_LEGACY_BUILD)
                dir += "/legacy";
            return {
                dir: dir,
                entryFileNames: '[name].[hash].js',
                chunkFileNames: '[name].[hash].js',
                format: 'esm',
                sourcemap: __chunk_5.dev
            };
        }
    },
    server: {
        input: function () {
            return {
                server: __chunk_5.src + "/server.js"
            };
        },
        output: function () {
            return {
                dir: __chunk_5.dest + "/server",
                format: 'cjs',
                sourcemap: __chunk_5.dev
            };
        }
    },
    serviceworker: {
        input: function () {
            return __chunk_5.src + "/service-worker.js";
        },
        output: function () {
            return {
                file: __chunk_5.dest + "/service-worker.js",
                format: 'iife'
            };
        }
    }
};

module.exports = rollup;
//# sourceMappingURL=rollup.js.map
