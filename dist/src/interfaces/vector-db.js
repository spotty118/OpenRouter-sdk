"use strict";
/**
 * Vector database interfaces for knowledge storage and retrieval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorDBType = void 0;
/**
 * Vector database type
 */
var VectorDBType;
(function (VectorDBType) {
    /** In-memory vector database with optional persistence */
    VectorDBType["InMemory"] = "in-memory";
    /** Chroma vector database */
    VectorDBType["Chroma"] = "chroma";
})(VectorDBType || (exports.VectorDBType = VectorDBType = {}));
//# sourceMappingURL=vector-db.js.map