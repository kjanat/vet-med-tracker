#!/usr/bin/env tsx
"use strict";
/**
 * Test script to validate materialized view performance and correctness
 * Run with: tsx scripts/test-materialized-views.ts
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
var node_perf_hooks_1 = require("node:perf_hooks");
var drizzle_orm_1 = require("drizzle-orm");
var drizzle_1 = require("../db/drizzle");
function measureQuery(name, queryFn) {
    return __awaiter(this, void 0, void 0, function () {
        var start, result, end, time;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("  Running ".concat(name, "..."));
                    start = node_perf_hooks_1.performance.now();
                    return [4 /*yield*/, queryFn()];
                case 1:
                    result = _a.sent();
                    end = node_perf_hooks_1.performance.now();
                    time = Math.round(end - start);
                    console.log("  ".concat(name, ": ").concat(time, "ms"));
                    return [2 /*return*/, { time: time, result: result }];
            }
        });
    });
}
function testComplianceStats() {
    return __awaiter(this, void 0, void 0, function () {
        var originalQuery, materializedQuery, original, materialized, improvementPct, rowCountMatch;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n=== Testing Compliance Statistics ===");
                    originalQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            SELECT household_id,\n                   animal_id,\n                   DATE_TRUNC('day', recorded_at) as day,\n\t\t\t\tCOUNT(*) as total,\n\t\t\t\tCOUNT(CASE WHEN status = 'ON_TIME' THEN 1 END) as on_time,\n\t\t\t\tCOUNT(CASE WHEN status IN ('LATE', 'VERY_LATE') THEN 1 END) as late,\n\t\t\t\tCOUNT(CASE WHEN status = 'MISSED' THEN 1 END) as missed\n            FROM vetmed_administrations\n            WHERE recorded_at >= CURRENT_DATE - INTERVAL '90 days'\n            GROUP BY household_id, animal_id, DATE_TRUNC('day', recorded_at)\n                LIMIT 100\n        "], ["\n            SELECT household_id,\n                   animal_id,\n                   DATE_TRUNC('day', recorded_at) as day,\n\t\t\t\tCOUNT(*) as total,\n\t\t\t\tCOUNT(CASE WHEN status = 'ON_TIME' THEN 1 END) as on_time,\n\t\t\t\tCOUNT(CASE WHEN status IN ('LATE', 'VERY_LATE') THEN 1 END) as late,\n\t\t\t\tCOUNT(CASE WHEN status = 'MISSED' THEN 1 END) as missed\n            FROM vetmed_administrations\n            WHERE recorded_at >= CURRENT_DATE - INTERVAL '90 days'\n            GROUP BY household_id, animal_id, DATE_TRUNC('day', recorded_at)\n                LIMIT 100\n        "]))))];
                        });
                    }); };
                    materializedQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n            SELECT household_id,\n                   animal_id, day, SUM (total_doses) as total, SUM (on_time_count) as on_time, SUM (late_count + very_late_count) as late, SUM (missed_count) as missed\n            FROM mv_compliance_stats\n            WHERE day >= CURRENT_DATE - INTERVAL '90 days'\n            GROUP BY household_id, animal_id, day\n                LIMIT 100\n        "], ["\n            SELECT household_id,\n                   animal_id, day, SUM (total_doses) as total, SUM (on_time_count) as on_time, SUM (late_count + very_late_count) as late, SUM (missed_count) as missed\n            FROM mv_compliance_stats\n            WHERE day >= CURRENT_DATE - INTERVAL '90 days'\n            GROUP BY household_id, animal_id, day\n                LIMIT 100\n        "]))))];
                        });
                    }); };
                    return [4 /*yield*/, measureQuery("Original Query", originalQuery)];
                case 1:
                    original = _a.sent();
                    return [4 /*yield*/, measureQuery("Materialized View", materializedQuery)];
                case 2:
                    materialized = _a.sent();
                    improvementPct = Math.round(((original.time - materialized.time) / original.time) * 100);
                    rowCountMatch = original.result.rows.length === materialized.result.rows.length;
                    return [2 /*return*/, {
                            testName: "Compliance Statistics",
                            originalQueryTime: original.time,
                            materializedViewTime: materialized.time,
                            improvementPct: improvementPct,
                            rowCountMatch: rowCountMatch,
                            status: improvementPct > 50 && rowCountMatch ? "PASS" : "FAIL",
                            details: "Rows: ".concat(original.result.rows.length, " vs ").concat(materialized.result.rows.length),
                        }];
            }
        });
    });
}
function testMedicationUsage() {
    return __awaiter(this, void 0, void 0, function () {
        var originalQuery, materializedQuery, original, materialized, improvementPct, rowCountSimilar;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n=== Testing Medication Usage ===");
                    originalQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n            SELECT household_id,\n                   medication_id,\n                   DATE_TRUNC('month', recorded_at) as month,\n\t\t\t\tCOUNT(*) as total_administrations,\n\t\t\t\tCOUNT(DISTINCT animal_id) as animals_treated,\n\t\t\t\tCOUNT(CASE WHEN adverse_event = true THEN 1 END) as adverse_events\n            FROM vetmed_administrations a\n                JOIN vetmed_regimens r\n            ON a.regimen_id = r.id\n            WHERE recorded_at >= CURRENT_DATE - INTERVAL '180 days'\n            GROUP BY household_id, medication_id, DATE_TRUNC('month', recorded_at)\n                LIMIT 100\n        "], ["\n            SELECT household_id,\n                   medication_id,\n                   DATE_TRUNC('month', recorded_at) as month,\n\t\t\t\tCOUNT(*) as total_administrations,\n\t\t\t\tCOUNT(DISTINCT animal_id) as animals_treated,\n\t\t\t\tCOUNT(CASE WHEN adverse_event = true THEN 1 END) as adverse_events\n            FROM vetmed_administrations a\n                JOIN vetmed_regimens r\n            ON a.regimen_id = r.id\n            WHERE recorded_at >= CURRENT_DATE - INTERVAL '180 days'\n            GROUP BY household_id, medication_id, DATE_TRUNC('month', recorded_at)\n                LIMIT 100\n        "]))))];
                        });
                    }); };
                    materializedQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n            SELECT household_id,\n                   medication_id, month, SUM (total_administrations) as total_administrations, AVG (animals_treated) as animals_treated, SUM (adverse_events) as adverse_events\n            FROM mv_medication_usage\n            WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '180 days')\n            GROUP BY household_id, medication_id, month\n                LIMIT 100\n        "], ["\n            SELECT household_id,\n                   medication_id, month, SUM (total_administrations) as total_administrations, AVG (animals_treated) as animals_treated, SUM (adverse_events) as adverse_events\n            FROM mv_medication_usage\n            WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '180 days')\n            GROUP BY household_id, medication_id, month\n                LIMIT 100\n        "]))))];
                        });
                    }); };
                    return [4 /*yield*/, measureQuery("Original Query", originalQuery)];
                case 1:
                    original = _a.sent();
                    return [4 /*yield*/, measureQuery("Materialized View", materializedQuery)];
                case 2:
                    materialized = _a.sent();
                    improvementPct = Math.round(((original.time - materialized.time) / original.time) * 100);
                    rowCountSimilar = Math.abs(original.result.rows.length - materialized.result.rows.length) <=
                        5;
                    return [2 /*return*/, {
                            testName: "Medication Usage",
                            originalQueryTime: original.time,
                            materializedViewTime: materialized.time,
                            improvementPct: improvementPct,
                            rowCountMatch: rowCountSimilar,
                            status: improvementPct > 50 && rowCountSimilar ? "PASS" : "FAIL",
                            details: "Rows: ".concat(original.result.rows.length, " vs ").concat(materialized.result.rows.length),
                        }];
            }
        });
    });
}
function testInventoryConsumption() {
    return __awaiter(this, void 0, void 0, function () {
        var originalQuery, materializedQuery, original, materialized, improvementPct, rowCountSimilar;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n=== Testing Inventory Consumption ===");
                    originalQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n            SELECT household_id,\n                   medication_id,\n                   COUNT(*)             as consumption_events,\n                   AVG(units_remaining) as avg_remaining\n            FROM vetmed_inventory_items\n            WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'\n              AND deleted_at IS NULL\n            GROUP BY household_id, medication_id\n                LIMIT 50\n        "], ["\n            SELECT household_id,\n                   medication_id,\n                   COUNT(*)             as consumption_events,\n                   AVG(units_remaining) as avg_remaining\n            FROM vetmed_inventory_items\n            WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'\n              AND deleted_at IS NULL\n            GROUP BY household_id, medication_id\n                LIMIT 50\n        "]))))];
                        });
                    }); };
                    materializedQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["\n            SELECT household_id,\n                   medication_id,\n                   COUNT(*)                   as consumption_events,\n                   AVG(total_units_remaining) as avg_remaining\n            FROM mv_inventory_consumption\n            WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '365 days')\n            GROUP BY household_id, medication_id\n                LIMIT 50\n        "], ["\n            SELECT household_id,\n                   medication_id,\n                   COUNT(*)                   as consumption_events,\n                   AVG(total_units_remaining) as avg_remaining\n            FROM mv_inventory_consumption\n            WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '365 days')\n            GROUP BY household_id, medication_id\n                LIMIT 50\n        "]))))];
                        });
                    }); };
                    return [4 /*yield*/, measureQuery("Original Query", originalQuery)];
                case 1:
                    original = _a.sent();
                    return [4 /*yield*/, measureQuery("Materialized View", materializedQuery)];
                case 2:
                    materialized = _a.sent();
                    improvementPct = Math.round(((original.time - materialized.time) / original.time) * 100);
                    rowCountSimilar = Math.abs(original.result.rows.length - materialized.result.rows.length) <=
                        10;
                    return [2 /*return*/, {
                            testName: "Inventory Consumption",
                            originalQueryTime: original.time,
                            materializedViewTime: materialized.time,
                            improvementPct: improvementPct,
                            rowCountMatch: rowCountSimilar,
                            status: improvementPct > 30 && rowCountSimilar ? "PASS" : "FAIL",
                            details: "Rows: ".concat(original.result.rows.length, " vs ").concat(materialized.result.rows.length),
                        }];
            }
        });
    });
}
function testAnimalHealthTrends() {
    return __awaiter(this, void 0, void 0, function () {
        var originalQuery, materializedQuery, original, materialized, improvementPct, rowCountMatch;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n=== Testing Animal Health Trends ===");
                    originalQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["\n            SELECT a.household_id,\n                   a.animal_id,\n                   DATE_TRUNC('month', a.recorded_at) as month,\n\t\t\t\tCOUNT(DISTINCT r.medication_id) as unique_medications,\n\t\t\t\tCOUNT(*) as total_administrations,\n\t\t\t\tAVG(CASE WHEN a.status = 'ON_TIME' THEN 1.0 ELSE 0.0 END) * 100 as on_time_rate\n            FROM vetmed_administrations a\n                JOIN vetmed_regimens r\n            ON a.regimen_id = r.id\n            WHERE a.recorded_at >= CURRENT_DATE - INTERVAL '12 months'\n            GROUP BY a.household_id, a.animal_id, DATE_TRUNC('month', a.recorded_at)\n                LIMIT 100\n        "], ["\n            SELECT a.household_id,\n                   a.animal_id,\n                   DATE_TRUNC('month', a.recorded_at) as month,\n\t\t\t\tCOUNT(DISTINCT r.medication_id) as unique_medications,\n\t\t\t\tCOUNT(*) as total_administrations,\n\t\t\t\tAVG(CASE WHEN a.status = 'ON_TIME' THEN 1.0 ELSE 0.0 END) * 100 as on_time_rate\n            FROM vetmed_administrations a\n                JOIN vetmed_regimens r\n            ON a.regimen_id = r.id\n            WHERE a.recorded_at >= CURRENT_DATE - INTERVAL '12 months'\n            GROUP BY a.household_id, a.animal_id, DATE_TRUNC('month', a.recorded_at)\n                LIMIT 100\n        "]))))];
                        });
                    }); };
                    materializedQuery = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["\n            SELECT household_id,\n                   animal_id, month, unique_medications, total_administrations, on_time_rate\n            FROM mv_animal_health_trends\n            WHERE month >= DATE_TRUNC('month'\n                , CURRENT_DATE - INTERVAL '12 months')\n                LIMIT 100\n        "], ["\n            SELECT household_id,\n                   animal_id, month, unique_medications, total_administrations, on_time_rate\n            FROM mv_animal_health_trends\n            WHERE month >= DATE_TRUNC('month'\n                , CURRENT_DATE - INTERVAL '12 months')\n                LIMIT 100\n        "]))))];
                        });
                    }); };
                    return [4 /*yield*/, measureQuery("Original Query", originalQuery)];
                case 1:
                    original = _a.sent();
                    return [4 /*yield*/, measureQuery("Materialized View", materializedQuery)];
                case 2:
                    materialized = _a.sent();
                    improvementPct = Math.round(((original.time - materialized.time) / original.time) * 100);
                    rowCountMatch = Math.abs(original.result.rows.length - materialized.result.rows.length) <=
                        5;
                    return [2 /*return*/, {
                            testName: "Animal Health Trends",
                            originalQueryTime: original.time,
                            materializedViewTime: materialized.time,
                            improvementPct: improvementPct,
                            rowCountMatch: rowCountMatch,
                            status: improvementPct > 50 && rowCountMatch ? "PASS" : "FAIL",
                            details: "Rows: ".concat(original.result.rows.length, " vs ").concat(materialized.result.rows.length),
                        }];
            }
        });
    });
}
function testRefreshPerformance() {
    return __awaiter(this, void 0, void 0, function () {
        var start, result, refreshResult, end, refreshTime, success, fastEnough, error_1, end, refreshTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n=== Testing Refresh Performance ===");
                    start = node_perf_hooks_1.performance.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["SELECT refresh_compliance_stats()"], ["SELECT refresh_compliance_stats()"]))))];
                case 2:
                    result = _a.sent();
                    refreshResult = result.rows[0];
                    end = node_perf_hooks_1.performance.now();
                    refreshTime = Math.round(end - start);
                    console.log("  Refresh time: ".concat(refreshTime, "ms"));
                    console.log("  Refresh result: ".concat(JSON.stringify(refreshResult)));
                    success = refreshResult && String(refreshResult.status) === "COMPLETED";
                    fastEnough = refreshTime < 30000;
                    return [2 /*return*/, {
                            testName: "Refresh Performance",
                            originalQueryTime: refreshTime,
                            materializedViewTime: 0,
                            improvementPct: 0,
                            rowCountMatch: true,
                            status: success && fastEnough ? "PASS" : "FAIL",
                            details: "Refresh took ".concat(refreshTime, "ms, Status: ").concat((refreshResult === null || refreshResult === void 0 ? void 0 : refreshResult.status) || "UNKNOWN"),
                        }];
                case 3:
                    error_1 = _a.sent();
                    end = node_perf_hooks_1.performance.now();
                    refreshTime = Math.round(end - start);
                    return [2 /*return*/, {
                            testName: "Refresh Performance",
                            originalQueryTime: refreshTime,
                            materializedViewTime: 0,
                            improvementPct: 0,
                            rowCountMatch: false,
                            status: "FAIL",
                            details: "Refresh failed: ".concat(error_1 instanceof Error ? error_1.message : "Unknown error"),
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function testViewHealth() {
    return __awaiter(this, void 0, void 0, function () {
        var healthResult, healthRows, healthyViews, totalViews, _i, healthRows_1, view, lastRefresh, successRate, isHealthy_1, healthRatio, isHealthy, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n=== Testing View Health ===");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, drizzle_1.db.execute((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["SELECT *\n                FROM get_mv_refresh_status()"], ["SELECT *\n                FROM get_mv_refresh_status()"]))))];
                case 2:
                    healthResult = _a.sent();
                    healthRows = healthResult.rows;
                    console.log("  Found ".concat(healthRows.length, " materialized views"));
                    healthyViews = 0;
                    totalViews = healthRows.length;
                    for (_i = 0, healthRows_1 = healthRows; _i < healthRows_1.length; _i++) {
                        view = healthRows_1[_i];
                        lastRefresh = view.last_refresh
                            ? new Date(String(view.last_refresh))
                            : null;
                        successRate = Number(view.success_rate) || 0;
                        isHealthy_1 = lastRefresh &&
                            lastRefresh > new Date(Date.now() - 2 * 60 * 60 * 1000) && // Refreshed within 2 hours
                            successRate >= 80;
                        if (isHealthy_1)
                            healthyViews++;
                        console.log("    ".concat(view.view_name, ": ").concat(successRate, "% success, last refresh ").concat(lastRefresh ? lastRefresh.toISOString() : "never"));
                    }
                    healthRatio = totalViews > 0 ? healthyViews / totalViews : 0;
                    isHealthy = healthRatio >= 0.75;
                    return [2 /*return*/, {
                            testName: "View Health",
                            originalQueryTime: 0,
                            materializedViewTime: 0,
                            improvementPct: Math.round(healthRatio * 100),
                            rowCountMatch: totalViews >= 4, // Should have all 4 expected views
                            status: isHealthy && totalViews >= 4 ? "PASS" : "FAIL",
                            details: "".concat(healthyViews, "/").concat(totalViews, " views healthy (").concat(Math.round(healthRatio * 100), "%)"),
                        }];
                case 3:
                    error_2 = _a.sent();
                    return [2 /*return*/, {
                            testName: "View Health",
                            originalQueryTime: 0,
                            materializedViewTime: 0,
                            improvementPct: 0,
                            rowCountMatch: false,
                            status: "FAIL",
                            details: "Health check failed: ".concat(error_2 instanceof Error ? error_2.message : "Unknown error"),
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Helper to execute all tests and collect results
function executeTestSuite(tests) {
    return __awaiter(this, void 0, void 0, function () {
        var results, _i, tests_1, test_1, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    results = [];
                    _i = 0, tests_1 = tests;
                    _a.label = 1;
                case 1:
                    if (!(_i < tests_1.length)) return [3 /*break*/, 6];
                    test_1 = tests_1[_i];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, test_1()];
                case 3:
                    result = _a.sent();
                    results.push(result);
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _a.sent();
                    console.error("Test failed with error: ".concat(error_3));
                    results.push({
                        testName: test_1.name,
                        originalQueryTime: 0,
                        materializedViewTime: 0,
                        improvementPct: 0,
                        rowCountMatch: false,
                        status: "FAIL",
                        details: "Exception: ".concat(error_3 instanceof Error ? error_3.message : "Unknown error"),
                    });
                    return [3 /*break*/, 5];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, results];
            }
        });
    });
}
// Helper to display test results
function displayTestResults(results) {
    console.log("\n📊 Test Results Summary");
    console.log("========================");
    console.table(results.map(function (r) { return ({
        Test: r.testName,
        Status: r.status,
        "Original (ms)": r.originalQueryTime || "-",
        "Optimized (ms)": r.materializedViewTime || "-",
        Improvement: r.improvementPct > 0 ? "".concat(r.improvementPct, "%") : "-",
        "Data Match": r.rowCountMatch ? "✅" : "❌",
        Details: r.details || "",
    }); }));
}
// Helper to show overall success summary
function showOverallSummary(results) {
    var passed = results.filter(function (r) { return r.status === "PASS"; }).length;
    var total = results.length;
    var overallSuccess = passed / total;
    console.log("\n\uD83D\uDCC8 Overall Results: ".concat(passed, "/").concat(total, " tests passed (").concat(Math.round(overallSuccess * 100), "%)"));
    if (overallSuccess >= 0.8) {
        console.log("✅ Materialized views deployment successful!");
    }
    else if (overallSuccess >= 0.6) {
        console.log("⚠️  Materialized views partially working - review failures");
    }
    else {
        console.log("❌ Materialized views deployment needs attention");
    }
    return overallSuccess;
}
// Helper to show performance summary
function showPerformanceSummary(results) {
    var performanceTests = results.filter(function (r) { return r.originalQueryTime > 0 && r.materializedViewTime > 0; });
    if (performanceTests.length > 0) {
        var avgImprovement = performanceTests.reduce(function (sum, r) { return sum + r.improvementPct; }, 0) /
            performanceTests.length;
        console.log("\uD83D\uDE80 Average performance improvement: ".concat(Math.round(avgImprovement), "%"));
        if (avgImprovement >= 70) {
            console.log("🎉 Excellent performance gains achieved!");
        }
        else if (avgImprovement >= 50) {
            console.log("👍 Good performance improvements");
        }
        else {
            console.log("📝 Consider optimizing further");
        }
    }
}
function runAllTests() {
    return __awaiter(this, void 0, void 0, function () {
        var tests, results, overallSuccess;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🚀 Starting Materialized Views Performance Tests");
                    console.log("================================================");
                    tests = [
                        testComplianceStats,
                        testMedicationUsage,
                        testInventoryConsumption,
                        testAnimalHealthTrends,
                        testRefreshPerformance,
                        testViewHealth,
                    ];
                    return [4 /*yield*/, executeTestSuite(tests)];
                case 1:
                    results = _a.sent();
                    displayTestResults(results);
                    overallSuccess = showOverallSummary(results);
                    showPerformanceSummary(results);
                    process.exit(overallSuccess >= 0.8 ? 0 : 1);
                    return [2 /*return*/];
            }
        });
    });
}
// Handle process termination gracefully
process.on("SIGINT", function () {
    console.log("\n⏹️  Test interrupted by user");
    process.exit(1);
});
process.on("unhandledRejection", function (reason) {
    console.error("❌ Unhandled rejection:", reason);
    process.exit(1);
});
// Run tests
runAllTests().catch(function (error) {
    console.error("💥 Test suite failed:", error);
    process.exit(1);
});
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10;
