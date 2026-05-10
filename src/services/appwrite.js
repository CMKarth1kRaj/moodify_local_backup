import { Client, Account, Databases, Storage, ID } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://sgp.cloud.appwrite.io/v1') 
    .setProject('6a00350500070a6a1472');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID };

export const DB_ID = 'moodify_db'; 
export const COLLECTIONS = {
    SONGS: 'songs',
    HISTORY: 'history',
    LIKES: 'likes',
    JAM_ROOMS: 'jam_rooms',
    MESSAGES: 'messages',
    USER_STATS: 'user_stats',
    PLAYLISTS: 'playlists'
};

export default client;
