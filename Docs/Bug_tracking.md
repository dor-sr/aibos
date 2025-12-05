# AI Business OS - Bug Tracking

## Overview

This document tracks bugs, issues, and their resolutions throughout the development of AI Business OS. All errors encountered should be documented here with their solutions.

---

## Issue Template

When logging a new issue, use this format:

```markdown
### Issue #[NUMBER]: [Brief Title]

**Date**: YYYY-MM-DD
**Status**: Open | In Progress | Resolved
**Severity**: Critical | High | Medium | Low

**Description**:
[Detailed description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Error Message** (if applicable):
```
[Error message or stack trace]
```

**Root Cause**:
[Analysis of why the issue occurred]

**Solution**:
[How the issue was resolved]

**Files Changed**:
- [file1.ts]
- [file2.tsx]

**Related Issues**: #[related issue numbers]
```

---

## Active Issues

*No active issues at project start.*

---

## Resolved Issues

*No resolved issues at project start.*

---

## Known Limitations

### V1 Limitations
1. **Single workspace per user**: V1 does not support multiple workspaces per user account
2. **Manual connector refresh**: Connectors must be manually triggered for sync (no real-time webhooks yet)
3. **Limited query patterns**: NLQ supports predefined query patterns, not arbitrary SQL

---

## Common Errors Reference

### Supabase Auth Errors
| Error Code | Description | Solution |
|------------|-------------|----------|
| `auth/invalid-email` | Invalid email format | Validate email format client-side |
| `auth/user-not-found` | User doesn't exist | Show appropriate error message |
| `auth/wrong-password` | Incorrect password | Show generic auth error |

### Database Errors
| Error | Description | Solution |
|-------|-------------|----------|
| `23505` | Unique constraint violation | Check for existing record before insert |
| `23503` | Foreign key violation | Ensure parent record exists |

### API Errors
| Status | Description | Solution |
|--------|-------------|----------|
| `401` | Unauthorized | Redirect to login |
| `403` | Forbidden | Check permissions |
| `429` | Rate limited | Implement retry with backoff |

---

## Error Handling Patterns

### Client-Side Errors
```typescript
try {
  const result = await apiCall();
} catch (error) {
  if (error instanceof AuthError) {
    // Handle auth error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  } else {
    // Log and show generic error
    console.error('Unexpected error:', error);
    toast.error('Something went wrong. Please try again.');
  }
}
```

### API Route Errors
```typescript
export async function POST(request: Request) {
  try {
    // Handle request
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Debugging Checklist

When encountering a bug:

1. [ ] Check this document for known issues
2. [ ] Review error message and stack trace
3. [ ] Check browser console for client errors
4. [ ] Check server logs for API errors
5. [ ] Verify environment variables are set
6. [ ] Check database connection
7. [ ] Test in isolation if possible
8. [ ] Document findings in this file

