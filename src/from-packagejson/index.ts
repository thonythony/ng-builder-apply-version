import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
} from "@angular-devkit/architect";
import { JsonObject } from "@angular-devkit/core";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { CodeBlockWriter, Project, ScriptTarget } from "ts-morph";
import ts from "typescript";

interface Options extends JsonObject {
  environmentFilePaths: string[];
}

async function extractVersionFromPackageJson(
  packageJsonPath: string
): Promise<string> {
  try {
    const packageJsonContent = await readFile(packageJsonPath);

    const packageJson = JSON.parse(packageJsonContent.toString());

    return Promise.resolve(packageJson?.version as string);
  } catch (error) {
    return Promise.reject(error);
  }
}

export default createBuilder<Options>(
  (options: Options, context: BuilderContext) => {
    return new Promise<BuilderOutput>(async (resolve, reject) => {
      try {
        const version = await extractVersionFromPackageJson(
          join(context.workspaceRoot, "package.json")
        );
        context.reportStatus(`Updating version... ${version}`);

        let srcRoot = "src";
        try {
          const projectName = context.target?.project;
          if (projectName) {
            const projectMetadata = await context.getProjectMetadata(
              projectName
            );

            if (projectMetadata && projectMetadata.sourceRoot) {
              srcRoot = projectMetadata.sourceRoot as string;
            }
          }
        } catch (error) {
          context.logger.debug(
            "Cannot determine srcRoot through project metadata. Fallback to: src"
          );
        }

        let environmentFilePaths: string[] = [];

        if (
          options &&
          options.environmentFilePaths &&
          Array.isArray(options.environmentFilePaths) &&
          options.environmentFilePaths.length > 0
        ) {
          environmentFilePaths = options.environmentFilePaths;
        } else {
          environmentFilePaths = ["environment.ts", "environment.prod.ts"].map(
            (fileName: string) =>
              join(context.workspaceRoot, srcRoot, "environments", fileName)
          );
        }

        environmentFilePaths = environmentFilePaths.filter((filePath: string) =>
          existsSync(filePath)
        );

        for (const environmentFilePath of environmentFilePaths) {
          const project = new Project({
            compilerOptions: {
              target: ScriptTarget.Latest,
            },
          });

          const sourceFile = project.addSourceFileAtPath(environmentFilePath);

          const environmentObjLit = sourceFile
            .getVariableDeclarationOrThrow("environment")
            .getInitializerIfKindOrThrow(
              ts.SyntaxKind.PropertyAccessExpression
            );

          try {
            environmentObjLit.getPropertyOrThrow("version").remove();
          } catch (error) {
            context.logger.debug(
              "Version attribute not set in environment yet"
            );
          }

          environmentObjLit.addPropertyAssignment({
            name: "version",
            initializer: (writer: CodeBlockWriter) =>
              writer.write(`'${version}'`),
          });

          sourceFile.saveSync();
        }

        context.reportStatus("done");

        return resolve({ success: true });
      } catch (error) {
        context.logger.fatal(`Cannot add version because: ${error}`);
        return reject(error);
      }
    });
  }
);
