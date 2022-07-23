const nodeExternals = require('webpack-node-externals');
const path = require('path');

const serverConfig = {
    entry: {
        index: './server/index.ts',
        redeployChecker: './server/redeployChecker.ts',
        importFinalScores: './server/importFinalScores.ts',
        checkSchedule: './server/checkSchedule.ts',
        // notificationsRunner: './server/notificationsRunner.ts',
        // service: './server/service.ts', // Service worker is now in its own file
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
                    transpileOnly: true // This REALLY speeds things up
                }
            }
        ]
    },
    resolve: {
        extensions: [ '.ts', '.tsx', '.js' ]
    },
    optimization: {
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
    },
    externals: [nodeExternals()] // <-- Important
};


export default serverConfig;