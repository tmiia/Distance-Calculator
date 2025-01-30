import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { agencies } from '$lib/data/agencies';
import 'dotenv/config';

const MAPS_API_KEY = process.env.MAPS_API_KEY as string;
const MAX_TRAVEL_TIME = 5400;

async function calculateTravelTime(origin: string, destination: string): Promise<number> {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.rows[0].elements[0].status === 'OK') {
            return data.rows[0].elements[0].duration.value;
        }
        throw new Error('Failed to calculate travel time');
    } catch (err) {
        throw new Error('Error calculating travel time');
    }
}

export async function POST({ request }: RequestEvent) {
    try {
        const { hospitalAddress } = await request.json();
        const nearbyAgencies: string[] = [];

        const travelTimePromises = agencies.map(agency =>
            calculateTravelTime(hospitalAddress, agency.address)
                .then(travelTime => ({
                    name: agency.name,
                    travelTime
                }))
                .catch(() => null)
        );

        const results = await Promise.all(travelTimePromises);

        results.forEach(result => {
            if (result && result.travelTime <= MAX_TRAVEL_TIME) {
                nearbyAgencies.push(result.name);
            }
        });

        return json({ agencies: nearbyAgencies });
    } catch (error) {
        return json({ error: 'Failed to process request' }, { status: 500 });
    }
}
