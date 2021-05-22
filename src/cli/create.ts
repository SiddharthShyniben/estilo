import {
  green,
  Input,
  prompt,
  resolve,
  basename,
  ensureDirSync,
  handlebars,
  mustaches,
  __dirname,
} from "../../deps.ts";

import { installTemplates } from "./install-templates.ts";

interface ProjectOptions {
  name: string;
  author: string;
  version: string;
  url: string;
  license: string;
  description: string;
}

const blankTermOrigin = resolve(__dirname, "templates/terminal.yml");
const defaultPalette = "myblue: '#99ccff'";

export async function createProject(projectPath: string, noQuestions: boolean) {
  const options = noQuestions
    ? getDefaultConfig(projectPath)
    : await askConfig(projectPath);
  createBoilerplate(projectPath, options as ProjectOptions);
}

function getDefaultConfig(projectPath: string): ProjectOptions {
  return {
    name: basename(projectPath),
    author: "",
    version: "1.0.0",
    url: "",
    license: "MIT",
    description: "A (neo)vim colorscheme",
  };
}

async function askConfig(projectPath: string) {
  const folderName = basename(projectPath);
  return await prompt([
    {
      type: Input,
      name: "name",
      message: "Project name:",
      default: folderName,
    },
    {
      type: Input,
      name: "version",
      message: "Version:",
      default: "1.0.0",
    },
    {
      type: Input,
      name: "license",
      message: "License:",
      default: "MIT",
    },
    {
      type: Input,
      name: "author",
      message: "Author:",
    },
    {
      type: Input,
      name: "url",
      message: "Project url:",
    },
    {
      type: Input,
      name: "description",
      message: "Short description:",
    },
  ]);
}

async function createBoilerplate(projectPath: string, options: ProjectOptions) {
  const estiloStr = renderConfigFile(options);
  const addonsFolder = resolve(projectPath, "estilo");
  const termPath = resolve(addonsFolder, "terminal.yml");
  const confPath = resolve(projectPath, "estilo.yml");
  ensureDirSync(resolve(projectPath));
  Deno.writeTextFileSync(confPath, estiloStr);
  const palettesPath = resolve(projectPath, "estilo/palettes");
  ensureDirSync(resolve(projectPath, "estilo/syntax"));
  ensureDirSync(palettesPath);
  ensureDirSync(addonsFolder);
  Deno.writeTextFileSync(
    resolve(palettesPath, options.name + ".yml"),
    defaultPalette
  );
  await Deno.copyFile(blankTermOrigin, termPath);
  installTemplates(projectPath, ["base.yml"]);
  console.log(green("✓  Your project is ready\n"));
}

function renderConfigFile(options: ProjectOptions) {
  const render = handlebars.compile(mustaches.project());
  return render((options as unknown) as Record<string, string>);
}
