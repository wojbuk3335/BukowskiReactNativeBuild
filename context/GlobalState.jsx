import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router"; // Import router
import React, { createContext, useState } from "react";
import { getApiUrl, API_CONFIG } from "../config/api"; // Import API config
import tokenService from "../services/tokenService"; // Import token service
import AuthErrorHandler from "../utils/authErrorHandler"; // Import auth error handler

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
    const [bags, setBags] = useState([]); // Global state for bags
    const [wallets, setWallets] = useState([]); // Global state for wallets
    const [matchedItems, setMatchedItems] = useState([]); // Lista dopasowanych elementów
    const [transferredJackets, setTransferredJackets] = useState([]); // Initialize transferred jackets

    // Helper function for fetch with timeout and authentication
    const fetchWithTimeout = async (url, timeout = 10000) => {
        // Skip fetch during logout
        if (tokenService.isLoggingOut) {
            throw new Error('Request cancelled: logout in progress');
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            // Use tokenService for authenticated requests
            const response = await tokenService.authenticatedFetch(url, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            // Check if response indicates auth error
            if (response && (response.status === 401 || response.status === 403)) {
                if (!tokenService.isLoggingOut) {
                    await AuthErrorHandler.handleResponseError(response, 'Global State Fetch');
                }
                throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - no response from server after 10 seconds');
            }
            
            // Handle auth errors with automatic redirect (but not during logout)
            if (!tokenService.isLoggingOut) {
                const wasHandled = await AuthErrorHandler.handleFetchError(error, 'Global State Fetch');
                if (wasHandled) {
                    // Auth error was handled, still throw to let caller know request failed
                    throw new Error('Authentication error - redirected to login');
                }
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
            const response = await fetchWithTimeout(getApiUrl("/state"));
            
            if (!response || !response.ok) {
                setStateData([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Handle both cases: direct array or object with state_data property
            let stateArray;
            if (Array.isArray(data)) {
                // API returns direct array
                stateArray = data;
            } else if (data?.state_data && Array.isArray(data.state_data)) {
                // API returns object with state_data array
                stateArray = data.state_data;
            } else {
                // Fallback to empty array
                stateArray = [];
            }
            
            setStateData(stateArray); // Set the array into state
            return stateArray; // Return fetched state as array
        } catch (error) {
            setStateData([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchSizes = async () => {
        try {
            const response = await fetchWithTimeout(getApiUrl("/excel/size/get-all-sizes"));
            
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
            const response = await fetchWithTimeout(getApiUrl("/excel/color/get-all-colors"));
            
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
            const response = await fetchWithTimeout(getApiUrl("/excel/goods/get-all-goods"));
            
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
            const response = await fetchWithTimeout(getApiUrl("/user"));
            
            if (!response || !response.ok) {
                setUsers([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract users array from the response object
            // API może zwracać { users: [...] } lub bezpośrednio [...]
            let usersArray;
            if (Array.isArray(data)) {
                usersArray = data; // API zwraca bezpośrednio tablicę
            } else if (Array.isArray(data?.users)) {
                usersArray = data.users; // API zwraca { users: [...] }
            } else {
                usersArray = []; // Fallback do pustej tablicy
            }
            
            setUsers(usersArray); // Set the fetched users into state
            return usersArray; // Return fetched users as array
        } catch (error) {
            setUsers([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchBags = async () => {
        try {
            const response = await fetchWithTimeout(getApiUrl("/excel/bags/get-all-bags"));
            
            if (!response || !response.ok) {
                setBags([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract bags array from the response object
            const bagsArray = Array.isArray(data?.bags) ? data.bags : [];
            setBags(bagsArray); // Set the fetched bags into state
            return bagsArray; // Return fetched bags as array
        } catch (error) {
            setBags([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const fetchWallets = async () => {
        try {
            const response = await fetchWithTimeout(getApiUrl("/excel/wallets/get-all-wallets"));
            
            if (!response || !response.ok) {
                setWallets([]); // Set fallback immediately
                return []; // Return empty array instead of throwing
            }
            const data = await response.json();
            
            // Extract wallets array from the response object
            const walletsArray = Array.isArray(data?.wallets) ? data.wallets : [];
            setWallets(walletsArray); // Set the fetched wallets into state
            return walletsArray; // Return fetched wallets as array
        } catch (error) {
            setWallets([]); // Fallback to an empty array in case of error
            return []; // Return empty array instead of throwing
        }
    };

    const bukowski_login = async (email, password, navigation, isAdminPanel = false) => {
        setIsLoading(true); // Set loading to true
        try {
            // Use different endpoint based on panel selection
            const endpoint = isAdminPanel ? "/user/admin-login" : "/user/login";
            
            const response = await fetch(getApiUrl(endpoint), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || "Login failed");
                } catch (parseError) {
                    throw new Error(`Login failed with status ${response.status}: ${response.statusText}`);
                }
            }

            const data = await response.json();
            
            // Store tokens using tokenService
            if (data.token || data.accessToken) {
                const accessToken = data.accessToken || data.token;
                const refreshToken = data.refreshToken;
                
                await tokenService.setTokens(accessToken, refreshToken);
            }
            
            // Wait a bit to ensure AsyncStorage write is completed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            setUser(data); // Update user state
            setIsLoggedIn(true); // Set login status to true
            await AsyncStorage.setItem("user", JSON.stringify(data)); // Save user data locally

            return data; // Return user data
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false); // Set loading to false
        }
    };

    const fetchStock = async () => {
        try {
            const response = await fetchWithTimeout(getApiUrl("/excel/stock/get-all-stocks"));
            
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
            // Set logout flag to prevent new requests
            tokenService.isLoggingOut = true;
            
            // Stop auto-logout monitoring first
            tokenService.stopAutoLogoutMonitoring();
            
            // Clear tokens using tokenService
            await tokenService.logout({ suppressFlagReset: true });
            
            setUser(null); // Clear user state
            setIsLoggedIn(false); // Set login status to false
            setStateData(null); // Clear state data
            setSizes([]); // Clear sizes
            setColors([]); // Clear colors
            setGoods([]); // Clear goods
            setStocks([]); // Clear stocks
            setUsers([]); // Clear users
            setBags([]); // Clear bags
            setWallets([]); // Clear wallets
            setMatchedItems([]); // Clear matched items
            setTransferredJackets([]); // Clear transferred jackets
            
            // Small delay to let pending requests fail quietly
            await new Promise(resolve => setTimeout(resolve, 200));
            
            await AsyncStorage.clear(); // Clear all AsyncStorage data
            router.replace("/"); // Redirect to the root route
        } catch (error) {
            // Silently handle logout errors
        } finally {
            // Reset logout flag after a delay to let everything settle
            setTimeout(() => {
                tokenService.isLoggingOut = false;
            }, 500);
        }
    };

    // Funkcja do filtrowania punktów sprzedaży na podstawie lokalizacji zalogowanego użytkownika
    const getFilteredSellingPoints = () => {
        if (!user || !user.location || !users || users.length === 0) {
            return [];
        }

        // Filtruj użytkowników tylko z tej samej lokalizacji co zalogowany użytkownik
        // Wykluczamy admin i magazyn (role: admin, magazyn)
        // Dodajemy rolę "dom" do listy dostępnych użytkowników (niezależnie od lokalizacji)
        const filteredUsers = users.filter(u => {
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

        return filteredUsers;
    };

    // 🧪 AUTO-LOGOUT: Setup automatic logout callback
    React.useEffect(() => {
        // Set up auto-logout callback
        const handleAutoLogout = async () => {
            // Silent logout without alert
            await logout();
        };

        // Register the callback with tokenService
        tokenService.setAutoLogoutCallback(handleAutoLogout);

        // Start monitoring if user is already logged in
        if (isLoggedIn && user) {
            tokenService.startAutoLogoutMonitoring();
        }

        // Cleanup
        return () => {
            tokenService.clearAutoLogoutTimer();
        };
    }, [isLoggedIn, user]);

    React.useEffect(() => {
        // Initialize token service on app start
        const initializeApp = async () => {
            await tokenService.initialize();
        };
        
        initializeApp();
        
        // Nie pobieramy danych przy inicjalizacji - będą pobierane w zakładce Create
        // gdy użytkownik faktycznie ich potrzebuje
    }, []);

    return (
        <GlobalStateContext.Provider value={{
            user,
            isLoggedIn,
            setIsLoggedIn, // Provide setIsLoggedIn
            isLoading,
            stateData,
            sizes, // Provide sizes in the global state
            colors, // Provide colors in the global state
            goods, // Provide goods in the global state
            stocks, // Provide stocks in the global state
            users, // Provide users in the global state
            bags, // Provide bags in the global state
            wallets, // Provide wallets in the global state
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
            fetchBags, // Provide function to fetch bags
            fetchWallets, // Provide function to fetch wallets
            getFilteredSellingPoints, // Provide function to get filtered selling points
        }}>
            {children}
        </GlobalStateContext.Provider>
    );
};
