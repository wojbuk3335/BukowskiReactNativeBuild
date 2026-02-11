import React, { useContext, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { GlobalStateContext } from "../../context/GlobalState";
import tokenService from "../../services/tokenService";
import { getApiUrl } from "../../config/api";
import LogoutButton from "../../components/LogoutButton";

const Users = () => {
  const insets = useSafeAreaInsets();
  const { users, fetchUsers } = useContext(GlobalStateContext);
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data from API
  const [blueItems, setBlueItems] = useState([]);
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [controlModalData, setControlModalData] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showUndoConfirmModal, setShowUndoConfirmModal] = useState(false);
  
  // Search
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [greyedWarehouseItems, setGreyedWarehouseItems] = useState(new Set());
  const [unprocessedCount, setUnprocessedCount] = useState(0);
  
  // Yellow transfers (incoming transfers)
  const [yellowTransfers, setYellowTransfers] = useState([]);
  
  // All products cache (for prices)
  const [allProducts, setAllProducts] = useState([]);
  
  // Corrections modal
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [correctionsData, setCorrectionsData] = useState(null);
  
  // Print confirmation modal
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [pendingProcessData, setPendingProcessData] = useState(null);
  
  // Print error modal
  const [showPrintErrorModal, setShowPrintErrorModal] = useState(false);
  const [printErrorMessage, setPrintErrorMessage] = useState('');
  const [processingStatusMessage, setProcessingStatusMessage] = useState("");
  const [allProcessed, setAllProcessed] = useState(false);

  const filteredUsers = users.filter((u) => !u.isAdmin);

  // Check processing status for ALL users for selected date
  const checkProcessingStatus = async () => {
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const url = getApiUrl(`/state/processing-status?date=${dateStr}`);
      
      const { accessToken } = await tokenService.getTokens();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnprocessedCount(data.unprocessedCount || 0);
        setAllProcessed(data.allProcessed || false);
        setProcessingStatusMessage(data.message || "");
      }
    } catch (error) {
      console.error("Error checking processing status:", error);
    }
  };

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
    fetchAllProducts(); // Fetch products for price cache
  }, []);

  const fetchAllProducts = async () => {
    try {
      const { accessToken } = await tokenService.getTokens();
      const url = getApiUrl('/excel/goods/get-all-goods');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const products = data.goods || [];
        setAllProducts(products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      const parzygniatUser = users.find(u => 
        u.email?.toLowerCase() === 'parzygnat@wp.pl'
      );
      if (parzygniatUser) {
        setSelectedUserId(parzygniatUser._id);
      }
    }
  }, [users]);

  useEffect(() => {
    if (selectedUserId && selectedDate) {
      fetchItemsToPick();
    }
  }, [selectedUserId, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      checkProcessingStatus();
    }
  }, [selectedDate]);

  // Auto-refresh last transaction every 5 seconds (for cross-app sync)
  useEffect(() => {
    // Initial check
    checkLastTransaction();
    
    // Set up interval for periodic checks
    const interval = setInterval(() => {
      checkLastTransaction();
    }, 5000); // Check every 5 seconds
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [selectedUserId, selectedDate]);

  const checkLastTransaction = async () => {
    try {
      const { accessToken } = await tokenService.getTokens();
      if (!accessToken) {
        console.log('No access token available for checkLastTransaction');
        return;
      }
      
      const url = getApiUrl('/transfer/last-transaction');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLastTransaction(data.canUndo ? data : null);
      } else if (response.status === 404) {
        setLastTransaction(null);
      } else {
        setLastTransaction(null);
      }
    } catch (error) {
      console.error('Error checking last transaction:', error);
      setLastTransaction(null);
    }
  };

  const fetchItemsToPick = async () => {
    if (!selectedUserId) return;

    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const { accessToken } = await tokenService.getTokens();
      
      // Get selected user data
      const selectedUserData = users.find(u => u._id === selectedUserId);
      if (!selectedUserData) {
        setLoading(false);
        return;
      }
      
      // 1. Fetch ALL transfers from /api/transfer (like web app)
      const transfersUrl = getApiUrl('/transfer');
      const transfersResponse = await fetch(transfersUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      let allTransfers = [];
      if (transfersResponse.ok) {
        allTransfers = await transfersResponse.json();
      }
      
      // 2. Filter BLUE transfers (outgoing from this user, not processed, correct date)
      const blueTransfers = allTransfers.filter(transfer => {
        const transferDate = new Date(transfer.date).toISOString().split('T')[0];
        const isCorrectDate = transferDate === dateStr;
        const isOutgoing = transfer.transfer_from === selectedUserData.symbol && !transfer.fromWarehouse;
        const notProcessed = !transfer.blueProcessed;
        
        return isCorrectDate && isOutgoing && notProcessed;
      });
      
      // 3. Filter YELLOW transfers (incoming to this user, not processed, correct date)
      const yellowTransfers = allTransfers.filter(transfer => {
        const transferDate = new Date(transfer.date).toISOString().split('T')[0];
        const isCorrectDate = transferDate === dateStr;
        const isIncoming = transfer.transfer_to === selectedUserData.symbol && transfer.transfer_from !== 'MAGAZYN';
        const notProcessed = !transfer.yellowProcessed;
        
        return isCorrectDate && isIncoming && notProcessed;
      });
      
      // 4. Fetch sales for this user (like web app)
      const salesUrl = getApiUrl('/sales/get-all-sales');
      const salesResponse = await fetch(salesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      let salesItems = [];
      if (salesResponse.ok) {
        const allSales = await salesResponse.json();
        // Filter unprocessed sales for this date and user
        salesItems = allSales.filter(sale => {
          const saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
          const isCorrectDate = saleDate === dateStr;
          const isFromUser = sale.from === selectedUserData.symbol;
          const notProcessed = !sale.processed;
          return isCorrectDate && isFromUser && notProcessed;
        });
      }
      
      // 5. Prepare blue items array (transfers + sales, like web app)
      const blueItemsArray = [
        ...blueTransfers.map(transfer => ({
          ...transfer, // Include ALL fields from backend (productId, transfer_from, transfer_to, etc.)
          type: 'transfer',
          fullName: typeof transfer.fullName === 'object' ? transfer.fullName.fullName : transfer.fullName,
          size: typeof transfer.size === 'object' ? transfer.size.Roz_Opis : transfer.size,
          barcode: transfer.barcode || '',
          sourceId: transfer._id,
          _id: transfer._id
        })),
        ...salesItems.map(sale => ({
          ...sale, // Include ALL fields from backend
          type: 'sale',
          fullName: sale.fullName,
          size: sale.size,
          barcode: sale.barcode,
          sourceId: sale._id,
          _id: sale._id,
          isFromSale: true
        }))
      ];
      
      // 6. Fetch warehouse items
      const warehouseUrl = getApiUrl('/state/warehouse');
      const warehouseResponse = await fetch(warehouseUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      let warehouseItemsArray = [];
      if (warehouseResponse.ok) {
        const warehouseData = await warehouseResponse.json();
        warehouseItemsArray = warehouseData.map(state => ({
          _id: state._id,
          barcode: state.barcode,
          fullName: typeof state.fullName === 'object' ? state.fullName.fullName : state.fullName,
          size: typeof state.size === 'object' ? state.size.Roz_Opis : state.size,
          price: state.fullName && state.fullName.price ? state.fullName.price : 0,
          discount_price: state.fullName && state.fullName.discount_price ? state.fullName.discount_price : 0,
          date: state.date
        }));
      }
      
      // 7. Auto-match blue and warehouse items (like backend does)
      const matchedPairsArray = [];
      const pairedBlueIndexes = new Set();
      const pairedWarehouseIndexes = new Set();
      
      for (let b = 0; b < blueItemsArray.length; b++) {
        if (pairedBlueIndexes.has(b)) continue;
        
        const blueItem = blueItemsArray[b];
        
        for (let w = 0; w < warehouseItemsArray.length; w++) {
          if (pairedWarehouseIndexes.has(w)) continue;
          
          const warehouseItem = warehouseItemsArray[w];
          
          // Matching logic (same as backend)
          const barcodeMatch = blueItem.barcode === warehouseItem.barcode;
          const nameMatch = blueItem.fullName === warehouseItem.fullName;
          const sizeMatch = blueItem.size === warehouseItem.size;
          
          const isTransferWithoutBarcode = blueItem.type === 'transfer' && 
                                          blueItem.barcode !== warehouseItem.barcode;
          
          const isMatched = isTransferWithoutBarcode 
            ? (nameMatch && sizeMatch) 
            : (barcodeMatch && nameMatch && sizeMatch);
          
          if (isMatched) {
            matchedPairsArray.push({
              blueProduct: {
                type: blueItem.type,
                fullName: blueItem.fullName,
                size: blueItem.size,
                barcode: blueItem.barcode
              },
              warehouseProduct: warehouseItem
            });
            
            pairedBlueIndexes.add(b);
            pairedWarehouseIndexes.add(w);
            break;
          }
        }
      }
      
      // Set all data
      setBlueItems(blueItemsArray);
      setWarehouseItems(warehouseItemsArray);
      setYellowTransfers(yellowTransfers);
      setMatchedPairs(matchedPairsArray);
      setTransfers([]); // Empty array (manual transfers are created by user)
      
      // Clear greyed items on fresh load
      setGreyedWarehouseItems(new Set());
      
      // Auto-synchronize on load - grey matched items
      if (matchedPairsArray.length > 0) {
        handleAutoSync(matchedPairsArray, warehouseItemsArray);
      }
      
      // Check processing status for ALL users for this date
      await checkProcessingStatus();
      
    } catch (error) {
      console.error("Error fetching items to pick:", error);
      Alert.alert("Błąd", "Nie udało się pobrać danych");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItemsToPick();
    setRefreshing(false);
  };

  // Check for missing items in state (like web app)
  const checkForMissingItems = async (itemsToCheck, userSymbol, transactionId = null) => {
    try {
      const { accessToken } = await tokenService.getTokens();
      
      // Fetch all states
      const allStatesUrl = getApiUrl('/state');
      const allStatesResponse = await fetch(allStatesUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      let currentState = await allStatesResponse.json();
      
      const missingItems = [];
      const availableItems = [];
      
      // Check items ONE BY ONE and simulate removal
      itemsToCheck.forEach((item, index) => {
        let sourceSymbol = userSymbol;
        
        // For transfers, check the source point (transfer_from)
        if (item.transfer_from && item.type !== 'sale') {
          sourceSymbol = item.transfer_from;
        }
        
        // Filter state by proper symbol
        const userStateItems = currentState.filter(stateItem => stateItem.symbol === sourceSymbol);
        
        const itemBarcode = item.barcode || item.productId;
        const itemFullName = item.fullName?.fullName || item.fullName;
        const itemSize = item.size?.Roz_Opis || item.size;
        
        // Find matching product in state
        const matchingStateItemIndex = userStateItems.findIndex(stateItem => {
          const stateFullName = stateItem.fullName?.fullName || stateItem.fullName;
          const stateSize = stateItem.size?.Roz_Opis || stateItem.size;
          
          return (stateItem.barcode === itemBarcode || stateItem.id === itemBarcode) &&
                 stateFullName === itemFullName &&
                 stateSize === itemSize;
        });
        
        const foundInState = matchingStateItemIndex !== -1;
        
        if (foundInState) {
          availableItems.push(item);
          
          // SIMULATE REMOVAL: Remove item from state (for next checks)
          const matchingStateItem = userStateItems[matchingStateItemIndex];
          const globalIndex = currentState.findIndex(stateItem => stateItem === matchingStateItem);
          if (globalIndex !== -1) {
            currentState.splice(globalIndex, 1);
          }
        } else {
          const operationType = item.type === 'sale' ? 'SPRZEDAŻY' : 'TRANSFERU';
          const operationDetails = item.type === 'sale'
            ? `sprzedaży za ${item.price || 'N/A'} PLN`
            : `transferu z punktu ${sourceSymbol}`;
          
          const detailedDescription = 
            `🚨 BRAK W STANIE: Element #${index + 1} - Próba odpisania "${itemFullName}" (${itemSize}) ` +
            `z punktu "${sourceSymbol}" w ramach ${operationDetails}. ` +
            `Produkt o kodzie ${itemBarcode} nie został znaleziony w aktualnym stanie punktu. ` +
            `Data wykrycia: ${new Date().toLocaleString('pl-PL')}.`;
          
          missingItems.push({
            fullName: itemFullName,
            size: itemSize,
            barcode: itemBarcode,
            sellingPoint: userSymbol,
            symbol: userSymbol,
            errorType: 'MISSING_IN_STATE',
            attemptedOperation: item.type === 'sale' ? 'SALE' : 'TRANSFER',
            description: detailedDescription,
            originalPrice: item.price,
            discountPrice: item.discount_price,
            transactionId: transactionId,
            elementIndex: index,
            originalData: {
              _id: item.sourceId || item._id,
              fullName: itemFullName,
              size: itemSize,
              barcode: itemBarcode,
              isFromSale: item.type === 'sale',
              price: item.price,
              transfer_from: item.transfer_from,
              transfer_to: item.transfer_to,
              timestamp: item.timestamp,
              date: item.date
            }
          });
        }
      });
      
      // If there are missing items, save them to corrections table
      if (missingItems.length > 0) {
        const correctionsUrl = getApiUrl('/corrections/multiple');
        const correctionsResponse = await fetch(correctionsUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(missingItems)
        });
        
        if (correctionsResponse.ok) {
          // Mark missing transfers as blueProcessed
          for (const missingItem of missingItems) {
            if (missingItem.originalData && missingItem.originalData._id && !missingItem.originalData.isFromSale) {
              try {
                const updateUrl = getApiUrl(`/transfer/${missingItem.originalData._id}`);
                await fetch(updateUrl, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    blueProcessed: true,
                    blueProcessedAt: new Date()
                  })
                });
              } catch (error) {
                console.error(`Error marking transfer as processed:`, error);
              }
            }
            
            // Mark missing sales as processed
            if (missingItem.originalData && missingItem.originalData._id && missingItem.originalData.isFromSale) {
              try {
                const getSaleUrl = getApiUrl(`/sales/${missingItem.originalData._id}`);
                const getSaleResponse = await fetch(getSaleUrl, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`
                  }
                });
                
                if (getSaleResponse.ok) {
                  const currentSaleData = await getSaleResponse.json();
                  const updatedSaleData = {
                    ...currentSaleData,
                    processed: true,
                    processedAt: new Date().toISOString()
                  };
                  
                  delete updatedSaleData._id;
                  delete updatedSaleData.__v;
                  delete updatedSaleData.date;
                  
                  const updateSaleUrl = getApiUrl(`/sales/update-sales/${missingItem.originalData._id}`);
                  await fetch(updateSaleUrl, {
                    method: 'PATCH',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedSaleData)
                  });
                }
              } catch (error) {
                console.error(`Error updating sale:`, error);
              }
            }
          }
          
          // Show corrections modal
          setCorrectionsData({
            title: '⚠️ WYKRYTO BRAKI W STANIE',
            items: missingItems,
            count: missingItems.length,
            success: true
          });
          setShowCorrectionsModal(true);
        } else {
          setCorrectionsData({
            title: '⚠️ WYKRYTO BRAKI - BŁĄD ZAPISU',
            items: missingItems,
            count: missingItems.length,
            success: false
          });
          setShowCorrectionsModal(true);
        }
      }
      
      // Mark available transfers as blueProcessed
      const availableTransfers = availableItems.filter(item => item.type !== 'sale');
      if (availableTransfers.length > 0) {
        for (const transfer of availableTransfers) {
          try {
            const updateUrl = getApiUrl(`/transfer/${transfer.sourceId}`);
            await fetch(updateUrl, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                blueProcessed: true,
                blueProcessedAt: new Date()
              })
            });
          } catch (error) {
            console.error('Error marking available transfer as processed:', error);
          }
        }
      }
      
      return { missingItems, availableItems };
    } catch (error) {
      console.error('Error checking for missing items:', error);
      return { missingItems: [], availableItems: itemsToCheck };
    }
  };

  const handleAutoSync = (pairs, allWarehouseItems) => {
    // Only grey out matched warehouse items (like web app)
    // Do NOT create separate transfer items
    const idsToGrey = [];
    
    pairs.forEach(pair => {
      const warehouseItem = pair.warehouseProduct;
      if (warehouseItem) {
        idsToGrey.push(warehouseItem._id);
      }
    });
    
    // Grey out matched items (don't remove them, don't create transfers)
    if (idsToGrey.length > 0) {
      setGreyedWarehouseItems(prev => new Set([...prev, ...idsToGrey]));
    }
  };

  const handleMoveFromWarehouse = (item) => {
    // Get selected user data
    const selectedUserData = users.find(u => u._id === selectedUserId);
    if (!selectedUserData) {
      Alert.alert("Błąd", "Nie można znaleźć danych użytkownika");
      return;
    }

    // Create new transfer item (orange/pomarańczowy)
    const newTransferItem = {
      _id: item._id,
      id: item._id,
      fullName: item.fullName,
      size: item.size,
      barcode: item.barcode,
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: selectedUserData.symbol,
      price: item.price || 0,
      discount_price: item.discount_price || 0,
      movedAt: new Date().toISOString()
    };

    // Add to transfers list (will show as orange)
    setTransfers(prev => [...prev, newTransferItem]);
    
    // Remove from warehouse items (like web app does)
    setWarehouseItems(prev => prev.filter(w => w._id !== item._id));
  };

  const handleReturnToWarehouse = (item) => {
    // Remove from transfers
    setTransfers(prev => prev.filter(t => t._id !== item._id || !t.fromWarehouse));
    // Add back to warehouse items
    setWarehouseItems(prev => [...prev, item]);
  };

  const handleUnpairMatchedItem = (warehouseItem) => {
    // Find the pair that contains this warehouse item
    const matchedPair = matchedPairs.find(pair => 
      pair && pair.warehouseProduct && pair.warehouseProduct._id === warehouseItem._id
    );
    
    if (!matchedPair) {
      Alert.alert("Błąd", "Nie znaleziono pary dla tego elementu");
      return;
    }
    
    // Remove from greyedWarehouseItems
    setGreyedWarehouseItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(warehouseItem._id); // Remove orange element
      
      // If paired with blue item, remove blue from greyed too
      if (matchedPair.blueProduct) {
        newSet.delete(matchedPair.blueProduct.sourceId);
      }
      
      return newSet;
    });
    
    // Remove from matchedPairs
    setMatchedPairs(prev => prev.filter(pair => 
      pair && pair.warehouseProduct && pair.warehouseProduct._id !== warehouseItem._id
    ));
    
    // Add warehouse item back to warehouseItems list
    setWarehouseItems(prev => {
      const exists = prev.some(item => item._id === warehouseItem._id);
      if (exists) {
        return prev;
      }
      return [...prev, warehouseItem];
    });
  };

  const handleProcessItems = async () => {
    if (transfers.length === 0 && blueItems.length === 0 && yellowTransfers.length === 0) {
      Alert.alert("Informacja", "Brak elementów do przetworzenia");
      return;
    }

    // Step 1: Print labels for orange and yellow items
    const itemsToPrint = [
      ...transfers.filter(t => t.fromWarehouse).map(item => {
        // 🔧 FIX: Enrich transfer items with price
        if (!item.price) {
          const itemFullName = typeof item.fullName === 'string' ? item.fullName : item.fullName?.fullName;
          
          // Try warehouse first (match by barcode OR fullName)
          const matchingWarehouse = warehouseItems.find(w => 
            w.barcode === item.barcode || w.fullName === itemFullName
          );
          if (matchingWarehouse) {
            return { ...item, price: matchingWarehouse.price };
          }
          
          // Try product cache by fullName
          if (itemFullName && allProducts.length > 0) {
            const productByName = allProducts.find(p => p.fullName === itemFullName);
            if (productByName) {
              return { ...item, price: productByName.price };
            }
          }
          
          // Fallback to 0 if nothing found
          return { ...item, price: 0 };
        }
        return item;
      }), // Orange from warehouse
      ...matchedPairs.map(pair => {
        // Orange matched items - enrich with price if missing
        const warehouseItem = pair.warehouseProduct;
        if (!warehouseItem.price) {
          const itemFullName = typeof warehouseItem.fullName === 'string' ? warehouseItem.fullName : warehouseItem.fullName?.fullName;
          
          // Try allProducts by fullName
          if (itemFullName && allProducts.length > 0) {
            const productByName = allProducts.find(p => p.fullName === itemFullName);
            if (productByName) {
              return { ...warehouseItem, price: productByName.price };
            }
          }
          return { ...warehouseItem, price: 0 };
        }
        return warehouseItem;
      }), // Orange matched pairs
      ...yellowTransfers.map(item => {
        // 🔧 FIX: Enrich yellow transfer items with price
        if (!item.price) {
          const itemFullName = typeof item.fullName === 'string' ? item.fullName : item.fullName?.fullName;
          
          // Try warehouse first (match by barcode OR fullName)
          const matchingWarehouse = warehouseItems.find(w => 
            w.barcode === item.barcode || w.fullName === itemFullName
          );
          if (matchingWarehouse) {
            return { ...item, price: matchingWarehouse.price };
          }
          
          // Try product cache by fullName
          if (itemFullName && allProducts.length > 0) {
            const productByName = allProducts.find(p => p.fullName === itemFullName);
            if (productByName) {
              return { ...item, price: productByName.price };
            }
          }
          
          // Fallback to 0 if nothing found
          return { ...item, price: 0 };
        }
        return item;
      }) // Yellow incoming transfers
    ];

    if (itemsToPrint.length > 0) {
      try {
        setProcessing(true);
        
        // Print labels quickly - printer has buffer
        const results = [];
        for (let i = 0; i < itemsToPrint.length; i++) {
          const item = itemsToPrint[i];
          
          try {
            const result = await handlePrintLabel(item);
            results.push(result);
          } catch (error) {
            results.push(false);
          }
        }
        const successCount = results.filter(r => r === true).length;
        const errorCount = results.filter(r => r === false).length;
        
        setProcessing(false);
        
        // Show print confirmation modal
        setPendingProcessData({
          successCount,
          errorCount,
          totalCount: itemsToPrint.length
        });
        setShowPrintConfirmModal(true);
      } catch (error) {
        console.error('Error printing labels:', error);
        setProcessing(false);
        setPrintErrorMessage('Wystąpił błąd podczas drukowania etykiet. Sprawdź połączenie z drukarką.');
        setShowPrintErrorModal(true);
      }
    } else {
      // No items to print, proceed directly
      executeProcessItems();
    }
  };

  const executeProcessItems = async () => {
    setProcessing(true);
    
    try {
      const selectedUserData = users.find(u => u._id === selectedUserId);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const sharedTransactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const userSymbol = selectedUserData?.symbol || selectedUserData?.sellingPoint;
      
      // Get current user state count BEFORE processing (like web app)
      // Fetch ALL states and filter by symbol
      const allStatesUrl = getApiUrl('/state');
      const { accessToken: accessTokenBefore } = await tokenService.getTokens();
      const allStatesResponse = await fetch(allStatesUrl, {
        headers: {
          'Authorization': `Bearer ${accessTokenBefore}`
        }
      });
      const allStatesData = await allStatesResponse.json();
      
      // Filter by user symbol (like web app does)
      const currentUserStateCountBefore = allStatesData.filter(item => 
        item.symbol === userSymbol || 
        (item.sellingPoint && item.sellingPoint.symbol === userSymbol)
      ).length;
      
      // Get warehouse state count BEFORE processing (like web app)
      // Web uses /state/warehouse endpoint which returns ALL warehouse items
      const warehouseUrl = getApiUrl('/state/warehouse');
      const warehouseResponse = await fetch(warehouseUrl, {
        headers: {
          'Authorization': `Bearer ${accessTokenBefore}`
        }
      });
      const warehouseData = await warehouseResponse.json();
      const warehouseBeforeCount = warehouseData.length;
      
      let processedCount = 0;
      let allBlueCount = 0;
      let yellowCount = 0;
      let orangeCount = 0;
      let greenMatchedCount = 0;
      
      // Store initial counts BEFORE processing
      const initialBlueCount = blueItems.length;
      const initialTransfersCount = transfers.length;

      // Step 1: Check for missing items BEFORE processing (like web app)
      const checkResult = await checkForMissingItems(blueItems, userSymbol, sharedTransactionId);
      const availableBlueItems = checkResult.availableItems;
      const missingBlueCount = checkResult.missingItems.length;

      // Step 2: Process BLUE items that ARE available (remove from state)
      for (const blue of availableBlueItems) {
        try {
          // Different endpoints for sales vs transfers
          if (blue.type === 'sale') {
            // Process as sale - use sourceId as _id
            const url = getApiUrl('/transfer/process-sales');
            const { accessToken } = await tokenService.getTokens();
            
            // Get the user symbol from the selected user
            const userSymbol = selectedUserData?.symbol || selectedUserData?.sellingPoint;
            
            const saleItem = {
              _id: blue.sourceId,
              barcode: blue.barcode,
              fullName: blue.fullName,
              size: blue.size,
              from: userSymbol
            };
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                salesItems: [saleItem],
                selectedUser: selectedUserId,
                transactionId: sharedTransactionId
              })
            });
            
            if (response.ok) {
              allBlueCount++;
              processedCount++;
            }
          } else {
            // Process as transfer - use full transfer object from backend (includes productId)
            const url = getApiUrl('/transfer/process-all');
            const { accessToken } = await tokenService.getTokens();
            
            // Use the full blue object from backend which now includes productId, transfer_from, transfer_to
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                transfers: [blue], // Send full object from backend
                selectedDate: dateStr,
                selectedUser: selectedUserId,
                transactionId: sharedTransactionId
              })
            });
            
            if (response.ok) {
              allBlueCount++;
              processedCount++;
            }
          }
        } catch (error) {
          console.error('Error processing blue item:', error);
        }
      }

      // Step 2: Process WAREHOUSE items (add to state)
      const warehouseItemsToProcess = transfers.filter(t => t.fromWarehouse);
      
      if (warehouseItemsToProcess.length > 0) {
        try {
          const url = getApiUrl('/transfer/process-warehouse');
          const { accessToken } = await tokenService.getTokens();
          
          const itemsWithTransferTo = warehouseItemsToProcess.map(item => ({
            ...item,
            transfer_to: selectedUserData?.symbol || selectedUserData?.sellingPoint
          }));
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              warehouseItems: itemsWithTransferTo,
              selectedDate: dateStr,
              selectedUser: selectedUserId,
              transactionId: sharedTransactionId
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            orangeCount = result.processedCount || warehouseItemsToProcess.length;
            processedCount += orangeCount;
          }
        } catch (error) {
          console.error('Error processing warehouse items:', error);
        }
      }

      // Step 3: Process MATCHED warehouse items (auto-matched green/orange items)
      // Like web app lines 1884-1895: ALWAYS add matched items to state
      if (matchedPairs && matchedPairs.length > 0) {
        try {
          const url = getApiUrl('/transfer/process-warehouse');
          const { accessToken } = await tokenService.getTokens();
          
          // Filter out items that are already in manual transfers
          const matchedWarehouseItems = matchedPairs
            .filter(pair => {
              const warehouseItem = pair.warehouseProduct;
              // Don't process if already manually moved
              return !transfers.some(t => t._id === warehouseItem._id && t.fromWarehouse);
            })
            .map(pair => ({
              ...pair.warehouseProduct,
              transfer_to: selectedUserData?.symbol || selectedUserData?.sellingPoint
            }));
          
          if (matchedWarehouseItems.length > 0) {
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                warehouseItems: matchedWarehouseItems,
                selectedDate: dateStr,
                selectedUser: selectedUserId,
                transactionId: sharedTransactionId
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              greenMatchedCount = result.processedCount || matchedWarehouseItems.length;
              processedCount += greenMatchedCount;
            }
          }
        } catch (error) {
          console.error('Error processing matched warehouse items:', error);
        }
      }

      // Step 4: Process YELLOW transfers (incoming transfers from other users)
      if (yellowTransfers && yellowTransfers.length > 0) {
        try {
          const url = getApiUrl('/transfer/process-warehouse');
          const { accessToken } = await tokenService.getTokens();
          
          const yellowItems = yellowTransfers.map(transfer => ({
            ...transfer,
            transfer_to: selectedUserData?.symbol || selectedUserData?.sellingPoint
          }));
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              warehouseItems: yellowItems,
              selectedDate: dateStr,
              selectedUser: selectedUserId,
              transactionId: sharedTransactionId,
              isIncomingTransfer: true
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            yellowCount = result.processedCount || yellowTransfers.length;
            processedCount += yellowCount;
          }
        } catch (error) {
          console.error('Error processing yellow transfers:', error);
        }
      }

      // Calculate expected result BEFORE refresh
      // Separate yellow (incoming transfers from other points) from orange (warehouse items)
      const totalOrangeFromWarehouse = orangeCount + greenMatchedCount; // Only items from warehouse
      const totalAdded = yellowCount + totalOrangeFromWarehouse; // Total added to user state
      const expectedAfterCount = currentUserStateCountBefore - allBlueCount + totalAdded;

      setLastTransaction({
        transactionId: sharedTransactionId,
        date: dateStr,
        userId: selectedUserId
      });

      // Clear matched pairs and refresh data FIRST (like web app)
      setMatchedPairs([]);
      
      // Wait for database to fully update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data from server (this will clear the lists automatically)
      await fetchItemsToPick();
      
      // Wait a bit for React state to update
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get ACTUAL user state count AFTER processing (like web app)
      const allStatesUrlAfter = getApiUrl('/state');
      const { accessToken: accessTokenAfter } = await tokenService.getTokens();
      const allStatesResponseAfter = await fetch(allStatesUrlAfter, {
        headers: {
          'Authorization': `Bearer ${accessTokenAfter}`
        }
      });
      const allStatesDataAfter = await allStatesResponseAfter.json();
      
      // Filter by user symbol (like web app does)
      const actualStateCountAfter = allStatesDataAfter.filter(item => 
        item.symbol === userSymbol || 
        (item.sellingPoint && item.sellingPoint.symbol === userSymbol)
      ).length;

      // Calculate how many items were TO BE processed (before processing)
      const totalItemsToProcess = initialBlueCount + initialTransfersCount;
      
      // Fetch items again to check what remains
      const checkUrl = getApiUrl(`/state/items-to-pick?userId=${selectedUserId}&date=${dateStr}`);
      const checkResponse = await fetch(checkUrl, {
        headers: {
          'Authorization': `Bearer ${accessTokenAfter}`
        }
      });
      const checkData = await checkResponse.json();
      const remainingItems = (checkData.blueItems?.length || 0) + (checkData.transfers?.length || 0);

      // Calculate warehouse state (like web app)
      // Only orange items from warehouse affect warehouse count (NOT yellow transfers!)
      const warehouseAfterCount = warehouseBeforeCount - totalOrangeFromWarehouse;
      const warehouseProcessedCount = totalOrangeFromWarehouse;

      // Check if user is warehouse
      const isWarehouse = userSymbol === 'Magazyn';

      // Show control modal with actual vs expected
      setControlModalData({
        userSymbol: selectedUserData?.symbol || selectedUserData?.username,
        beforeCount: currentUserStateCountBefore,
        allBlueCount,
        yellowCount, // Incoming transfers from other points (NOT from warehouse)
        warehouseCount: orangeCount, // Manually moved from warehouse
        allOrangeCount: totalOrangeFromWarehouse, // Total from warehouse (manual + auto-matched)
        greenMatchedCount,
        expectedAfterCount,
        actualAfterCount: actualStateCountAfter,
        remainingItems,
        totalItemsToProcess,
        calculation: `${currentUserStateCountBefore} - ${allBlueCount} (niebieskie) + ${yellowCount} (żółte) + ${totalOrangeFromWarehouse} (pomarańczowe) = ${expectedAfterCount}`,
        transactionId: sharedTransactionId,
        processedDate: dateStr,
        warehouseBeforeCount,
        warehouseAfterCount,
        warehouseProcessedCount,
        isWarehouse
      });
      
      // Clear greyed items after processing
      setGreyedWarehouseItems(new Set());
      setMatchedPairs([]);
      
      // Refresh processing status for all users
      await checkProcessingStatus();
      
      // Refresh last transaction data
      await checkLastTransaction();

      // THEN show the modal
      setShowControlModal(true);    } catch (error) {
      console.error('Error processing items:', error);
      Alert.alert("Błąd", "Wystąpił błąd podczas przetwarzania");
    } finally {
      setProcessing(false);
    }
  };

  const handleUndoTransaction = async () => {
    if (!lastTransaction) return;

    try {
      setProcessing(true);
      
      const { accessToken } = await tokenService.getTokens();
      
      // Get current user data
      const selectedUserData = users.find(u => u._id === selectedUserId);
      const userSymbol = selectedUserData?.symbol || selectedUserData?.username;
      
      // Get warehouse state BEFORE undo
      const warehouseUrlBefore = getApiUrl('/state/warehouse');
      const warehouseResponseBefore = await fetch(warehouseUrlBefore, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const warehouseDataBefore = await warehouseResponseBefore.json();
      const warehouseBeforeCount = warehouseDataBefore.length;
      
      // Get user state count BEFORE undo
      const allStatesUrlBefore = getApiUrl('/state');
      const allStatesResponseBefore = await fetch(allStatesUrlBefore, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      const allStatesDataBefore = await allStatesResponseBefore.json();
      const userStateBefore = allStatesDataBefore.filter(item => 
        item.symbol === userSymbol || 
        (item.sellingPoint && item.sellingPoint.symbol === userSymbol)
      ).length;
      
      // Now call undo endpoint
      const url = getApiUrl('/transfer/undo-last');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Get warehouse state AFTER undo
        const warehouseUrl = getApiUrl('/state/warehouse');
        const warehouseResponse = await fetch(warehouseUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const warehouseData = await warehouseResponse.json();
        const warehouseAfterCount = warehouseData.length;
        
        // Get user state count AFTER undo
        const allStatesUrl = getApiUrl('/state');
        const allStatesResponse = await fetch(allStatesUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const allStatesData = await allStatesResponse.json();
        const userStateAfter = allStatesData.filter(item => 
          item.symbol === userSymbol || 
          (item.sellingPoint && item.sellingPoint.symbol === userSymbol)
        ).length;
        
        // Calculate changes
        const warehouseReturned = warehouseAfterCount - warehouseBeforeCount;
        const stateChange = userStateAfter - userStateBefore;
        const isWarehouse = userSymbol === 'MAGAZYN';
        
        // Calculate display values based on user type
        let restoredCount, calculation;
        
        if (isWarehouse) {
          // For warehouse: show items removed (negative value)
          restoredCount = stateChange; // Will be negative
          calculation = `Cofnięcie: ${Math.abs(stateChange)} produktów zostało usuniętych z magazynu\nStan wraca do: ${userStateAfter}`;
        } else {
          // For selling points: don't show "restored count", only warehouse return
          restoredCount = undefined;
          calculation = `Stan przed transakcją: ${userStateBefore}`;
        }
        
        setControlModalData({
          userSymbol: userSymbol,
          beforeCount: userStateBefore,
          restoredCount: restoredCount,
          warehouseReturnedCount: warehouseReturned,
          expectedAfterCount: userStateAfter,
          actualAfterCount: userStateAfter,
          calculation: calculation,
          warehouseBeforeCount: warehouseBeforeCount,
          warehouseAfterCount: warehouseAfterCount,
          warehouseProcessedCount: 0,
          isWarehouse,
          isUndo: true
        });
        
        // Refresh data
        await fetchItemsToPick();
        
        // Refresh processing status for all users
        await checkProcessingStatus();
        
        // Hide undo button (only one undo allowed like in web app)
        setLastTransaction(null);
        
        // Wait a bit then show modal
        await new Promise(resolve => setTimeout(resolve, 100));
        setShowControlModal(true);
      } else {
        const errorText = await response.text();
        console.error('Undo error:', errorText);
        Alert.alert("Błąd", "Nie udało się cofnąć transakcji");
      }
    } catch (error) {
      console.error('Error undoing transaction:', error);
      Alert.alert("Błąd", "Wystąpił błąd podczas cofania transakcji");
    } finally {
      setProcessing(false);
    }
  };

  const filteredWarehouse = warehouseItems.filter(item => {
    if (!warehouseSearch) return true;
    const search = warehouseSearch.toLowerCase();
    const fullName = (item.fullName?.fullName || item.fullName || '').toLowerCase();
    const size = (item.size?.Roz_Opis || item.size || '').toLowerCase();
    const barcode = (item.barcode || '').toLowerCase();
    return fullName.includes(search) || size.includes(search) || barcode.includes(search);
  });

  const isWarehouseItemMatched = (itemId) => {
    // Check if item is in matched pairs (for graying out)
    // OR if manually moved to transfers list
    const inMatchedPairs = matchedPairs.some(pair => pair.warehouseProduct?._id === itemId);
    const inTransfers = transfers.some(transfer => transfer._id === itemId && transfer.fromWarehouse);
    return inMatchedPairs || inTransfers;
  };

  const isBlueItemMatched = (itemId) => {
    return matchedPairs.some(pair => pair.blueProduct?.id === itemId);
  };

  const renderBlueItem = ({ item, index }) => {
    const isMatched = isBlueItemMatched(item.sourceId);
    const backgroundColor = isMatched ? '#10B981' : '#007bff';
    
    return (
      <View style={[styles.transferCard, { backgroundColor, borderColor: backgroundColor }]}>
        <View style={styles.transferContent}>
          <View style={styles.transferInfo}>
            <Text style={styles.transferName} numberOfLines={1}>
              {item.fullName || 'N/A'}
            </Text>
            <Text style={styles.transferSize}>
              {item.size || 'N/A'} • {item.type === 'sale' ? 'Sprzedaż' : 'Transfer'}
            </Text>
            <Text style={styles.transferBarcode}>
              {item.barcode || 'N/A'}
            </Text>
          </View>
          
          {isMatched && (
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedBadgeText}>✓</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderWarehouseItem = ({ item, index }) => {
    const isMatched = isWarehouseItemMatched(item._id);
    const isGreyed = greyedWarehouseItems.has(item._id);
    
    return (
      <View style={[styles.warehouseCard, isGreyed && styles.warehouseCardMatched]}>
        <View style={styles.warehouseContent}>
          <View style={styles.warehouseInfo}>
            <Text style={[styles.warehouseName, isGreyed && styles.matchedText]} numberOfLines={1}>
              {item.fullName?.fullName || item.fullName}
            </Text>
            <Text style={[styles.warehouseSize, isGreyed && styles.matchedText]}>
              {item.size?.Roz_Opis || item.size}
            </Text>
            <Text style={[styles.warehouseBarcode, isGreyed && styles.matchedText]}>
              {item.barcode}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.warehouseButton, 
              isGreyed && styles.warehouseButtonDisabled
            ]}
            onPress={() => !isGreyed && handleMoveFromWarehouse(item)}
            disabled={isGreyed}
          >
            <Text style={styles.warehouseButtonText}>
              {isGreyed ? '⚡ Sparowany' : 'Przenieś'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMatchedWarehouseItem = ({ item, index }) => {
    const isGreyed = greyedWarehouseItems.has(item._id);
    
    return (
      <View style={[styles.transferCard, { 
        backgroundColor: '#ff8c00', 
        borderColor: '#ff8c00',
        opacity: isGreyed ? 0.7 : 1.0 
      }]}>
        <View style={styles.transferContent}>
          <View style={styles.transferInfo}>
            <Text style={styles.transferName} numberOfLines={1}>
              {isGreyed && '✓ '}{item.fullName?.fullName || item.fullName}
            </Text>
            <Text style={styles.transferSize}>
              {item.size?.Roz_Opis || item.size}
            </Text>
            <Text style={styles.transferBarcode}>
              {item.barcode}
            </Text>
            <Text style={styles.transferSize}>
              MAGAZYN → Sparowany z transferem
            </Text>
          </View>
          
          <View style={styles.transferActions}>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => {
                // 🔧 Enrich item with price before printing
                const enrichedItem = { ...item };
                const itemFullName = typeof item.fullName === 'string' ? item.fullName : item.fullName?.fullName;
                
                // Try warehouse first (match by barcode OR fullName)
                if (!enrichedItem.price) {
                  const matchingWarehouse = warehouseItems.find(w => 
                    w.barcode === enrichedItem.barcode || 
                    w.fullName === itemFullName
                  );
                  if (matchingWarehouse) {
                    enrichedItem.price = matchingWarehouse.price;
                  }
                }
                
                // Try allProducts cache (match by fullName)
                if (!enrichedItem.price && itemFullName && allProducts.length > 0) {
                  const productByName = allProducts.find(p => p.fullName === itemFullName);
                  if (productByName) {
                    enrichedItem.price = productByName.price;
                  } else {
                    enrichedItem.price = 0; // Fallback if product deleted
                  }
                }
                
                handlePrintLabel(enrichedItem);
              }}
            >
              <Ionicons name="print" size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.returnButton}
              onPress={() => handleUnpairMatchedItem(item)}
            >
              <Ionicons name="arrow-undo" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderTransferItem = ({ item, index }) => {
    const fromWarehouse = item.fromWarehouse;
    const backgroundColor = fromWarehouse ? '#ff8c00' : '#ffc107';
    
    return (
      <View style={[styles.transferCard, { backgroundColor, borderColor: backgroundColor }]}>
        <View style={styles.transferContent}>
          <View style={styles.transferInfo}>
            <Text style={styles.transferName} numberOfLines={1}>
              {item.fullName?.fullName || item.fullName}
            </Text>
            <Text style={styles.transferSize}>
              {item.size?.Roz_Opis || item.size}
            </Text>
            <Text style={styles.transferBarcode}>
              {item.barcode}
            </Text>
          </View>
          
          <View style={styles.transferActions}>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => {
                // 🔧 Enrich item with price before printing
                const enrichedItem = { ...item };
                const itemFullName = typeof item.fullName === 'string' ? item.fullName : item.fullName?.fullName;
                
                // Try warehouse first (match by barcode OR fullName)
                if (!enrichedItem.price) {
                  const matchingWarehouse = warehouseItems.find(w => 
                    w.barcode === enrichedItem.barcode || 
                    w.fullName === itemFullName
                  );
                  if (matchingWarehouse) {
                    enrichedItem.price = matchingWarehouse.price;
                  }
                }
                
                // Try allProducts cache (match by fullName)
                if (!enrichedItem.price && itemFullName && allProducts.length > 0) {
                  const productByName = allProducts.find(p => p.fullName === itemFullName);
                  if (productByName) {
                    enrichedItem.price = productByName.price;
                  } else {
                    enrichedItem.price = 0; // Fallback if product deleted
                  }
                }
                
                handlePrintLabel(enrichedItem);
              }}
            >
              <Ionicons name="print" size={20} color="#fff" />
            </TouchableOpacity>
            
            {fromWarehouse && (
              <TouchableOpacity
                style={styles.returnButton}
                onPress={() => handleReturnToWarehouse(item)}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderYellowTransferItem = ({ item, index }) => {
    const fullName = item.fullName?.fullName || item.fullName;
    const size = item.size?.Roz_Opis || item.size;
    const transferFrom = item.transfer_from || 'N/A';
    
    return (
      <View style={[styles.transferCard, { 
        backgroundColor: '#ffc107', 
        borderColor: '#ffc107' 
      }]}>
        <View style={styles.transferContent}>
          <View style={styles.transferInfo}>
            <Text style={styles.transferName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.transferSize}>
              {size}
            </Text>
            <Text style={styles.transferBarcode}>
              {item.barcode}
            </Text>
            <Text style={styles.transferSize}>
              Transfer z: {transferFrom}
            </Text>
          </View>
          
          <View style={styles.transferActions}>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => {
                // 🔧 Enrich item with price before printing
                const enrichedItem = { ...item };
                const itemFullName = typeof item.fullName === 'string' ? item.fullName : item.fullName?.fullName;
                
                // Try warehouse first (match by barcode OR fullName)
                if (!enrichedItem.price) {
                  const matchingWarehouse = warehouseItems.find(w => 
                    w.barcode === enrichedItem.barcode || 
                    w.fullName === itemFullName
                  );
                  if (matchingWarehouse) {
                    enrichedItem.price = matchingWarehouse.price;
                  }
                }
                
                // Try allProducts cache (match by fullName)
                if (!enrichedItem.price && itemFullName && allProducts.length > 0) {
                  const productByName = allProducts.find(p => p.fullName === itemFullName);
                  if (productByName) {
                    enrichedItem.price = productByName.price;
                  } else {
                    enrichedItem.price = 0; // Fallback if product deleted
                  }
                }
                
                handlePrintLabel(enrichedItem);
              }}
            >
              <Ionicons name="print" size={20} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.yellowBadge}>
              <Text style={styles.yellowBadgeText}>🟡</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const generateZplCode = (item) => {
    const itemName = item.fullName?.fullName || item.fullName || 'N/A';
    const itemSize = item.size?.Roz_Opis || item.size || 'N/A';
    const barcode = item.barcode || 'NO-BARCODE';
    
    // 🔧 FIX: Extract price (should be enriched before calling this function)
    let price = null;
    if (item.price !== undefined && item.price !== null) {
      price = item.price;
    } else if (item.fullName?.price !== undefined && item.fullName?.price !== null) {
      price = item.fullName.price;
    }
    
    const symbol = item.symbol || item.sellingPoint?.symbol || item.transfer_to || 'N/A';

    const pointMapping = {
      P: '01',
      M: '02',
      K: '03',
      T: '04',
      S: '05',
      Kar: '06'
    };

    const mappedPoint = pointMapping[symbol] || symbol;

    let processedName = (itemName || 'N/A');
    processedName = processedName
      .replace(/\s*(czarny|czarna|czarne|biały|biała|białe|niebieski|niebieska|niebieskie|czerwony|czerwona|czerwone|zielony|zielona|zielone|żółty|żółta|żółte|szary|szara|szare|brązowy|brązowa|brązowe|różowy|różowa|różowe|fioletowy|fioletowa|fioletowe|pomarańczowy|pomarańczowa|pomarańczowe|kakao|beżowy|beżowa|beżowe|kremowy|kremowa|kremowe|granatowy|granatowa|granatowe|bordowy|bordowa|bordowe|khaki|oliwkowy|oliwkowa|oliwkowe|złoty|złota|złote|srebrny|srebrna|srebrne|miętowy|miętowa|miętowe)\s*/gi, '')
      .trim();

    const barcodeDigits = (barcode && barcode.length >= 5) ? barcode.substring(3, 5) : '';
    if (barcodeDigits) {
      processedName += ` ${barcodeDigits}`;
    }

    const safeName = processedName.replace(/[^\x00-\x7F]/g, '?');
    const safeSize = (itemSize || 'N/A').replace(/[^\x00-\x7F]/g, '?');
    const safeTransfer = (mappedPoint || 'N/A').replace(/[^\x00-\x7F]/g, '?');
    
    // 🔧 FIX: Only show 'N/A' if price is truly missing (not if it's 0)
    const safePrice = (price !== null && price !== undefined) 
      ? price.toString().replace(/[^\x00-\x7F]/g, '?') 
      : 'N/A';

    return `^XA
^MMT
^PW450
^LL0400
^LS0
^FT3,50^A0N,40,40^FD${safeName}^FS
^FT320,55^A0N,40,40^FDCena:^FS
^FT320,105^A0N,55,55^FD${safePrice} zl^FS

^FT3,120^A0N,38,38^FDRozmiar: ${safeSize}^FS
^FT3,150^A0N,25,25^FDPunkt: ${safeTransfer}^FS
^BY2,3,85^FT80,238^BCN,,N,N
^FD${barcode}^FS
^FT125,280^A0N,28,28^FB200,1,0,C,0^FD${barcode}^FS
^XZ`;
  };

  const handlePrintLabel = async (item) => {
    try {
      const zplCode = generateZplCode(item);
      const printerIP = '192.168.1.25';
      const printerPort = 9100;
      const printerUrl = `http://${printerIP}:${printerPort}`;

      // Kontroler do timeout - 300ms (drukarka nie odpowiada przez HTTP)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300);

      // Wyślij ZPL bezpośrednio do drukarki przez HTTP POST
      const response = await fetch(printerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: zplCode,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // 🔇 Ciche drukowanie - bez komunikatu sukcesu
      return true;

    } catch (error) {
      // ✅ AbortError = SUKCES! Drukarka Zebra nie odpowiada przez HTTP,
      // ale jeśli dostaliśmy timeout to znaczy że komenda została wysłana
      if (error.name === 'AbortError') {
        return true; // Sukces - drukarka dostała komendę
      }
      
      // ❌ Inne błędy (brak sieci, etc.) - zwróć false
      // Modal potwierdzenia pokaże statystyki błędów
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LogoutButton position="top-right" />
      
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="shirt" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>Dobierz</Text>
        <Text style={styles.subtitle}>Dobieranie produktów z magazynu</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="rgb(0, 123, 255)"
            colors={["rgb(0, 123, 255)"]}
          />
        }
      >
        {/* PROCESSING STATUS - ALWAYS VISIBLE AT TOP */}
        {processingStatusMessage && (
          <View style={styles.topWarningContainer}>
            <View style={allProcessed ? styles.topSuccess : styles.topWarning}>
              <Ionicons 
                name={allProcessed ? "checkmark-circle" : "warning"} 
                size={32} 
                color={allProcessed ? "#22c55e" : "#ff9900"} 
              />
              <View style={styles.topWarningContent}>
                <Text style={allProcessed ? styles.topSuccessTitle : styles.topWarningTitle}>
                  {processingStatusMessage}
                </Text>
                {!allProcessed && unprocessedCount > 0 && (
                  <Text style={styles.topWarningCount}>Nieprzetworzonych pozycji: {unprocessedCount}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* User and Date Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Użytkownik:</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowUserModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {selectedUserId 
                ? filteredUsers.find(u => u._id === selectedUserId)?.sellingPoint || 
                  filteredUsers.find(u => u._id === selectedUserId)?.username || 
                  filteredUsers.find(u => u._id === selectedUserId)?.email
                : "Wybierz użytkownika..."}
            </Text>
            <Ionicons name="people" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Data:</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.selectButtonText}>
              {selectedDate.toLocaleDateString("pl-PL")}
            </Text>
            <Ionicons name="calendar" size={24} color="#fff" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="rgb(0, 123, 255)" />
            <Text style={styles.loadingText}>Ładowanie danych...</Text>
          </View>
        ) : selectedUserId ? (
          <>
            {/* Warehouse Items Section - Always Visible on Top */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                📦 Magazyn ({warehouseItems.length})
              </Text>
              <Text style={styles.sectionSubtitle}>Dostępne produkty w magazynie</Text>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Szukaj w magazynie..."
                  placeholderTextColor="#64748B"
                  value={warehouseSearch}
                  onChangeText={setWarehouseSearch}
                />
                {warehouseSearch !== '' && (
                  <TouchableOpacity onPress={() => setWarehouseSearch('')}>
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                style={[
                  styles.warehouseList,
                  filteredWarehouse.length === 0 && styles.warehouseListEmpty,
                  filteredWarehouse.length > 0 && filteredWarehouse.length <= 5 && styles.warehouseListSmall
                ]}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                scrollEnabled={filteredWarehouse.length > 5}
              >
                {filteredWarehouse.length > 0 ? (
                  filteredWarehouse.map((item, index) => (
                    <View key={`warehouse-${item._id}`}>
                      {renderWarehouseItem({ item, index })}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyWarehouse}>
                    <Text style={styles.emptyWarehouseText}>
                      {warehouseSearch ? 'Brak wyników wyszukiwania' : 'Brak produktów w magazynie'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Combined Blue and Transfer Items Section */}
            {(blueItems.length > 0 || transfers.length > 0 || matchedPairs.length > 0 || yellowTransfers.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  📋 Do przetworzenia ({blueItems.length + transfers.length + matchedPairs.length + yellowTransfers.length})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Niebieskie (usunąć): {blueItems.length} | Żółte (dodać z transferów): {yellowTransfers.length} | Pomarańczowe (dodać z magazynu): {transfers.length + matchedPairs.length}
                </Text>
                
                {/* Blue Items */}
                {blueItems.map((item, index) => (
                  <View key={`blue-${item.sourceId}-${index}`}>
                    {renderBlueItem({ item, index })}
                  </View>
                ))}
                
                {/* Matched Warehouse Items (rendered AFTER all blue items) - ONE PER PAIR */}
                {matchedPairs.map((pair, pairIndex) => {
                  const warehouseItem = pair.warehouseProduct;
                  // Check if this warehouse item is already in transfers (manually moved)
                  const alreadyInTransfers = transfers.some(t => t._id === warehouseItem._id && t.fromWarehouse);
                  
                  if (!alreadyInTransfers) {
                    return (
                      <View key={`matched-warehouse-${warehouseItem._id}-${pairIndex}`}>
                        {renderMatchedWarehouseItem({ item: warehouseItem, index: pairIndex })}
                      </View>
                    );
                  }
                  return null;
                })}
                
                {/* Yellow Transfer Items (incoming from other users) */}
                {yellowTransfers.map((item, index) => (
                  <View key={`yellow-${item._id}-${index}`}>
                    {renderYellowTransferItem({ item, index })}
                  </View>
                ))}
                
                {/* Transfer Items (manually moved from warehouse) */}
                {transfers.map((item, index) => (
                  <View key={`transfer-${item._id}-${index}`}>
                    {renderTransferItem({ item, index })}
                  </View>
                ))}
              </View>
            )}

            {/* Process Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.processButton,
                  (processing || (blueItems.length === 0 && transfers.length === 0 && yellowTransfers.length === 0)) && styles.processButtonDisabled
                ]}
                onPress={handleProcessItems}
                disabled={processing || (blueItems.length === 0 && transfers.length === 0 && yellowTransfers.length === 0)}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={24} color="#fff" />
                    <Text style={styles.processButtonText}>Przetwórz</Text>
                  </>
                )}
              </TouchableOpacity>

              {lastTransaction && (
                <TouchableOpacity
                  style={[styles.undoButton, processing && styles.undoButtonDisabled]}
                  onPress={() => setShowUndoConfirmModal(true)}
                  disabled={processing}
                >
                  <Ionicons name="arrow-undo" size={24} color="#fff" />
                  <Text style={styles.undoButtonText}>Cofnij ostatnią transakcję</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="person-add" size={64} color="#475569" />
            <Text style={styles.emptyText}>
              Wybierz użytkownika aby rozpocząć
            </Text>
          </View>
        )}
      </ScrollView>

      {/* User Selection Modal */}
      <Modal
        visible={showUserModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Wybierz użytkownika</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    selectedUserId === item._id && styles.userItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedUserId(item._id);
                    setShowUserModal(false);
                  }}
                >
                  <View style={styles.userItemContent}>
                    <Ionicons 
                      name="person-circle" 
                      size={32} 
                      color={selectedUserId === item._id ? "rgb(0, 123, 255)" : "#64748B"} 
                    />
                    <View style={styles.userItemText}>
                      <Text style={styles.userItemName}>
                        {item.sellingPoint || item.username || item.email}
                      </Text>
                      {item.symbol && (
                        <Text style={styles.userItemSymbol}>{item.symbol}</Text>
                      )}
                    </View>
                  </View>
                  {selectedUserId === item._id && (
                    <Ionicons name="checkmark-circle" size={24} color="rgb(0, 123, 255)" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Control Modal */}
      <Modal
        visible={showControlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowControlModal(false)}
      >
        <View style={styles.controlModalOverlay}>
          <View style={styles.controlModalGradient}>
            <View style={styles.controlModalContent}>
              <View style={styles.controlModalHeader}>
                <Text style={styles.controlModalEmoji}>{controlModalData?.isUndo ? '↩️' : '✅'}</Text>
                <Text style={styles.controlModalTitle}>
                  {controlModalData?.isUndo ? 'Transakcja cofnięta' : 'Przetwarzanie zakończone'}
                </Text>
              </View>

              {controlModalData && (
                <ScrollView style={styles.controlModalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.userSection}>
                    <Text style={styles.userLabel}>Użytkownik</Text>
                    <Text style={styles.userValue}>{controlModalData.userSymbol}</Text>
                  </View>

                  {controlModalData.isUndo ? (
                    // Undo mode - show restoration info
                    <>
                      <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Stan przed cofnięciem</Text>
                        <View style={styles.statValueBlue}>
                          <Text style={styles.statValueTextBlue}>{controlModalData.beforeCount}</Text>
                        </View>
                      </View>

                      {/* For warehouse: show items removed */}
                      {controlModalData.isWarehouse ? (
                        <>
                          {controlModalData.restoredCount !== undefined && controlModalData.restoredCount < 0 && (
                            <View style={styles.statRowRed}>
                              <Text style={styles.statLabelRed}>↩️ Usunięte z magazynu (cofnięcie)</Text>
                              <Text style={styles.statValueTextRed}>{controlModalData.restoredCount}</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <>
                          {/* For selling points: show restored products and removed items */}
                          {controlModalData.restoredCount !== undefined && controlModalData.restoredCount > 0 && (
                            <View style={styles.statRowGreen}>
                              <Text style={styles.statLabelGreen}>↩️ Przywrócone produkty</Text>
                              <Text style={styles.statValueTextGreen}>+{controlModalData.restoredCount}</Text>
                            </View>
                          )}

                          {controlModalData.warehouseReturnedCount > 0 && (
                            <View style={styles.statRowRed}>
                              <Text style={styles.statLabelRed}>📦 Usunięte ze stanu (wrócone do magazynu)</Text>
                              <Text style={styles.statValueTextRed}>-{controlModalData.warehouseReturnedCount}</Text>
                            </View>
                          )}
                        </>
                      )}

                      <View style={styles.calculationBox}>
                        <Text style={styles.calculationLabel}>OBLICZENIE</Text>
                        <Text style={styles.calculationText}>{controlModalData.calculation}</Text>
                      </View>

                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>
                          {controlModalData.isWarehouse ? 'Oczekiwany stan końcowy magazynu' : 'Oczekiwany stan końcowy'}
                        </Text>
                        <View style={styles.resultValue}>
                          <Text style={styles.resultValueText}>{controlModalData.expectedAfterCount}</Text>
                        </View>
                      </View>

                      {/* Warehouse state display (only for selling points, not for warehouse itself) */}
                      {!controlModalData.isWarehouse && (
                        <View style={styles.warehouseStateBox}>
                          <Text style={styles.warehouseStateTitle}>📦 MAGAZYN</Text>
                          <View style={styles.warehouseStateRow}>
                            <Text style={styles.warehouseStateLabel}>Stan przed:</Text>
                            <Text style={styles.warehouseStateValue}>{controlModalData.warehouseBeforeCount}</Text>
                          </View>
                          <View style={styles.warehouseStateRow}>
                            <Text style={styles.warehouseStateLabel}>Zwrócono:</Text>
                            <Text style={styles.warehouseStateValue}>+{controlModalData.warehouseReturnedCount || 0}</Text>
                          </View>
                          <View style={styles.warehouseStateRow}>
                            <Text style={styles.warehouseStateLabel}>Stan po:</Text>
                            <Text style={styles.warehouseStateValue}>{controlModalData.warehouseAfterCount}</Text>
                          </View>
                        </View>
                      )}

                      {/* Bottom spacing for scrollable content */}
                      <View style={{ height: 30 }} />
                    </>
                  ) : (
                    // Processing mode - show calculation
                    <>
                      {controlModalData.remainingItems > 0 && (
                        <View style={styles.warningBox}>
                          <Text style={styles.warningEmoji}>⚠️</Text>
                          <View style={styles.warningContent}>
                            <Text style={styles.warningTitle}>UWAGA! Nie wszystkie produkty z dnia zostały przetworzone</Text>
                            <Text style={styles.warningText}>Nieprzetworzonych pozycji: {controlModalData.remainingItems}</Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Stan początkowy</Text>
                        <View style={styles.statValueBlue}>
                          <Text style={styles.statValueTextBlue}>{controlModalData.beforeCount}</Text>
                        </View>
                      </View>

                      {controlModalData.allBlueCount > 0 && (
                        <View style={styles.statRowRed}>
                          <Text style={styles.statLabelRed}>🔵 Niebieskie (odpis)</Text>
                          <Text style={styles.statValueTextRed}>-{controlModalData.allBlueCount}</Text>
                        </View>
                      )}

                      {controlModalData.yellowCount > 0 && (
                        <View style={styles.statRowYellow}>
                          <Text style={styles.statLabelYellow}>🟡 Żółte transfery (dopis)</Text>
                          <Text style={styles.statValueTextYellow}>+{controlModalData.yellowCount}</Text>
                        </View>
                      )}

                      {controlModalData.warehouseCount > 0 && (
                        <View style={styles.statRowGreen}>
                          <Text style={styles.statLabelGreen}>📦 Magazyn (dopis)</Text>
                          <Text style={styles.statValueTextGreen}>+{controlModalData.warehouseCount}</Text>
                        </View>
                      )}

                      {controlModalData.greenMatchedCount > 0 && (
                        <View style={styles.statRowGray}>
                          <Text style={styles.statLabelGray}>🟢 {controlModalData.greenMatchedCount} par dopasowanych (bilans: 0)</Text>
                        </View>
                      )}

                      <View style={styles.calculationBox}>
                        <Text style={styles.calculationLabel}>OBLICZENIE</Text>
                        <Text style={styles.calculationText}>{controlModalData.calculation}</Text>
                      </View>

                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Rzeczywisty stan końcowy</Text>
                        <View style={styles.resultValue}>
                          <Text style={styles.resultValueText}>{controlModalData.actualAfterCount || controlModalData.expectedAfterCount}</Text>
                        </View>
                      </View>

                      {/* Warehouse state display (only for selling points, not for warehouse itself) */}
                      {!controlModalData.isWarehouse && (
                        <View style={styles.warehouseStateBox}>
                          <Text style={styles.warehouseStateTitle}>📦 MAGAZYN</Text>
                          <View style={styles.warehouseStateRow}>
                            <Text style={styles.warehouseStateLabel}>Stan przed:</Text>
                            <Text style={styles.warehouseStateValue}>{controlModalData.warehouseBeforeCount}</Text>
                          </View>
                          <View style={styles.warehouseStateRow}>
                            <Text style={styles.warehouseStateLabel}>Przetworzone:</Text>
                            <Text style={styles.warehouseStateValue}>-{controlModalData.warehouseProcessedCount}</Text>
                          </View>
                          <View style={styles.warehouseStateRow}>
                            <Text style={styles.warehouseStateLabel}>Stan po:</Text>
                            <Text style={styles.warehouseStateValue}>{controlModalData.warehouseAfterCount}</Text>
                          </View>
                        </View>
                      )}

                      {controlModalData.actualAfterCount !== controlModalData.expectedAfterCount && (
                        <View style={styles.discrepancyBox}>
                          <Text style={styles.discrepancyText}>
                            Różnica: {(controlModalData.actualAfterCount || 0) - (controlModalData.expectedAfterCount || 0)}
                          </Text>
                          <Text style={styles.discrepancySubtext}>
                            (Oczekiwano: {controlModalData.expectedAfterCount})
                          </Text>
                        </View>
                      )}

                      {/* Bottom spacing for scrollable content */}
                      <View style={{ height: 30 }} />
                    </>
                  )}
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.controlModalButton}
                onPress={() => {
                  setShowControlModal(false);
                }}
              >
                <Text style={styles.controlModalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Undo Confirmation Modal */}
      <Modal
        visible={showUndoConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUndoConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="arrow-undo-circle" size={64} color="rgb(0, 123, 255)" />
              <Text style={styles.confirmModalTitle}>Cofnij transakcję</Text>
              <Text style={styles.confirmModalMessage}>
                Czy na pewno chcesz cofnąć ostatnią transakcję?
              </Text>
            </View>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setShowUndoConfirmModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>Anuluj</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmModalConfirmButton}
                onPress={() => {
                  setShowUndoConfirmModal(false);
                  handleUndoTransaction();
                }}
              >
                <Text style={styles.confirmModalConfirmText}>Tak, cofnij</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Corrections Modal */}
      <Modal
        visible={showCorrectionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCorrectionsModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalContent, { maxHeight: '85%', width: '90%' }]}>
            <View style={styles.confirmModalHeader}>
              <View style={styles.correctionIconContainer}>
                <Ionicons 
                  name="warning" 
                  size={48} 
                  color="#f59e0b" 
                />
              </View>
              <Text style={styles.confirmModalTitle}>
                Braki w stanie
              </Text>
              <Text style={styles.confirmModalMessage}>
                Następujące produkty nie zostały znalezione w stanie i zostały automatycznie przeniesione do korekt:
              </Text>
            </View>
            
            <ScrollView style={styles.correctionsScrollView}>
              {correctionsData?.items?.map((item, index) => (
                <View key={index} style={styles.correctionItem}>
                  <View style={styles.correctionItemHeader}>
                    <Text style={styles.correctionItemNumber}>{index + 1}</Text>
                    <View style={styles.correctionItemInfo}>
                      <Text style={styles.correctionItemText}>
                        {item.fullName}
                      </Text>
                      <Text style={styles.correctionItemSize}>
                        Rozmiar: {item.size}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.correctionItemBarcode}>
                    {item.barcode}
                  </Text>
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.correctionsFooter}>
              <Ionicons 
                name={correctionsData?.success ? "checkmark-circle" : "close-circle"} 
                size={20} 
                color={correctionsData?.success ? "#10b981" : "#ef4444"} 
              />
              <Text style={[styles.correctionsFooterText, correctionsData?.success ? styles.successText : styles.errorText]}>
                {correctionsData?.success 
                  ? 'Wszystkie braki zostały zapisane w tabeli Korekty'
                  : 'Błąd zapisu - skontaktuj się z administratorem'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.correctionConfirmButton}
              onPress={() => setShowCorrectionsModal(false)}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.correctionConfirmText}>Rozumiem</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Print Confirmation Modal */}
      <Modal
        visible={showPrintConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <View style={styles.printIconContainer}>
                <Ionicons name="print" size={40} color="#fff" />
              </View>
              <Text style={styles.confirmModalTitle}>Potwierdzenie drukowania</Text>
              {pendingProcessData && (
                <View style={styles.printStatsContainer}>
                  <Text style={styles.printStatsText}>
                    Wydrukowano {pendingProcessData.successCount} z {pendingProcessData.totalCount} etykiet
                  </Text>
                  {pendingProcessData.errorCount > 0 && (
                    <Text style={styles.printErrorText}>
                      Błędów: {pendingProcessData.errorCount}
                    </Text>
                  )}
                </View>
              )}
              <Text style={styles.confirmModalMessage}>
                Czy wszystkie metki zostały poprawnie wydrukowane?
              </Text>
              <Text style={styles.confirmModalSubtext}>
                Po potwierdzeniu produkty zostaną przetworzone.
              </Text>
            </View>
            
            <View style={styles.printModalButtons}>
              <TouchableOpacity
                style={styles.printConfirmButton}
                onPress={() => {
                  setShowPrintConfirmModal(false);
                  setPendingProcessData(null);
                  executeProcessItems();
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.printConfirmButtonText}>Tak - Przetwórz</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.printCancelButton}
                onPress={() => {
                  setShowPrintConfirmModal(false);
                  setPendingProcessData(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
                <Text style={styles.printCancelButtonText}>Nie - Anuluj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Print Error Modal */}
      <Modal
        visible={showPrintErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrintErrorModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Ionicons name="alert-circle" size={64} color="#ef4444" />
              <Text style={styles.confirmModalTitle}>Błąd drukowania</Text>
              <Text style={styles.confirmModalMessage}>
                {printErrorMessage}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.printErrorButton}
              onPress={() => setShowPrintErrorModal(false)}
            >
              <Text style={styles.printErrorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgb(0, 123, 255)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
  },
  warehouseList: {
    maxHeight: 400,
    marginBottom: 12,
  },
  warehouseListEmpty: {
    height: 0,
  },
  warehouseListSmall: {
    maxHeight: 'auto',
  },
  warehouseCard: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  warehouseCardMatched: {
    backgroundColor: "#374151",
    opacity: 0.6,
  },
  warehouseContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  warehouseInfo: {
    flex: 1,
    marginRight: 12,
  },
  warehouseName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  warehouseSize: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 2,
  },
  warehouseBarcode: {
    fontSize: 12,
    color: "#64748B",
  },
  matchedText: {
    color: "#9CA3AF",
  },
  warehouseButton: {
    backgroundColor: "rgb(0, 123, 255)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warehouseButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  warehouseButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  transferCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
  },
  transferContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transferInfo: {
    flex: 1,
  },
  transferName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  transferSize: {
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },
  transferBarcode: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  transferActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  printButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 8,
    borderRadius: 8,
  },
  returnButton: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 8,
    borderRadius: 8,
  },
  matchedBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  matchedBadgeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  processButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  processButtonDisabled: {
    backgroundColor: "#374151",
  },
  processButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  undoButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dc3545",
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  undoButtonDisabled: {
    backgroundColor: "#374151",
  },
  undoButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  userItemSelected: {
    backgroundColor: "rgba(0, 123, 255, 0.2)",
  },
  userItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  userItemText: {
    flex: 1,
  },
  userItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  userItemSymbol: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 2,
  },
  controlModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  controlModalGradient: {
    borderRadius: 20,
    padding: 2,
    backgroundColor: "rgb(0, 123, 255)",
    width: "100%",
    maxWidth: 450,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 15,
  },
  controlModalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 18,
    padding: 20,
    maxHeight: "100%",
  },
  controlModalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  controlModalEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  controlModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  controlModalBody: {
    backgroundColor: "#0f0f0f",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 400,
  },
  userSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  userLabel: {
    fontSize: 11,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
    marginBottom: 6,
  },
  userValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgb(0, 123, 255)",
  },
  warningBox: {
    backgroundColor: "#3a2a1a",
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9900",
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  warningEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffcc66",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: "#ffddaa",
    fontWeight: "600",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#242424",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#bbbbbb",
  },
  statValueBlue: {
    backgroundColor: "#1a3a52",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statValueTextBlue: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgb(0, 123, 255)",
  },
  statRowRed: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3a1a1a",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ff4444",
    marginBottom: 10,
  },
  statLabelRed: {
    fontSize: 13,
    color: "#ffaaaa",
    flex: 1,
  },
  statValueTextRed: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ff6666",
  },
  statRowYellow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3a3a1a",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ffcc00",
    marginBottom: 10,
  },
  statLabelYellow: {
    fontSize: 13,
    color: "#ffffaa",
    flex: 1,
  },
  statValueTextYellow: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffdd44",
  },
  statRowGreen: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a3a1a",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#22ff55",
    marginBottom: 10,
  },
  statLabelGreen: {
    fontSize: 13,
    color: "#aaffaa",
    flex: 1,
  },
  statValueTextGreen: {
    fontSize: 17,
    fontWeight: "700",
    color: "#44ff66",
  },
  statRowGray: {
    backgroundColor: "#222222",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
    marginBottom: 10,
  },
  statLabelGray: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
  },
  statRowRed: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3a1a1a",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ff5555",
    marginBottom: 10,
  },
  statLabelRed: {
    fontSize: 13,
    color: "#ffaaaa",
    flex: 1,
  },
  statValueTextRed: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ff6666",
  },
  calculationBox: {
    backgroundColor: "#1a1a1a",
    padding: 14,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#333333",
  },
  calculationLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    letterSpacing: 1,
    marginBottom: 6,
  },
  calculationText: {
    fontSize: 13,
    color: "#cccccc",
    lineHeight: 20,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#242424",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#bbbbbb",
  },
  resultValue: {
    backgroundColor: "#1a3a52",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resultValueText: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgb(0, 123, 255)",
  },
  discrepancyBox: {
    backgroundColor: "#3a1a1a",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ff4444",
    marginTop: 10,
  },
  discrepancyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ff6666",
    marginBottom: 4,
  },
  discrepancySubtext: {
    fontSize: 12,
    color: "#ffaaaa",
  },
  controlModalButton: {
    backgroundColor: "rgb(0, 123, 255)",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  controlModalButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  warehouseStateBox: {
    backgroundColor: "#3a2a1a",
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff7700",
    marginTop: 14,
  },
  warehouseStateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffaa66",
    marginBottom: 10,
    textAlign: "center",
  },
  warehouseStateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  warehouseStateLabel: {
    fontSize: 13,
    color: "#ffcc88",
    fontWeight: "600",
  },
  warehouseStateValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffdd99",
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 2,
    borderColor: "rgb(0, 123, 255)",
  },
  confirmModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  confirmModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 12,
    marginBottom: 8,
  },
  confirmModalMessage: {
    fontSize: 16,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 24,
  },
  confirmModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  confirmModalCancelButton: {
    flex: 1,
    backgroundColor: "#374151",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmModalCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  confirmModalConfirmButton: {
    flex: 1,
    backgroundColor: "rgb(0, 123, 255)",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmModalConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  confirmModalSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  printIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgb(0, 123, 255)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "rgb(0, 123, 255)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  printStatsContainer: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    width: '100%',
  },
  printStatsText: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    fontWeight: '600',
  },
  printErrorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 4,
  },
  printModalButtons: {
    gap: 12,
    width: '100%',
  },
  printConfirmButton: {
    backgroundColor: "rgb(0, 123, 255)",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "rgb(0, 123, 255)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  printConfirmButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  printCancelButton: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  printCancelButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94A3B8",
  },
  printErrorButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    marginTop: 8,
  },
  printErrorButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  topWarningContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topWarning: {
    backgroundColor: "#3a2a1a",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: "#ff9900",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#ff9900",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topSuccess: {
    backgroundColor: "#1a3a1a",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  topWarningContent: {
    flex: 1,
  },
  topWarningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffcc66",
    marginBottom: 6,
    lineHeight: 20,
  },
  topSuccessTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#86efac",
    lineHeight: 20,
  },
  topWarningCount: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ff9900",
  },
  yellowBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yellowBadgeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  correctionIconContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 60,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  correctionsScrollView: {
    maxHeight: 350,
    width: '100%',
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  correctionItem: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  correctionItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  correctionItemNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f59e0b',
    marginRight: 12,
    minWidth: 24,
  },
  correctionItemInfo: {
    flex: 1,
  },
  correctionItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  correctionItemSize: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  correctionItemBarcode: {
    fontSize: 13,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 4,
    paddingLeft: 36,
  },
  correctionsFooter: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  correctionsFooterText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  correctionConfirmButton: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  correctionConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Users;
