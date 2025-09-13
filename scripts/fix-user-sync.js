#!/usr/bin/env bun
"use strict";
/**
 * Fix user sync issue between Stack Auth and local database
 *
 * This script handles various user synchronization issues:
 * - Users deleted from Stack Auth but still in local DB
 * - Orphaned test/seed users without Stack Auth IDs
 * - Cross-checking between vetmed_users and neon_auth.users_sync tables
 * - Validates stack_user_id against Stack Auth API
 *
 * Usage:
 *   bun scripts/fix-user-sync.ts <email>           # Fix specific user
 *   bun scripts/fix-user-sync.ts --check-orphaned  # List orphaned users
 *   bun scripts/fix-user-sync.ts --check-all       # Show all users and sync status
 *   bun scripts/fix-user-sync.ts --clean-test      # Remove test/seed users
 *   bun scripts/fix-user-sync.ts --validate-stack  # Validate Stack Auth IDs
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var drizzle_orm_1 = require("drizzle-orm");
var drizzle_1 = require("../db/drizzle");
var schema_1 = require("../db/schema");
// ANSI color codes for better output
var colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};
var log = {
    info: function (msg) { return console.log("".concat(colors.blue, "\u2139").concat(colors.reset, "  ").concat(msg)); },
    success: function (msg) {
        return console.log("".concat(colors.green, "\u2705").concat(colors.reset, " ").concat(msg));
    },
    warning: function (msg) {
        return console.log("".concat(colors.yellow, "\u26A0\uFE0F").concat(colors.reset, "  ").concat(msg));
    },
    error: function (msg) { return console.log("".concat(colors.red, "\u274C").concat(colors.reset, " ").concat(msg)); },
    header: function (msg) {
        return console.log("\n".concat(colors.bright).concat(colors.cyan, "\u2550\u2550\u2550 ").concat(msg, " \u2550\u2550\u2550").concat(colors.reset, "\n"));
    },
};
// Test/seed user emails to identify
var TEST_USER_EMAILS = [
    "sarah.johnson@gmail.com",
    "michael.chen@outlook.com",
    "dr.emma.wilson@vetclinic.com",
    "james.martinez@gmail.com",
    "lisa.thompson@yahoo.com",
];
// Stack Auth API configuration
var STACK_API_URL = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
    ? "https://api.stack-auth.com/api/v1/projects/".concat(process.env.NEXT_PUBLIC_STACK_PROJECT_ID)
    : null;
var STACK_SECRET_KEY = process.env.STACK_SECRET_SERVER_KEY;
/**
 * Validate if a Stack Auth user ID is actually valid
 */
function validateStackUserId(stackUserId) {
    return __awaiter(this, void 0, void 0, function () {
        var response, errorText, userData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!STACK_API_URL || !STACK_SECRET_KEY) {
                        return [2 /*return*/, {
                                valid: false,
                                error: "Stack Auth environment variables not configured",
                            }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, fetch("".concat(STACK_API_URL, "/users/").concat(stackUserId), {
                            method: "GET",
                            headers: {
                                "x-stack-secret-server-key": STACK_SECRET_KEY,
                                "x-stack-project-id": process.env.NEXT_PUBLIC_STACK_PROJECT_ID ||
                                    (function () {
                                        throw new Error("NEXT_PUBLIC_STACK_PROJECT_ID environment variable is required");
                                    })(),
                                "x-stack-access-type": "server",
                                "Content-Type": "application/json",
                            },
                        })];
                case 2:
                    response = _a.sent();
                    if (response.status === 404) {
                        return [2 /*return*/, {
                                valid: false,
                                error: "User not found in Stack Auth",
                            }];
                    }
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    errorText = _a.sent();
                    return [2 /*return*/, {
                            valid: false,
                            error: "Stack Auth API error: ".concat(response.status, " - ").concat(errorText),
                        }];
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    userData = _a.sent();
                    return [2 /*return*/, {
                            valid: true,
                            user: userData,
                        }];
                case 6:
                    error_1 = _a.sent();
                    return [2 /*return*/, {
                            valid: false,
                            error: "Failed to validate: ".concat(error_1),
                        }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function checkAndFixUser(email) {
    return __awaiter(this, void 0, void 0, function () {
        var existingUser, user_1, validation, readline, rl_1, answer, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    log.header("Checking user: ".concat(email));
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, drizzle_1.db
                            .select()
                            .from(schema_1.vetmedUsers)
                            .where((0, drizzle_orm_1.eq)(schema_1.vetmedUsers.email, email))
                            .limit(1)];
                case 2:
                    existingUser = _c.sent();
                    if (existingUser.length === 0) {
                        log.success("No user found in database - you can sign up freely!");
                        return [2 /*return*/];
                    }
                    user_1 = existingUser[0];
                    console.log("📊 User details:");
                    console.log("  ID: ".concat(colors.dim).concat(user_1.id).concat(colors.reset));
                    console.log("  Email: ".concat(user_1.email));
                    console.log("  Name: ".concat(user_1.name || "".concat(colors.dim, "(not set)").concat(colors.reset)));
                    console.log("  Stack User ID: ".concat(user_1.stackUserId || "".concat(colors.yellow, "(missing - orphaned)").concat(colors.reset)));
                    console.log("  Created: ".concat(colors.dim).concat(user_1.createdAt).concat(colors.reset));
                    if (!user_1.stackUserId) return [3 /*break*/, 4];
                    return [4 /*yield*/, validateStackUserId(user_1.stackUserId)];
                case 3:
                    validation = _c.sent();
                    if (validation.valid) {
                        console.log("  Stack Auth Status: ".concat(colors.green, "\u2713 Valid").concat(colors.reset, " (").concat(((_a = validation.user) === null || _a === void 0 ? void 0 : _a.primaryEmail) || ((_b = validation.user) === null || _b === void 0 ? void 0 : _b.email) || "no email", ")"));
                    }
                    else {
                        console.log("  Stack Auth Status: ".concat(colors.red, "\u2717 Invalid").concat(colors.reset, " - ").concat(validation.error));
                    }
                    _c.label = 4;
                case 4:
                    console.log();
                    readline = require("node:readline");
                    rl_1 = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    return [4 /*yield*/, new Promise(function (resolve) {
                            rl_1.question("".concat(colors.yellow, "?").concat(colors.reset, " This user exists in the database").concat(!user_1.stackUserId ? " but has no Stack Auth ID" : "", ".\n") +
                                "  Would you like to delete it from the database? (yes/no): ", resolve);
                        })];
                case 5:
                    answer = _c.sent();
                    rl_1.close();
                    if (!(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y")) return [3 /*break*/, 7];
                    console.log("\n🗑️  Deleting user from database...");
                    return [4 /*yield*/, drizzle_1.db.delete(schema_1.vetmedUsers).where((0, drizzle_orm_1.eq)(schema_1.vetmedUsers.email, email))];
                case 6:
                    _c.sent();
                    log.success("User deleted successfully!");
                    console.log("  You can now sign up with this email address.\n");
                    return [3 /*break*/, 8];
                case 7:
                    log.info("User not deleted.");
                    _c.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_2 = _c.sent();
                    log.error("Error: ".concat(error_2));
                    process.exit(1);
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
function checkOrphanedUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var orphanedUsers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log.header("Checking for Orphaned Users");
                    return [4 /*yield*/, drizzle_1.db
                            .select()
                            .from(schema_1.vetmedUsers)
                            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.vetmedUsers.stackUserId), (0, drizzle_orm_1.eq)(schema_1.vetmedUsers.stackUserId, "")))];
                case 1:
                    orphanedUsers = _a.sent();
                    if (orphanedUsers.length === 0) {
                        log.success("No orphaned users found!");
                        return [2 /*return*/];
                    }
                    log.warning("Found ".concat(orphanedUsers.length, " orphaned user(s):"));
                    console.log();
                    orphanedUsers.forEach(function (user) {
                        var isTestUser = TEST_USER_EMAILS.includes(user.email);
                        console.log("  ".concat(colors.dim, "\u2022").concat(colors.reset, " ").concat(user.email));
                        console.log("    ID: ".concat(colors.dim).concat(user.id).concat(colors.reset));
                        console.log("    Type: ".concat(isTestUser ? "".concat(colors.yellow, "Test/Seed User") : "".concat(colors.cyan, "Real User")).concat(colors.reset));
                        console.log("    Created: ".concat(colors.dim).concat(user.createdAt).concat(colors.reset));
                        console.log();
                    });
                    log.info("These users don't have Stack Auth IDs and may cause sync issues.");
                    console.log("Options:");
                    console.log("  • Run with email to fix individually: bun scripts/fix-user-sync.ts <email>");
                    console.log("  • Clean all test users: bun scripts/fix-user-sync.ts --clean-test");
                    return [2 /*return*/];
            }
        });
    });
}
function checkAllUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var allUsers, syncTableResult, syncUsers, orphaned, testUsers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log.header("All Users in System");
                    return [4 /*yield*/, drizzle_1.db
                            .select()
                            .from(schema_1.vetmedUsers)
                            .orderBy(schema_1.vetmedUsers.createdAt)];
                case 1:
                    allUsers = _a.sent();
                    return [4 /*yield*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT *\n            FROM neon_auth.users_sync"], ["SELECT *\n            FROM neon_auth.users_sync"]))))];
                case 2:
                    syncTableResult = _a.sent();
                    syncUsers = syncTableResult.rows;
                    console.log("".concat(colors.bright, "Local Database (vetmed_users):").concat(colors.reset));
                    console.log("Total: ".concat(allUsers.length, " users\n"));
                    allUsers.forEach(function (user) {
                        var isTestUser = TEST_USER_EMAILS.includes(user.email);
                        var hasStackId = !!user.stackUserId;
                        var status = "";
                        if (isTestUser)
                            status = "".concat(colors.yellow, " [TEST]").concat(colors.reset);
                        if (!hasStackId)
                            status += "".concat(colors.red, " [ORPHANED]").concat(colors.reset);
                        if (hasStackId)
                            status += "".concat(colors.green, " [SYNCED]").concat(colors.reset);
                        console.log("  ".concat(user.email).concat(status));
                        if (!hasStackId) {
                            console.log("    ".concat(colors.dim, "Missing Stack Auth ID").concat(colors.reset));
                        }
                        else {
                            console.log("    ".concat(colors.dim, "Stack ID: ").concat(user.stackUserId).concat(colors.reset));
                        }
                    });
                    console.log("\n".concat(colors.bright, "Stack Auth Sync Table (neon_auth.users_sync):").concat(colors.reset));
                    console.log("Total: ".concat(syncUsers.length, " users\n"));
                    if (syncUsers.length === 0) {
                        log.warning("Sync table is empty - Stack Auth may not be properly configured");
                    }
                    else {
                        syncUsers.forEach(function (user) {
                            console.log("  ".concat(user.email || user.id));
                            console.log("    ".concat(colors.dim, "ID: ").concat(user.id).concat(colors.reset));
                            if (user.deleted_at) {
                                console.log("    ".concat(colors.red, "Deleted: ").concat(user.deleted_at).concat(colors.reset));
                            }
                        });
                    }
                    // Find mismatches
                    console.log("\n".concat(colors.bright, "Sync Issues:").concat(colors.reset));
                    orphaned = allUsers.filter(function (u) { return !u.stackUserId; });
                    testUsers = allUsers.filter(function (u) { return TEST_USER_EMAILS.includes(u.email); });
                    if (orphaned.length > 0) {
                        log.warning("".concat(orphaned.length, " users without Stack Auth ID"));
                    }
                    if (testUsers.length > 0) {
                        log.info("".concat(testUsers.length, " test/seed users found"));
                    }
                    if (orphaned.length === 0 && testUsers.length === 0) {
                        log.success("No sync issues detected!");
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function validateStackAuthIds() {
    return __awaiter(this, void 0, void 0, function () {
        var usersWithStackIds, validCount, invalidCount, invalidUsers, _i, usersWithStackIds_1, user, validation;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log.header("Validating Stack Auth IDs");
                    return [4 /*yield*/, drizzle_1.db
                            .select()
                            .from(schema_1.vetmedUsers)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNotNull)(schema_1.vetmedUsers.stackUserId), (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["", "\n                != ''"], ["", "\n                != ''"])), schema_1.vetmedUsers.stackUserId)))];
                case 1:
                    usersWithStackIds = _a.sent();
                    if (usersWithStackIds.length === 0) {
                        log.info("No users with Stack Auth IDs found.");
                        return [2 /*return*/];
                    }
                    console.log("Checking ".concat(usersWithStackIds.length, " users with Stack Auth IDs...\n"));
                    validCount = 0;
                    invalidCount = 0;
                    invalidUsers = [];
                    _i = 0, usersWithStackIds_1 = usersWithStackIds;
                    _a.label = 2;
                case 2:
                    if (!(_i < usersWithStackIds_1.length)) return [3 /*break*/, 5];
                    user = usersWithStackIds_1[_i];
                    if (!user.stackUserId) {
                        console.log("  ".concat(colors.yellow, "\u26A0").concat(colors.reset, " ").concat(user.email, " - Missing Stack User ID"));
                        return [3 /*break*/, 4];
                    }
                    return [4 /*yield*/, validateStackUserId(user.stackUserId)];
                case 3:
                    validation = _a.sent();
                    if (validation.valid) {
                        validCount++;
                        console.log("  ".concat(colors.green, "\u2713").concat(colors.reset, " ").concat(user.email, " - Stack ID valid"));
                    }
                    else {
                        invalidCount++;
                        invalidUsers.push({ user: user, error: validation.error });
                        console.log("  ".concat(colors.red, "\u2717").concat(colors.reset, " ").concat(user.email, " - ").concat(validation.error));
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\n".concat(colors.bright, "Summary:").concat(colors.reset));
                    console.log("  Valid Stack Auth IDs: ".concat(colors.green).concat(validCount).concat(colors.reset));
                    console.log("  Invalid Stack Auth IDs: ".concat(colors.red).concat(invalidCount).concat(colors.reset));
                    if (invalidUsers.length > 0) {
                        console.log("\n".concat(colors.yellow, "Invalid users need attention:").concat(colors.reset));
                        invalidUsers.forEach(function (_a) {
                            var user = _a.user, error = _a.error;
                            console.log("  \u2022 ".concat(user.email));
                            console.log("    ".concat(colors.dim, "Stack ID: ").concat(user.stackUserId).concat(colors.reset));
                            console.log("    ".concat(colors.dim, "Error: ").concat(error).concat(colors.reset));
                        });
                        console.log("\n".concat(colors.cyan, "Recommendations:").concat(colors.reset));
                        console.log("  1. These users may have been deleted from Stack Auth");
                        console.log("  2. Consider removing them with: bun scripts/fix-user-sync.ts <email>");
                        console.log("  3. Or clear their Stack IDs to mark them as orphaned");
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function cleanTestUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var testUsersInList, readline, rl, answer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log.header("Cleaning Test/Seed Users");
                    return [4 /*yield*/, drizzle_1.db
                            .select()
                            .from(schema_1.vetmedUsers)
                            .where(drizzle_orm_1.or.apply(void 0, TEST_USER_EMAILS.map(function (email) { return (0, drizzle_orm_1.eq)(schema_1.vetmedUsers.email, email); })))];
                case 1:
                    testUsersInList = _a.sent();
                    if (testUsersInList.length === 0) {
                        log.info("No test users found to clean.");
                        return [2 /*return*/];
                    }
                    console.log("Found test/seed users to remove:");
                    testUsersInList.forEach(function (user) {
                        console.log("  ".concat(colors.dim, "\u2022").concat(colors.reset, " ").concat(user.email));
                    });
                    readline = require("node:readline");
                    rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout,
                    });
                    return [4 /*yield*/, new Promise(function (resolve) {
                            rl.question("\n".concat(colors.yellow, "?").concat(colors.reset, " Delete ").concat(testUsersInList.length, " test user(s)? (yes/no): "), resolve);
                        })];
                case 2:
                    answer = _a.sent();
                    rl.close();
                    if (!(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y")) return [3 /*break*/, 4];
                    return [4 /*yield*/, drizzle_1.db
                            .delete(schema_1.vetmedUsers)
                            .where(drizzle_orm_1.or.apply(void 0, TEST_USER_EMAILS.map(function (email) { return (0, drizzle_orm_1.eq)(schema_1.vetmedUsers.email, email); })))];
                case 3:
                    _a.sent();
                    log.success("Deleted ".concat(testUsersInList.length, " test user(s)!"));
                    return [3 /*break*/, 5];
                case 4:
                    log.info("Cleanup cancelled.");
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Main execution
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var args, command, _a, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    args = process.argv.slice(2);
                    command = args[0];
                    console.log("".concat(colors.bright).concat(colors.blue, "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557").concat(colors.reset));
                    console.log("".concat(colors.bright).concat(colors.blue, "\u2551   VetMed User Sync Management      \u2551").concat(colors.reset));
                    console.log("".concat(colors.bright).concat(colors.blue, "\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D").concat(colors.reset));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 15, , 16]);
                    _a = command;
                    switch (_a) {
                        case "--check-orphaned": return [3 /*break*/, 2];
                        case "--check-all": return [3 /*break*/, 4];
                        case "--status": return [3 /*break*/, 4];
                        case "--clean-test": return [3 /*break*/, 6];
                        case "--validate-stack": return [3 /*break*/, 8];
                        case "--validate": return [3 /*break*/, 8];
                        case "--help": return [3 /*break*/, 10];
                        case "-h": return [3 /*break*/, 10];
                        case undefined: return [3 /*break*/, 10];
                    }
                    return [3 /*break*/, 11];
                case 2: return [4 /*yield*/, checkOrphanedUsers()];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 4: return [4 /*yield*/, checkAllUsers()];
                case 5:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 6: return [4 /*yield*/, cleanTestUsers()];
                case 7:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 8: return [4 /*yield*/, validateStackAuthIds()];
                case 9:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 10:
                    console.log("\nUsage:");
                    console.log("  bun scripts/fix-user-sync.ts <email>           # Fix specific user");
                    console.log("  bun scripts/fix-user-sync.ts --check-orphaned  # List orphaned users");
                    console.log("  bun scripts/fix-user-sync.ts --check-all       # Show all users and sync status");
                    console.log("  bun scripts/fix-user-sync.ts --clean-test      # Remove test/seed users");
                    console.log("  bun scripts/fix-user-sync.ts --validate-stack  # Validate Stack Auth IDs");
                    console.log("\nExamples:");
                    console.log("  bun scripts/fix-user-sync.ts user@example.com");
                    console.log("  bun scripts/fix-user-sync.ts --check-orphaned");
                    console.log("  bun scripts/fix-user-sync.ts --validate-stack");
                    return [3 /*break*/, 14];
                case 11:
                    if (!command.includes("@")) return [3 /*break*/, 13];
                    return [4 /*yield*/, checkAndFixUser(command)];
                case 12:
                    _b.sent();
                    return [3 /*break*/, 14];
                case 13:
                    log.error("Unknown command: ".concat(command));
                    console.log("Run with --help to see available commands");
                    process.exit(1);
                    _b.label = 14;
                case 14: return [3 /*break*/, 16];
                case 15:
                    error_3 = _b.sent();
                    log.error("Fatal error: ".concat(error_3));
                    process.exit(1);
                    return [3 /*break*/, 16];
                case 16:
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    log.error("Fatal error: ".concat(error));
    process.exit(1);
});
var templateObject_1, templateObject_2;
