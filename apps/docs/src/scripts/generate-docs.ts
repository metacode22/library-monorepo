type NestedObject<T> = {
  [key: string]: T | NestedObject<T>;
};

(async () => {
  const fse = require("fs-extra");
  const path = await import("path");
  const { globby } = await import("globby");

  const PACKAGES_PATH = path.resolve(__dirname, "../../../../packages");
  const DOCS_PAGES_PATH = path.resolve(__dirname, "../../pages/packages");

  async function main() {
    await Promise.all([generateDocsFromReadme(), generateMetaJson()]);
  }

  async function generateDocsFromReadme() {
    const readmeFilePathsFromPackages = await globby("**/README.md", {
      cwd: PACKAGES_PATH,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });

    await Promise.all(
      readmeFilePathsFromPackages.map(async (readmeFilePath) => {
        const source = path.resolve(PACKAGES_PATH, readmeFilePath);
        const destination = path.resolve(
          DOCS_PAGES_PATH,
          readmeFilePath.replace("/README.md", ".mdx")
        );

        await fse.ensureDir(path.dirname(destination));
        await fse.copy(source, destination);
      })
    );
  }

  async function generateMetaJson() {
    const readmeFilePathsFromPackages = await globby("**/README.md", {
      cwd: PACKAGES_PATH,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });
    const meta: NestedObject<string> = {};

    readmeFilePathsFromPackages
      .map((readmeFilePath) => readmeFilePath.replace("/README.md", ""))
      .forEach((readmeFilePath) => {
        const readmeFilePathArray = readmeFilePath.split("/");
        let currentMeta = meta;

        readmeFilePathArray.forEach((readmeFilePath, index) => {
          if (index === readmeFilePathArray.length - 1) {
            currentMeta[readmeFilePath] = readmeFilePath;
          }

          if (!currentMeta[readmeFilePath]) {
            currentMeta[readmeFilePath] = {};
          }

          currentMeta = currentMeta[readmeFilePath] as NestedObject<string>;
        });
      });

    function dfs(
      currentMeta: NestedObject<string>,
      currentPath: string = "",
      json: Record<string, string> = {}
    ) {
      Object.keys(currentMeta).forEach((key) => {
        if (typeof currentMeta[key] === "object") {
          dfs(
            currentMeta[key] as NestedObject<string>,
            `${currentPath}/${key}`
          );
        } else {
          json[key] = key;
        }
      });

      const destination = path.join(DOCS_PAGES_PATH, currentPath, "_meta.json");
      fse.ensureDirSync(path.dirname(destination));
      fse.writeJsonSync(destination, json);
    }

    dfs(meta);
  }

  await main();
})();
