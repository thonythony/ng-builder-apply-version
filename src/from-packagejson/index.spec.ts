import { Architect } from "@angular-devkit/architect";
import { TestingArchitectHost } from "@angular-devkit/architect/testing";
import { schema } from "@angular-devkit/core";
import { join } from "path";
import { readFile } from "fs/promises";

describe("Apply version from package.json runner builder", () => {
  let architect: Architect;
  let architectHost: TestingArchitectHost;
  let testAppPath = join(__dirname, "..", "..", "test-app");

  beforeEach(async () => {
    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    // Arguments to TestingArchitectHost are workspace and current directories.
    // Since we don't use those, both are the same in this case.
    architectHost = new TestingArchitectHost(testAppPath);
    architect = new Architect(architectHost, registry);

    // This will either take a Node package name, or a path to the directory
    // for the package.json file.
    await architectHost.addBuilderFromPackage(join(__dirname, "..", ".."));
  });

  it("should update environment.ts and environment.prod.ts of test-app", async () => {
    // A "run" can contain multiple outputs, and contains progress information.
    const run = await architect.scheduleBuilder(
      "ng-builder-apply-version:from-packagejson",
      {},
      {}
    ); // We pass the logger for checking later.

    // The "result" member is the next output of the runner.
    // This is of type BuilderOutput.
    const output = await run.result;

    // Stop the builder from running. This really stops Architect from keeping
    // the builder associated states in memory, since builders keep waiting
    // to be scheduled.
    await run.stop();

    // Expect that it succeeded.
    expect(output.success).toBe(true);

    const environmentFilesPath = join(testAppPath, "src", "environments");
    const environmentFile = await readFile(
      join(environmentFilesPath, "environment.ts"),
      "utf8"
    );
    const environmentProdFile = await readFile(
      join(environmentFilesPath, "environment.ts"),
      "utf8"
    );
    expect(environmentFile.toString().includes("version:"));
    expect(environmentProdFile.toString().includes("version:"));
  });
});
