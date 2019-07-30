/* eslint-disable no-param-reassign, no-underscore-dangle */
const { defaultFieldResolver } = require("graphql");
const { SchemaDirectiveVisitor } = require("graphql-tools");

require("./jsdoc-types");
const {
  shouldApplyToField,
  markDirectiveApplied,
  validateDirectiveConfig,
} = require("./utils");

/**
 * @param {import('./jsdoc-types.js').DirectiveConfig} directiveConfig
 */
const createDirective = (directiveConfig) => {
  const {
    name,
    resolverReplacer,
    hooks: { onVisitObject, onVisitFieldDefinition, onApplyDirective } = {},
  } = validateDirectiveConfig(directiveConfig);

  return class ApolloDirective extends SchemaDirectiveVisitor {
    visitObject(objectType) {
      if (onVisitObject) {
        onVisitObject(this.createDirectiveContext(objectType));
      }

      this.applyToObject(objectType);
    }

    visitFieldDefinition(field, details) {
      const { objectType } = details;

      if (onVisitFieldDefinition) {
        onVisitFieldDefinition(this.createDirectiveContext(objectType, field));
      }

      this.replaceFieldResolver(objectType, field);
    }

    createDirectiveContext(objectType, field) {
      return {
        field,
        objectType,
        name: this.name,
        args: this.args,
      };
    }

    replaceFieldResolver(objectType, field, fromApplyToObject = false) {
      // if the directive has already been applied to the field exit early
      // prevents duplicate application of the directive
      if (!shouldApplyToField(field, name, fromApplyToObject)) return;

      if (onApplyDirective) {
        onApplyDirective(this.createDirectiveContext(objectType, field));
      }

      // mapped scalar fields (without custom resolvers) will use the defaultFieldResolver
      const originalResolver = field.resolve || defaultFieldResolver;

      field.resolve = resolverReplacer(
        originalResolver,
        this.createDirectiveContext(objectType, field),
      );

      markDirectiveApplied(field, name);
    }

    applyToObject(objectType) {
      const fields = objectType.getFields();

      Object.values(fields).forEach((field) => {
        this.replaceFieldResolver(objectType, field, true);
      });
    }
  };
};

module.exports = createDirective;
