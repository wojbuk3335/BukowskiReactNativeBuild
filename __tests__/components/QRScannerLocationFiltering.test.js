import { render, waitFor } from '@testing-library/react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock expo-camera
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: React.forwardRef((props, ref) => {
      const { children, onBarcodeScanned, ...otherProps } = props;
      
      // Add ref methods for testing
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: jest.fn(),
      }));
      
      return React.createElement('View', {
        testID: 'camera-view',
        ...otherProps
      }, children);
    }),
    useCameraPermissions: () => [
      { status: 'granted', granted: true },
      jest.fn(() => Promise.resolve({ status: 'granted' }))
    ],
  };
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock console methods for testing debug output
const originalLog = console.log;
const mockConsoleLog = jest.fn();

describe('QRScanner Location Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    console.log = mockConsoleLog;
    
    // Mock successful API response for sales
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    console.log = originalLog;
  });

  const createMockUsers = () => [
    {
      _id: '1',
      symbol: 'T',
      location: 'Zakopane', // No trailing space
      role: 'seller',
      sellingPoint: 'Point T'
    },
    {
      _id: '2',
      symbol: 'K',
      location: 'Zakopane ', // Trailing space
      role: 'seller',
      sellingPoint: 'Point K'
    },
    {
      _id: '3',
      symbol: 'P',
      location: 'Zakopane ', // Trailing space
      role: 'seller',
      sellingPoint: 'Point P'
    },
    {
      _id: '4',
      symbol: 'M',
      location: 'Zakopane ', // Trailing space
      role: 'seller',
      sellingPoint: 'Point M'
    },
    {
      _id: '5',
      symbol: 'S',
      location: 'Zakopane ', // Trailing space
      role: 'seller',
      sellingPoint: 'Point S'
    },
    {
      _id: '6',
      symbol: 'W',
      location: 'Warszawa',
      role: 'seller',
      sellingPoint: 'Point W'
    }
  ];

  const createMockStateData = () => [
    {
      id: '1',
      symbol: 'T',
      barcode: '0010702300001',
      fullName: 'Ada',
      color: 'CZERWONY',
      size: '2XL'
    },
    {
      id: '2',
      symbol: 'K',
      barcode: '0010702300001',
      fullName: 'Ada',
      color: 'CZERWONY',
      size: '2XL'
    },
    {
      id: '3',
      symbol: 'P',
      barcode: '0010702300001',
      fullName: 'Ada',
      color: 'CZERWONY',
      size: '2XL'
    },
    {
      id: '4',
      symbol: 'M',
      barcode: '1234567890123',
      fullName: 'Different Product',
      color: 'BLUE',
      size: 'M'
    },
    {
      id: '5',
      symbol: 'W',
      barcode: '0010702300001',
      fullName: 'Ada',
      color: 'CZERWONY',
      size: '2XL'
    }
  ];

  const createMockCurrentUser = () => ({
    _id: '1',
    symbol: 'T',
    location: 'Zakopane',
    role: 'seller',
    sellingPoint: 'Point T'
  });

  it('should filter users by location with trim() for space consistency', async () => {
    const mockUsers = createMockUsers();
    const mockStateData = createMockStateData();
    const mockCurrentUser = createMockCurrentUser();

    const mockProps = {
      stateData: mockStateData,
      users: mockUsers,
      user: mockCurrentUser,
      sizes: [],
      colors: [],
      goods: [],
      stocks: [],
      isActive: true
    };

    // Create a mock QRScanner component that exposes the getMatchingSymbols function
    const TestableQRScanner = (props) => {
      const React = require('react');
      
      // Simulate the getMatchingSymbols function from QRScanner
      const getMatchingSymbols = (barcode) => {
        const { stateData, users, user } = props;
        
        // 1. Find matching products by barcode
        const matchingProducts = stateData.filter((item) => item.barcode === barcode);
        
        // 2. Extract symbols from those products
        const matchingSymbols = matchingProducts.map((item) => item.symbol);
        
        // 3. Filter users by same location with trim() for consistency
        const sameLocationUsers = users.filter(u => 
          u.location && user.location && 
          u.location.trim() === user.location.trim() && // Use trim() to handle space differences
          u.role !== 'admin' && 
          u.role !== 'magazyn' &&
          u.sellingPoint && 
          u.sellingPoint.trim() !== ''
        );
        
        // 4. Return only users from same location who have matching products
        const availableSellingPoints = sameLocationUsers.filter(u => 
          matchingSymbols.includes(u.symbol)
        );
        
        return {
          matchingProducts,
          matchingSymbols,
          sameLocationUsers,
          availableSellingPoints
        };
      };

      // Test the function
      React.useEffect(() => {
        const result = getMatchingSymbols('0010702300001');
        
        // Store result for testing
        window.testResult = result;
      }, []);

      return React.createElement('View', { testID: 'test-component' });
    };

    render(<TestableQRScanner {...mockProps} />);

    await waitFor(() => {
      expect(window.testResult).toBeDefined();
    });

    const result = window.testResult;

    // Test 1: Should find matching products for Ada CZERWONY 2XL
    expect(result.matchingProducts).toHaveLength(4); // T, K, P, W have this product
    expect(result.matchingSymbols).toEqual(['T', 'K', 'P', 'W']);

    // Test 2: Should filter users by location with trim() handling spaces
    expect(result.sameLocationUsers).toHaveLength(5); // T, K, P, M, S are all from Zakopane
    expect(result.sameLocationUsers.map(u => u.symbol)).toEqual(['T', 'K', 'P', 'M', 'S']);

    // Test 3: Should return only Zakopane users who have the product
    expect(result.availableSellingPoints).toHaveLength(3); // T, K, P
    expect(result.availableSellingPoints.map(u => u.symbol)).toEqual(['T', 'K', 'P']);

    // Test 4: Should exclude M (no matching product) and W (different location)
    const symbols = result.availableSellingPoints.map(u => u.symbol);
    expect(symbols).not.toContain('M'); // M doesn't have Ada CZERWONY 2XL
    expect(symbols).not.toContain('W'); // W is from Warszawa, not Zakopane

    // Clean up
    delete window.testResult;
  });

  it('should handle location strings without spaces correctly', async () => {
    const mockUsers = [
      {
        _id: '1',
        symbol: 'T',
        location: 'Zakopane', // No space
        role: 'seller',
        sellingPoint: 'Point T'
      },
      {
        _id: '2',
        symbol: 'K',
        location: 'Zakopane', // No space
        role: 'seller',
        sellingPoint: 'Point K'
      }
    ];

    const mockStateData = [
      {
        id: '1',
        symbol: 'T',
        barcode: '0010702300001',
        fullName: 'Ada',
        color: 'CZERWONY',
        size: '2XL'
      },
      {
        id: '2',
        symbol: 'K',
        barcode: '0010702300001',
        fullName: 'Ada',
        color: 'CZERWONY',
        size: '2XL'
      }
    ];

    const mockCurrentUser = {
      _id: '1',
      symbol: 'T',
      location: 'Zakopane',
      role: 'seller',
      sellingPoint: 'Point T'
    };

    const mockProps = {
      stateData: mockStateData,
      users: mockUsers,
      user: mockCurrentUser,
      sizes: [],
      colors: [],
      goods: [],
      stocks: [],
      isActive: true
    };

    const TestableQRScanner = (props) => {
      const React = require('react');
      
      const getMatchingSymbols = (barcode) => {
        const { stateData, users, user } = props;
        
        const matchingProducts = stateData.filter((item) => item.barcode === barcode);
        const matchingSymbols = matchingProducts.map((item) => item.symbol);
        
        const sameLocationUsers = users.filter(u => 
          u.location && user.location && 
          u.location.trim() === user.location.trim() &&
          u.role !== 'admin' && 
          u.role !== 'magazyn' &&
          u.sellingPoint && 
          u.sellingPoint.trim() !== ''
        );
        
        const availableSellingPoints = sameLocationUsers.filter(u => 
          matchingSymbols.includes(u.symbol)
        );
        
        return { sameLocationUsers, availableSellingPoints };
      };

      React.useEffect(() => {
        const result = getMatchingSymbols('0010702300001');
        window.testResult2 = result;
      }, []);

      return React.createElement('View', { testID: 'test-component' });
    };

    render(<TestableQRScanner {...mockProps} />);

    await waitFor(() => {
      expect(window.testResult2).toBeDefined();
    });

    const result = window.testResult2;

    // Should correctly match both users with same location (no spaces)
    expect(result.sameLocationUsers).toHaveLength(2);
    expect(result.availableSellingPoints).toHaveLength(2);
    expect(result.availableSellingPoints.map(u => u.symbol)).toEqual(['T', 'K']);

    delete window.testResult2;
  });

  it('should handle mixed space scenarios correctly', async () => {
    const mockUsers = [
      {
        _id: '1',
        symbol: 'T',
        location: 'Zakopane', // No trailing space
        role: 'seller',
        sellingPoint: 'Point T'
      },
      {
        _id: '2',
        symbol: 'K',
        location: 'Zakopane ', // With trailing space
        role: 'seller',
        sellingPoint: 'Point K'
      },
      {
        _id: '3',
        symbol: 'P',
        location: ' Zakopane', // Leading space
        role: 'seller',
        sellingPoint: 'Point P'
      },
      {
        _id: '4',
        symbol: 'M',
        location: ' Zakopane ', // Both leading and trailing spaces
        role: 'seller',
        sellingPoint: 'Point M'
      }
    ];

    const mockStateData = mockUsers.map((user, index) => ({
      id: `${index + 1}`,
      symbol: user.symbol,
      barcode: '0010702300001',
      fullName: 'Ada',
      color: 'CZERWONY',
      size: '2XL'
    }));

    const mockCurrentUser = {
      _id: '1',
      symbol: 'T',
      location: 'Zakopane', // No spaces
      role: 'seller',
      sellingPoint: 'Point T'
    };

    const mockProps = {
      stateData: mockStateData,
      users: mockUsers,
      user: mockCurrentUser,
      sizes: [],
      colors: [],
      goods: [],
      stocks: [],
      isActive: true
    };

    const TestableQRScanner = (props) => {
      const React = require('react');
      
      const getMatchingSymbols = (barcode) => {
        const { stateData, users, user } = props;
        
        const matchingProducts = stateData.filter((item) => item.barcode === barcode);
        const matchingSymbols = matchingProducts.map((item) => item.symbol);
        
        const sameLocationUsers = users.filter(u => 
          u.location && user.location && 
          u.location.trim() === user.location.trim() &&
          u.role !== 'admin' && 
          u.role !== 'magazyn' &&
          u.sellingPoint && 
          u.sellingPoint.trim() !== ''
        );
        
        const availableSellingPoints = sameLocationUsers.filter(u => 
          matchingSymbols.includes(u.symbol)
        );
        
        return { sameLocationUsers, availableSellingPoints };
      };

      React.useEffect(() => {
        const result = getMatchingSymbols('0010702300001');
        window.testResult3 = result;
      }, []);

      return React.createElement('View', { testID: 'test-component' });
    };

    render(<TestableQRScanner {...mockProps} />);

    await waitFor(() => {
      expect(window.testResult3).toBeDefined();
    });

    const result = window.testResult3;

    // All users should be matched despite different spacing patterns
    expect(result.sameLocationUsers).toHaveLength(4);
    expect(result.availableSellingPoints).toHaveLength(4);
    expect(result.availableSellingPoints.map(u => u.symbol).sort()).toEqual(['K', 'M', 'P', 'T']);

    delete window.testResult3;
  });

  it('should exclude admin and magazyn roles', async () => {
    const mockUsers = [
      {
        _id: '1',
        symbol: 'T',
        location: 'Zakopane',
        role: 'seller',
        sellingPoint: 'Point T'
      },
      {
        _id: '2',
        symbol: 'A',
        location: 'Zakopane',
        role: 'admin', // Should be excluded
        sellingPoint: 'Point A'
      },
      {
        _id: '3',
        symbol: 'M',
        location: 'Zakopane',
        role: 'magazyn', // Should be excluded
        sellingPoint: 'Point M'
      }
    ];

    const mockStateData = [
      {
        id: '1',
        symbol: 'T',
        barcode: '0010702300001',
        fullName: 'Ada',
        color: 'CZERWONY',
        size: '2XL'
      }
    ];

    const mockCurrentUser = {
      _id: '1',
      symbol: 'T',
      location: 'Zakopane',
      role: 'seller',
      sellingPoint: 'Point T'
    };

    const mockProps = {
      stateData: mockStateData,
      users: mockUsers,
      user: mockCurrentUser,
      sizes: [],
      colors: [],
      goods: [],
      stocks: [],
      isActive: true
    };

    const TestableQRScanner = (props) => {
      const React = require('react');
      
      const getMatchingSymbols = (barcode) => {
        const { stateData, users, user } = props;
        
        const matchingProducts = stateData.filter((item) => item.barcode === barcode);
        const matchingSymbols = matchingProducts.map((item) => item.symbol);
        
        const sameLocationUsers = users.filter(u => 
          u.location && user.location && 
          u.location.trim() === user.location.trim() &&
          u.role !== 'admin' && 
          u.role !== 'magazyn' &&
          u.sellingPoint && 
          u.sellingPoint.trim() !== ''
        );
        
        return { sameLocationUsers };
      };

      React.useEffect(() => {
        const result = getMatchingSymbols('0010702300001');
        window.testResult4 = result;
      }, []);

      return React.createElement('View', { testID: 'test-component' });
    };

    render(<TestableQRScanner {...mockProps} />);

    await waitFor(() => {
      expect(window.testResult4).toBeDefined();
    });

    const result = window.testResult4;

    // Should only include seller, exclude admin and magazyn
    expect(result.sameLocationUsers).toHaveLength(1);
    expect(result.sameLocationUsers[0].symbol).toBe('T');
    expect(result.sameLocationUsers[0].role).toBe('seller');

    delete window.testResult4;
  });
});
