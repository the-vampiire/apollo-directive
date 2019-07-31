const { makeExecutableSchema } = require("graphql-tools");
const { auth, typeDef } = require("./directive");

const typeDefs = `
  ${typeDef("FIELD_DEFINITION")}

  type Query {
    getNoDirective: String! # should not affect
    getPerson: Person!
  }

  type Person {
    age: Int!
    name: String! @auth(require: [ADMIN, SELF])
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
    message: "Query.getPerson, role = SELF: Person fields are resolved",
    query: `
      ${personFieldsFragment}

      query {
        result: getPerson {
          ...PersonFields
        }
      }
    `,
    expectedResult: person,
    context: { role: "SELF" },
  },
  {
    message: "Query.getPerson.name, role = USER: throws authorization Error",
    query: `
      query {
        result: getPerson {
          name
        }
      }
    `,
    expectErrors: true,
    context: { role: "USER" },
  },
  {
    message:
      "Query.getPerson.[age, favoriteColor], role = USER: resolves values",
    query: `
      query {
        result: getPerson {
          age
          favoriteColor
        }
      }
    `,
    expectedResult: {
      age: 100,
      favoriteColor: "green",
    },
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
