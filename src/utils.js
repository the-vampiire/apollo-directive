/* eslint-disable no-param-reassign, no-underscore-dangle */

const validateDirectiveConfig = (directiveConfig) => {
  const { name, resolverReplacer } = directiveConfig;

  let message;
  if (!name) {
    message = "directiveConfig.name is required";
  } else if (!resolverReplacer) {
    message = "directiveConfig.resolverReplacer is required";
  } else if (typeof name !== "string") {
    message = "directiveConfig.name must be a string";
  } else if (typeof resolverReplacer !== "function") {
    message = "directiveConfig.resolverReplacer must be a function";
  } else {
    return directiveConfig;
  }

  const error = new Error(message);
  error.name = "CreateDirectiveError";

  throw error;
};

const markDirectiveApplied = (directiveTarget, directiveName) => {
  if (!directiveTarget._appliedDirectives) {
    directiveTarget._appliedDirectives = {};
  }

  directiveTarget._appliedDirectives[directiveName] = true;
};

const shouldApplyToField = (
  field,
  directiveName,
  applyingAtObjectLevel = false,
) => {
  if (!field._appliedDirectives) {
    field._appliedDirectives = {};
  }

  const directiveAlreadyApplied = field._appliedDirectives[directiveName];

  // if the directive is being applied from applyToObject and it has already been applied
  if (applyingAtObjectLevel && directiveAlreadyApplied) {
    /**
     * edge case where both the Object Type and its field have been tagged by the same directive
     * but each have different directive args
     * - give directive args precedence to field level args
     * - field level args have higher specificity than the more general object level args
     *
     * an alternative if the order of visitX methods is ever changed
     * - markDirectiveApplied: cache the args (stringified) applied at the field level / object level
     * - if applyingAtObjectLevel && argsDontMatch: compare the args and return false if object args !== field args
     */
    return false;
  }

  return true;
};

module.exports = {
  shouldApplyToField,
  markDirectiveApplied,
  validateDirectiveConfig,
};
