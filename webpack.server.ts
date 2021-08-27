const nodeExternals = require('webpack-node-externals');
const path = require('path');

const serverConfig = {
    entry: {
        index: './server/index.ts',
        redeployChecker: './server/redeployChecker.ts',
    },
    output: {
        filename: './[name].js', // <-- Important
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
                    // transpileOnly: true
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