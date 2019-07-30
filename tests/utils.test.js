/* eslint-disable no-param-reassign, no-underscore-dangle */

const {
  shouldApplyToField,
  markDirectiveApplied,
  validateDirectiveConfig,
} = require("../src/utils");

describe("utility functions", () => {
  describe("validateDirectiveConfig: throws an Error for missing or invalid required properties", () => {
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
    ].forEach(testCase => test(testCase.message, () => {
      expect(() => validateDirectiveConfig(testCase.config)).toThrow();
    }));
  });

  describe("shouldApplyToField: checks if the directive should be applied to the field", () => {
    const directiveName = "admin";

    it("return true and sets the _appliedDirectives object property on the field if it is not already applied", () => {
      const field = {};
      expect(shouldApplyToField(field, directiveName)).toBe(true);
      expect(field._appliedDirectives).toEqual({});
    });

    it("returns false if the directive has already been applied at the Field level and is attempting to be re-applied at the Object Type level", () => {
      const field = { _appliedDirectives: { [directiveName]: true } };
      expect(shouldApplyToField(field, directiveName, true)).toBe(false);
    });
  });

  describe("markDirectiveApplied: sets a directive applied flag onto the directive target", () => {
    const directiveName = "upperCase";

    it("attaches an _appliedDirectives object property to an unmarked target and flags the directive name as applied", () => {
      const directiveTarget = {};
      markDirectiveApplied(directiveTarget, directiveName);
      expect(directiveTarget._appliedDirectives[directiveName]).toBe(true);
    });

    it("flags the new directive name as applied to a target that has had other directives applied to it previously", () => {
      const directiveTarget = { _appliedDirectives: { admin: true } };
      markDirectiveApplied(directiveTarget, directiveName);
      expect(directiveTarget._appliedDirectives).toEqual({
        admin: true,
        [directiveName]: true,
      });
    });
  });
});
