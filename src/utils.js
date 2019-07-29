const validateDirectiveConfig = (directiveConfig) => {
  const { name, resolverReplacer } = directiveConfig;

  let message;
  if (!name || !resolverReplacer) {
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

module.exports = {
  validateDirectiveConfig,
};
