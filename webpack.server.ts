const nodeExternals = require('webpack-node-externals');
const path = require('path');

const serverConfig = {
    entry: './server/index.ts',
    output: {
        filename: './index.js', // <-- Important
        libraryTarget: 'this', // <-- Important
        path: path.resolve(__dirname, 'serverDist'),
        clean: true,
    },
    target: 'node', // <-- Important
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    transpileOnly: true
                }
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.tsx', '.js' ]
    },
    externals: [nodeExternals()] // <-- Important
};


export default serverConfig;