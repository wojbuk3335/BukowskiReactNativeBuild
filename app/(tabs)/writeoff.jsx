import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GlobalStateContext } from "../../context/GlobalState";

const WriteOff = () => {
    const { user, stateData } = React.useContext(GlobalStateContext);
    const [modalVisible, setModalVisible] = useState(false);
    const [transferModalVisible, setTransferModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [users, setUsers] = useState([]); // List of users for transfer
    const [transfers, setTransfers] = useState([]); // List of current transfers

    // Ensure stateData and user are not null
    const filteredData = stateData?.filter(item => item.symbol === user?.symbol) || []; // Fallback to empty array

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    useFocusEffect(
        React.useCallback(() => {
            if (user?.symbol) { // Ensure user exists before fetching transfers
                fetchTransfers(); // Only fetch transfers if user exists
            }
        }, [stateData, user])
    );

const fetchTransfers = async () => {
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
        console.error("Error fetching transfers:", error.message);
        setTransfers([]);
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

    const fetchUsers = async () => {
        try {
            const response = await fetch("http://192.168.1.32:3000/api/user"); // Fetch all users
            const data = await response.json();
            setUsers(
                data.users.filter(
                    (u) => u.symbol !== user.symbol && u.role !== "admin" // Exclude current user and admin
                )
            );
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const initiateTransfer = async (toSymbol) => {
        if (!selectedItem) {
            Alert.alert("Error", "No item selected for transfer.");
            return;
        }

        const transferModel = {
            fullName: selectedItem.fullName,
            size: selectedItem.size,
            date: new Date().toISOString(),
            transfer_from: user.symbol,
            transfer_to: toSymbol,
            productId: selectedItem.id,
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

            fetchTransfers();
            setTransferModalVisible(false);
        } catch (error) {
            console.error("Error creating transfer:", error);
            Alert.alert("Error", "An unexpected error occurred while creating the transfer.");
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

            fetchTransfers();
            closeModal();
        } catch (error) {
            console.error("Error deleting transfer:", error);
            Alert.alert("Error", "An unexpected error occurred while deleting the transfer.");
        }
    };

    // Only treat as transferred if transfer for this item exists and is from today
    const isTransferred = (item) => {
        return Array.isArray(transfers) && transfers.some((t) => t.productId === item.id);
    };

    return (
        <View style={styles.container}>
            <FlatList
                ListHeaderComponent={
                    <Text style={styles.headerText}>
                        Stan użytkownika: {user?.email || "Nieznany użytkownik"}
                    </Text>
                }
                contentContainerStyle={{ paddingHorizontal: 0 }}
                data={filteredData}
                keyExtractor={(item) => item.id}
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
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <View
                        style={{
                            width: "75%",
                            borderRadius: 10,
                            backgroundColor: "black",
                            borderWidth: 1,
                            borderColor: "white",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 5,
                        }}
                    >
                        <View
                            style={{
                                padding: 16,
                                borderTopLeftRadius: 10,
                                borderTopRightRadius: 10,
                                backgroundColor: "black",
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: "bold", color: "white", textAlign: "center" }}>Opcje</Text>
                        </View>
                        <View style={{ padding: 24 }}>
                            {selectedItem && isTransferred(selectedItem) ? (
                                <Pressable
                                    onPress={cancelTransfer}
                                    style={{
                                        backgroundColor: "#dc3545",
                                        paddingVertical: 10,
                                        paddingHorizontal: 20,
                                        borderRadius: 5,
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Anuluj przepisanie</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    onPress={() => {
                                        setModalVisible(false);
                                        setTransferModalVisible(true);
                                    }}
                                    style={{
                                        backgroundColor: "#0d6efd",
                                        paddingVertical: 10,
                                        paddingHorizontal: 20,
                                        borderRadius: 5,
                                        marginBottom: 10,
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Przepisz do</Text>
                                </Pressable>
                            )}
                            <Pressable
                                onPress={closeModal}
                                style={{
                                    backgroundColor: "#6c757d",
                                    paddingVertical: 10,
                                    paddingHorizontal: 20,
                                    borderRadius: 5,
                                }}
                            >
                                <Text style={{ color: "white", fontWeight: "bold", textAlign: "center" }}>Anuluj</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={transferModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setTransferModalVisible(false)}
            >
                <View style={styles.currencyModalContainer}>
                    <View style={styles.currencyModalContent}>
                        <Text style={styles.currencyModalTitle}>Wybierz użytkownika</Text>
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.currencyModalItem}
                                    onPress={() => initiateTransfer(item.symbol)}
                                >
                                    <Text style={styles.currencyModalItemText}>{item.symbol}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <Pressable
                            style={styles.currencyModalCloseButton}
                            onPress={() => setTransferModalVisible(false)}
                        >
                            <Text style={styles.currencyModalCloseButtonText}>Zamknij</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
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
        padding: 5,
        borderRadius: 5,
        width: "100%",
        marginVertical: 5,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemText: {
        color: "white",
        fontSize: 13, // Standardized font size
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
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
        width: "80%",
        alignItems: "center",
    },
    modalText: {
        fontSize: 18,
        marginBottom: 10,
    },
    userItem: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: "#0d6efd",
        borderRadius: 5,
        marginBottom: 10,
        alignItems: "center",
    },
    userItemText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    closeButton: {
        marginTop: 15,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: "#6c757d",
        borderRadius: 5,
        alignItems: "center",
    },
    closeButtonText: {
        color: "white",
        fontSize: 16,
    },
    currencyModalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
    },
    currencyModalContent: {
        width: "80%",
        backgroundColor: "black",
        borderRadius: 10,
        padding: 20,
        alignItems: "center",
    },
    currencyModalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "white",
        marginBottom: 15,
    },
    currencyModalItem: {
        paddingVertical: 5, // Reduce vertical padding for shorter height
        paddingHorizontal: 30, // Increase horizontal padding for wider items
        marginVertical: 5, // Add vertical margin between items
        borderBottomWidth: 1,
        borderBottomColor: "gray",
        width: 100, // Set the width to 100px
        alignItems: "center",
        backgroundColor: "rgb(13, 110, 253)", // Set background color to blue
    },
    currencyModalItemText: {
        color: "white",
        fontSize: 16,
    },
    currencyModalCloseButton: {
        marginTop: 15,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: "red",
        borderRadius: 5,
        alignItems: "center",
    },
    currencyModalCloseButtonText: {
        color: "white",
        fontSize: 16,
    },
});

export default WriteOff;