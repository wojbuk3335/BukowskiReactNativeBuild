# Tests for Item Graying/Blocking Functionality

This directory contains comprehensive tests for the new item graying and blocking functionality implemented in the WriteOff component.

## Overview

The item blocking system prevents users from performing operations on items that have already been transferred or sold on the same day. Visual graying provides immediate feedback to users about item availability.

## Test Structure

### 1. `ItemBlockingStatus.test.js` - Core Logic Tests
**Focus**: Basic blocking logic with date-based filtering
**Coverage**: 18 tests

Tests the fundamental `getItemBlockStatus` function logic:
- ✅ Transfer blocking (today vs yesterday)
- ✅ Sale blocking (today vs yesterday) 
- ✅ Priority logic (transfer > sale)
- ✅ Edge cases (null/undefined handling)
- ✅ Daily reset functionality
- ✅ Multiple operations same day
- ✅ UI integration properties

### 2. `RealItemBlockingLogic.test.js` - Implementation Tests
**Focus**: Actual WriteOff component implementation
**Coverage**: 18 tests

Tests the real `getItemBlockStatus` function from `writeoff.jsx`:
- ✅ Transfer blocking by exact item ID
- ✅ Sale blocking by barcode + selling point
- ✅ Priority handling (transfer overrides sale)
- ✅ Error handling (malformed data)
- ✅ Multiple sales counting logic
- ✅ User context handling

### 3. `UIGrayingLogic.test.js` - User Interface Tests
**Focus**: Visual graying and user interaction
**Coverage**: 14 tests

Tests UI behavior and styling:
- ✅ Visual state properties (opacity, clickability)
- ✅ User interaction simulation (click blocking)
- ✅ Tooltip and accessibility support
- ✅ CSS/styling properties generation
- ✅ Performance optimization (caching)
- ✅ Large dataset handling

## Key Test Scenarios

### Priority Logic
```javascript
// Transfer takes priority over sale
transfer + sale → Shows "transferred" (not "sold")
no transfer + sale → Shows "sold"
no transfer + no sale → Available
```

### Daily Reset
```javascript
// Operations only block on same day
today_transfer → Blocked
yesterday_transfer → Available (reset)
```

### Visual States
```javascript
// UI graying states
available → opacity: 1.0, clickable: true
blocked → opacity: 0.5, clickable: false, warning icon
```

## Running Tests

```bash
# Run all blocking functionality tests
npm test __tests__/unit/ItemBlockingStatus.test.js __tests__/unit/RealItemBlockingLogic.test.js __tests__/unit/UIGrayingLogic.test.js

# Run individual test suites
npm test __tests__/unit/ItemBlockingStatus.test.js
npm test __tests__/unit/RealItemBlockingLogic.test.js  
npm test __tests__/unit/UIGrayingLogic.test.js
```

## Test Results Summary

- **Total Test Suites**: 3 passed
- **Total Tests**: 50 passed
- **Coverage**: Core logic, real implementation, UI behavior
- **Performance**: All tests complete in <1 second

## Integration with Existing Tests

These tests complement the existing WriteOff test suite:
- `WriteOff.test.new.js` - Component behavior tests
- `WriteOffUserTransfer.test.js` - Integration tests
- Other component and unit tests

## Business Logic Tested

### Transfer Blocking
- Items transferred today cannot be transferred again
- Different items with same barcode can be transferred
- Transfer operations reset at midnight

### Sale Blocking  
- Items sold from same selling point are blocked
- Different selling points don't affect each other
- Sales count towards stock availability

### Priority System
- Transfers always take priority over sales
- UI shows transfer reason when both exist
- Validation checks transfers first, then sales

### Daily Reset
- All blocking resets at midnight
- Previous day operations don't affect current day
- Fresh start every day for all operations

## Visual Graying Features Tested

### User Experience
- Clear visual feedback (grayed out items)
- Tooltip explanations for blocking reasons
- Click prevention on blocked items
- Accessibility support for screen readers

### Performance
- Efficient processing of large item lists
- Caching mechanisms for repeated calculations
- Quick response times for UI updates

## Error Handling

Tests cover various error scenarios:
- Missing or null data
- Malformed API responses
- Network failures
- Invalid date formats
- Missing user context

## Future Enhancements

The test suite is designed to be extensible for:
- Additional blocking reasons
- Complex business rules
- Enhanced UI animations
- Advanced accessibility features
- Performance optimizations

---

**Created**: September 2025  
**Context**: Product blocking logic fix for transfer vs sale priority  
**Author**: Development Team  
**Status**: ✅ All tests passing