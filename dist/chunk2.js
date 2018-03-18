'use strict';

var path = require('path');
require('./chunk1.js');

var dev = function () { return process.env.NODE_ENV !== 'production'; };
var locations = {
    base: function () { return path.resolve(process.env.SAPPER_BASE || ''); },
    app: function () { return path.resolve(process.env.SAPPER_BASE || '', process.env.SAPPER_APP || 'app'); },
    routes: function () { return path.resolve(process.env.SAPPER_BASE || '', process.env.SAPPER_ROUTES || 'routes'); },
    dest: function () { return path.resolve(process.env.SAPPER_BASE || '', process.env.SAPPER_DEST || '.sapper'); }
};

exports.dev = dev;
exports.locations = locations;
//# sourceMappingURL=./chunk2.js.map
