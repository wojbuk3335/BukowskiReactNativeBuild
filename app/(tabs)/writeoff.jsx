import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GlobalStateContext } from "../../context/GlobalState";

const WriteOff = () => {
    const { 
        user, 
        stateData, 
        users: globalUsers, // Dodaj globalną tablicę użytkowników
        fetchState,
        fetchUsers: fetchUsersFromContext,
        getFilteredSellingPoints
    } = React.useContext(GlobalStateContext);
    
    const [modalVisible, setModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [domReasonModalVisible, setDomReasonModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [users, setUsers] = useState([]); // List of users for transfer
    const [transfers, setTransfers] = useState([]); // List of current transfers
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // Dodano nowy stan dla pull-to-refresh
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [customReason, setCustomReason] = useState(""); // Stan dla niestandardowego powodu
    const [selectedReason, setSelectedReason] = useState(""); // Stan dla wybranego radio button powodu
    const [advanceAmount, setAdvanceAmount] = useState(""); // Stan dla kwoty zaliczki
    const [selectedCurrency, setSelectedCurrency] = useState("PLN"); // Stan dla waluty zaliczki
    const [showCurrencyModal, setShowCurrencyModal] = useState(false); // Modal wyboru waluty
    
    // Animacje dla kropek ładowania
    const dot1Anim = useRef(new Animated.Value(0)).current;
    const dot2Anim = useRef(new Animated.Value(0)).current;
    const dot3Anim = useRef(new Animated.Value(0)).current;
    const spinnerAnim = useRef(new Animated.Value(0)).current;

    // Ensure stateData and user are not null
    const filteredData = stateData?.filter(item => item.symbol === user?.symbol) || []; // Fallback to empty array

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Animacja kropek
    useEffect(() => {
        if (isLoading) {
            const animateDots = () => {
                const createDotAnimation = (animValue, delay) => {
                    return Animated.loop(
                        Animated.sequence([
                            Animated.delay(delay),
                            Animated.timing(animValue, {
                                toValue: 1,
                                duration: 400,
                                useNativeDriver: true,
                            }),
                            Animated.timing(animValue, {
                                toValue: 0,
                                duration: 400,
                                useNativeDriver: true,
                            }),
                        ])
                    );
                };

                Animated.parallel([
                    createDotAnimation(dot1Anim, 0),
                    createDotAnimation(dot2Anim, 200),
                    createDotAnimation(dot3Anim, 400),
                ]).start();
            };

            // Animacja spinnera
            const animateSpinner = () => {
                Animated.loop(
                    Animated.timing(spinnerAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    })
                ).start();
            };

            animateDots();
            animateSpinner();
        } else {
            // Reset animacji gdy loading się skończy
            dot1Anim.setValue(0);
            dot2Anim.setValue(0);
            dot3Anim.setValue(0);
            spinnerAnim.setValue(0);
        }
    }, [isLoading]);

    // Automatyczne filtrowanie użytkowników gdy globalUsers się zaktualizuje
    useEffect(() => {
        if (globalUsers && globalUsers.length > 0) {
            fetchUsersData();
        }
    }, [globalUsers]);

    const fetchAllRequiredData = async (isRefreshAction = false) => {
        // Ustawienie odpowiedniego stanu ładowania
        if (isRefreshAction) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        
        setErrorMessage("");
        setShowErrorModal(false);
        
        // Add a small delay to ensure the loading state renders before starting API calls
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Set up a 10-second timeout for the entire operation
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Timeout - backend nie odpowiada po 10 sekundach'));
            }, 10000);
        });
        
        try {
            // Race between data fetching and timeout
            const dataPromise = Promise.all([
                fetchState(),
                fetchUsersFromContext(), // Użyj funkcji z Global State zamiast lokalnej
                fetchTransfers()
            ]);
            
            await Promise.race([
                dataPromise,
                timeoutPromise
            ]);
            
            // fetchUsersData() będzie wywoływane automatycznie przez useEffect gdy globalUsers się zaktualizuje
            
        } catch (error) {
            if (error.message.includes('Timeout') || error.message.includes('timeout')) {
                setErrorMessage("Backend nie odpowiada. Upłynął limit czasu 10 sekund. Sprawdź połączenie internetowe i spróbuj ponownie.");
            } else {
                setErrorMessage("Nie można pobrać danych z backendu. Sprawdź połączenie internetowe i spróbuj ponownie.");
            }
            
            setShowErrorModal(true);
        } finally {
            if (isRefreshAction) {
                setIsRefreshing(false);
            } else {
                setIsLoading(false);
            }
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchAllRequiredData(false); // false = nie jest to refresh action
            
            return () => {
                // Cleanup when tab unfocused
            };
        }, [])
    );

const fetchTransfers = async () => {
    if (!user?.symbol) return;
    
    try {
        const response = await fetch(`http://192.168.1.32:3000/api/transfer/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch transfers: ${response.status}`);
        }

        const data = await response.json();
        // Only keep transfers for this user and made today
        const filteredTransfers = Array.isArray(data)
            ? data.filter(
                (transfer) =>
                    (transfer.transfer_from === user?.symbol || transfer.transfer_to === user?.symbol) &&
                    transfer.date &&
                    transfer.date.startsWith(today)
            )
            : [];

        setTransfers(filteredTransfers);
    } catch (error) {
        setTransfers([]);
        throw error; // Re-throw to be caught by fetchAllRequiredData
    }
};

    const openModal = (item) => {
        setSelectedItem(item);
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setSelectedItem(null); // Reset selectedItem
    };

    const fetchUsersData = async () => {
        try {
            // Nie pobieramy danych z API - używamy danych z Global State
            // które zostały już zaktualizowane przez fetchUsersFromContext()
            
            if (!globalUsers || globalUsers.length === 0) {
                // Fallback do funkcji z Global State
                const filteredUsers = getFilteredSellingPoints();
                const finalFilteredUsers = filteredUsers.filter(u => u.symbol !== user?.symbol);
                setUsers(finalFilteredUsers);
                return;
            }
            
            // Zastosuj logikę filtrowania
            const filteredUsers = globalUsers.filter(u => {
                // Zawsze uwzględniaj użytkowników z rolą "dom"
                if (u.role && u.role.toLowerCase() === 'dom') {
                    return true;
                }
                
                // Dla pozostałych użytkowników stosuj standardowe filtrowanie
                const userLocation = u.location || u.sellingPoint || null;
                const currentUserLocation = user?.location || user?.sellingPoint || null;
                
                const shouldInclude = userLocation && currentUserLocation &&
                    userLocation.trim().toLowerCase() === currentUserLocation.trim().toLowerCase() && 
                    u.role !== 'admin' && 
                    u.role !== 'magazyn' &&
                    u.sellingPoint && 
                    u.sellingPoint.trim() !== '';
                    
                return shouldInclude;
            });
            
            // Dodatkowo wykluczamy zalogowanego użytkownika
            const finalFilteredUsers = filteredUsers.filter(u => u.symbol !== user?.symbol);
            
            setUsers(finalFilteredUsers);
        } catch (error) {
            throw error; // Re-throw to be caught by fetchAllRequiredData
        }
    };

    const initiateTransfer = async (toSymbol, reason = null, advance = null) => {
        if (!selectedItem) {
            Alert.alert("Error", "No item selected for transfer.");
            return;
        }

        // Sprawdź czy transfer jest do "Dom" i czy nie ma powodu
        if (toSymbol.toLowerCase() === 'dom' || toSymbol.toLowerCase() === 'd') {
            if (!reason) {
                // Pokaż modal wyboru powodu dla transferu do domu
                setTransferModalVisible(false);
                setDomReasonModalVisible(true);
                return;
            }
        }

        const transferModel = {
            fullName: selectedItem.fullName,
            size: selectedItem.size,
            date: new Date().toISOString(),
            transfer_from: user.symbol,
            transfer_to: toSymbol,
            productId: selectedItem.id,
            reason: reason || null,
            // Dostosuj format zaliczki do backendu
            advancePayment: advance ? advance.amount : 0,
            advancePaymentCurrency: advance ? advance.currency : 'PLN',
        };

        try {
            const response = await fetch("http://192.168.1.32:3000/api/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(transferModel),
            });

            const responseData = await response.json();

            if (!response.ok) {
                Alert.alert("Error", responseData.message || "Failed to create transfer.");
                return;
            }

            fetchAllRequiredData(false);
            setTransferModalVisible(false);
            setDomReasonModalVisible(false);
            setCustomReason("");
            setSelectedReason("");
            setAdvanceAmount("");
            setSelectedCurrency("PLN");
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred while creating the transfer.");
        }
    };

    const handleDomReasonSelect = (reason) => {
        if (reason === 'custom') {
            // Nie zamykaj modalu, pozwól użytkownikowi wpisać powód
            return;
        }
        
        setSelectedReason(reason);
    };

    const handleCustomReasonSubmit = () => {
        if (!customReason.trim()) {
            Alert.alert("Error", "Proszę podać powód.");
            return;
        }
        
        setSelectedReason(customReason.trim());
    };

    const handleFinalSubmit = () => {
        if (!selectedReason) {
            Alert.alert("Error", "Proszę wybrać powód.");
            return;
        }

        // Sprawdź czy to custom reason i czy tekst został podany
        if (selectedReason === 'custom' && !customReason.trim()) {
            Alert.alert("Error", "Proszę podać powód.");
            return;
        }

        // Przygotuj dane zaliczki jeśli została wprowadzona
        let advanceData = null;
        if (advanceAmount && parseFloat(advanceAmount) > 0) {
            advanceData = {
                amount: parseFloat(advanceAmount),
                currency: selectedCurrency,
                date: new Date().toISOString()
            };
        }

        // Użyj odpowiedniego powodu
        const finalReason = selectedReason === 'custom' ? customReason.trim() : selectedReason;

        // Znajdź użytkownika Dom
        const domUser = users.find(u => u.role && u.role.toLowerCase() === 'dom');
        if (domUser) {
            initiateTransfer(domUser.symbol, finalReason, advanceData);
        } else {
            Alert.alert("Error", "Nie znaleziono użytkownika Dom.");
        }
    };

    const cancelTransfer = async () => {
        if (!selectedItem) {
            Alert.alert("Error", "No item selected to cancel transfer.");
            return;
        }

        try {
            const transfer = transfers.find(t => t.productId === selectedItem.id);
            if (!transfer) {
                Alert.alert("Error", "No transfer found for this product.");
                return;
            }

            const response = await fetch(`http://192.168.1.32:3000/api/transfer/${transfer.productId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete transfer");
            }

            fetchAllRequiredData(false);
            closeModal();
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred while deleting the transfer.");
        }
    };

    const handleRetry = () => {
        setShowErrorModal(false);
        fetchAllRequiredData(false); // false = nie jest to refresh action
    };

    const handleCloseError = () => {
        setShowErrorModal(false);
    };

    // Only treat as transferred if transfer for this item exists and is from today
    const isTransferred = (item) => {
        return Array.isArray(transfers) && transfers.some((t) => t.productId === item.id);
    };

    return (
        <>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <View style={styles.spinnerContainer}>
                        <Animated.View
                            style={[
                                styles.customSpinner,
                                {
                                    transform: [{
                                        rotate: spinnerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    }],
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.loadingText}>Pobieranie danych z backendu...</Text>
                    <View style={styles.loadingDots}>
                        <Animated.View 
                            style={[
                                styles.dot, 
                                {
                                    opacity: dot1Anim,
                                    transform: [{ 
                                        scale: dot1Anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1.2],
                                        }) 
                                    }],
                                }
                            ]} 
                        />
                        <Animated.View 
                            style={[
                                styles.dot, 
                                {
                                    opacity: dot2Anim,
                                    transform: [{ 
                                        scale: dot2Anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1.2],
                                        }) 
                                    }],
                                }
                            ]} 
                        />
                        <Animated.View 
                            style={[
                                styles.dot, 
                                {
                                    opacity: dot3Anim,
                                    transform: [{ 
                                        scale: dot3Anim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.8, 1.2],
                                        }) 
                                    }],
                                }
                            ]} 
                        />
                    </View>
                </View>
            ) : (
                <View style={styles.container}>
                    <FlatList
                        testID="writeoff-flatlist"
                        ListHeaderComponent={
                            <Text style={styles.headerText}>
                                Stan użytkownika: {user?.email || "Nieznany użytkownik"}
                            </Text>
                        }
                        contentContainerStyle={{ paddingHorizontal: 0 }}
                        data={filteredData}
                        keyExtractor={(item) => item.id}
                        onRefresh={() => fetchAllRequiredData(true)} // true = to jest refresh action
                        refreshing={isRefreshing} // Używamy isRefreshing zamiast isLoading
                        renderItem={({ item, index }) => (
                            <View
                                style={[
                                    styles.itemContainer,
                                    isTransferred(item) && { backgroundColor: "#6c757d" }, // Highlight transferred items
                                    { marginHorizontal: 0 }, // Remove side margins
                                ]}
                            >
                                <Text style={styles.itemText} numberOfLines={1}>
                                    {index + 1}. {item.fullName}   {item.size}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => openModal(item)}
                                    style={styles.menuButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Text style={styles.menuText}>⋮</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                </View>
            )}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Opcje</Text>
                        {selectedItem && isTransferred(selectedItem) ? (
                            <TouchableOpacity
                                style={[styles.optionButton, styles.deleteButton]}
                                onPress={cancelTransfer}
                            >
                                <Text style={styles.optionText}>Anuluj przepisanie</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.optionButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    setTransferModalVisible(true);
                                }}
                            >
                                <Text style={styles.optionText}>Przepisz do</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.optionButton, styles.closeButton]}
                            onPress={closeModal}
                        >
                            <Text style={styles.closeText}>Anuluj</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={transferModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setTransferModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Wybierz użytkownika</Text>
                        {users.map((item) => (
                            <TouchableOpacity
                                key={item._id}
                                style={styles.optionButton}
                                onPress={() => {
                                    if (item.role && item.role.toLowerCase() === 'dom') {
                                        // Dla użytkownika Dom pokaż modal powodów
                                        setTransferModalVisible(false);
                                        setDomReasonModalVisible(true);
                                    } else {
                                        // Dla innych użytkowników normalne przepisywanie
                                        initiateTransfer(item.symbol);
                                    }
                                }}
                            >
                                <Text style={styles.optionText}>{item.symbol}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.optionButton, styles.closeButton]}
                            onPress={() => setTransferModalVisible(false)}
                        >
                            <Text style={styles.closeText}>Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal błędu */}
            <Modal
                visible={showErrorModal}
                transparent
                animationType="slide"
                onRequestClose={handleCloseError}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Błąd połączenia</Text>
                        <Text style={styles.modalMessage}>{errorMessage}</Text>
                        <TouchableOpacity
                            style={styles.optionButton}
                            onPress={handleRetry}
                        >
                            <Text style={styles.optionText}>Spróbuj ponownie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, styles.closeButton]}
                            onPress={handleCloseError}
                        >
                            <Text style={styles.closeText}>Zamknij</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal powodów przepisania do domu */}
            <Modal
                visible={domReasonModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setDomReasonModalVisible(false);
                    setCustomReason("");
                    setSelectedReason("");
                    setAdvanceAmount("");
                    setSelectedCurrency("PLN");
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { width: '85%' }]}>
                        <Text style={styles.modalTitle}>Powód przepisania do domu</Text>
                        
                        {/* Radio buttons dla powodów */}
                        <View style={styles.radioContainer}>
                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => setSelectedReason('skracanie rękawów')}
                            >
                                <View style={styles.radioButton}>
                                    {selectedReason === 'skracanie rękawów' && <View style={styles.radioButtonSelected} />}
                                </View>
                                <Text style={styles.radioText}>Skracanie rękawów</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => setSelectedReason('przeróbka')}
                            >
                                <View style={styles.radioButton}>
                                    {selectedReason === 'przeróbka' && <View style={styles.radioButtonSelected} />}
                                </View>
                                <Text style={styles.radioText}>Przeróbka</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => setSelectedReason('wysyłka')}
                            >
                                <View style={styles.radioButton}>
                                    {selectedReason === 'wysyłka' && <View style={styles.radioButtonSelected} />}
                                </View>
                                <Text style={styles.radioText}>Wysyłka</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={styles.radioOption}
                                onPress={() => {
                                    setSelectedReason('custom');
                                    setCustomReason(''); // Wyczyść poprzedni tekst
                                }}
                            >
                                <View style={styles.radioButton}>
                                    {selectedReason === 'custom' && <View style={styles.radioButtonSelected} />}
                                </View>
                                <Text style={styles.radioText}>Inny powód</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Pole tekstowe dla niestandardowego powodu */}
                        {selectedReason === 'custom' && (
                            <View style={styles.customReasonContainer}>
                                <TextInput
                                    style={styles.customReasonInput}
                                    placeholder="Wpisz powód (max 12 znaków)..."
                                    placeholderTextColor="#999"
                                    value={customReason}
                                    onChangeText={(text) => {
                                        // Ograniczenie do 12 znaków
                                        if (text.length <= 12) {
                                            setCustomReason(text);
                                        }
                                    }}
                                    maxLength={12}
                                    multiline={false}
                                    numberOfLines={1}
                                />
                                <Text style={styles.characterCount}>
                                    {customReason.length}/12
                                </Text>
                            </View>
                        )}
                        
                        {/* Sekcja zaliczki */}
                        <View style={styles.advanceSection}>
                            <Text style={styles.advanceTitle}>Zaliczka (opcjonalnie)</Text>
                            <View style={styles.advanceRow}>
                                <TextInput
                                    style={styles.advanceInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#ccc"
                                    value={advanceAmount}
                                    onChangeText={setAdvanceAmount}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={styles.currencyButton}
                                    onPress={() => setShowCurrencyModal(true)}
                                >
                                    <Text style={styles.currencyButtonText}>{selectedCurrency}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {/* Przyciski akcji */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.optionButton, styles.submitButton, !selectedReason && styles.disabledButton]}
                                onPress={handleFinalSubmit}
                                disabled={!selectedReason}
                            >
                                <Text style={styles.optionText}>Zatwierdź</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.optionButton, styles.closeButton]}
                                onPress={() => {
                                    setDomReasonModalVisible(false);
                                    setCustomReason("");
                                    setSelectedReason("");
                                    setAdvanceAmount("");
                                    setSelectedCurrency("PLN");
                                }}
                            >
                                <Text style={styles.closeText}>Anuluj</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal wyboru waluty */}
            <Modal
                visible={showCurrencyModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCurrencyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Wybierz walutę</Text>
                        {['PLN', 'EUR', 'USD', 'CZK'].map((currency) => (
                            <TouchableOpacity
                                key={currency}
                                style={styles.optionButton}
                                onPress={() => {
                                    setSelectedCurrency(currency);
                                    setShowCurrencyModal(false);
                                }}
                            >
                                <Text style={styles.optionText}>{currency}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.optionButton, styles.closeButton]}
                            onPress={() => setShowCurrencyModal(false)}
                        >
                            <Text style={styles.closeText}>Anuluj</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black', // Ciemne tło
    },
    spinnerContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        width: 80,
        height: 80,
    },
    customSpinner: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderWidth: 3,
        borderColor: 'transparent',
        borderTopColor: '#0066cc',
        borderRightColor: '#0066cc',
        borderRadius: 30,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        color: '#ffffff', // Biały tekst na ciemnym tle
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgb(13, 110, 253)',
        marginHorizontal: 6,
    },
    // Unified modal styles from search.jsx
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'black',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        width: '70%',
        color: '#fff',
        borderWidth: 1,
        borderColor: 'white',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#fff',
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    optionButton: {
        backgroundColor: '#0d6efd',
        padding: 8,
        borderRadius: 8,
        marginVertical: 6,
        width: '90%',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 14,
        color: '#fff',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
    },
    closeButton: {
        backgroundColor: 'red',
    },
    closeText: {
        color: 'white',
        fontSize: 14,
    },
    container: {
        flex: 1,
        backgroundColor: "black",
        paddingHorizontal: 0,
    },
    text: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: "center",
    },
    headerText: {
        color: "white",
        fontSize: 13,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: "center",
        marginTop: 20,
    },
    itemContainer: {
        backgroundColor: "#0d6efd",
        padding: 3, // Zmniejszono z 5 na 3
        borderRadius: 5,
        width: "100%",
        marginVertical: 3, // Zmniejszono z 5 na 3
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemText: {
        color: "white",
        fontSize: 12, // Delikatnie zwiększono z 11 na 12
        fontWeight: "bold", // Standardized font weight
        textAlign: "left",
        flex: 1,
    },
    menuButton: {
        padding: 5,
    },
    menuText: {
        color: "white",
        fontSize: 20, // Increased font size for the three dots
    },
    customReasonContainer: {
        width: '90%',
        marginVertical: 10,
    },
    customReasonInput: {
        backgroundColor: 'black',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: 'white',
        textAlignVertical: 'top',
        marginBottom: 5,
        minHeight: 45,
        borderWidth: 1,
        borderColor: 'white',
    },
    characterCount: {
        color: '#999',
        fontSize: 12,
        textAlign: 'right',
        marginBottom: 10,
    },
    submitButton: {
        backgroundColor: '#28a745',
    },
    disabledButton: {
        backgroundColor: '#6c757d',
        opacity: 0.6,
    },
    radioContainer: {
        width: '100%',
        marginVertical: 15,
    },
    radioOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 10,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#0d6efd',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#0d6efd',
    },
    radioText: {
        color: '#fff',
        fontSize: 16,
        flex: 1,
    },
    advanceSection: {
        width: '100%',
        marginVertical: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
    },
    advanceTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        backgroundColor: 'black',
    },
    advanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    advanceInput: {
        flex: 1,
        backgroundColor: 'black',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: 'white',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'white',
        textAlign: 'center',
    },
    currencyButton: {
        backgroundColor: '#0d6efd',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white',
    },
    currencyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionButtons: {
        width: '100%',
        marginTop: 10,
    },
});

export default WriteOff;