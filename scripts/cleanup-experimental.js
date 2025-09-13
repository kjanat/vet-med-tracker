#!/usr/bin/env tsx
"use strict";
/**
 * Experimental Code Cleanup Script
 *
 * Removes experimental directory and related test files as part of the
 * architectural simplification strategy. Preserves learnings in documentation.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var node_child_process_1 = require("node:child_process");
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var node_util_1 = require("node:util");
var execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
/**
 * Calculate directory size recursively
 */
function getDirectorySize(dirPath) {
    try {
        var _totalSize = 0;
        var stats = (0, node_fs_1.statSync)(dirPath);
        if (stats.isFile()) {
            return stats.size;
        }
        if (stats.isDirectory()) {
            var execSync = require("node:child_process").execSync;
            var result = execSync("du -sb \"".concat(dirPath, "\""), { encoding: "utf8" });
            var size = parseInt(result.split("\t")[0], 10);
            return size || 0;
        }
        return 0;
    }
    catch (_error) {
        console.warn("Warning: Could not calculate size for ".concat(dirPath));
        return 0;
    }
}
/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return "0 Bytes";
    var k = 1024;
    var sizes = ["Bytes", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return "".concat(parseFloat((bytes / Math.pow(k, i)).toFixed(2)), " ").concat(sizes[i]);
}
function cleanupExperimental() {
    return __awaiter(this, void 0, void 0, function () {
        var summary, experimentalDir, experimentalTest, stillExists;
        return __generator(this, function (_a) {
            summary = {
                directories: [],
                files: [],
                totalSize: 0,
                success: false,
                errors: [],
            };
            try {
                experimentalDir = node_path_1.default.join(process.cwd(), "experimental");
                experimentalTest = node_path_1.default.join(process.cwd(), "components/providers/__tests__/provider-refactor.test.tsx");
                // Calculate sizes before cleanup
                if ((0, node_fs_1.existsSync)(experimentalDir)) {
                    summary.totalSize += getDirectorySize(experimentalDir);
                    summary.directories.push("experimental/");
                }
                if ((0, node_fs_1.existsSync)(experimentalTest)) {
                    summary.totalSize += getDirectorySize(experimentalTest);
                    summary.files.push("components/providers/__tests__/provider-refactor.test.tsx");
                }
                console.log("🧹 Starting experimental code cleanup...\n");
                // Remove experimental directory
                if ((0, node_fs_1.existsSync)(experimentalDir)) {
                    console.log("📁 Removing experimental directory...");
                    (0, node_fs_1.rmSync)(experimentalDir, { recursive: true, force: true });
                    console.log("✅ Removed experimental/ directory");
                }
                else {
                    console.log("ℹ️  Experimental directory not found");
                }
                // Remove experimental test file
                if ((0, node_fs_1.existsSync)(experimentalTest)) {
                    console.log("🧪 Removing experimental test file...");
                    (0, node_fs_1.rmSync)(experimentalTest, { force: true });
                    console.log("✅ Removed provider-refactor.test.tsx");
                }
                else {
                    console.log("ℹ️  Experimental test file not found");
                }
                stillExists = (0, node_fs_1.existsSync)(experimentalDir) || (0, node_fs_1.existsSync)(experimentalTest);
                if (!stillExists) {
                    summary.success = true;
                    console.log("\n🎉 Cleanup completed successfully!");
                    console.log("\uD83D\uDCCA Total space freed: ".concat(formatBytes(summary.totalSize)));
                    console.log("\uD83D\uDDC2\uFE0F  Directories removed: ".concat(summary.directories.length));
                    console.log("\uD83D\uDCC4 Files removed: ".concat(summary.files.length));
                }
                else {
                    summary.errors.push("Some files still exist after cleanup");
                }
            }
            catch (error) {
                summary.errors.push("Cleanup failed: ".concat(error));
                console.error("❌ Cleanup failed:", error);
            }
            return [2 /*return*/, summary];
        });
    });
}
function updateGitignore() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, _error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log("\n📝 Checking .gitignore...");
                    return [4 /*yield*/, execAsync('grep -n "experimental" .gitignore || true')];
                case 1:
                    stdout = (_a.sent()).stdout;
                    if (stdout.trim()) {
                        console.log("ℹ️  Found experimental references in .gitignore");
                        console.log("💡 Consider reviewing .gitignore for experimental patterns");
                    }
                    else {
                        console.log("✅ No experimental references found in .gitignore");
                    }
                    return [3 /*break*/, 3];
                case 2:
                    _error_1 = _a.sent();
                    console.warn("Warning: Could not check .gitignore");
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function runLintCheck() {
    return __awaiter(this, void 0, void 0, function () {
        var stdout, _error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log("\n🔍 Running post-cleanup lint check...");
                    return [4 /*yield*/, execAsync("biome check --reporter=summary", {
                            encoding: "utf8",
                            timeout: 30000,
                        })];
                case 1:
                    stdout = (_a.sent()).stdout;
                    console.log("📊 Post-cleanup lint results:");
                    console.log(stdout);
                    return [3 /*break*/, 3];
                case 2:
                    _error_2 = _a.sent();
                    console.log("ℹ️  Lint check completed (warnings may remain)");
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Main execution
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var summary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🚀 VetMed Tracker Experimental Code Cleanup\n");
                    console.log("This script removes experimental architecture code in favor of");
                    console.log("the proven simplified approach that achieved 62% complexity reduction.\n");
                    return [4 /*yield*/, cleanupExperimental()];
                case 1:
                    summary = _a.sent();
                    // Update gitignore if needed
                    return [4 /*yield*/, updateGitignore()];
                case 2:
                    // Update gitignore if needed
                    _a.sent();
                    // Check lint improvements
                    return [4 /*yield*/, runLintCheck()];
                case 3:
                    // Check lint improvements
                    _a.sent();
                    // Summary report
                    console.log("\n📋 Cleanup Summary:");
                    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    console.log("Status: ".concat(summary.success ? "✅ Success" : "❌ Failed"));
                    console.log("Space Freed: ".concat(formatBytes(summary.totalSize)));
                    console.log("Directories: ".concat(summary.directories.join(", ") || "None"));
                    console.log("Files: ".concat(summary.files.join(", ") || "None"));
                    if (summary.errors.length > 0) {
                        console.log("Errors: ".concat(summary.errors.join(", ")));
                    }
                    console.log("\n💡 Next Steps:");
                    console.log("• Review docs/EXPERIMENTAL_LEARNINGS.md for insights");
                    console.log("• Run `pnpm typecheck` to verify no broken imports");
                    console.log("• Run `pnpm build` to ensure clean production build");
                    console.log('• Commit changes: "feat: remove experimental code in favor of simplified architecture"');
                    process.exit(summary.success ? 0 : 1);
                    return [2 /*return*/];
            }
        });
    });
}
// Handle errors gracefully
main().catch(function (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
});
