
import * as webpack from 'webpack';

import { Configuration as WebpackConfiguration } from "webpack";
import { Configuration as WebpackDevServerConfiguration } from "webpack-dev-server";

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

import path from "path";
import fs from "fs";
import HtmlWebpackPlugin from "html-webpack-plugin";
const criticalCss = fs.readFileSync('./src/compiled/critical.css');

const config: Configuration = {
    mode: "development",
    output: {
        publicPath: "/",
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    entry: "./src/index.tsx",
    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/i,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            "@babel/preset-env",
                            "@babel/preset-react",
                            "@babel/preset-typescript",
                        ],
                    },
                },
            },
            {
                test: /\.(scss|css)$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.png$/,
                loader: "url-loader"
            },
            {
                test: /\.svg$/,
                loader: "url-loader"
            },
            {
                test: /\.(mp3|wav)$/,
                loader: "url-loader"
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
        fallback: {
        //    "crypto": require.resolve('crypto-browserify'),
        //    "stream": require.resolve("stream-browserify"),
        },
        alias: {
            // This forces to use the root installed version of bn.js rather than including all the different sub package versions
            /*
            "bn.js": path.join(
                __dirname,
                "node_modules",
                "bn.js"
            ),
            */
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "src/public/index.ejs",
            templateParameters: {
                criticalCss,
            }
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
            'process.env.NODE_DEBUG': JSON.stringify(false),
            'process.env.DEVMODE': JSON.stringify(true),
        }),
        /*
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
            // assert: ['assert'],
        })
        */
    ],
    devtool: "inline-source-map",
    devServer: {
        historyApiFallback: true
    }
};

export default config;