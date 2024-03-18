#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const { exec } = require("child_process");

const packageJson = require("../package.json");

const getDeps = (deps) =>
    Object.entries(deps)
        .map((dep) => `${dep[0]}@${dep[1]}`)
        .toString()
        .replace(/,/g, " ")
        .replace(/^/g, "")
        // exclude the dependency only used in this file, nor relevant to the boilerplate
        .replace(/fs-extra[^\s]+/g, "");

console.log("Initializing project..");

const copy = (from, to) => {
    fs.copy(path.join(__dirname, from), `${to}/${from}`)
    .then(() => console.log(`Copied directory ${from} to directory ${to}`)
    ).catch((err) => console.error(err))
}

// create folder and initialize npm
exec(
    `mkdir ${process.argv[2]} && cd ${process.argv[2]} && wget https://raw.githubusercontent.com/xanimo/ejected-cra/main/package.json`,
    (initErr, initStdout, initStderr) => {
        if (initErr) {
            console.error(`Everything was fine, then it wasn't:
    ${initErr}`);
            return;
        }

        const packageJSON = `${process.argv[2]}/package.json`;
        // replace non pertinent fields
        fs.readFile(packageJSON, (err, file) => {
            if (err) throw err;
            file = file.toString().split(',').map((value) => {
                console.log(value);
                if (value.includes('\n  "files": [\n    "bin"') 
                || value.includes('\n    "config"') 
                || value.includes('\n    "scripts"') 
                || value.includes('\n    "src"') 
                || value.includes('\n    "public"\n  ]')
                || value.includes('\n  "bin": {\n    "ejected-cra": "./bin/start.js"\n  }')
                || value.includes("homepage")) {
                    console.log(value);
                } else {
                    return value;
                }
            }).join(',').replace(',,,,','').replace(',,', ',');
            const data = file.toString().split('\n').map((value) => {
                    if (value.includes("name") || value.includes("description") || value.includes("author")) {
                        return value.split(':').map((name, index) => {
                            if (index == 1) {
                                return name = ' "",';
                            }
                            return name;
                        }).join(':');
                    }
                    if (value.includes("version")) {
                        return value.split(':').map((name, index) => {
                            if (index == 1) {
                                return name = ' "1.0.0",';
                            }
                            return name;
                        }).join(':');
                    }
                    return value;
            }).join('\n').replace(',,,', ',');
            console.log(data);
            fs.writeFile(packageJSON, data, (err2) => err2 || true);
        });

        // npm will remove the .gitignore file when the package is installed, therefore it cannot be copied, locally and needs to be downloaded. Use your raw .gitignore once you pushed your code to GitHub.
        https.get(
            "https://raw.githubusercontent.com/xanimo/ejected-cra/main/.gitignore",
            (res) => {
                res.setEncoding("utf8");
                let body = "";
                res.on("data", (data) => {
                    body += data;
                });
                res.on("end", () => {
                    fs.writeFile(
                        `${process.argv[2]}/.gitignore`,
                        body,
                        { encoding: "utf-8" },
                        (err) => {
                            if (err) throw err;
                        }
                    );
                });
            }
        );

        console.log("npm init -- done\n");

        // installing dependencies
        console.log("Installing deps -- it might take a few minutes..");
        const devDeps = getDeps(packageJson.devDependencies);
        const deps = getDeps(packageJson.dependencies);
        exec(
            `cd ${process.argv[2]} && git init && node -v && npm -v && npm i -S ${deps} && npm i -D ${devDeps} && mkdir -p config/jest config/webpack/persistentCache scripts`,
            (npmErr, npmStdout, npmStderr) => {
                if (npmErr) {
                    console.error(`Some error while installing dependencies
      ${npmErr}\n${npmStderr}`);
                    return;
                }
                console.log(npmStdout);
                console.log("Dependencies installed");

                console.log("Copying additional files..");
                // copy additional source files
                copy('../config', `${process.argv[2]}/config`);
                copy('../scripts', `${process.argv[2]}/scripts`);
                fs.copy(path.join(__dirname, "../src"), `${process.argv[2]}/src`)
                    .then(() =>
                        fs.copy(path.join(__dirname, "../public"), `${process.argv[2]}/public`)
                            .then(() =>
                            
                                console.log(
                                    `All done!\n\nYour project is now ready\n\nUse the below command to run the app.\n\ncd ${process.argv[2]}\nnpm start`
                                )
                            ).catch((err) => console.error(err))
                    )
                    .catch((err) => console.error(err));
            }
        );
    }
);
