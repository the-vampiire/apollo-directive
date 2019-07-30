const { validateDirectiveConfig } = require("../src/utils");

describe("utility functions", () => {
  describe("validateDirectiveConfig: validates required fields and types", () => {
    const directiveConfig = {
      name: "directiveName",
      resolverReplacer: () => {},
    };

    [
      {
        message: "missing name",
        config: { ...directiveConfig, name: undefined },
      },
      {
        message: "missing resolverReplacer",
        config: { ...directiveConfig, resolverReplacer: undefined },
      },
      {
        message: "name is not a string",
        config: { ...directiveConfig, name: 5 },
      },
      {
        message: "resolverReplacer is not a function",
        config: { ...directiveConfig, resolverReplacer: "not a func" },
      },
    ].forEach(testCase =>
      test(testCase.message, () => {
        expect(() => validateDirectiveConfig(testCase.config)).toThrow();
      }),
    );
  });
});
