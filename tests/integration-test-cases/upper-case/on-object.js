const { makeExecutableSchema } = require("graphql-tools");
const { upperCase } = require("./directive");

const typeDefs = `
  directive @upperCase on OBJECT

  type Query {
    getNoDirective: String! # should not affect
    getPerson: Person!
    getPeople: [Person!]!
  }

  type Person @upperCase {
    name: String!
    favoriteColor: String!
    age: Int! # should not affect
  }
`;

const people = [
  {
    age: 100,
    name: "vamp",
    favoriteColor: "green",
  },
  {
    age: 100,
    name: "witch",
    favoriteColor: "red",
  },
];

const resolvers = {
  Query: {
    getPerson: () => people[0],
    getPeople: () => people,
    getNoDirective: () => "lowercase",
  },
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  schemaDirectives: { upperCase },
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
    message:
      "Query.getPeople (list): each Person String field returned in upper case",
    query: `
      ${personFieldsFragment}

      query {
        result: getPeople {
          ...PersonFields
        }
      }
    `,
    expectedResult: [
      {
        age: 100,
        name: "VAMP",
        favoriteColor: "GREEN",
      },
      {
        age: 100,
        name: "WITCH",
        favoriteColor: "RED",
      },
    ],
  },
  {
    message: "Query.getPerson: Person String fields returned in upper case",
    query: `
      ${personFieldsFragment}

      query {
        result: getPerson {
          ...PersonFields
        }
      }
    `,
    expectedResult: {
      age: 100,
      name: "VAMP",
      favoriteColor: "GREEN",
    },
  },
  {
    message: "Query.getNoDirective: returned in lower case",
    query: `
      query {
        result: getNoDirective
      }
    `,
    expectedResult: "lowercase",
  },
];

module.exports = {
  schema,
  testCases,
};
