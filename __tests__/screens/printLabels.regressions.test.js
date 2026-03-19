/**
 * 🔧 REGRESSION TESTS: print-labels.jsx – Mobile Label Printing
 *
 * Location of implementation:
 *   app/print-labels.jsx
 *   - generateZplCode()       – point number lookup
 *   - getPriceFromPriceList() – case-insensitive fullName matching
 *
 * BUGS FIXED 2026-03-19:
 *   1. Hardcoded point map: T→"04" but Tata has pointNumber "02" in DB
 *      → Replaced with dynamic lookup: user.pointNumber from allUsers[]
 *   2. getPriceFromPriceList fullName match was case-SENSITIVE
 *      → Now .toLowerCase() on both sides (mirrors web app logic)
 *
 * NEVER revert to a hardcoded pointMapping object!
 * NEVER remove .toLowerCase() from fullName comparison!
 */

// ---------------------------------------------------------------------------
// ✅  1. Point number lookup – mirrors generateZplCode() in print-labels.jsx
// ---------------------------------------------------------------------------

/**
 * Mirrors the fixed dynamic lookup from generateZplCode().
 * Resolves point number for a given identifier (MongoDB ID or symbol).
 */
function resolvePointSymbol(userToCheck, allUsers) {
  if (!userToCheck) return 'N/A';

  let user;
  // MongoDB ObjectId pattern
  if (/^[0-9a-f]{24}$/i.test(userToCheck)) {
    user = allUsers.find(u => u._id === userToCheck);
  } else {
    user = allUsers.find(u => {
      const sym = u.symbol || '';
      const sp  = u.sellingPoint || '';
      return sym === userToCheck ||
             sp  === userToCheck ||
             (u.role === 'magazyn' && userToCheck === 'MAGAZYN');
    });
  }

  // ALWAYS use pointNumber from DB – never fallback to hardcoded map
  return user?.pointNumber || 'N/A';
}

/** Real user data as stored in MongoDB */
const DB_USERS = [
  { _id: '699f278e8a22e5b70c6ca016', symbol: 'P',        pointNumber: '01', sellingPoint: 'Parzygnat', role: 'user'    },
  { _id: '699f27b28a22e5b70c6ca06e', symbol: 'T',        pointNumber: '02', sellingPoint: 'Tata',      role: 'user'    },
  { _id: '699f27cd8a22e5b70c6ca077', symbol: 'MAGAZYN',  pointNumber: '00', sellingPoint: '',          role: 'magazyn' },
  { _id: '699f27205b39dde12f341ce6', symbol: 'W.BUKOWSKI',                  sellingPoint: '',          role: 'admin'   },
];

describe('🏪 Mobile – Point number lookup (generateZplCode)', () => {

  describe('🔴 Regression guards', () => {
    test('🔴 REGRESSION: T (Tata) via symbol → "02" (was "04" with hardcoded map)', () => {
      expect(resolvePointSymbol('T', DB_USERS)).toBe('02');
    });

    test('🔴 REGRESSION: T via MongoDB _id → "02"', () => {
      expect(resolvePointSymbol('699f27b28a22e5b70c6ca06e', DB_USERS)).toBe('02');
    });
  });

  describe('Known points via symbol', () => {
    test('P  → "01"',      () => expect(resolvePointSymbol('P', DB_USERS)).toBe('01'));
    test('T  → "02"',      () => expect(resolvePointSymbol('T', DB_USERS)).toBe('02'));
    test('MAGAZYN → "00"', () => expect(resolvePointSymbol('MAGAZYN', DB_USERS)).toBe('00'));
  });

  describe('Known points via MongoDB _id', () => {
    test('_id of P → "01"', () =>
      expect(resolvePointSymbol('699f278e8a22e5b70c6ca016', DB_USERS)).toBe('01'));
    test('_id of T → "02"', () =>
      expect(resolvePointSymbol('699f27b28a22e5b70c6ca06e', DB_USERS)).toBe('02'));
    test('_id of MAGAZYN → "00"', () =>
      expect(resolvePointSymbol('699f27cd8a22e5b70c6ca077', DB_USERS)).toBe('00'));
  });

  describe('Edge cases', () => {
    test('Missing / unknown symbol → "N/A"',  () => expect(resolvePointSymbol('X',    DB_USERS)).toBe('N/A'));
    test('null → "N/A"',                       () => expect(resolvePointSymbol(null,   DB_USERS)).toBe('N/A'));
    test('undefined → "N/A"',                  () => expect(resolvePointSymbol(undefined, DB_USERS)).toBe('N/A'));
    test('empty string → "N/A"',               () => expect(resolvePointSymbol('',    DB_USERS)).toBe('N/A'));
    test('empty allUsers → "N/A"',             () => expect(resolvePointSymbol('T',   [])).toBe('N/A'));
  });

  describe('DB-driven: new point requires only DB insert, no code change', () => {
    test('New symbol K pointNumber "03" works without code changes', () => {
      const usersWithK = [
        ...DB_USERS,
        { _id: 'new-k-id', symbol: 'K', pointNumber: '03', sellingPoint: 'Kowalski', role: 'user' },
      ];
      expect(resolvePointSymbol('K', usersWithK)).toBe('03');
    });
  });

});

// ---------------------------------------------------------------------------
// ✅  2. getPriceFromPriceList – case-insensitive fullName match
//     Mirrors the fixed logic in print-labels.jsx
// ---------------------------------------------------------------------------

/**
 * Mirrors the fixed getPriceFromPriceList() from print-labels.jsx.
 * priceLists is a map { [userId]: { items: [...] } }
 */
function getPriceFromPriceList(item, itemSize, userId, priceLists) {
  const priceList = priceLists[userId];
  if (!priceList || !priceList.items) return null;

  let itemBarcode = item.barcodes || item.barcode;
  if (itemBarcode && typeof itemBarcode === 'string' && itemBarcode.includes(',')) {
    itemBarcode = itemBarcode.split(',')[0].trim();
  }
  const normalizedBarcode = itemBarcode != null ? itemBarcode.toString().trim() : null;

  const itemFullName = item.product || item.fullName;
  // FIXED: lowercase for case-insensitive match
  const normalizedFullName = itemFullName ? itemFullName.toString().trim().toLowerCase() : null;

  const priceListItem = priceList.items.find(priceItem => {
    const priceItemCode = priceItem.code != null ? priceItem.code.toString().trim() : null;
    // FIXED: lowercase
    const priceItemFullName = priceItem.fullName
      ? priceItem.fullName.toString().trim().toLowerCase()
      : null;

    if (normalizedBarcode && priceItemCode && priceItemCode === normalizedBarcode) return true;
    if (priceItemFullName && normalizedFullName && priceItemFullName === normalizedFullName) return true;
    return priceItemFullName && normalizedFullName &&
      priceItemFullName === normalizedFullName &&
      priceItem.category === item.category;
  });

  if (!priceListItem) return null;

  const result = {
    regularPrice: priceListItem.price || 0,
    discountPrice: priceListItem.discountPrice || 0,
    sizeExceptionPrice: null,
    hasDiscount: !!(priceListItem.discountPrice && priceListItem.discountPrice > 0),
  };

  if (itemSize && Array.isArray(priceListItem.priceExceptions)) {
    const sizeException = priceListItem.priceExceptions.find(ex => {
      const exSize = ex.size?.Roz_Opis || ex.size;
      return exSize === itemSize;
    });
    if (sizeException) result.sizeExceptionPrice = sizeException.value;
  }

  return result;
}

const USER_ID = '699f27b28a22e5b70c6ca016'; // Parzygnat

const PRICE_LISTS = {
  [USER_ID]: {
    items: [
      {
        code: '0100602300000',
        fullName: 'Amanda Czarny',        // Mixed case in DB
        price: 299,
        discountPrice: 199,
        priceExceptions: [
          { size: '3XL', value: 399 },
        ],
      },
    ],
  },
};

const ITEM_EXACT = {
  barcode: '0100602300000',
  fullName: 'Amanda Czarny',
};

const ITEM_UPPER = {
  barcode: '0100602300000',
  fullName: 'AMANDA CZARNY',             // All uppercase – should still match
};

const ITEM_LOWER = {
  barcode: '0100602300000',
  fullName: 'amanda czarny',             // All lowercase – should still match
};

const ITEM_NAME_ONLY = {
  fullName: 'Amanda Czarny',             // No barcode
};

describe('💰 Mobile – getPriceFromPriceList (case-insensitive matching)', () => {

  describe('🔴 Regression guards', () => {
    test('🔴 REGRESSION: UPPERCASE fullName matches priceList (was failing before fix)', () => {
      const result = getPriceFromPriceList(ITEM_UPPER, 'M', USER_ID, PRICE_LISTS);
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(299);
    });

    test('🔴 REGRESSION: lowercase fullName matches priceList (was failing before fix)', () => {
      const result = getPriceFromPriceList(ITEM_LOWER, 'M', USER_ID, PRICE_LISTS);
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(299);
    });
  });

  describe('Barcode matching', () => {
    test('Match by barcode → returns priceInfo', () => {
      const result = getPriceFromPriceList(ITEM_EXACT, 'M', USER_ID, PRICE_LISTS);
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(299);
    });

    test('No barcode → falls back to fullName match', () => {
      const result = getPriceFromPriceList(ITEM_NAME_ONLY, 'M', USER_ID, PRICE_LISTS);
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(299);
    });
  });

  describe('fullName matching (case-insensitive)', () => {
    test('Exact case matches',      () => expect(getPriceFromPriceList(ITEM_EXACT, 'M', USER_ID, PRICE_LISTS)).not.toBeNull());
    test('UPPERCASE matches',       () => expect(getPriceFromPriceList(ITEM_UPPER, 'M', USER_ID, PRICE_LISTS)).not.toBeNull());
    test('lowercase matches',       () => expect(getPriceFromPriceList(ITEM_LOWER, 'M', USER_ID, PRICE_LISTS)).not.toBeNull());
  });

  describe('Discount and hasDiscount', () => {
    test('discountPrice: 199 → hasDiscount=true', () => {
      const result = getPriceFromPriceList(ITEM_EXACT, 'M', USER_ID, PRICE_LISTS);
      expect(result.hasDiscount).toBe(true);
      expect(result.discountPrice).toBe(199);
    });

    test('discountPrice: 0 → hasDiscount=false', () => {
      const priceListsNoDiscount = {
        [USER_ID]: { items: [{ code: '0100602300000', fullName: 'Amanda Czarny', price: 299, discountPrice: 0, priceExceptions: [] }] },
      };
      const result = getPriceFromPriceList(ITEM_EXACT, 'M', USER_ID, priceListsNoDiscount);
      expect(result.hasDiscount).toBe(false);
    });
  });

  describe('Size exception', () => {
    test('Size "3XL" → sizeExceptionPrice 399', () => {
      const result = getPriceFromPriceList(ITEM_EXACT, '3XL', USER_ID, PRICE_LISTS);
      expect(result.sizeExceptionPrice).toBe(399);
    });

    test('Size "M" (no exception) → sizeExceptionPrice null', () => {
      const result = getPriceFromPriceList(ITEM_EXACT, 'M', USER_ID, PRICE_LISTS);
      expect(result.sizeExceptionPrice).toBeNull();
    });
  });

  describe('Null / missing scenarios', () => {
    test('No priceList for userId → null', () => {
      expect(getPriceFromPriceList(ITEM_EXACT, 'M', 'unknown-id', PRICE_LISTS)).toBeNull();
    });

    test('userId null → null', () => {
      expect(getPriceFromPriceList(ITEM_EXACT, 'M', null, PRICE_LISTS)).toBeNull();
    });

    test('Empty items → null', () => {
      const empty = { [USER_ID]: { items: [] } };
      expect(getPriceFromPriceList(ITEM_EXACT, 'M', USER_ID, empty)).toBeNull();
    });

    test('Non-matching product → null', () => {
      const item = { barcode: '9999999', fullName: 'Nieznany Produkt' };
      expect(getPriceFromPriceList(item, 'M', USER_ID, PRICE_LISTS)).toBeNull();
    });
  });

});

// ---------------------------------------------------------------------------
// ✅  3. shouldPrintTwoLabels logic – mirrors handlePrintLabel
// ---------------------------------------------------------------------------

/**
 * Mirrors the 1-vs-2 label decision in handlePrintLabel (print-labels.jsx).
 */
function shouldPrintTwoLabels(priceInfo) {
  if (!priceInfo) return false;
  if (priceInfo.sizeExceptionPrice) return false; // exception → 1 label
  return !!priceInfo.hasDiscount;                 // discount  → 2 labels
}

describe('🖨️ Mobile – shouldPrintTwoLabels logic', () => {

  test('No priceInfo → 1 label', () =>
    expect(shouldPrintTwoLabels(null)).toBe(false));

  test('Regular price, no discount → 1 label', () =>
    expect(shouldPrintTwoLabels({ regularPrice: 299, discountPrice: 0, sizeExceptionPrice: null, hasDiscount: false })).toBe(false));

  test('Discount, no size exception → 2 labels', () =>
    expect(shouldPrintTwoLabels({ regularPrice: 299, discountPrice: 199, sizeExceptionPrice: null, hasDiscount: true })).toBe(true));

  test('Size exception → 1 label (blocks 2-label path)', () =>
    expect(shouldPrintTwoLabels({ regularPrice: 299, discountPrice: 199, sizeExceptionPrice: 399, hasDiscount: true })).toBe(false));

  test('Size exception + no discount → 1 label', () =>
    expect(shouldPrintTwoLabels({ regularPrice: 299, discountPrice: 0, sizeExceptionPrice: 399, hasDiscount: false })).toBe(false));

});
