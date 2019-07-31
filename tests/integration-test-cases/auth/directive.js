const { createDirective } = require("../../../src");

const resolverReplacer = (originalResolver, directiveContext) => async function upperCaseResolver(...args) {
  const { role } = args[2]; // context
  const hasAuthorization = directiveContext.args.require.includes(role);

  if (!hasAuthorization) {
    throw new Error("Not authorized");
  }

  return originalResolver.apply(this, args);
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
  auth: createDirective({
    name: "auth",
    resolverReplacer,
  }),
};
