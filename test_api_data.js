// Test do sprawdzenia danych z API
const testApiData = async () => {
    try {
        const response = await fetch('http://192.168.1.32:3000/api/user');
        const data = await response.json();
        
        console.log('=== API Response ===');
        console.log('Full response:', JSON.stringify(data, null, 2));
        
        // Sprawdź strukturę danych
        let users;
        if (Array.isArray(data)) {
            users = data;
        } else if (Array.isArray(data.users)) {
            users = data.users;
        } else {
            console.log('Unknown data structure');
            return;
        }
        
        console.log('=== Users Analysis ===');
        console.log('Total users:', users.length);
        
        // Sprawdź jakie role istnieją
        const roles = [...new Set(users.map(u => u.role))];
        console.log('Available roles:', roles);
        
        // Sprawdź użytkowników z Zakopane
        const zakopaneUsers = users.filter(u => 
            u.location && u.location.trim().toLowerCase().includes('zakopane')
        );
        console.log('Zakopane users:', zakopaneUsers.length);
        zakopaneUsers.forEach(u => {
            console.log(`- ${u.symbol}: ${u.role} (${u.location}) [${u.sellingPoint}]`);
        });
        
        // Sprawdź użytkowników z rolą Dom
        const domUsers = users.filter(u => 
            u.role && u.role.toLowerCase().includes('dom')
        );
        console.log('Dom role users:', domUsers.length);
        domUsers.forEach(u => {
            console.log(`- ${u.symbol}: ${u.role} (${u.location}) [${u.sellingPoint}]`);
        });
        
    } catch (error) {
        console.log('Error:', error.message);
    }
};

// Uruchom test
testApiData();
