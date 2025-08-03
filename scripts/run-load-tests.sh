#!/bin/bash

# Load Testing Runner Script for VetMed Tracker
# This script sets up the environment and runs comprehensive load tests

set -e

echo "🎯 VetMed Tracker Load Testing Suite"
echo "===================================="

# Check if development server is running
check_dev_server() {
    echo "🔍 Checking if development server is running..."
    
    if curl -s -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ Development server is running"
        return 0
    else
        echo "❌ Development server is not running"
        echo "💡 Please start the development server first:"
        echo "   pnpm dev"
        return 1
    fi
}

# Start development server if not running
start_dev_server() {
    echo "🚀 Starting development server..."
    
    # Start the dev server in background
    pnpm dev > /tmp/vetmed-dev-server.log 2>&1 &
    DEV_SERVER_PID=$!
    
    echo "⏳ Waiting for server to start..."
    
    # Wait up to 60 seconds for server to be ready
    for i in {1..60}; do
        if curl -s -f http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "✅ Development server started (PID: $DEV_SERVER_PID)"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ Development server failed to start within 60 seconds"
    kill $DEV_SERVER_PID 2>/dev/null || true
    return 1
}

# Clean up function
cleanup() {
    echo "🧹 Cleaning up..."
    if [ ! -z "$DEV_SERVER_PID" ]; then
        echo "⏹️ Stopping development server (PID: $DEV_SERVER_PID)"
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
    fi
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Check dependencies
echo "📦 Checking dependencies..."
if ! command -v tsx >/dev/null 2>&1; then
    echo "❌ tsx not found. Installing..."
    pnpm add -D tsx
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "❌ curl not found. Please install curl."
    exit 1
fi

# Main execution
main() {
    local test_type="${1:-all}"
    local scenario="${2:-}"
    
    echo "🎯 Test type: $test_type"
    
    # Check if server is running, start if needed
    if ! check_dev_server; then
        echo "🔄 Starting development server..."
        if ! start_dev_server; then
            echo "❌ Failed to start development server"
            exit 1
        fi
        DEV_SERVER_PID=$!
    fi
    
    # Wait a moment for server to stabilize
    echo "⏳ Waiting for server to stabilize..."
    sleep 5
    
    # Run the load tests based on type
    case "$test_type" in
        "all")
            echo "🚀 Running all load test scenarios..."
            tsx scripts/load-test.ts all
            ;;
        "scenario")
            if [ -z "$scenario" ]; then
                echo "❌ Scenario name required for 'scenario' test type"
                echo "Available scenarios: normal, highLoad, rateLimitTest, circuitBreakerTest, extreme"
                exit 1
            fi
            echo "🚀 Running scenario: $scenario"
            tsx scripts/load-test.ts scenario "$scenario"
            ;;
        "quick")
            echo "🚀 Running quick test scenarios..."
            echo "📊 Running normal load test..."
            tsx scripts/load-test.ts scenario normal
            echo ""
            echo "📊 Running rate limit test..."
            tsx scripts/load-test.ts scenario rateLimitTest
            ;;
        "stress")
            echo "🚀 Running stress test scenarios..."
            echo "📊 Running high load test..."
            tsx scripts/load-test.ts scenario highLoad
            echo ""
            echo "📊 Running extreme load test..."
            tsx scripts/load-test.ts scenario extreme
            ;;
        "simulate")
            if [ -z "$scenario" ]; then
                echo "❌ Simulation type required"
                echo "Available simulations: load, failure"
                exit 1
            fi
            echo "🚀 Running simulation: $scenario"
            tsx scripts/load-test.ts simulate "$scenario"
            ;;
        *)
            echo "❌ Invalid test type: $test_type"
            echo "Available types: all, scenario, quick, stress, simulate"
            exit 1
            ;;
    esac
    
    echo ""
    echo "✅ Load testing completed successfully!"
    echo "📁 Check the console output above for detailed results"
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <test_type> [scenario]"
    echo ""
    echo "Test types:"
    echo "  all       - Run all test scenarios (comprehensive)"
    echo "  scenario  - Run specific scenario (requires scenario name)"
    echo "  quick     - Run quick test suite (normal + rate limit)"
    echo "  stress    - Run stress test suite (high load + extreme)"
    echo "  simulate  - Run failure simulations (requires simulation type)"
    echo ""
    echo "Examples:"
    echo "  $0 all                           # Run all tests"
    echo "  $0 scenario normal               # Run normal load scenario"
    echo "  $0 scenario rateLimitTest        # Test rate limiting"
    echo "  $0 quick                         # Quick test suite"
    echo "  $0 stress                        # Stress testing"
    echo "  $0 simulate load                 # Simulate database load"
    echo ""
    echo "Available scenarios: normal, highLoad, rateLimitTest, circuitBreakerTest, extreme"
    echo "Available simulations: load, failure"
    exit 1
fi

# Run main function with arguments
main "$@"