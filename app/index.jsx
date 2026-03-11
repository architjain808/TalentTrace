import { Redirect } from 'expo-router';

// Root index: hand off to the tab navigator's default screen
export default function Index() {
    return <Redirect href="/search" />;
}
