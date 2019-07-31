const { createDirective } = require("../../src");

const upperCase = createDirective({
  name: "upperCase",
  resolverReplacer: originalResolver => function upperCaseResolver(...args) {
    const result = originalResolver.apply(this, args);
    return typeof result === "string" ? result.toUpperCase() : result;
  },
});

module.exports = {
  upperCase,
};
