import { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authData, setAuthData] = useState(null);

    const login = (data) => {
        console.log('Login data received in AuthContext:', data); // Debug log
        if (data && data.email) {
            setAuthData(data); // Set authData with the received fields
        } else {
            console.error('Invalid data passed to login:', data); // Debug log
        }
    };

    const logout = () => {
        console.log('Logging out from AuthContext'); // Debug log
        setAuthData(null); // Clear authData
    };

    return (
        <AuthContext.Provider value={{ authData, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;