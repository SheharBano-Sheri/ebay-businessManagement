# Vendor Messaging System - Visual Flow Guide

## 🎯 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GENIE BMS MESSAGING SYSTEM                 │
│                                                                 │
│  Business Owner ←→ Real-Time Messages ←→ Public Vendor        │
└─────────────────────────────────────────────────────────────────┘
```

## 📱 User Flows

### Flow 1: Starting a Conversation (Owner → Vendor)

```
Owner Dashboard
    │
    ├─→ Vendors Page
    │       │
    │       ├─→ Marketplace Tab
    │       │       └─→ Add Vendor to "My Vendors"
    │       │
    │       └─→ My Vendors Tab
    │               └─→ Click "Message Vendor" Button
    │                       │
    │                       ├─→ API: POST /api/messages/conversations
    │                       │       └─→ Create/Get Conversation
    │                       │
    │                       └─→ Redirect to Messages Page
    │                               └─→ Conversation Auto-Selected
    │
    └─→ Messages Page
            ├─→ Conversation List (Left Panel)
            │       └─→ Shows: Vendor Name, Unread Count, Last Message
            │
            └─→ Chat Window (Right Panel)
                    └─→ Type & Send Message → Real-Time Delivery
```

### Flow 2: Receiving Messages (Vendor Side)

```
Vendor Dashboard
    │
    └─→ Messages Page
            │
            ├─→ Sees Client Name in Conversation List
            │       └─→ Unread Badge Displayed
            │
            ├─→ Clicks Conversation
            │       │
            │       └─→ API: GET /api/messages/[conversationId]
            │               └─→ Loads Message History
            │
            └─→ Types Reply
                    │
                    └─→ API: POST /api/messages/send
                            └─→ Client Receives Instantly via WebSocket
```

### Flow 3: Offline Notification

```
Owner Sends Message
    │
    └─→ API: POST /api/messages/send
            │
            ├─→ Message Saved to Database
            │
            ├─→ Check: Is Vendor Online?
            │       │
            │       ├─→ YES: WebSocket → Instant Delivery
            │       │
            │       └─→ NO: Email Notification
            │               │
            │               └─→ sendMessageNotificationEmail()
            │                       │
            │                       ├─→ Subject: "New message from [Owner]"
            │                       ├─→ Body: Message Preview
            │                       └─→ Link: Direct to Conversation
            │
            └─→ Vendor Receives Email
                    │
                    └─→ Clicks Link → Opens Messages Page
```

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Messages Page (page.jsx)                                      │
│       │                                                         │
│       ├─→ ConversationList Component                           │
│       │       └─→ Displays: List, Unread Counts, Timestamps    │
│       │                                                         │
│       └─→ ChatWindow Component                                 │
│               ├─→ Message Display                              │
│               ├─→ Typing Indicators                            │
│               ├─→ Message Input                                │
│               └─→ Real-Time Updates                            │
│                                                                 │
│  Socket Client (socket-client.js)                              │
│       ├─→ initSocket()                                         │
│       ├─→ joinConversation()                                   │
│       ├─→ sendMessage()                                        │
│       └─→ Event Listeners                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ↓ HTTP / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Custom Server (server.js)                                     │
│       ├─→ Next.js HTTP Server                                  │
│       └─→ Socket.io Server                                     │
│                                                                 │
│  API Routes                                                     │
│       ├─→ GET  /api/messages/conversations                     │
│       ├─→ POST /api/messages/conversations                     │
│       ├─→ GET  /api/messages/[conversationId]                  │
│       ├─→ POST /api/messages/send                              │
│       └─→ POST /api/messages/mark-read                         │
│                                                                 │
│  Socket Server (socket-server.js)                              │
│       ├─→ Connection Management                                │
│       ├─→ Room-Based Broadcasting                              │
│       ├─→ Authentication                                       │
│       └─→ Event Handling                                       │
│                                                                 │
│  Email Service (email.js)                                      │
│       └─→ sendMessageNotificationEmail()                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ↓ MongoDB
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Conversation Collection                                       │
│       ├─→ ownerId                                              │
│       ├─→ vendorId                                             │
│       ├─→ vendorUserId                                         │
│       ├─→ lastMessageAt                                        │
│       ├─→ lastMessagePreview                                   │
│       ├─→ ownerUnreadCount                                     │
│       └─→ vendorUnreadCount                                    │
│                                                                 │
│  Message Collection                                            │
│       ├─→ conversationId                                       │
│       ├─→ senderId                                             │
│       ├─→ senderType                                           │
│       ├─→ content                                              │
│       ├─→ readByOwner                                          │
│       ├─→ readByVendor                                         │
│       └─→ createdAt                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Real-Time Message Flow

```
Owner Types Message
    │
    ├─→ [CLIENT] Emit 'typing-start' via Socket.io
    │       └─→ [SERVER] Broadcast to Vendor's Socket
    │               └─→ [CLIENT] Vendor sees "Owner is typing..."
    │
    ├─→ Owner Presses Enter
    │       │
    │       ├─→ [CLIENT] Stop typing indicator
    │       │
    │       └─→ [CLIENT] POST /api/messages/send
    │               │
    │               ├─→ [SERVER] Save to Database
    │               │       └─→ Message Document Created
    │               │       └─→ Conversation Updated
    │               │
    │               ├─→ [SERVER] Emit 'new-message' via Socket.io
    │               │       └─→ [CLIENT] Vendor instantly receives
    │               │               └─→ Message appears in chat
    │               │
    │               └─→ [SERVER] Check if Vendor offline
    │                       └─→ Send Email Notification
    │
    └─→ Vendor Opens Message
            │
            └─→ [CLIENT] POST /api/messages/mark-read
                    │
                    ├─→ [SERVER] Update readByVendor = true
                    │
                    └─→ [SERVER] Emit 'messages-read' via Socket.io
                            └─→ [CLIENT] Owner sees read receipt
```

## 🎨 UI Component Hierarchy

```
Messages Page
├─── Sidebar Navigation
│    └─── "Messages" Link (with unread badge)
│
└─── Main Content
     ├─── Conversation List Container
     │    ├─── Header: "Conversations"
     │    └─── Conversation Items
     │         ├─── Avatar/Icon
     │         ├─── Name
     │         ├─── Last Message Preview
     │         ├─── Timestamp
     │         └─── Unread Badge
     │
     └─── Chat Window Container
          ├─── Header
          │    └─── Recipient Name
          │
          ├─── Messages Area (scrollable)
          │    ├─── Message Bubbles
          │    │    ├─── Own Messages (right, blue)
          │    │    └─── Other Messages (left, gray)
          │    │
          │    └─── Typing Indicator
          │         └─── Animated dots
          │
          └─── Input Area
               ├─── Textarea
               ├─── Send Button
               └─── Hint Text: "Enter to send"
```

## 🔌 Socket.io Events

```
┌────────────────────────────────────────────────────────────┐
│                    SOCKET.IO EVENTS                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Client → Server                                          │
│  ─────────────────                                        │
│  • authenticate        - Link user to socket              │
│  • join-conversation   - Join conversation room           │
│  • leave-conversation  - Leave conversation room          │
│  • new-message         - Broadcast message to room        │
│  • typing-start        - Show typing indicator            │
│  • typing-stop         - Hide typing indicator            │
│  • mark-read           - Broadcast read status            │
│                                                            │
│  Server → Client                                          │
│  ─────────────────                                        │
│  • message-received    - New message in conversation      │
│  • user-typing         - Someone is typing                │
│  • user-stopped-typing - Typing stopped                   │
│  • messages-read       - Messages marked as read          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 📊 Data Model Relationships

```
User
├─── _id
├─── name
├─── email
└─── role

        ↓ (ownerId)
        
Conversation
├─── _id
├─── ownerId ────────────┐
├─── vendorId            │
├─── vendorUserId        │
├─── lastMessageAt       │
├─── lastMessagePreview  │
├─── ownerUnreadCount    │
└─── vendorUnreadCount   │
                         │
        ↓ (conversationId)
                         │
Message                  │
├─── _id                 │
├─── conversationId ─────┘
├─── senderId
├─── senderType
├─── content
├─── readByOwner
├─── readByVendor
├─── readAt
└─── createdAt

Vendor
├─── _id
├─── name
├─── vendorType
├─── publicVendorUserId
└─── status
```

## 🚦 Status Indicators

```
Conversation List Item
┌─────────────────────────────────────┐
│ 👤 Vendor Name           [Badge: 3] │  ← Unread Count
│ "Last message preview..."            │
│ 2 hours ago                          │
└─────────────────────────────────────┘

Message Bubble
┌─────────────────────────────────────┐
│ Your message text here...            │
│ Mar 5, 2:30 PM           ✓✓         │  ← Read Receipt
└─────────────────────────────────────┘

Typing Indicator
┌─────────────────────────────────────┐
│ ● ● ●  Vendor is typing...           │  ← Animated Dots
└─────────────────────────────────────┘
```

## 🎯 Key Integration Points

### Vendor Page Integration
```
Vendor Card (Public Vendor)
├─── Vendor Name
├─── Description
├─── "Add to My Vendors" Button
└─── "Message Vendor" Button ← NEW
     └─→ Starts/Opens Conversation
```

### Sidebar Navigation
```
Sidebar Menu
├─── Dashboard
├─── Orders
├─── Inventory
├─── Vendors
│    ├─→ View Vendors
│    ├─→ Purchase History
│    └─→ Messages ← NEW
├─── Accounts
└─── Settings
```

## ⚡ Performance Features

```
Pagination
├─→ Load 50 messages at a time
└─→ "Load More" on scroll up

Indexes
├─→ Conversation: ownerId + vendorId (unique)
├─→ Conversation: lastMessageAt (sorted list)
├─→ Message: conversationId + createdAt
└─→ Message: read status queries

Socket.io Rooms
├─→ conversation:[id] rooms
├─→ Only room members receive messages
└─→ Reduces broadcast overhead

Caching
├─→ Conversation list cached client-side
├─→ Auto-refresh on new message
└─→ Optimistic UI updates
```

## 🔐 Security Layers

```
Authentication
├─→ NextAuth session required
└─→ Socket authentication on connect

Authorization
├─→ Verify user owns/is part of conversation
├─→ Check vendor type (public only)
└─→ Validate sender on message send

Data Validation
├─→ Content max length: 5000 chars
├─→ Required fields validation
└─→ Sanitization via React
```

---

This visual guide provides a comprehensive overview of the messaging system's architecture, flow, and integration points. Use it as a reference for understanding how all components work together.
