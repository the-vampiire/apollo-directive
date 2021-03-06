const { makeExecutableSchema } = require("graphql-tools");
const { auth, typeDef } = require("./directive");

const typeDefs = `
  ${typeDef("OBJECT | FIELD_DEFINITION")}

  type Query {
    getNoDirective: String! # should not affect
    getPerson: Person!
    getMessages: [String!]! @auth(require: [SELF])
  }

  type Person @auth {
    age: Int!
    name: String!
    favoriteColor: String!
  }
`;

const person = {
  age: 100,
  name: "vamp",
  favoriteColor: "green",
};

const messages = [
  "hello, Clarice",
  "it could grip it by the husk! it's not a question of where it grips it...",
];

const resolvers = {
  Query: {
    getPerson: () => person,
    getMessages: () => messages,
    getNoDirective: () => "some string",
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  schemaDirectives: { auth },
});

const personFieldsFragment = `
  fragment PersonFields on Person {
    age
    name
    favoriteColor
  }
`;

const testCases = [
  {
    message: "Query.getPerson, role = ADMIN: Person fields are resolved",
    query: `
      ${personFieldsFragment}

      query {
        result: getPerson {
          ...PersonFields
        }
      }
    `,
    expectedResult: person,
    context: { role: "ADMIN" },
  },
  {
    message: "Query.getPerson, role = USER: throws authorization Error",
    query: `
      ${personFieldsFragment}

      query {
        result: getPerson {
          ...PersonFields
        }
      }
    `,
    expectErrors: true,
    context: { role: "USER" },
  },
  {
    message: "Query.getMessages, role = SELF: resolves messages",
    query: `
      query {
        result: getMessages
      }
    `,
    expectedResult: messages,
    context: { role: "SELF" },
  },
  {
    message: "Query.getMessages, role = ADMIN: throws authorization Error",
    query: `
      query {
        result: getMessages
      }
    `,
    expectErrors: true,
    context: { role: "ADMIN" },
  },
  {
    message: "Query.getNoDirective: resolves value",
    query: `
      query {
        result: getNoDirective
      }
    `,
    expectedResult: "some string",
  },
];

module.exports = {
  schema,
  testCases,
};
