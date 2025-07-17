// Mock dla testów jednostkowych - test funkcji filtrowania bez renderowania komponentów
describe('getFilteredSellingPoints - Logic Tests', () => {
  
  // Funkcja do symulacji logiki filtrowania z Global State
  const mockGetFilteredSellingPoints = (user, users) => {
    if (!user || !user.location || !users || users.length === 0) {
      return [];
    }

    // Filtruj użytkowników z tej samej lokalizacji
    // Wykluczamy admin i magazyn, ale WŁĄCZAMY Dom (niezależnie od lokalizacji)
    return users.filter(u => {
      // Zawsze uwzględniaj użytkowników z rolą "dom"
      if (u.role && u.role.toLowerCase() === 'dom') {
        return true;
      }
      
      // Dla pozostałych użytkowników stosuj standardowe filtrowanie
      return u.location && user.location &&
        u.location.trim().toLowerCase() === user.location.trim().toLowerCase() && 
        u.role !== 'admin' && 
        u.role !== 'magazyn' &&
        u.sellingPoint && 
        u.sellingPoint.trim() !== '';
    });
  };

  test('should filter users by location correctly (Zakopane scenario)', () => {
    const user = {
      symbol: 'M',
      email: 'most@wp.pl',
      location: 'Zakopane ',
      sellingPoint: 'Most'
    };
    
    const users = [
      {
        _id: '1',
        email: 'admin@wp.pl',
        role: 'admin',
        symbol: 'Admin',
        sellingPoint: null,
        location: null
      },
      {
        _id: '2',
        email: 'tata@wp.pl',
        role: 'user',
        symbol: 'T',
        sellingPoint: 'Tata',
        location: 'Zakopane'
      },
      {
        _id: '3',
        email: 'krupowki@wp.pl',
        role: 'user',
        symbol: 'K',
        sellingPoint: 'Krupówki',
        location: 'Zakopane '
      },
      {
        _id: '4',
        email: 'most@wp.pl',
        role: 'user',
        symbol: 'M',
        sellingPoint: 'Most',
        location: 'Zakopane '
      },
      {
        _id: '5',
        email: 'parzygnat@wp.pl',
        role: 'user',
        symbol: 'P',
        sellingPoint: 'Parzygnat',
        location: 'Zakopane '
      },
      {
        _id: '6',
        email: 'magazyn@wp.pl',
        role: 'magazyn',
        symbol: 'MAGAZYN',
        sellingPoint: '',
        location: null
      },
      {
        _id: '7',
        email: 'skrzat@wp.pl',
        role: 'user',
        symbol: 'S',
        sellingPoint: 'Skzat',
        location: 'Zakopane '
      },
      {
        _id: '8',
        email: 'karpacz@wp.pl',
        role: 'user',
        symbol: 'Kar',
        sellingPoint: 'Karpacz',
        location: 'Karpacz'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    // Should include users from Zakopane (T, K, M, P, S)
    expect(filteredUsers).toHaveLength(5);
    
    const symbols = filteredUsers.map(u => u.symbol);
    expect(symbols).toEqual(expect.arrayContaining(['T', 'K', 'M', 'P', 'S']));
    
    // Should NOT include admin
    expect(symbols).not.toContain('Admin');
    
    // Should NOT include magazyn
    expect(symbols).not.toContain('MAGAZYN');
    
    // Should NOT include different location
    expect(symbols).not.toContain('Kar');
  });

  test('should handle location matching with trim and case insensitive', () => {
    const user = {
      symbol: 'Test',
      location: 'zakopane', // lowercase, no space
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'T1',
        role: 'user',
        sellingPoint: 'Test1',
        location: 'ZAKOPANE ' // uppercase with space
      },
      {
        _id: '2',
        symbol: 'T2',
        role: 'user', 
        sellingPoint: 'Test2',
        location: ' Zakopane ' // mixed case with spaces
      },
      {
        _id: '3',
        symbol: 'T3',
        role: 'user',
        sellingPoint: 'Test3',
        location: 'Krakow' // different location
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    // Should match first two users despite case and space differences
    expect(filteredUsers).toHaveLength(2);
    expect(filteredUsers.map(u => u.symbol)).toEqual(['T1', 'T2']);
  });

  test('should exclude users without sellingPoint', () => {
    const user = {
      symbol: 'Test',
      location: 'Zakopane',
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'T1',
        role: 'user',
        sellingPoint: '', // Empty
        location: 'Zakopane'
      },
      {
        _id: '2',
        symbol: 'T2',
        role: 'user',
        sellingPoint: null, // Null
        location: 'Zakopane'
      },
      {
        _id: '3',
        symbol: 'T3',
        role: 'user',
        sellingPoint: '   ', // Only spaces
        location: 'Zakopane'
      },
      {
        _id: '4',
        symbol: 'T4',
        role: 'user',
        sellingPoint: 'Valid Point',
        location: 'Zakopane'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    // Should only include user with valid selling point
    expect(filteredUsers).toHaveLength(1);
    expect(filteredUsers[0].symbol).toBe('T4');
  });

  test('should exclude admin role', () => {
    const user = {
      symbol: 'Test',
      location: 'Zakopane',
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'Admin',
        role: 'admin',
        sellingPoint: 'Admin Point',
        location: 'Zakopane'
      },
      {
        _id: '2',
        symbol: 'User',
        role: 'user',
        sellingPoint: 'User Point',
        location: 'Zakopane'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    expect(filteredUsers).toHaveLength(1);
    expect(filteredUsers[0].symbol).toBe('User');
    expect(filteredUsers[0].role).toBe('user');
  });

  test('should exclude magazyn role', () => {
    const user = {
      symbol: 'Test',
      location: 'Zakopane',
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'MAGAZYN',
        role: 'magazyn',
        sellingPoint: 'Magazyn Point',
        location: 'Zakopane'
      },
      {
        _id: '2',
        symbol: 'User',
        role: 'user',
        sellingPoint: 'User Point',
        location: 'Zakopane'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    expect(filteredUsers).toHaveLength(1);
    expect(filteredUsers[0].symbol).toBe('User');
    expect(filteredUsers[0].role).toBe('user');
  });

  test('should return empty array when user has no location', () => {
    const user = {
      symbol: 'Test',
      location: null, // No location
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'User',
        role: 'user',
        sellingPoint: 'User Point',
        location: 'Zakopane'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    expect(filteredUsers).toHaveLength(0);
  });

  test('should return empty array when no users available', () => {
    const user = {
      symbol: 'Test',
      location: 'Zakopane',
    };
    
    const users = []; // No users

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    expect(filteredUsers).toHaveLength(0);
  });

  test('should return empty array when user is not set', () => {
    const user = null; // No user
    
    const users = [
      {
        _id: '1',
        symbol: 'User',
        role: 'user',
        sellingPoint: 'User Point',
        location: 'Zakopane'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    expect(filteredUsers).toHaveLength(0);
  });

  test('should handle real data scenario from API response', () => {
    const user = {
      symbol: 'M',
      email: 'most@wp.pl',
      location: 'Zakopane ',
      sellingPoint: 'Most'
    };
    
    // Simulate exact data from your API response
    const users = [
      {
        "_id": "67ffc5943f7c34de4cfdb8cf",
        "email": "admin@wp.pl",
        "role": "admin",
        "symbol": "Admin",
        "sellingPoint": null,
        "location": null
      },
      {
        "_id": "68079c83bcf41226bb694a3c",
        "email": "tata@wp.pl",
        "role": "user",
        "symbol": "T",
        "sellingPoint": "Tata",
        "location": "Zakopane"
      },
      {
        "_id": "68079cf9bcf41226bb694a4a",
        "email": "krupowki@wp.pl",
        "role": "user",
        "symbol": "K",
        "sellingPoint": "Krupówki",
        "location": "Zakopane "
      },
      {
        "_id": "6808ab28147fef1860200b8d",
        "email": "most@wp.pl",
        "role": "user",
        "symbol": "M",
        "sellingPoint": "Most",
        "location": "Zakopane "
      },
      {
        "_id": "6808b0a8ce400c26f291565d",
        "email": "parzygnat@wp.pl",
        "role": "user",
        "symbol": "P",
        "sellingPoint": "Parzygnat",
        "location": "Zakopane "
      },
      {
        "_id": "6825d5a55a01218d8e14cf43",
        "email": "magazyn@wp.pl",
        "role": "magazyn",
        "symbol": "MAGAZYN",
        "sellingPoint": "",
        "location": null
      },
      {
        "_id": "6825f2335a01218d8e14d27f",
        "email": "skrzat@wp.pl",
        "role": "user",
        "symbol": "S",
        "sellingPoint": "Skzat",
        "location": "Zakopane "
      },
      {
        "_id": "685ef480ab4e1b56e89383fe",
        "email": "karpacz@wp.pl",
        "role": "user",
        "symbol": "Kar",
        "sellingPoint": "Karpacz",
        "location": "Karpacz"
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    // Should return T, K, M, P, S (users from Zakopane location)
    expect(filteredUsers).toHaveLength(5);
    
    const symbols = filteredUsers.map(u => u.symbol).sort();
    expect(symbols).toEqual(['K', 'M', 'P', 'S', 'T']);
    
    // Verify each user
    filteredUsers.forEach(user => {
      expect(user.role).toBe('user');
      expect(user.location.trim().toLowerCase()).toBe('zakopane');
      expect(user.sellingPoint).toBeTruthy();
      expect(user.sellingPoint.trim()).not.toBe('');
    });
  });

  test('should include Dom role users regardless of location', () => {
    const user = {
      symbol: 'M',
      location: 'Zakopane',
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'Admin',
        role: 'admin',
        sellingPoint: 'Admin Point',
        location: 'Zakopane'
      },
      {
        _id: '2',
        symbol: 'User1',
        role: 'user',
        sellingPoint: 'User Point 1',
        location: 'Zakopane'
      },
      {
        _id: '3',
        symbol: 'Dom',
        role: 'dom', // lowercase
        sellingPoint: null, // null sellingPoint
        location: null // null location (different from user)
      },
      {
        _id: '4',
        symbol: 'UserFromKrakow',
        role: 'user',
        sellingPoint: 'Krakow Point',
        location: 'Krakow' // different location
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    // Should include User1 (same location) and Dom (special role), but exclude admin and different location user
    expect(filteredUsers).toHaveLength(2);
    expect(filteredUsers.map(u => u.symbol)).toEqual(['User1', 'Dom']);
    
    // Verify Dom is included despite null location and sellingPoint
    const domUser = filteredUsers.find(u => u.symbol === 'Dom');
    expect(domUser).toBeDefined();
    expect(domUser.role).toBe('dom');
    expect(domUser.location).toBeNull();
    expect(domUser.sellingPoint).toBeNull();
  });

  test('should include Dom role users', () => {
    const user = {
      symbol: 'Test',
      location: 'Zakopane',
    };
    
    const users = [
      {
        _id: '1',
        symbol: 'Admin',
        role: 'admin',
        sellingPoint: 'Admin Point',
        location: 'Zakopane'
      },
      {
        _id: '2',
        symbol: 'MAGAZYN',
        role: 'magazyn',
        sellingPoint: 'Magazyn Point',
        location: 'Zakopane'
      },
      {
        _id: '3',
        symbol: 'Dom1',
        role: 'Dom',
        sellingPoint: 'Dom Point 1',
        location: 'Zakopane'
      },
      {
        _id: '4',
        symbol: 'User',
        role: 'user',
        sellingPoint: 'User Point',
        location: 'Zakopane'
      },
      {
        _id: '5',
        symbol: 'Dom2',
        role: 'Dom',
        sellingPoint: 'Dom Point 2',
        location: 'Zakopane'
      }
    ];

    const filteredUsers = mockGetFilteredSellingPoints(user, users);
    
    // Should include Dom role users and regular users, but exclude admin and magazyn
    expect(filteredUsers).toHaveLength(3);
    expect(filteredUsers.map(u => u.symbol)).toEqual(['Dom1', 'User', 'Dom2']);
    expect(filteredUsers.map(u => u.role)).toEqual(['Dom', 'user', 'Dom']);
    
    // Should NOT include admin and magazyn
    expect(filteredUsers.find(u => u.role === 'admin')).toBeUndefined();
    expect(filteredUsers.find(u => u.role === 'magazyn')).toBeUndefined();
  });
});
