import { useContext } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GlobalStateContext } from '../../context/GlobalState';

const Profile = () => {
  const { logout, user } = useContext(GlobalStateContext); // Access logout function

  const handleLogout = async () => {
    await logout(); // Call the logout function
  };

  return (
    <>
      <SafeAreaView style={{ backgroundColor: "#000", flex: 1 }}>
        <View style={{ marginVertical: 24, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <View>
              <Text style={{ fontSize: 14, color: "#f3f4f6" }}>
                Zalogowany jako: <Text style={{ fontWeight: 'bold' }}>{user?.email}</Text>
              </Text>
              <Text style={{ fontSize: 14, color: "#f3f4f6" }}>
                {new Date().toLocaleDateString('pl-PL', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              style={{ backgroundColor: "#0d6efd", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text style={{ fontSize: 14, color: "#fff", fontWeight: "bold" }}>Wyloguj</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.container}>
          {/* <Text style={styles.text}>Profile Screen</Text> */}
          {/* Display user details */}
          {user && (
            <View style={styles.userDetails}>
              {Object.entries(user)
                .map(([key, value]) => (
                  <Text key={key} style={styles.userDetailText}>
                    <Text style={{ fontWeight: 'bold' }}>{key}:</Text> {String(value)}
                  </Text>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
  },
  userDetails: {
    marginVertical: 20,
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 20,
  },
  userDetailText: {
    color: 'white',
    fontSize: 14,

  },
});
