import React from 'react';
import ToastMessage from 'react-native-toast-message';

export function showToast(type, title, message) {
    ToastMessage.show({
        type,        // 'success' | 'error' | 'info'
        text1: title,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
        topOffset: 50,
    });
}

export default function Toast() {
    return <ToastMessage />;
}
