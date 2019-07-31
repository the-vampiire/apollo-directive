const { makeExecutableSchema } = require("graphql-tools");
const { upperCase } = require("./directives");

const typeDefs = `
  directive @upperCase on FIELD_DEFINITION | OBJECT

  type Query {
    getNoDirective: String! # should not affect
    getString: String! @upperCase
    getPerson: Person!
  }

  type Person @upperCase {
    name: String!
    favoriteColor: String!
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
    message: "Query.getPerson: all Person String fields returned in upper case",
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
      favoriteColor: "GREEN",
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
