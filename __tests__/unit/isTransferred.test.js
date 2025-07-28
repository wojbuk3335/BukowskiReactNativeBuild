// __tests__/unit/isTransferred.test.js

// Wyodrębniona funkcja do testów (skopiowana z writeoff.jsx)
function isTransferred(item, transfers) {
  if (!Array.isArray(transfers)) return false;
  return transfers.some((t) => t.productId === item.id);
}

describe('isTransferred', () => {
  it('returns false if transfers is not an array', () => {
    expect(isTransferred({ id: '1' }, null)).toBe(false);
    expect(isTransferred({ id: '1' }, undefined)).toBe(false);
  });

  it('returns false if no transfer for item', () => {
    const transfers = [
      { productId: '2', transfer_to: 'SOLD' },
      { productId: '3', transfer_to: 'DOM' },
    ];
    expect(isTransferred({ id: '1' }, transfers)).toBe(false);
  });

  it('returns true if transfer exists for item (SOLD)', () => {
    const transfers = [
      { productId: '1', transfer_to: 'SOLD' },
      { productId: '2', transfer_to: 'DOM' },
    ];
    expect(isTransferred({ id: '1' }, transfers)).toBe(true);
  });

  it('returns true if transfer exists for item (other type)', () => {
    const transfers = [
      { productId: '1', transfer_to: 'DOM' },
      { productId: '2', transfer_to: 'SOLD' },
    ];
    expect(isTransferred({ id: '1' }, transfers)).toBe(true);
  });
});
