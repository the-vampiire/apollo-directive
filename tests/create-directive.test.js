const { createDirective } = require("../src");

const {
  shouldApplyToField,
  markDirectiveApplied,
  validateDirectiveConfig,
} = require("../src/utils");

jest.mock("../src/utils.js", () => ({
  validateDirectiveConfig: jest.fn(config => config),
}));

const mockMethods = (directiveInstance, methodsToMock) => {
  Object.keys(methodsToMock).forEach((methodName) => {
    directiveInstance[methodName] = jest.fn();
  });
};
const replaceMethods = (directiveInstance, originalMethods) => {
  Object.entries(originalMethods).forEach((entry) => {
    const [methodName, originalMethod] = entry;
    directiveInstance[methodName] = originalMethod;
  });
};

const resolverReplacer = spies => (originalResolver, directiveContext) => function directiveResolver(...resolverArgs) {
  spies.originalResolver(originalResolver);
  spies.directiveContext(directiveContext);
  spies.resolverArgs(resolverArgs);
};

const field = { name: "getPerson" };
const objectType = { name: "Query " };
const directiveName = "fancyDirective";
const directiveArgs = { first: "first arg", second: ["second", "arg", "list"] };

describe("core export: createDirective", () => {
  const directiveConfig = {
    name: directiveName,
    resolverReplacer,
    hooks: {
      onVisitObject: jest.fn(),
      onApplyDirective: jest.fn(),
      onVisitFieldDefinition: jest.fn(),
    },
  };

  const ApolloDirective = createDirective(directiveConfig);
  const directiveInstance = new ApolloDirective({
    name: directiveName,
    args: directiveArgs,
  });

  it("validates the directiveConfig object and returns an ApolloDirective class", () => {
    expect(validateDirectiveConfig).toHaveBeenCalled();
    expect(directiveInstance.constructor.name).toBe("ApolloDirective");
  });

  describe("visitObject behavior", () => {
    const { applyToObject, createDirectiveContext } = directiveInstance;

    beforeAll(() => {
      jest.clearAllMocks();
      mockMethods(directiveInstance, { applyToObject, createDirectiveContext });
      directiveInstance.visitObject(objectType);
    });
    afterAll(() => {
      replaceMethods(directiveInstance, {
        applyToObject,
        createDirectiveContext,
      });
    });

    it("calls onVisitObject hook providing it the directiveContext with objectType", () => {
      expect(directiveInstance.createDirectiveContext).toHaveBeenCalledWith(
        objectType,
      );
      expect(directiveConfig.hooks.onVisitObject).toHaveBeenCalledWith(
        directiveInstance.createDirectiveContext(),
      );
    });

    it("applies the directive to the objectType object", () => expect(directiveInstance.applyToObject).toHaveBeenCalledWith(objectType));
  });

  describe("visitFieldDefinition behavior", () => {
    const { replaceFieldResolver, createDirectiveContext } = directiveInstance;

    beforeAll(() => {
      jest.clearAllMocks();
      mockMethods(directiveInstance, {
        replaceFieldResolver,
        createDirectiveContext,
      });
      directiveInstance.visitFieldDefinition(field, { objectType });
    });
    afterAll(() => {
      replaceMethods(directiveInstance, {
        replaceFieldResolver,
        createDirectiveContext,
      });
    });

    it("calls onVisitFieldDefinition hook providing it the directiveContext with objectType and field", () => {
      expect(directiveInstance.createDirectiveContext).toHaveBeenCalledWith(
        objectType,
        field,
      );
      expect(directiveConfig.hooks.onVisitFieldDefinition).toHaveBeenCalledWith(
        directiveInstance.createDirectiveContext(),
      );
    });

    it("replaces the field object's resolver", () => expect(directiveInstance.replaceFieldResolver).toHaveBeenCalledWith(
      objectType,
      field,
    ));
  });

  describe("createDirectiveContext: builds a context object with information about the directive", () => {
    const expectedContext = {
      objectType,
      name: directiveName,
      args: directiveArgs,
    };

    test("given an objectType: returns { objectType, name, args }", () => expect(directiveInstance.createDirectiveContext(objectType)).toEqual(
      expectedContext,
    ));
    test("given an objectType and field: returns { objectType, field, name, args }", () => expect(
      directiveInstance.createDirectiveContext(objectType, field),
    ).toEqual({
      field,
      ...expectedContext,
    }));
  });

  describe("applyToObject behavior", () => {
    const { replaceFieldResolver } = directiveInstance;
    const mockObjectFields = {
      first: "first",
      second: "second",
      third: "third",
    };
    const mockObjectType = { getFields: () => mockObjectFields };

    beforeAll(() => {
      jest.clearAllMocks();
      mockMethods(directiveInstance, { replaceFieldResolver });
      directiveInstance.applyToObject(mockObjectType);
    });
    afterAll(() => replaceMethods(directiveInstance, { replaceFieldResolver }));

    it("sets the replaceFieldResolver method flag to indicate an Object Type level application of the directive", () => expect(directiveInstance.replaceFieldResolver).toHaveBeenCalledWith(
      mockObjectType,
      mockObjectFields.first,
      true,
    ));

    it("replaces the resolver for each of the objectType's fields", () => {
      const numFields = Object.keys(mockObjectFields).length;
      expect(directiveInstance.replaceFieldResolver).toHaveBeenCalledTimes(
        numFields,
      );
    });
  });
});
