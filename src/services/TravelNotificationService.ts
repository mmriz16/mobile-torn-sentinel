import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

const CHANNEL_ID = 'travel_status';
const NOTIFICATION_ID = 'travel_foreground_service';

interface TravelData {
    destination: string;
    arrival_at: number; // Unix timestamp in seconds
    departed_at: number; // Unix timestamp in seconds
    time_left: number; // Seconds
}

class TravelNotificationService {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    async setup() {
        if (Platform.OS === 'android') {
            await notifee.createChannel({
                id: CHANNEL_ID,
                name: 'Travel Status',
                lights: false,
                vibration: false,
                importance: AndroidImportance.LOW,
            });
        }
    }

    async startService(travelData: TravelData) {
        if (this.isRunning) {
            this.displayNotification(travelData);
            return;
        }

        this.isRunning = true;
        await this.setup();

        // Initial notification
        await this.displayNotification(travelData);

        // Start interval to update notification every second
        let currentTravelData = { ...travelData };

        this.intervalId = setInterval(async () => {
            // Decrement time_left locally to keep UI smooth without fetching API constantly
            currentTravelData.time_left = Math.max(0, currentTravelData.time_left - 1);

            if (currentTravelData.time_left <= 0) {
                this.stopService();
            } else {
                await this.displayNotification(currentTravelData);
            }
        }, 1000);

        // Register foreground service to keep it alive
        notifee.registerForegroundService(() => {
            return new Promise(() => {
                // Keep the service running until stopped
                // We handle updates in the interval above, but we could also listen to events here
            });
        });
    }

    stopService() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        notifee.stopForegroundService();
    }

    private async displayNotification(travel: TravelData) {
        // const now = Math.floor(Date.now() / 1000);
        const totalDuration = travel.arrival_at - travel.departed_at;
        const elapsedTime = totalDuration - travel.time_left;
        const progress = Math.min(Math.max(0, elapsedTime), totalDuration); // Clamp between 0 and total

        const isReturning = travel.destination === 'Torn'; // Assuming 'Torn' is the home city
        // const iconName = isReturning ? 'travel_return' : 'travel_depart';

        // Format ETA
        const arrivalDate = new Date(travel.arrival_at * 1000);
        const etaTime = arrivalDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Format Timer (HH:MM:SS or MM:SS)
        const hours = Math.floor(travel.time_left / 3600);
        const minutes = Math.floor((travel.time_left % 3600) / 60);
        const seconds = travel.time_left % 60;
        const timerString = hours > 0
            ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        const titleText = isReturning
            ? `Returning to Torn • ETA ${etaTime} • ${timerString}`
            : `Travelling to ${travel.destination} • ETA ${etaTime} • ${timerString}`;

        await notifee.displayNotification({
            id: NOTIFICATION_ID,
            title: titleText,
            body: '', // Body is empty as per design request (minimalist)
            android: {
                channelId: CHANNEL_ID,
                asForegroundService: true,
                ongoing: true, // Make notification non-dismissible
                color: '#FBB32C', // Fixed Accent Color (Orange)
                onlyAlertOnce: true, // Don't buzz on every update
                progress: {
                    max: totalDuration,
                    current: progress,
                    indeterminate: false,
                },
                // Use specific travel icon resource
                smallIcon: 'ic_notif_plane',
                // largeIcon logic removed as requested for single icon style using native resource
            },
        });
    }

    // Call this when Travel data updates from the API
    updateTravelData(travelData: TravelData | null) {
        if (!travelData || travelData.time_left <= 0) {
            this.stopService();
        } else {
            this.startService(travelData);
        }
    }
}

export default new TravelNotificationService();
