self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body,
                icon: data.icon || '/globe.svg',
                badge: data.badge || '/globe.svg',
                data: {
                    url: data.data?.url || '/'
                }
            };
            event.waitUntil(self.registration.showNotification(data.title, options));
        } catch (err) {
            console.error('Error parsing push payload', err);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
