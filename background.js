// --- 1. INSTALLATION & ONBOARDING ---
// Fires when the extension is first installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("TabQuest: System Initialized.");
        // Optional: Open a welcome page
        chrome.tabs.create({ url: "welcome.html" });
    }
});

// --- 2. THE ALARM ENGINE ---
// This listener catches the timer set in popup.js
chrome.alarms.onAlarm.addListener((alarm) => {
    // alarm.name is the unique Mission Name provided in the popup
    chrome.storage.local.get(alarm.name, (result) => {
        const task = result[alarm.name];

        if (task) {
            // INTEGRATION: Trigger System Desktop Notification
            chrome.notifications.create(alarm.name, {
                type: 'basic',
                // chrome.runtime.getURL ensures the path is absolute for the service worker
                iconUrl: chrome.runtime.getURL('icon128.png'),
                title: 'TabQuest: Mission Deadline!',
                message: `The deadline for "${task.name}" has arrived. Ready to resume?`,
                priority: 2,
                requireInteraction: true // Keeps the notification visible until user acts
            }, (notificationId) => {
                // FALLBACK: In case icon128.png is missing or corrupt
                if (chrome.runtime.lastError) {
                    console.warn("Main icon failed, firing fallback notification.");
                    chrome.notifications.create(alarm.name, {
                        type: 'basic',
                        iconUrl: 'icon48.png',
                        title: 'TabQuest: Deadline Reached!',
                        message: `Time is up for: ${task.name}`,
                        priority: 2
                    });
                }
            });

            console.log(`Notification fired for: ${task.name}`);
        } else {
            console.error("Alarm fired but task data was missing from storage.");
        }
    });
});

// --- 3. NOTIFICATION INTERACTION ---
// Handles what happens when a user clicks the notification banner
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log("User clicked notification for ID:", notificationId);

    chrome.storage.local.get(notificationId, (res) => {
        const task = res[notificationId];
        if (task && task.links) {
            // AUTOMATION: Re-open all saved tabs for this mission
            task.links.forEach(link => {
                chrome.tabs.create({ url: link.url });
            });

            // CLEANUP: Clear notification and remove mission from active list
            chrome.notifications.clear(notificationId);
            chrome.storage.local.remove(notificationId);

            // Optional: You could add logic here to move this to "History"
        }
    });
});

// --- 4. CLEANUP ON CLOSED NOTIFICATION ---
chrome.notifications.onClosed.addListener((notificationId) => {
    console.log("Notification dismissed for:", notificationId);
});