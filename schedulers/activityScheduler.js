const cron = require('node-cron');
const db = require('../config/db');

async function deactivateExpiredActivities() {
    try {
        const result = await db.query(`
            UPDATE hd_activity
            SET status = 0, updated_at = NOW()
            WHERE end_date < NOW()
              AND status = 1
              AND deleted_at IS NULL
        `);
        if (result.rowCount > 0) {
            console.log(`[Scheduler] ${result.rowCount} activity set to Inactive (end_date passed)`);
        } else {
            console.log('[Scheduler] No expired activities found');
        }
    } catch (error) {
        console.error('[Scheduler] Failed to auto-deactivate activities:', error.message);
    }
}

// Jalankan sekali saat server start
deactivateExpiredActivities();

// Runs every hour
cron.schedule('0 * * * *', deactivateExpiredActivities, {
    timezone: 'Asia/Jakarta'
});

console.log('[Scheduler] Activity auto-deactivate scheduler started');
