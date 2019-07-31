const { createDirective } = require("../../../src");

const upperCaseIfString = value => (typeof value === "string" ? value.toUpperCase() : value);

const directiveConfig = {
  name: "upperCase",
  resolverReplacer: originalResolver => async function upperCaseResolver(...args) {
    const result = await originalResolver.apply(this, args);
    if (Array.isArray(result)) {
      return result.map(upperCaseIfString);
    }
    return upperCaseIfString(result);
  },
};

module.exports = {
  directiveConfig,
  upperCase: createDirective(directiveConfig),
};
