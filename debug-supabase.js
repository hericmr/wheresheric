const { createClient } = require('@supabase/supabase-js');

// Credentials from src/supabaseClient.js
const supabaseUrl = 'https://reqksafbotcxjbuuwzkx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcWtzYWZib3RjeGpidXV3emt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODc1NjcsImV4cCI6MjA3OTA2MzU2N30.0ZKO-JWRcG4ExCtOiSWxmqgb9H6w9M0u766ObVC_NNo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLatestLocation() {
    console.log('Checking latest location from:', supabaseUrl);

    try {
        const { data, error } = await supabase
            .from('location_updates')
            .select('*') // Select ALL columns to verify lat/lng existence
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching data:', error);
        } else {
            console.log('Latest 20 records (User Distribution):');
            const userCounts = {};
            data.forEach(record => {
                const uid = record.user_id || 'undefined';
                userCounts[uid] = (userCounts[uid] || 0) + 1;
            });
            console.table(userCounts);

            console.log('Latest 5 raw records:');
            data.slice(0, 5).forEach(r => console.log(`${r.created_at} - ${r.user_id}`));

            // Check specifically for bruno
            const brunoData = data.find(r => r.user_id === 'bruno');
            if (brunoData) {
                console.log('\n✅ Data found for Bruno!');
                console.log(`DETAILS: Time: ${brunoData.created_at}, Lat: ${brunoData.lat}, Lng: ${brunoData.lng}`);
            } else {
                console.log('\n❌ No data found for Bruno in last 20 records.');
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkLatestLocation();
