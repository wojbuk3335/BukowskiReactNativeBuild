import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import React from "react";
import { GlobalStateContext } from "../../context/GlobalState";
import QRScanner from "../QRScanner";

export default function App() {
  const { stateData, user, sizes, colors, goods } = React.useContext(GlobalStateContext);
  const isFocused = useIsFocused();
//koment: This component is used to scan QR codes for creating new items or actions.
  useFocusEffect(
    React.useCallback(() => {
      if (isFocused) {
        return () => {};
      }
    }, [isFocused])
  );

  return (
    <QRScanner
      stateData={stateData}
      user={user}
      sizes={sizes}
      colors={colors}
      goods={goods}
      isActive={isFocused}
    />
  );
}