const { graphql } = require("graphql");
const {
  auth,
  upperCase,
  multipleDirectives,
} = require("./integration-test-cases");

const runQueryTest = (schema, testCase) => {
  const {
    query,
    message,
    context = {},
    expectedResult,
    expectErrors = false,
  } = testCase;

  test(message, async () => {
    const response = await graphql(schema, query, null, context);
    if (expectErrors) {
      expect(response.errors).toBeDefined();
    } else {
      expect(response.data.result).toEqual(expectedResult);
    }
  });
};

describe("integration tests: applying schema directives and executing live queries", () => {
  describe("directive with no args: @upperCase", () => {
    const { onObject, onCombined, onFieldDefinition } = upperCase;

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

  describe("directive with args: @auth(require: [Role] = [ADMIN])", () => {
    const {
      onObject,
      onCombined,
      onFieldDefinition,
      withConflictingArgs,
    } = auth;

    describe("on OBJECT: @auth (default [ADMIN]) on Person", () => {
      const { schema, testCases } = onObject;
      testCases.forEach(testCase => runQueryTest(schema, testCase));
    });

    describe("on FIELD_DEFINITION: @auth(require: [SELF, ADMIN]) on Person.name", () => {
      const { schema, testCases } = onFieldDefinition;
      testCases.forEach(testCase => runQueryTest(schema, testCase));
    });

    describe("on OBJECT | FIELD_DEFINITION: @auth (default [ADMIN]) on Person, @auth(require: [SELF]) on Query.getMessages", () => {
      const { schema, testCases } = onCombined;
      testCases.forEach(testCase => runQueryTest(schema, testCase));
    });

    describe("with conflicting args: @auth(require: [ADMIN, SELF]) on Person, @auth(require: [SELF]) on Person.age", () => {
      const { schema, testCases } = withConflictingArgs;
      testCases.forEach(testCase => runQueryTest(schema, testCase));
    });
  });

  describe("multiple directives and locations using createSchemaDirectives", () => {
    describe("@auth on Person, @upperCase on Person.name, @auth(require: [SELF]) @upperCase on Query.getMessages", () => {
      const { schema, testCases } = multipleDirectives;
      testCases.forEach(testCase => runQueryTest(schema, testCase));
    });
  });
});
