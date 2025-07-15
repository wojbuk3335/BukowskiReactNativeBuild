import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GlobalStateContext } from "../../context/GlobalState";
import QRScanner from "../QRScanner";

export default function Create() {
  const { 
    stateData, 
    user, 
    sizes, 
    colors, 
    goods, 
    stocks,
    users,
    fetchSizes,
    fetchColors,
    fetchGoods,
    fetchStock,
    fetchState,
    fetchUsers,
    getFilteredSellingPoints
  } = React.useContext(GlobalStateContext);
  
  const isFocused = useIsFocused();
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  // Animacje dla kropek ładowania
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const spinnerAnim = useRef(new Animated.Value(0)).current;

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

  const fetchAllRequiredData = async () => {
    // Ensure loading state is set first and give it time to render
    setIsLoading(true);
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
        fetchSizes(),
        fetchColors(), 
        fetchGoods(),
        fetchStock(),
        fetchState(),
        fetchUsers()
      ]);
      
      const [sizesResult, colorsResult, goodsResult, stocksResult, stateResult, usersResult] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]);

      const stateArray = Array.isArray(stateResult) ? stateResult : [];
      const usersArray = Array.isArray(usersResult) ? usersResult : [];
      
      // Sprawdź filtrowane punkty sprzedaży
      const filteredPoints = getFilteredSellingPoints();
      
    } catch (error) {
      
      if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        setErrorMessage("Backend nie odpowiada. Upłynął limit czasu 10 sekund. Sprawdź połączenie internetowe i spróbuj ponownie.");
      } else {
        setErrorMessage("Nie można pobrać danych z backendu. Sprawdź połączenie internetowe i spróbuj ponownie.");
      }
      
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Pobierz dane przy każdym wejściu w zakładkę
  useFocusEffect(
    React.useCallback(() => {
      fetchAllRequiredData();
      
      return () => {
        // Cleanup when tab unfocused
      };
    }, [])
  );

  const handleRetry = () => {
    setShowErrorModal(false);
    fetchAllRequiredData();
  };

  const handleCloseError = () => {
    setShowErrorModal(false);
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
        <QRScanner
          stateData={stateData}
          user={user}
          sizes={sizes}
          colors={colors}
          goods={goods}
          stocks={stocks}
          users={users}
          getFilteredSellingPoints={getFilteredSellingPoints}
          isActive={isFocused}
        />
      )}

      {/* Modal błędu */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseError}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Błąd połączenia</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.retryButton]} 
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.closeButton]} 
                onPress={handleCloseError}
              >
                <Text style={styles.closeButtonText}>Zamknij</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Ciemniejsze tło modala
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'black', // Ciemne tło modala
    margin: 20,
    padding: 24,
    borderRadius: 12,
    minWidth: 300,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff', // Biały tekst tytułu
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#cccccc', // Jasnoszary tekst wiadomości
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#0066cc',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#444444', // Ciemny przycisk
    borderWidth: 1,
    borderColor: '#666',
  },
  closeButtonText: {
    color: '#ffffff', // Biały tekst przycisku
    fontSize: 12,
    fontWeight: '600',
  },
});