/* eslint-disable no-param-reassign, no-underscore-dangle */
const { defaultFieldResolver } = require("graphql");
const { SchemaDirectiveVisitor } = require("graphql-tools");

require("./jsdoc-types");
const { validateDirectiveConfig } = require("./utils");

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
    static markDirectiveApplied(directiveTarget) {
      if (!directiveTarget._appliedDirectives) {
        directiveTarget._appliedDirectives = {};
      }

      directiveTarget._appliedDirectives[name] = true;
    }

    static shouldApplyToField(directiveTarget, fromApplyToObject = false) {
      if (!directiveTarget._appliedDirectives) {
        directiveTarget._appliedDirectives = {};
      }

      const directiveAlreadyApplied = directiveTarget._appliedDirectives[name];

      // if the directive is being applied from applyToObject and it has already been applied
      if (fromApplyToObject && directiveAlreadyApplied) {
        // edge case where both the Object Type and its field have been tagged by the same directive
        // with different directive args, give directive args precedence to field level args
        // as it has a higher specificity than the more general object level args
        return false;
      }

      return true;
    }

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
      if (!ApolloDirective.shouldApplyToField(field, fromApplyToObject)) return;

      if (onApplyDirective) {
        onApplyDirective(this.createDirectiveContext(objectType, field));
      }

      // mapped scalar fields (without custom resolvers) will use the defaultFieldResolver
      const originalResolver = field.resolve || defaultFieldResolver;

      field.resolve = resolverReplacer(
        originalResolver,
        this.createDirectiveContext(objectType, field),
      );

      ApolloDirective.markDirectiveApplied(field);
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
