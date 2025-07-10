import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router"; // Import router
import React, { createContext, useState } from "react";

export const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Global state for user
    const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status
    const [isLoading, setIsLoading] = useState(false); // State to track loading status
    const [stateData, setStateData] = useState([]); // Global state for fetched data
    const [sizes, setSizes] = useState([]); // Global state for sizes
    const [colors, setColors] = useState([]); // Global state for colors
    const [goods, setGoods] = useState([]); // Global state for goods
    const [stocks, setStocks] = useState([]); // Global state for stocks
    const [users, setUsers] = useState([]); // Global state for all users
    const [matchedItems, setMatchedItems] = useState([]); // Lista dopasowanych elementów
    const [transferredJackets, setTransferredJackets] = useState([]); // Initialize transferred jackets

    // Helper function for fetch with timeout
    const fetchWithTimeout = async (url, timeout = 10000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - no response from server after 10 seconds');
            }
            throw error;
        }
    };

    const addMatchedItem = (barcode) => {
        if (stateData) {
            const matchedItem = stateData.find(item => item.barcode === barcode);
            if (matchedItem) {
                setMatchedItems(prev => [...prev, matchedItem]);
            }
        }
    };

    const updateUser = (userData) => {
        setUser(userData);
        setIsLoggedIn(!!userData); // Update login status
    };

    const fetchState = async () => {
        try {
            console.log('🌐 Wywołuję API /api/state...');
            const response = await fetchWithTimeout("http://192.168.1.32:3000/api/state");
            
            if (!response || !response.ok) {
                console.log('❌ Response nie OK:', response?.status, response?.statusText);
                setStateData([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            console.log('📦 Raw data z API:', data);
            console.log('📦 Data type:', typeof data);
            console.log('📦 Data is array:', Array.isArray(data));
            
            // API returns object with state_data array
            const stateArray = data?.state_data && Array.isArray(data.state_data) ? data.state_data : [];
            console.log('✅ Processed stateArray:', stateArray);
            console.log('✅ StateArray length:', stateArray.length);
            
            setStateData(stateArray); // Set the array into state
            return stateArray; // Return fetched state as array
        } catch (error) {
            console.log('💥 Error w fetchState:', error.message);
            setStateData([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchSizes = async () => {
        try {
            const response = await fetchWithTimeout("http://192.168.1.32:3000/api/excel/size/get-all-sizes");
            
            if (!response || !response.ok) {
                setSizes([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract sizes array from the response object
            const sizesArray = Array.isArray(data?.sizes) ? data.sizes : [];
            setSizes(sizesArray); // Set the fetched sizes into state
            return sizesArray; // Return fetched sizes as array
        } catch (error) {
            setSizes([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchColors = async () => {
        try {
            const response = await fetchWithTimeout("http://192.168.1.32:3000/api/excel/color/get-all-colors");
            
            if (!response || !response.ok) {
                setColors([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract colors array from the response object
            const colorsArray = Array.isArray(data?.colors) ? data.colors : [];
            setColors(colorsArray); // Set the fetched colors into state
            return colorsArray; // Return fetched colors as array
        } catch (error) {
            setColors([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchGoods = async () => {
        try {
            const response = await fetchWithTimeout("http://192.168.1.32:3000/api/excel/goods/get-all-goods");
            
            if (!response || !response.ok) {
                setGoods([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract goods array from the response object
            const goodsArray = Array.isArray(data?.goods) ? data.goods : [];
            setGoods(goodsArray); // Set the fetched goods into state
            return goodsArray; // Return fetched goods as array
        } catch (error) {
            setGoods([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchUsers = async () => {
        try {
            console.log('🔍 Pobieranie użytkowników z API...');
            const response = await fetchWithTimeout("http://192.168.1.32:3000/api/user");
            
            if (!response || !response.ok) {
                setUsers([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract users array from the response object
            const usersArray = Array.isArray(data?.users) ? data.users : [];
            console.log('👥 Pobrano użytkowników:', usersArray.length);
            setUsers(usersArray); // Set the fetched users into state
            return usersArray; // Return fetched users as array
        } catch (error) {
            console.log('💥 Error w fetchUsers:', error.message);
            setUsers([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const bukowski_login = async (email, password, navigation) => {
        setIsLoading(true); // Set loading to true
        try {
            const response = await fetch("http://192.168.1.32:3000/api/user/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Login failed");
            }

            const data = await response.json();
            setUser(data); // Update user state
            setIsLoggedIn(true); // Set login status to true
            await AsyncStorage.setItem("user", JSON.stringify(data)); // Save user data locally

            return data; // Return user data
        } catch (error) {
            // Don't log the error to console - it will be handled by the UI
            throw error;
        } finally {
            setIsLoading(false); // Set loading to false
        }
    };

    const fetchStock = async () => {
        try {
            const response = await fetchWithTimeout("http://192.168.1.32:3000/api/excel/stock/get-all-stocks");
            
            if (!response || !response.ok) {
                setStocks([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract stocks array from the response object
            const stocksArray = Array.isArray(data?.stocks) ? data.stocks : [];
            setStocks(stocksArray); // Update stocks state
            return stocksArray; // Return fetched stocks as array
        } catch (error) {
            setStocks([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const logout = async () => {
        try {
            setUser(null); // Clear user state
            setIsLoggedIn(false); // Set login status to false
            setStateData(null); // Clear state data
            setSizes([]); // Clear sizes
            setColors([]); // Clear colors
            setGoods([]); // Clear goods
            setStocks([]); // Clear stocks
            setUsers([]); // Clear users
            setMatchedItems([]); // Clear matched items
            setTransferredJackets([]); // Clear transferred jackets
            await AsyncStorage.clear(); // Clear all AsyncStorage data
            router.replace("/"); // Redirect to the root route
        } catch (error) {
            // Silently handle logout errors
        }
    };

    // Funkcja do filtrowania punktów sprzedaży na podstawie lokalizacji zalogowanego użytkownika
    const getFilteredSellingPoints = () => {
        if (!user || !user.location || !users || users.length === 0) {
            console.log('⚠️ Brak danych do filtrowania punktów sprzedaży');
            return [];
        }

        // Filtruj użytkowników tylko z tej samej lokalizacji co zalogowany użytkownik
        // Wykluczamy admin i magazyn (role: admin, magazyn)
        const filteredUsers = users.filter(u => 
            u.location === user.location && 
            u.role !== 'admin' && 
            u.role !== 'magazyn' &&
            u.sellingPoint && 
            u.sellingPoint.trim() !== ''
        );

        console.log(`🏪 Punkty sprzedaży dla lokalizacji "${user.location}":`, 
            filteredUsers.map(u => u.sellingPoint)
        );

        return filteredUsers;
    };

    React.useEffect(() => {
        // Nie pobieramy danych przy inicjalizacji - będą pobierane w zakładce Create
        // gdy użytkownik faktycznie ich potrzebuje
    }, []);

    return (
        <GlobalStateContext.Provider value={{
            user,
            isLoggedIn,
            isLoading,
            stateData,
            sizes, // Provide sizes in the global state
            colors, // Provide colors in the global state
            goods, // Provide goods in the global state
            stocks, // Provide stocks in the global state
            users, // Provide users in the global state
            matchedItems, // Provide matched items in the global state
            transferredJackets, // Provide transferred jackets in the global state
            setUser: updateUser,
            bukowski_login,
            logout, // Ensure logout is included in the context value
            addMatchedItem, // Provide function to add matched items
            setTransferredJackets, // Provide function to update transferred jackets
            fetchState, // Provide function to fetch state data
            fetchStock, // Provide function to fetch stocks
            fetchColors, // Provide function to fetch colors
            fetchSizes, // Provide function to fetch sizes
            fetchGoods, // Provide function to fetch goods
            fetchUsers, // Provide function to fetch users
            getFilteredSellingPoints, // Provide function to get filtered selling points
        }}>
            {children}
        </GlobalStateContext.Provider>
    );
};
