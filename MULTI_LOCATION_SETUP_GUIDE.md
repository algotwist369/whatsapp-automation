# 🏢 Multi-Location Spa Setup Guide

## Overview

Your auto-reply system now supports **multiple spa locations** with different addresses, timings, and contact details. The AI will intelligently handle location-specific questions.

---

## 📍 How to Add Your Spa Locations

### **Step 1: Edit the Seed File**

Open: `backend/src/scripts/seed-multi-location-spa-data.ts`

### **Step 2: Find the Locations Array** (around line 30)

```typescript
const locations: LocationData[] = [
  // LOCATION 1: Your first location
  {
    locationName: 'Delight Spa - Gomti Nagar',
    address: 'Gomti Nagar, Lucknow',
    landmark: 'Near Phoenix Mall',  // ADD YOUR LANDMARK
    googleMapsLink: 'https://maps.google.com/?q=...', // ADD GOOGLE MAPS LINK
    contactNumber: '9876543210',    // ADD YOUR CONTACT
    whatsappNumber: '9876543210',   // ADD WHATSAPP NUMBER
    timings: {
      weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Steam Room', 'Private Rooms', 'Couple Rooms'],
    specialFeatures: ['Four Hand Massage Available', 'Couple Treatments'],
    parkingAvailable: true
  },
  
  // Add more locations here...
];
```

---

## 🎯 Adding a New Location

### **Copy this template for each location:**

```typescript
{
  locationName: 'Delight Spa - [AREA NAME]',
  address: '[Full Address]',
  landmark: '[Nearby Landmark]',
  googleMapsLink: '[Google Maps URL]',
  contactNumber: '[Phone Number]',
  whatsappNumber: '[WhatsApp Number]',
  timings: {
    weekdays: '[Monday-Friday timings]',
    weekends: '[Saturday-Sunday timings]',
    holiday: '[Holiday policy]'
  },
  amenities: ['List', 'Your', 'Facilities'],
  specialFeatures: ['Special', 'Services'],
  parkingAvailable: true // or false
},
```

---

## 📝 Complete Example: 3 Locations

```typescript
const locations: LocationData[] = [
  // ===== LOCATION 1: Gomti Nagar =====
  {
    locationName: 'Delight Spa - Gomti Nagar',
    address: 'Shop No. 15, Viraj Khand, Gomti Nagar, Lucknow - 226010',
    landmark: 'Near Phoenix United Mall',
    googleMapsLink: 'https://goo.gl/maps/your-actual-link-here',
    contactNumber: '0522-4567890',
    whatsappNumber: '9876543210',
    timings: {
      weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays except Holi and Diwali'
    },
    amenities: ['Jacuzzi', 'Steam Room', 'Sauna', 'Private Rooms', 'Couple Rooms', 'Changing Rooms', 'Lockers'],
    specialFeatures: ['Four Hand Massage', 'Couple Treatments', 'Hammam Bath', 'Premium Oils', 'Ladies Special Section'],
    parkingAvailable: true
  },

  // ===== LOCATION 2: Hazratganj =====
  {
    locationName: 'Delight Spa - Hazratganj',
    address: '1st Floor, Sardar Patel Marg, Hazratganj, Lucknow - 226001',
    landmark: 'Above Café Coffee Day, Near GPO',
    googleMapsLink: 'https://goo.gl/maps/your-hazratganj-link',
    contactNumber: '0522-4567891',
    whatsappNumber: '9876543211',
    timings: {
      weekdays: '11:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Private Rooms', 'Couple Rooms', 'Changing Rooms'],
    specialFeatures: ['Quick Service', 'Express Massages', 'Ladies Only Section'],
    parkingAvailable: false // Street parking available
  },

  // ===== LOCATION 3: Indira Nagar =====
  {
    locationName: 'Delight Spa - Indira Nagar',
    address: '2nd Floor, Sector 14, Indira Nagar, Lucknow - 226016',
    landmark: 'Near Sahara Ganj Mall',
    googleMapsLink: 'https://goo.gl/maps/your-indiranagar-link',
    contactNumber: '0522-4567892',
    whatsappNumber: '9876543212',
    timings: {
      weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
      weekends: '9:00 AM - 10:00 PM (Saturday & Sunday)',
      holiday: 'Open on all holidays'
    },
    amenities: ['Jacuzzi', 'Steam Room', 'Private Rooms', 'Couple Rooms'],
    specialFeatures: ['Four Hand Massage', 'Premium Location', 'Valet Parking'],
    parkingAvailable: true
  },
];
```

---

## 🚀 After Adding Locations

### **Run the seed script:**

```bash
cd backend
npx ts-node src/scripts/seed-multi-location-spa-data.ts
```

---

## 💬 How AI Handles Multiple Locations

### **Example Conversations:**

#### **Example 1: General Location Query**
```
👤 Customer: "how many locations do you have?"
🤖 AI: "Delight Spa has 3 locations: Gomti Nagar, Hazratganj, and Indira Nagar. 
       Which area are you in?"

👤: "gomti nagar"
🤖: "Great! Gomti Nagar branch: Viraj Khand, near Phoenix Mall. 
     Open 10 AM-9 PM weekdays, 10 AM-10 PM weekends. Ph: 0522-4567890. Book?"
```

#### **Example 2: Nearest Location**
```
👤: "nearest spa to me"
🤖: "We have 3 locations: Gomti Nagar, Hazratganj, Indira Nagar. 
     Which area are you in? I'll help find the nearest one."

👤: "hazratganj area"
🤖: "Perfect! Our Hazratganj branch is on Sardar Patel Marg, 
     above Café Coffee Day near GPO. Open 11 AM-9 PM. Contact: 0522-4567891."
```

#### **Example 3: Specific Location Query**
```
👤: "indira nagar branch timings"
🤖: "Indira Nagar branch: Mon-Fri 10 AM-9 PM, Sat-Sun 9 AM-10 PM. 
     Open all holidays. When would you like to visit?"
```

#### **Example 4: Location-Specific Amenities**
```
👤: "which branch has sauna?"
🤖: "Gomti Nagar branch has Sauna + Jacuzzi + Steam Room + Private & Couple Rooms. 
     Our biggest facility! Want to book?"
```

#### **Example 5: Contact for Specific Location**
```
👤: "hazratganj contact number"
🤖: "Hazratganj branch: Ph: 0522-4567891, WhatsApp: 9876543211. 
     Located above CCD near GPO. Book?"
```

#### **Example 6: Parking Query**
```
👤: "parking available?"
🤖: "Parking available at: Gomti Nagar ✓ and Indira Nagar ✓ (with valet). 
     Hazratganj has street parking nearby. Which location interests you?"
```

---

## 🎯 What Gets Auto-Generated for Each Location

When you add a location, the system automatically creates Q&A entries for:

✅ **Address & Location** - Full address with landmark
✅ **Contact Details** - Phone & WhatsApp numbers
✅ **Timings** - Weekday, weekend, and holiday hours
✅ **Amenities** - All facilities available
✅ **Special Features** - Unique offerings
✅ **Parking Info** - Availability status
✅ **Directions** - Google Maps link

---

## 📋 Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `locationName` | ✅ Yes | Unique name for location | "Delight Spa - Gomti Nagar" |
| `address` | ✅ Yes | Full address | "Shop 15, Viraj Khand, Gomti Nagar" |
| `landmark` | ⚠️ Optional | Nearby landmark | "Near Phoenix Mall" |
| `googleMapsLink` | ⚠️ Optional | Google Maps URL | "https://goo.gl/maps/..." |
| `contactNumber` | ⚠️ Optional | Phone number | "0522-4567890" |
| `whatsappNumber` | ⚠️ Optional | WhatsApp number | "9876543210" |
| `timings.weekdays` | ⚠️ Optional | Mon-Fri hours | "10:00 AM - 9:00 PM" |
| `timings.weekends` | ⚠️ Optional | Sat-Sun hours | "10:00 AM - 10:00 PM" |
| `timings.holiday` | ⚠️ Optional | Holiday policy | "Open on all holidays" |
| `amenities` | ⚠️ Optional | List of facilities | ['Jacuzzi', 'Steam Room'] |
| `specialFeatures` | ⚠️ Optional | Unique offerings | ['Four Hand Available'] |
| `parkingAvailable` | ⚠️ Optional | Parking status | true or false |

---

## 🔥 Pro Tips

### **1. Use Specific Landmarks**
```
❌ "Near market"
✅ "Near Phoenix United Mall, opposite Metro Station"
```

### **2. Include Complete Contact Info**
```typescript
contactNumber: '0522-4567890',  // Landline
whatsappNumber: '9876543210',   // WhatsApp for booking
```

### **3. Be Clear About Timings**
```typescript
timings: {
  weekdays: '10:00 AM - 9:00 PM (Monday to Friday)',
  weekends: '10:00 AM - 10:00 PM (Saturday & Sunday)',
  holiday: 'Open on all holidays except Holi and Diwali'
}
```

### **4. List ALL Amenities**
```typescript
amenities: [
  'Jacuzzi',
  'Steam Room',
  'Sauna',
  'Private Rooms',
  'Couple Rooms',
  'Changing Rooms',
  'Lockers',
  'Shower',
  'Premium Towels'
]
```

### **5. Highlight Special Features**
```typescript
specialFeatures: [
  'Four Hand Massage Available',
  'Couple Treatments',
  'Ladies Special Section',
  'Premium Oils',
  'Hammam Bath',
  'Express Service Available'
]
```

---

## 🎨 AI Intelligence Features

### **Location Detection:**
The AI automatically detects which location the customer is asking about:
- "gomti nagar branch" → Gomti Nagar data
- "hazratganj timings" → Hazratganj data
- "nearest to me" → Asks customer's area

### **Smart Recommendations:**
```
Customer: "which branch has more facilities?"
AI: "Gomti Nagar has the most: Jacuzzi, Steam, Sauna, Private & Couple Rooms. 
     Also offers Four Hand, Hammam, and Ladies Special section."
```

### **Contextual Responses:**
```
First Question: "locations?"
AI: "3 locations: Gomti Nagar, Hazratganj, Indira Nagar. Which area?"

Follow-up: "gomti nagar"
AI: [Remembers context] "Gomti Nagar: Viraj Khand, near Phoenix Mall. 
     10 AM-9 PM weekdays. Our biggest facility with all amenities!"
```

---

## 📊 Data Structure

### **Common for All Locations:**
- All massage services & pricing (44 entries)
- Service descriptions
- Package details
- General FAQs

### **Location-Specific:**
- Address & directions
- Contact numbers
- Timings
- Amenities
- Special features
- Parking info

**Total entries per location:** ~6-7 specific Q&As
**Total for 3 locations:** ~60+ Q&A entries

---

## 🔄 Updating Locations

### **To Update Existing Location:**
1. Edit the location details in the script
2. Run: `npx ts-node src/scripts/seed-multi-location-spa-data.ts`
3. Old data is automatically deleted and replaced

### **To Add New Location:**
1. Copy location template
2. Fill in details
3. Add to `locations` array
4. Run seed script

### **To Remove Location:**
1. Delete location from `locations` array
2. Run seed script

---

## ✅ Verification

After running the script, check:

1. **Auto-Reply page** → Data tab
2. Look for "Delight Spa - Complete Multi-Location Guide"
3. Should show total Q&A entries (services + locations)
4. Test queries:
   - "how many locations"
   - "gomti nagar address"
   - "hazratganj timings"
   - "which has parking"

---

## 🎉 Benefits of Multi-Location Setup

### **For Business:**
✅ One AI handles all locations
✅ Customers find nearest branch easily
✅ Location-specific information always accurate
✅ Easy to update/add locations

### **For Customers:**
✅ Get nearest location instantly
✅ Location-specific timings & contact
✅ Know which branch has specific amenities
✅ Easy booking at preferred location

### **For You:**
✅ Single auto-reply system for all branches
✅ Consistent service information
✅ Easy maintenance (one place to update)
✅ Scalable (add unlimited locations)

---

## 🚀 Quick Start Checklist

- [ ] Open `seed-multi-location-spa-data.ts`
- [ ] Update Location 1 details (Gomti Nagar)
- [ ] Add Location 2 (uncomment and fill)
- [ ] Add Location 3 (if needed)
- [ ] Add Location 4+ (copy template)
- [ ] Update contact numbers
- [ ] Update timings for each
- [ ] Add landmarks
- [ ] Add Google Maps links
- [ ] List all amenities
- [ ] Run seed script
- [ ] Test in auto-reply
- [ ] Enable auto-reply with RAG

---

## 📞 Example Test Queries

Test your setup with these questions:

```
1. "how many locations"
2. "gomti nagar address"
3. "hazratganj phone number"
4. "indira nagar timings"
5. "which branch has jacuzzi"
6. "nearest location to hazratganj"
7. "parking available where"
8. "all locations list"
9. "gomti nagar directions"
10. "which branch is biggest"
```

AI should answer all accurately! ✅

---

**Your multi-location spa system is ready! Add your locations and run the seed script.** 🎊

