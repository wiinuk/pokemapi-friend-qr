//@ts-check
const Path = require("path");
const { ConcatSource } = require("webpack-sources");

const PluginName = "WebpackUserScriptPlugin";
const headerPattern =
    /(?=(^|\n))\s*\/\/\s*==UserScript==[^\n]\n((.|\r\n)*?)\r\n\s*\/\/\s*==\/UserScript==[^\n]*(\n|$)/i;

/** @type {import("webpack").WebpackPluginFunction} */
module.exports = (compiler) =>
    compiler.hooks.emit.tapPromise(PluginName, async (compilation) => {
        for (const chunk of compilation.chunks) {
            if (!chunk.canBeInitial()) {
                continue;
            }

            for (const fileName of chunk.files) {
                if (Path.extname(fileName) !== ".js") {
                    continue;
                }

                const contents = compilation.assets[fileName]
                    .source()
                    .toString();
                const userScriptMatch = contents.match(headerPattern);
                if (userScriptMatch == null) {
                    continue;
                }

                const headerContents = userScriptMatch[0];
                const contentsWithoutHeader = contents.replace(
                    headerPattern,
                    ""
                );

                compilation.assets[fileName] = new ConcatSource(
                    headerContents,
                    "\n",
                    contentsWithoutHeader
                );
            }
        }
    });
