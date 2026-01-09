export interface LocationData {
    country: string;
    province: string;
    city?: string;
}

export const detectLocation = async (): Promise<LocationData> => {
    try {
        // Using ipapi.co as it requires no API key for basic usage and provides clean JSON
        // Fallback to ip-api.com if needed
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) {
            throw new Error('Location fetch failed');
        }
        const data = await response.json();
        
        return {
            country: data.country_name || 'Unknown',
            province: data.region || 'Unknown',
            city: data.city || 'Unknown'
        };
    } catch (error) {
        console.warn("Primary location service failed, trying backup...", error);
        try {
            const response = await fetch('http://ip-api.com/json/');
            const data = await response.json();
             return {
                country: data.country || 'Unknown',
                province: data.regionName || 'Unknown',
                city: data.city || 'Unknown'
            };
        } catch (err) {
            console.error("All location services failed", err);
            return {
                country: 'Unknown',
                province: 'Unknown',
                city: 'Unknown'
            };
        }
    }
};
