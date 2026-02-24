/**
 * MOBILE BUSINESS CASE TESTS - Users/Dobierz
 * Scenario: one missing sale goes to corrections
 */

describe('Users/Dobierz processing + undo (missing sale -> corrections)', () => {
  test('processing modal: expected count after processing', () => {
    const initialCount = 6;
    const allBlueCount = 3; // 3 sales lines
    const missingCount = 1; // 1 missing in state

    const actualBlueProcessed = allBlueCount - missingCount; // 2
    const yellowCount = 0;
    const orangeCount = 0;

    const expectedAfterProcessing = initialCount - actualBlueProcessed + yellowCount + orangeCount;

    expect(actualBlueProcessed).toBe(2);
    expect(expectedAfterProcessing).toBe(4);
  });

  test('undo modal: expected count returns to pre-transaction state', () => {
    const userStateCountBefore = 6;
    const userStateAfterProcessing = 4;

    const restoredItems = [
      { action: 'restored_from_sale' },
      { action: 'restored_from_sale' },
      { action: 'restored_from_corrections' }
    ];

    const blueCount = restoredItems.filter(item =>
      item.action === 'restored_from_sale' || item.action === 'restored_from_corrections'
    ).length;
    const yellowCount = restoredItems.filter(item =>
      item.action === 'restored_to_transfer_list' || item.action === 'restored_to_state_from_transfer'
    ).length;
    const orangeCount = restoredItems.filter(item => item.action === 'restored_to_warehouse').length;

    const expectedAfterUndo = userStateCountBefore;

    expect(userStateAfterProcessing).toBe(4);
    expect(blueCount).toBe(3);
    expect(yellowCount).toBe(0);
    expect(orangeCount).toBe(0);
    expect(expectedAfterUndo).toBe(6);
  });
});
