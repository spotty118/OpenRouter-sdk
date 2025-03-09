/**
 * Interface definitions for CrewAI agent orchestration
 */
/**
 * The current state of a task
 */
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["APPROVED"] = "approved";
    TaskStatus["REJECTED"] = "rejected";
})(TaskStatus || (TaskStatus = {}));
/**
 * Defines how tasks should be processed
 */
export var ProcessMode;
(function (ProcessMode) {
    /** Process tasks sequentially */
    ProcessMode["SEQUENTIAL"] = "sequential";
    /** Process tasks in parallel */
    ProcessMode["PARALLEL"] = "parallel";
    /** Process tasks based on dependencies */
    ProcessMode["HIERARCHICAL"] = "hierarchical";
})(ProcessMode || (ProcessMode = {}));
//# sourceMappingURL=crew-ai.js.map