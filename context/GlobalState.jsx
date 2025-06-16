import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router"; // Import router
import React, { createContext, useState } from "react";

export const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Global state for user
    const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status
    const [isLoading, setIsLoading] = useState(false); // State to track loading status
    const [stateData, setStateData] = useState(null); // Global state for fetched data
    const [sizes, setSizes] = useState([]); // Global state for sizes
    const [colors, setColors] = useState([]); // Global state for colors
    const [goods, setGoods] = useState([]); // Global state for goods
    const [matchedItems, setMatchedItems] = useState([]); // Lista dopasowanych elementów
    const [transferredJackets, setTransferredJackets] = useState([]); // Initialize transferred jackets

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
            const response = await fetch("https://bukowskiapp.pl/api/state");
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error response data:", errorData); // Log error response data
                throw new Error(errorData.message || "Failed to fetch state");
            }
            const data = await response.json();
            setStateData(data || []); // Ensure stateData is set to an empty array if data is null
            return data; // Return fetched state
        } catch (error) {
            console.error("Error fetching state:", error.message); // Debug log
            setStateData([]); // Fallback to an empty array in case of error
            throw error;
        }
    };

    const fetchSizes = async () => {
        try {
            const response = await fetch("https://bukowskiapp.pl/api/excel/size/get-all-sizes");
            if (!response.ok) {
                throw new Error("Failed to fetch sizes");
            }
            const data = await response.json();
            setSizes(data); // Set the fetched sizes into state
            return data; // Return fetched sizes
        } catch (error) {
            console.error("Error fetching sizes:", error.message);
            throw error;
        }
    };

    const fetchColors = async () => {
        try {
            const response = await fetch("https://bukowskiapp.pl/api/excel/color/get-all-colors");
            if (!response.ok) {
                throw new Error("Failed to fetch colors");
            }
            const data = await response.json();
            setColors(data); // Set the fetched colors into state
            return data; // Return fetched colors
        } catch (error) {
            console.error("Error fetching colors:", error.message);
            throw error;
        }
    };

    const fetchGoods = async () => {
        try {
            const response = await fetch("https://bukowskiapp.pl/api/excel/goods/get-all-goods");
            if (!response.ok) {
                throw new Error("Failed to fetch goods");
            }
            const data = await response.json();
            setGoods(data); // Set the fetched goods into state
            return data; // Return fetched goods
        } catch (error) {
            console.error("Error fetching goods:", error.message);
            throw error;
        }
    };

    const bukowski_login = async (email, password, navigation) => {
        setIsLoading(true); // Set loading to true
        try {
            const response = await fetch("https://bukowskiapp.pl/api/user/login", {
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


            // Fetch additional state after login
            const fetchedState = await fetchState();
            setStateData(fetchedState); // Update global state with fetched data

            return data; // Return user data
        } catch (error) {
            console.error("Login error:", error.message); // Debug log
            throw error;
        } finally {
            setIsLoading(false); // Set loading to false
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
            setMatchedItems([]); // Clear matched items
            setTransferredJackets([]); // Clear transferred jackets
            await AsyncStorage.clear(); // Clear all AsyncStorage data
            router.replace("/"); // Redirect to the root route
        } catch (error) {
            console.error("Error during logout:", error); // Debug log
        }
    };

    React.useEffect(() => {
        fetchState()
            .then((data) => {
            })
            .catch((error) => {
                console.error("Error during state initialization:", error); // Debug log
            });
        fetchSizes(); // Fetch sizes on app initialization
        fetchColors(); // Fetch colors on app initialization
        fetchGoods(); // Fetch goods on app initialization
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
            matchedItems, // Provide matched items in the global state
            transferredJackets, // Provide transferred jackets in the global state
            setUser: updateUser,
            bukowski_login,
            logout, // Ensure logout is included in the context value
            addMatchedItem, // Provide function to add matched items
            setTransferredJackets, // Provide function to update transferred jackets
        }}>
            {children}
        </GlobalStateContext.Provider>
    );
};
