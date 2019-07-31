const { makeExecutableSchema } = require("graphql-tools");
const { auth, typeDef } = require("./directive");

const typeDefs = `
  ${typeDef("OBJECT")}

  type Query {
    getNoDirective: String! # should not affect
    getPerson: Person!
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

const resolvers = {
  Query: {
    getPerson: () => person,
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
