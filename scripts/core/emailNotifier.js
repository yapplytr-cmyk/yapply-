import { getAuthOrigin } from "./auth.js";
function getNotifyUrl() {
try {
const origin = getAuthOrigin();
return `${origin}/api/notify`;
} catch (_) {
return "https://yapplytr.com/api/notify";
}
}
async function _sendNotification(type, payload) {
try {
const url = getNotifyUrl();
console.log(`[yapply] Sending ${type} notification...`);
const resp = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ type, payload }),
});
if (resp.ok) {
console.log(`[yapply] ${type} notification sent successfully`);
} else {
console.warn(`[yapply] ${type} notification failed:`, resp.status);
}
} catch (err) {
console.warn(`[yapply] ${type} notification error (non-blocking):`, err?.message);
}
}
export function notifyListingCreated(listing, listingType = "client") {
_sendNotification("listing_created", {
...listing,
listingType,
type: listingType,
});
}
export function notifyBidReceived(listing, bid) {
_sendNotification("bid_received", {
listing: {
id: listing?.id || "",
title: listing?.title || "",
ownerEmail: listing?.ownerEmail || "",
ownerName: listing?.ownerName || "",
contact: listing?.contact || {},
marketplaceMeta: listing?.marketplaceMeta || {},
},
bid: {
id: bid?.id || "",
developerUserId: bid?.developerUserId || bid?.developerId || "",
developerName: bid?.developerName || bid?.companyName || "",
bidAmount: bid?.bidAmount || {},
estimatedCompletionTimeframe: bid?.estimatedCompletionTimeframe || {},
proposalMessage: bid?.proposalMessage || "",
developerProfileReference: bid?.developerProfileReference || {},
},
});
}
export function notifyBidAccepted(listing, bid) {
_sendNotification("bid_accepted", {
listing: {
id: listing?.id || "",
title: listing?.title || "",
ownerEmail: listing?.ownerEmail || "",
ownerName: listing?.ownerName || "",
contact: listing?.contact || {},
marketplaceMeta: listing?.marketplaceMeta || {},
},
bid: {
id: bid?.id || "",
developerUserId: bid?.developerUserId || bid?.developerId || "",
developerEmail: bid?.developerEmail || "",
developerName: bid?.developerName || bid?.companyName || "",
bidAmount: bid?.bidAmount || {},
estimatedCompletionTimeframe: bid?.estimatedCompletionTimeframe || {},
proposalMessage: bid?.proposalMessage || "",
developerProfileReference: bid?.developerProfileReference || {},
},
});
}
export function notifyDeveloperSignup(user) {
_sendNotification("developer_signup", {
adminEmail: "yapplytr@gmail.com",
user: {
id: user?.id || "",
email: user?.email || "",
fullName: user?.fullName || "",
role: user?.role || "developer",
developerType: user?.developerType || "",
companyName: user?.companyName || "",
businessName: user?.businessName || "",
businessWebsite: user?.businessWebsite || "",
businessLocations: user?.businessLocations || "",
businessDescription: user?.businessDescription || "",
businessPhotos: user?.businessPhotos || [],
portfolioLinks: user?.portfolioLinks || [],
selfieUrl: user?.selfieUrl || "",
serviceArea: user?.serviceArea || "",
specialties: user?.specialties || "",
yearsExperience: user?.yearsExperience || "",
phoneNumber: user?.phoneNumber || "",
},
});
}
export function notifyInquiryReceived(listing, inquiry) {
_sendNotification("inquiry_received", {
listing: {
id: listing?.id || "",
title: listing?.title || listing?.name || "",
ownerEmail: listing?.ownerEmail || "",
ownerName: listing?.ownerName || "",
contact: listing?.contact || {},
},
inquiry,
});
}