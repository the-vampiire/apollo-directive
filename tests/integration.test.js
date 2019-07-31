const { graphql } = require("graphql");

const {
  onObject,
  onCombined,
  onFieldDefinition,
} = require("./integration-test-cases");

const runQueryTest = (schema, testCase) => {
  const { message, query, expectedResult } = testCase;
  test(message, async () => {
    const response = await graphql(schema, query);
    expect(response.data.result).toEqual(expectedResult);
  });
};

describe("integration tests: applying schema directives and executing live queries", () => {
  describe("on OBJECT: @upperCase on Person", () => {
    const { schema, testCases } = onObject;
    testCases.forEach(testCase => runQueryTest(schema, testCase));
  });

  describe("on FIELD_DEFINITION: @upperCase on Person.name, Query.getString", () => {
    const { schema, testCases } = onFieldDefinition;
    testCases.forEach(testCase => runQueryTest(schema, testCase));
  });
  describe("on OBJECT | FIELD_DEFINITION: @upperCase on Person, Query.getString", () => {
    const { schema, testCases } = onCombined;
    testCases.forEach(testCase => runQueryTest(schema, testCase));
  });
});
