const { createSchemaDirectives } = require("../src");
const createDirective = require("../src/create-directive");

jest.mock("../src/create-directive.js");

describe("core export: createSchemaDirectives", () => {
  const firstDirectiveConfig = { name: "first", resolverReplacer: () => {} };
  const secondDirectiveConfig = { name: "second", resolverReplacer: () => {} };
  const directiveConfigs = [firstDirectiveConfig, secondDirectiveConfig];

  test("given a DirectiveConfig[] array: returns a schemaDirectives object in { directiveName: directiveResolverClass } form", () => {
    createDirective.mockImplementation(() => "directiveResolverClass");
    expect(createSchemaDirectives({ directiveConfigs })).toEqual({
      [firstDirectiveConfig.name]: "directiveResolverClass",
      [secondDirectiveConfig.name]: "directiveResolverClass",
    });
  });
});
