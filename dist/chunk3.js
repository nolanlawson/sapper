'use strict';

var htmlMinifier = require('html-minifier');
require('./chunk1.js');

function minify_html(html) {
    return htmlMinifier.minify(html, {
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        decodeEntities: true,
        html5: true,
        minifyCSS: true,
        minifyJS: true,
        removeAttributeQuotes: true,
        removeComments: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        sortAttributes: true,
        sortClassName: true
    });
}

exports.minify_html = minify_html;
//# sourceMappingURL=./chunk3.js.map
