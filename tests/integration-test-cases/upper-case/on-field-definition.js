const { makeExecutableSchema } = require("graphql-tools");
const { upperCase } = require("./directive");

const typeDefs = `
  directive @upperCase on FIELD_DEFINITION

  type Query {
    getNoDirective: String! # should not affect
    getString: String! @upperCase
    getPerson: Person!
  }

  type Person {
    name: String! @upperCase
    favoriteColor: String! # should not affect
  }
`;

const resolvers = {
  Query: {
    getPerson: () => ({
      name: "vamp",
      favoriteColor: "green",
    }),
    getString: () => "upperCase",
    getNoDirective: () => "lowerCase",
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  schemaDirectives: { upperCase },
});

const testCases = [
  {
    message:
      "Query.getPerson: Person.name upper case, Person.favoriteColor lower case",
    query: `
      query {
        result: getPerson {
          name
          favoriteColor
        }
      }
    `,
    expectedResult: {
      name: "VAMP",
      favoriteColor: "green",
    },
  },
  {
    message: "Query.getString: returned in upper case",
    query: `
      query {
        result: getString
      }
    `,
    expectedResult: "UPPERCASE",
  },
  {
    message: "Query.getNoDirective: returned in lower case",
    query: `
      query {
        result: getNoDirective
      }
    `,
    expectedResult: "lowerCase",
  },
];

module.exports = {
  schema,
  testCases,
};
