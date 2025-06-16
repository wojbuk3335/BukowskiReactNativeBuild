import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Query = () => {
    return (
        <View style={styles.container}>
            <Text>Query</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Query;