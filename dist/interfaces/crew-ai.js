"use strict";
/**
 * Interface definitions for CrewAI agent orchestration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessMode = exports.TaskStatus = void 0;
/**
 * The current state of a task
 */
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["APPROVED"] = "approved";
    TaskStatus["REJECTED"] = "rejected";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
/**
 * Defines how tasks should be processed
 */
var ProcessMode;
(function (ProcessMode) {
    /** Process tasks sequentially */
    ProcessMode["SEQUENTIAL"] = "sequential";
    /** Process tasks in parallel */
    ProcessMode["PARALLEL"] = "parallel";
    /** Process tasks based on dependencies */
    ProcessMode["HIERARCHICAL"] = "hierarchical";
})(ProcessMode || (exports.ProcessMode = ProcessMode = {}));
