/**
 * Vector database interfaces for knowledge storage and retrieval
 */
/**
 * Vector database type
 */
export var VectorDBType;
(function (VectorDBType) {
    /** In-memory vector database with optional persistence */
    VectorDBType["InMemory"] = "in-memory";
    /** Chroma vector database */
    VectorDBType["Chroma"] = "chroma";
})(VectorDBType || (VectorDBType = {}));
//# sourceMappingURL=vector-db.js.map