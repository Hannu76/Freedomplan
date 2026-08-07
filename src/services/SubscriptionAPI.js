// Mocked API service according to specification

const DB_SIMULATION = {
    price: 3.00,
    currency: 'GBP'
}

export const SubscriptionAPI = {
    getSubscriptionPrice: async () => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            monthlyPrice: DB_SIMULATION.price,
            currency: DB_SIMULATION.currency,
            symbol: '£'
        };
    },

    getPaymentMethods: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return ['visa', 'mastercard', 'amex', 'discover', 'unionpay', 'jcb', 'diners'];
    },

    createSubscription: async (paymentDetails, userEmail, autoRenew, userId = 'app_user_001') => {
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Simulate basic validations backend mock (e.g. failing on 0000 card for demo)
        if (paymentDetails.cardNumber.includes('0000 0000')) {
            throw new Error('Payment declined by provider.');
        }

        const subscriptionId = 'sub_test_' + Math.random().toString(36).substring(7);
        const providerId = 'pi_test_' + Math.random().toString(36).substring(7);

        // Google Sheets Integration Mock
        const sheetData = {
            'User ID': userId,
            'Email': userEmail,
            'Plan': 'Pro',
            'Amount': DB_SIMULATION.price,
            'Currency': DB_SIMULATION.currency,
            'Payment Status': 'Paid',
            'Subscription Status': 'Active',
            'Auto Renew': autoRenew ? 'Yes' : 'No',
            'Purchase Date': new Date().toISOString(),
            'Renewal Date': new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
            'Payment Provider ID': providerId
        };

        try {
            const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwK8959N1rGAZgyNMLJk-McUt95rDZfQ4s8U_IM7mYwS1talcaltSv8abxYAr-8MqVTTQ/exec';
            await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sheetData),
                mode: 'no-cors'
            });
        } catch (err) {
            console.warn('Google Sheets sync failed:', err);
        }

        return {
            status: 'success',
            subscriptionId,
            message: 'Subscription activated'
        };
    },

    createPaymentIntent: async () => {
        return { clientSecret: 'pi_test_secret' };
    },

    confirmPayment: async (clientSecret, paymentDetails) => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { status: 'succeeded' };
    },

    verifyPayment: async (subscriptionId) => {
        return { status: 'verified', premiumActive: true };
    },

    cancelSubscription: async (subscriptionId) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { status: 'cancelled' };
    },

    renewSubscription: async (subscriptionId) => {
        return { status: 'renewed' };
    },

    getSubscriptionStatus: async (userId) => {
        return { status: 'Free' };
    },

    getPremiumFeatures: async () => {
        return [
            'Unlimited usage',
            'Privacy Mode',
            'Advanced AI features',
            'Faster processing',
            'Priority server access',
            'Cross-device synchronization'
        ];
    },

    getUserSubscription: async (userId) => {
        return {
            status: 'Free',
            email: userId,
            plan: 'Basic'
        };
    },

    restoreSubscription: async (userId, userEmail) => {
        // Simulate finding active subscription by email logic
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { restored: false, message: 'No active subscription found.' };
    }
};
