# GitHub Actions CI/CD Setup

This document explains the enhanced GitHub Actions workflows for VetMed Tracker.

## Overview

Your CI/CD pipeline consists of three main workflows that work together to provide comprehensive testing, code quality checks, and database management for PRs.

## Workflows

### 1. PR Database Environment (`neon_workflow.yml`)

**Purpose**: Creates isolated database environments for each PR with full testing integration.

**Triggered on**: PR opened, reopened, synchronized, closed

**Jobs Flow**:
```
Setup → Create Neon Branch → Migrate Database → Test Against PR Database
                                     ↓
                              Schema Diff Comment
```

**Key Features**:
- ✅ **Isolated Database**: Each PR gets its own Neon database branch
- ✅ **Automatic Migrations**: Database schema applied to PR branch
- ✅ **Schema Review**: Automatic PR comments showing database changes  
- ✅ **Real Testing**: Tests run against actual PR database (not mock data)
- ✅ **Auto Cleanup**: Database branch deleted when PR closes

### 2. Test (`test.yml`)

**Purpose**: Reusable workflow for running integration and E2E tests.

**Triggered on**: 
- Push to main/master (uses local PostgreSQL)
- Called by neon workflow (uses PR database)
- Manual workflow_call

**Features**:
- 🔄 **Flexible Database**: Can use external database or local PostgreSQL
- 🧪 **Full Test Suite**: Integration tests + Playwright E2E tests
- 📊 **Test Artifacts**: Playwright reports uploaded on failure

### 3. Code Quality (`code_quality.yml`)

**Purpose**: Unified code quality checking with Biome linter.

**Triggered on**: Push, Pull Request

**Features**:
- 📋 **CI Checks**: Runs Biome CI checks on all pushes
- 💬 **PR Comments**: Adds reviewdog comments on pull requests
- ⚡ **Single Run**: No duplicate linting (merged from two workflows)

## Secrets Configuration

Your repository has the following secrets configured:

### Required Secrets (✅ Already Set)
- `NEON_API_KEY` - For database branch management
- `VERCEL_TOKEN` - For deployment automation  
- `VERCEL_ORG_ID` - Organization identifier
- `VERCEL_PROJECT_ID` - Project identifier
- `VERCEL_USER_ID` - User identifier

### Variables (✅ Already Set)
- `NEON_PROJECT_ID` - Your Neon project ID

## Workflow Integration with Vercel

Your setup integrates seamlessly with Vercel:

1. **PR Created** → Neon workflow creates database branch
2. **Migrations Run** → Schema applied to PR database  
3. **Vercel Auto-Deploy** → Vercel creates preview deployment (automatic)
4. **Tests Execute** → Tests run against PR database
5. **Schema Review** → Database changes commented on PR

## Monitoring Your CI/CD

### Single Dashboard View

Monitor all PR progress through the **"PR Database Environment"** workflow in GitHub Actions. This workflow orchestrates:
- Database provisioning ✅
- Schema migrations ✅  
- Test execution ✅
- Code quality checks ✅ (separate workflow)
- Schema review ✅

### Status Checks

Each PR will show these status checks:
- ✅ **PR Database Environment** - Main orchestration workflow
- ✅ **Code Quality** - Biome linting checks
- ✅ **Vercel** - Preview deployment (automatic)

## Benefits

### For Developers
- 🎯 **Real Environment Testing**: Tests against actual database schema
- 📋 **Automatic Reviews**: Database changes documented in PR
- 🔄 **Isolated Development**: No interference between PR environments
- ⚡ **Fast Feedback**: Parallel execution of tests and quality checks

### For Operations  
- 🛡️ **Zero Risk Deployments**: Full testing before merge
- 🧹 **Automatic Cleanup**: No resource leakage
- 📊 **Comprehensive Monitoring**: Single place to track all CI/CD activity
- 🔒 **Secure Credentials**: Proper secret management

## Troubleshooting

### Common Issues

**Database Migration Fails**:
- Check if schema changes are valid
- Verify migrations run locally first
- Review schema diff comment for conflicts

**Tests Fail on PR Database**:
- Ensure tests work with actual data (not just mocks)
- Check if test data fixtures are compatible
- Verify database permissions and connectivity

**Workflow Permissions**:
- PR comments require `pull-requests: write` permission (✅ already set)
- Schema diff action needs proper Neon API access (✅ already configured)

### Manual Interventions

**Retry Failed Workflow**:
- Navigate to Actions tab
- Find the failed workflow run
- Click "Re-run failed jobs"

**Force Database Branch Deletion**:
- Neon branches auto-delete when PR closes
- Manual deletion available in Neon Console if needed

## Next Steps

Your CI/CD pipeline is now production-ready with:
- ✅ Database-aware testing
- ✅ Automatic schema review  
- ✅ Unified code quality checking
- ✅ Zero-risk deployments
- ✅ Comprehensive monitoring

The system will automatically handle PR lifecycle management and provide detailed feedback on all changes.