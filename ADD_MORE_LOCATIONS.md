# 📍 Quick Guide: Add More Delight Spa Locations

## ✅ System is Ready for Multiple Locations!

Currently: **1 location** (Gomti Nagar)  
You can add: **Unlimited locations**

---

## 🚀 How to Add Your Other Locations (5 Minutes)

### **Step 1: Open the File**
```
backend/src/scripts/seed-multi-location-spa-data.ts
```

### **Step 2: Find Line ~30** (locations array)

You'll see:
```typescript
const locations: LocationData[] = [
  // LOCATION 1: Gomti Nagar (Main Branch)
  {
    locationName: 'Delight Spa - Gomti Nagar',
    address: 'Gomti Nagar, Lucknow',
    landmark: 'Near Phoenix Mall',
    // ... more details
  },
  
  // LOCATION 2: Add your second location here
  // Uncomment and fill details...
```

### **Step 3: Uncomment & Fill Location 2**

Remove the `/*  */` and fill your details:
```typescript
  {
    locationName: 'Delight Spa - Hazratganj',  // Change this
    address: 'Your Hazratganj address here',   // Change this
    landmark: 'Your landmark',                 // Change this
    googleMapsLink: 'Your maps link',          // Change this
    contactNumber: '0522-XXXXXXX',             // Change this
    whatsappNumber: '98765XXXXX',              // Change this
    timings: {
      weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Steam Room', 'Private Rooms'],
    specialFeatures: ['Four Hand Massage Available'],
    parkingAvailable: true  // or false
  },
```

### **Step 4: Add Location 3, 4, 5... (Optional)**

Copy the template and add more:
```typescript
  {
    locationName: 'Delight Spa - Indira Nagar',
    address: 'Your address',
    // ... fill all details
  },
  {
    locationName: 'Delight Spa - Alambagh',
    address: 'Your address',
    // ... fill all details
  },
  // Add as many as you need!
```

### **Step 5: Run the Script**
```bash
cd backend
npx ts-node src/scripts/seed-multi-location-spa-data.ts
```

### **Step 6: Done!** ✅

Your AI now knows about all locations!

---

## 📝 Template to Copy

Copy this for each new location:

```typescript
  {
    locationName: 'Delight Spa - [AREA NAME]',
    address: '[FULL ADDRESS]',
    landmark: '[NEARBY LANDMARK]',
    googleMapsLink: 'https://maps.google.com/?q=...',
    contactNumber: '[PHONE]',
    whatsappNumber: '[WHATSAPP]',
    timings: {
      weekdays: '[TIMINGS]',
      weekends: '[TIMINGS]',
      holiday: '[POLICY]'
    },
    amenities: ['List', 'Your', 'Facilities'],
    specialFeatures: ['Special', 'Services'],
    parkingAvailable: true
  },
```

---

## 💬 What Happens After Adding Locations

### **AI Can Now Answer:**

```
👤 "how many locations?"
🤖 "Delight Spa has 3 locations: Gomti Nagar, Hazratganj, Indira Nagar."

👤 "hazratganj address"
🤖 "Hazratganj branch: [Your address], near [landmark]. Ph: [number]."

👤 "which has parking?"
🤖 "Parking available at Gomti Nagar ✓ and Indira Nagar ✓."

👤 "nearest to me"
🤖 "We have 3 locations. Which area are you in?"

👤 "timings for all branches"
🤖 "Gomti Nagar: 10-9 PM, Hazratganj: 11-9 PM, Indira Nagar: 10-10 PM."
```

---

## 🎯 What Information to Fill

| Info | Example | Why Important |
|------|---------|---------------|
| **Location Name** | "Delight Spa - Gomti Nagar" | Unique identifier |
| **Address** | "Shop 15, Viraj Khand, Gomti Nagar" | Customers can find you |
| **Landmark** | "Near Phoenix United Mall" | Easy recognition |
| **Google Maps** | "https://goo.gl/maps/xyz" | Direct navigation |
| **Phone** | "0522-4567890" | For calls |
| **WhatsApp** | "9876543210" | For bookings |
| **Timings** | "10 AM - 9 PM" | When you're open |
| **Amenities** | ["Jacuzzi", "Steam"] | What you offer |
| **Parking** | true/false | Customer convenience |

---

## 🔥 Pro Tips

### **1. Get Google Maps Link:**
- Go to Google Maps
- Search your spa
- Click "Share"
- Copy the link
- Paste in `googleMapsLink`

### **2. List ALL Amenities:**
```typescript
amenities: [
  'Jacuzzi',
  'Steam Room',
  'Sauna',
  'Private Rooms',
  'Couple Rooms',
  'Changing Rooms',
  'Lockers',
  'Shower Facilities'
]
```

### **3. Be Specific About Timings:**
```typescript
timings: {
  weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
  weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
  holiday: 'Open on all holidays except Holi and Diwali'
}
```

### **4. Highlight Special Features:**
```typescript
specialFeatures: [
  'Four Hand Massage Available',
  'Couple Treatments',
  'Hammam Bath',
  'Ladies Special Section',
  'Premium Location'
]
```

---

## ✅ Quick Checklist

For each location you add:
- [ ] Location name (unique)
- [ ] Full address
- [ ] Landmark nearby
- [ ] Google Maps link
- [ ] Contact number
- [ ] WhatsApp number
- [ ] Weekday timings
- [ ] Weekend timings
- [ ] Holiday policy
- [ ] All amenities listed
- [ ] Special features
- [ ] Parking availability

---

## 🎨 Real Example: 3 Locations

```typescript
const locations: LocationData[] = [
  // Location 1
  {
    locationName: 'Delight Spa - Gomti Nagar',
    address: 'Shop No. 15, Viraj Khand, Gomti Nagar, Lucknow - 226010',
    landmark: 'Near Phoenix United Mall',
    googleMapsLink: 'https://goo.gl/maps/abc123',
    contactNumber: '0522-4567890',
    whatsappNumber: '9876543210',
    timings: {
      weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Steam Room', 'Sauna', 'Private Rooms', 'Couple Rooms'],
    specialFeatures: ['Four Hand Massage', 'Hammam Bath', 'Ladies Section'],
    parkingAvailable: true
  },

  // Location 2
  {
    locationName: 'Delight Spa - Hazratganj',
    address: '1st Floor, Sardar Patel Marg, Hazratganj, Lucknow - 226001',
    landmark: 'Above Café Coffee Day, Near GPO',
    googleMapsLink: 'https://goo.gl/maps/xyz789',
    contactNumber: '0522-4567891',
    whatsappNumber: '9876543211',
    timings: {
      weekdays: '11:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Private Rooms', 'Couple Rooms'],
    specialFeatures: ['Quick Service', 'Express Massages'],
    parkingAvailable: false
  },

  // Location 3
  {
    locationName: 'Delight Spa - Indira Nagar',
    address: '2nd Floor, Sector 14, Indira Nagar, Lucknow - 226016',
    landmark: 'Near Sahara Ganj Mall',
    googleMapsLink: 'https://goo.gl/maps/pqr456',
    contactNumber: '0522-4567892',
    whatsappNumber: '9876543212',
    timings: {
      weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '9:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Steam Room', 'Private Rooms'],
    specialFeatures: ['Premium Location', 'Valet Parking'],
    parkingAvailable: true
  },
];
```

---

## 🚀 After Adding Locations, Test These:

Send these messages to your auto-reply:

```
1. "how many locations"
2. "all branches"
3. "gomti nagar address"
4. "hazratganj phone number"
5. "indira nagar timings"
6. "which has jacuzzi"
7. "nearest location"
8. "parking available where"
9. "all locations list"
10. "which branch is biggest"
```

AI should answer everything correctly! ✅

---

## 📊 Current Status

**✅ System Ready:** Multi-location support active  
**📍 Locations Added:** 1 (Gomti Nagar)  
**➕ To Add:** Your other locations  
**📝 File to Edit:** `backend/src/scripts/seed-multi-location-spa-data.ts`  
**🔄 Command to Run:** `npx ts-node src/scripts/seed-multi-location-spa-data.ts`

---

## 💡 Remember

- **Services & Pricing:** Same for all locations (already done ✅)
- **Location Details:** Different for each (you add these)
- **One AI:** Handles all locations intelligently
- **Easy Updates:** Edit file, run script, done!

---

## 🎉 Benefits

✅ Customers find nearest branch instantly  
✅ Location-specific info always accurate  
✅ One auto-reply for all locations  
✅ Easy to add/update/remove locations  
✅ AI intelligently routes queries  
✅ Professional, consistent responses  

---

**Add your locations now and enjoy multi-location auto-reply!** 🚀

**Need help?** Check `MULTI_LOCATION_SETUP_GUIDE.md` for detailed instructions.

