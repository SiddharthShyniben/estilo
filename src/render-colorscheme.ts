import { handlebars, hexterm, version } from "../deps.ts";
import { buckets } from "../buckets.ts";

import { crash } from "./crash.ts";
import { isHexColor } from "./util.ts";
import { isLegacyUi, parseLegacyUi } from "./legacy-ui.ts";

import {
  ColorObj,
  Palette,
  Project,
  SchemeConfig,
  SyntaxRule,
  TerminalSyntax,
} from "./common.ts";

type SyntaxValues = Record<string, SyntaxValue | LinkValue>;

interface SyntaxValue {
  fore: false | ColorObj;
  back: false | ColorObj;
  ui: false | string;
  guisp: boolean | ColorObj;
}

interface LinkValue {
  link: string;
}

export function renderColorscheme(
  config: SchemeConfig,
  project: Project,
): string {
  const palette = project.palettes[config.palette];
  if (!palette) {
    crash("Colorscheme palette does not exist", {
      colorscheme: config.name,
      palette: config.palette,
    });
  }

  const render = handlebars.compile(
    buckets.mustaches["colorscheme.hbs"] as string,
  );
  return render({
    info: {
      name: config.name,
      description: config.description,
      url: project.config.url,
      author: project.config.author,
      license: project.config.license,
      background: config.background,
      estiloVersion: version,
    },
    stacks: parseSyntaxColors(project.syntax, palette),
    term: parseTermColors(project.terminalSyntax, palette),
  });
}

function parseTermColors(termSyntax: TerminalSyntax, palette: Palette) {
  const values = Object.keys(termSyntax).map((prop) => {
    const colorName = termSyntax[prop];
    const value = palette.colors[colorName];
    if (!value) {
      crash("Missing terminal color", {
        colorName,
        property: prop,
        palette: palette.filepath,
      });
    }
    return [prop, value.hex];
  });
  return Object.fromEntries(values);
}

function parseSyntaxColors(
  syntax: SyntaxRule[],
  palette: Palette,
): SyntaxValues {
  const values = {} as SyntaxValues;
  syntax.forEach((rule) => {
    const [fgColor, bgColor, ui, curlColor] = rule.rule.split(/\s+/);
    const filepath = rule.filepath;
    if (fgColor.startsWith("@")) {
      values[rule.name] = {
        link: fgColor.slice(1),
      };
    } else {
      values[rule.name] = {
        fore: getColorCode(fgColor, palette, filepath),
        back: getColorCode(bgColor, palette, filepath),
        ui: getUI(ui),
        guisp: getCurlColor(curlColor, palette, filepath),
      };
    }
  });
  return values;
}

export function getColorCode(
  color: string,
  palette: Palette,
  filepath: string,
): false | ColorObj {
  // return false if empty color
  if (color === ".") return false;
  // return false if color is `NONE`
  if (!color || color === "-") return { hex: "NONE", xterm: "NONE" };
  // return custom color if colorname is in palette
  const colorcodes = palette.colors[color];
  if (colorcodes) return colorcodes;
  // return direct hex color
  if (isHexColor(color)) {
    const finalcolor = color.startsWith("#") ? color : color.slice(1);
    return {
      hex: finalcolor,
      xterm: hexterm(color).toString(),
    };
  }
  // not valid color
  crash("Color does not exist", { filepath, color });
}

export function getUI(ui: string): false | string {
  // no defined gui
  if (ui === ".") return false;
  if (!ui) return "NONE";
  // 'NONE' or empty value
  if (ui === "NONE") return "NONE";
  if (isLegacyUi(ui)) return parseLegacyUi(ui);
  // validate(ui)
  return ui;
}

export function getCurlColor(
  color: string,
  palette: Palette,
  filepath: string,
): boolean | ColorObj {
  const curlParsed = getColorCode(color, palette, filepath);
  let curlColor;
  if (!curlParsed || curlParsed.hex === "NONE") {
    curlColor = false;
  } else {
    curlColor = curlParsed;
  }
  return curlColor;
}
