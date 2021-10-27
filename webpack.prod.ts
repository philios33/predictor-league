

import * as webpack from 'webpack';
import path from 'path';

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');

// The prod config is heavily based on the data in the dev config to keep things DRY.
const prodConfig = require('./webpack.dev').default;

prodConfig.mode = "production";
prodConfig.output.filename = "[name].[contenthash].bundle.js";

// It's actually NOT worth code splitting
/*
prodConfig.entry = {
    results: './src/compiled/results.json',
    main: {
        import: './src/index.tsx',
        dependOn: ['results'],
    },
}
prodConfig.optimization = {
    splitChunks: {
        chunks: (chunk) => {
            // I filter the chunks here so that things that aren't the main bundle are code split.
            return chunk.name === 'main';
        },
        name: 'vendor'
    },
    runtimeChunk: 'single', // This needs to be single since I am injecting multiple entry points in to the page to do code splitting
}
*/

/*
prodConfig.optimization = {
    splitChunks: {
        chunks: (chunk) => {
            // I filter the chunks here so that things that aren't the main bundle are code split.
            return chunk.name === 'main';
        },
        name: 'vendor'
    },
    runtimeChunk: 'single', // This needs to be single since I am injecting multiple entry points in to the page to do code splitting
}
*/

prodConfig.plugins = prodConfig.plugins.filter((p: any) => {
    if (p instanceof webpack.HotModuleReplacementPlugin) {
        return false;
    } else if (p instanceof webpack.DefinePlugin) {
        return false;
    }
    return true;
});

prodConfig.plugins.push(
    new webpack.DefinePlugin({
        'process.env.NODE_DEBUG': JSON.stringify(false),
        'process.env.DEVMODE': JSON.stringify(false),

        'process.env.SERVICE_ENDPOINT': JSON.stringify('/'),
    })
);


prodConfig.plugins.push(
    new CopyWebpackPlugin({
        patterns: [
            path.resolve(__dirname, "src", "assets", "week10_mystery_player2.jpg"),
            // path.resolve(__dirname, "src", "public", "robots.txt"),
            // path.resolve(__dirname, "src", "public", "sitemap.xml")
        ]
    })
);


/*
prodConfig.plugins.push(
    new BundleAnalyzerPlugin()
);
*/


prodConfig.devtool = false;
prodConfig.stats = "errors-only";

export default prodConfig;