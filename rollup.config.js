const nodeResolverPlugin = require('rollup-plugin-node-resolve');
const commonjsPlugin = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify').uglify;

module.exports = [
    {
        input: './build/browserIndex.js',
        output: {
            file: './dist/umd/browserIndex.min.js',
            format: 'umd',
            name: 'binack-browser.js',
        },
        plugins: [
            nodeResolverPlugin({
                module: true,
                jsnext: true,
            }),
            commonjsPlugin(),
            uglify()
        ]
    },
];
