/* eslint-disable class-methods-use-this, no-param-reassign, no-underscore-dangle */
const { defaultFieldResolver } = require("graphql");
const { SchemaDirectiveVisitor } = require("graphql-tools");

require("./jsdoc-types");
const { validateDirectiveConfig } = require("./utils");

/**
 * @param {import('./jsdoc-types.js').DirectiveConfig} directiveConfig
 */
const createDirective = (directiveConfig) => {
  const { name, resolverReplacer, hooks = {} } = validateDirectiveConfig(
    directiveConfig,
  );
  const { onVisitObject, onVisitFieldDefinition, onApplyDirective } = hooks;

  return class ApolloDirective extends SchemaDirectiveVisitor {
    visitObject(objectType) {
      if (onVisitObject) onVisitObject(objectType);
      this.applyDirective(objectType);
    }

    visitFieldDefinition(field, details) {
      if (onVisitFieldDefinition) onVisitFieldDefinition(field, details);
      this.applyDirective(details.objectType);
    }

    applyDirective(objectType) {
      if (onApplyDirective) onApplyDirective(objectType);

      // exit early if the directive has already been applied to the object type
      if (objectType[`_${name}DirectiveApplied`]) return;
      objectType[`_${name}DirectiveApplied`] = true; // otherwise set _<key>DirectiveApplied flag

      const fields = objectType.getFields();

      Object.values(fields).forEach((field) => {
        // mapped scalar fields (without custom resolvers) will use the defaultFieldResolver
        const originalResolver = field.resolve || defaultFieldResolver;

        // replace the original resolver with the resolverWrapper returned from resolverReplacer
        field.resolve = resolverReplacer(originalResolver, {
          field,
          objectType,
        });
      });
    }
  };
};

module.exports = createDirective;
