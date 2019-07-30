require("./jsdoc-types");
const createDirective = require("./create-directive");

/**
 * @typedef {import('./jsdoc-types.js').DirectiveConfig} DirectiveConfig
 */

/**
 * Creates an Apollo Server config.schemaDirectives object
 * @param {{ directiveConfigs: [DirectiveConfig] }} config
 * @returns {Object} schemaDirectives
 */
const createSchemaDirectives = config => config.directiveConfigs.reduce(
  (schemaDirectives, directiveConfig) => ({
    ...schemaDirectives,
    [directiveConfig.name]: createDirective(directiveConfig),
  }),
  {},
);

module.exports = createSchemaDirectives;
