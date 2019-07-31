const { createDirective } = require("../../../src");

const resolverReplacer = (originalResolver, directiveContext) => async function upperCaseResolver(...args) {
  const { role } = args[2]; // context
  const hasAuthorization = directiveContext.args.require.includes(role);

  if (!hasAuthorization) {
    throw new Error("Not authorized");
  }

  return originalResolver.apply(this, args);
};

const directiveConfig = {
  name: "auth",
  resolverReplacer,
};

const typeDef = directiveTarget => `
  directive @auth(require: [Role] = [ADMIN]) on ${directiveTarget}

  enum Role {
    SELF
    USER
    ADMIN
  }
`;

module.exports = {
  typeDef,
  directiveConfig,
  auth: createDirective(directiveConfig),
};
