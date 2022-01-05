# ng-builder-apply-version

Angular CLI Builder that apply version into relevant `environment.ts` file(s) from various sources :

- [x] `package.json` version attribute
- [ ] system variable environment
- [ ] `.env` file

## Prerequisites

- An angular project with `@angular/cli` in version 13.x

- Install library in `devDependencies` :

```bash
npm i -D ng-builder-apply-version
```

## Usage

- Update `angular.json` under `architect` :

```json
"set-packagejson-version": {
    "builder": "ng-builder-apply-version:from-packagejson",
    "options": {
        "environmentFilePaths": [
            "src/environments/environment.ts",
            "src/environments/environment.staging.ts",
            "src/environments/environment.preprod.ts",
            "src/environments/environment.prod.ts"
       ]
    }
},
```

Note: `environmentFilePaths` option is optional. By default builder will use `environment.ts` and `environment.prod.ts` files.

- Execute command :

```bash
ng run set-packagejson-version
```

Pro-tips: add command to your package.json scripts as `"prebuild": "ng run set-packagejson-version",`, `prebuild` script will be automatically called before you call `npm run build`.
