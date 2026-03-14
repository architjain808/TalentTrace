/**
 * Expo Router API Route — server-side proxy for Gamalogic.
 * Runs server-side so there are no CORS restrictions.
 * Used only when running on web (npm run web).
 */
export async function GET(request) {
    const url = new URL(request.url);
    const firstname = url.searchParams.get('firstname');
    const lastname = url.searchParams.get('lastname');
    const domain = url.searchParams.get('domain');

    if (!firstname || !lastname || !domain) {
        return Response.json(
            { error: true, error_message: 'Missing firstname, lastname, or domain' },
            { status: 400 }
        );
    }

    const apiKey = process.env.EXPO_PUBLIC_GAMALOGIC_API_KEY;
    if (!apiKey) {
        return Response.json(
            { error: true, error_message: 'Gamalogic API key not configured' },
            { status: 500 }
        );
    }

    try {
        const gamalogicUrl = `https://gamalogic.com/email-discovery/?firstname=${encodeURIComponent(firstname)}&lastname=${encodeURIComponent(lastname)}&domain=${encodeURIComponent(domain)}&apikey=${apiKey}&speed_rank=0`;

        const res = await fetch(gamalogicUrl);
        const data = await res.json();
        return Response.json(data);
    } catch (err) {
        return Response.json(
            { error: true, error_message: err.message },
            { status: 500 }
        );
    }
}
