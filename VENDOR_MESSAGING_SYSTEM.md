# Direct Vendor-Owner Messaging System - Implementation Guide

## Overview
A real-time, in-app messaging system that enables direct communication between Business Owners and their approved Public Vendors within Genie BMS. This feature is separate from the Teams module and focuses specifically on external supplier communication.

## Key Features

### 1. **Real-Time Messaging**
- Instant message delivery using Socket.io WebSockets
- Live typing indicators
- Real-time read receipts
- Automatic reconnection on connection loss

### 2. **Conversation Management**
- Dedicated inbox for each user type (Owner/Vendor)
- Conversation list with unread counts
- Last message preview
- Timestamp for last activity

### 3. **Offline Notifications**
- Automatic email notifications when recipient is offline
- Beautiful HTML email templates with message previews
- Direct links back to conversation

### 4. **User Experience**
- Clean, modern chat interface
- Message history with pagination support
- Responsive design for mobile and desktop
- Easy access from vendor profiles

## Technical Architecture

### Database Models

#### **Conversation Model** ([src/models/Conversation.js](src/models/Conversation.js))
- Links Owner and Vendor for persistent conversations
- Tracks unread counts for both parties
- Stores last message preview and timestamp
- Indexed for efficient querying

```javascript
{
  ownerId: ObjectId,
  vendorId: ObjectId,
  vendorUserId: ObjectId,
  lastMessageAt: Date,
  lastMessagePreview: String,
  ownerUnreadCount: Number,
  vendorUnreadCount: Number,
  isActive: Boolean
}
```

#### **Message Model** ([src/models/Message.js](src/models/Message.js))
- Stores individual messages
- Tracks read status for both parties
- Supports attachments (ready for future enhancement)
- Content limited to 5000 characters

```javascript
{
  conversationId: ObjectId,
  senderId: ObjectId,
  senderType: 'owner' | 'vendor',
  content: String,
  readByOwner: Boolean,
  readByVendor: Boolean,
  readAt: Date,
  attachments: Array
}
```

### API Endpoints

#### **GET /api/messages/conversations**
Fetches all conversations for the authenticated user.
- Returns different conversations based on user role (owner vs vendor)
- Populates user and vendor details
- Sorted by last message time

#### **POST /api/messages/conversations**
Starts a new conversation with a vendor.
- Validates vendor exists and is a public vendor
- Prevents duplicate conversations
- Returns populated conversation object

#### **GET /api/messages/[conversationId]**
Retrieves messages for a specific conversation.
- Supports pagination (default: 50 messages per page)
- Verifies user access to conversation
- Returns messages in chronological order

#### **POST /api/messages/send**
Sends a new message in a conversation.
- Updates conversation metadata
- Increments unread count for recipient
- Triggers email notification if recipient offline
- Broadcasts message via Socket.io

#### **POST /api/messages/mark-read**
Marks all unread messages in a conversation as read.
- Updates read status based on user type
- Resets unread counter
- Emits read status via Socket.io

### Real-Time Communication

#### **Socket.io Server** ([src/lib/socket-server.js](src/lib/socket-server.js))
- Handles WebSocket connections on `/api/socket` path
- Manages user authentication and connection tracking
- Implements conversation rooms for targeted broadcasting
- Events:
  - `authenticate`: Links socket to user ID
  - `join-conversation`: Joins conversation room
  - `leave-conversation`: Leaves conversation room
  - `new-message`: Broadcasts new message to room
  - `typing-start/stop`: Typing indicator management
  - `mark-read`: Broadcasts read status

#### **Socket.io Client** ([src/lib/socket-client.js](src/lib/socket-client.js))
- Client-side utility functions for socket communication
- Auto-reconnection with exponential backoff
- Event listeners for real-time updates
- Clean connection management

#### **Custom Server** ([server.js](server.js))
- Next.js custom server to enable Socket.io
- Initializes Socket.io alongside Next.js
- Required for WebSocket support in Next.js

### UI Components

#### **Messages Page** ([src/app/dashboard/messages/page.jsx](src/app/dashboard/messages/page.jsx))
- Main messaging interface
- Two-column layout: conversations list + chat window
- Initializes socket connection on mount
- Handles URL-based conversation selection

#### **Conversation List** ([src/components/messages/conversation-list.jsx](src/components/messages/conversation-list.jsx))
- Displays all active conversations
- Shows unread count badges
- Highlights selected conversation
- Displays last message preview and time

#### **Chat Window** ([src/components/messages/chat-window.jsx](src/components/messages/chat-window.jsx))
- Full-featured chat interface
- Message history with auto-scroll
- Real-time message delivery
- Typing indicators
- Read receipts
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

#### **Message Vendor Button** ([src/components/messages/message-vendor-button.jsx](src/components/messages/message-vendor-button.jsx))
- Integrated into vendor profile cards
- Starts or navigates to existing conversation
- Only available for public vendors
- Loading state during conversation creation

### Email Notifications

#### **sendMessageNotificationEmail** ([src/lib/email.js](src/lib/email.js))
- Sends notification when recipient is offline
- Beautiful HTML template with message preview
- Direct link to conversation
- Fallback plain text version
- Uses existing Nodemailer configuration

### Navigation Integration

Messages link added to sidebar navigation for users with vendor access.
- Located under Vendors section
- Uses IconMessage from Tabler Icons
- Accessible to owners and users with vendor permissions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install socket.io socket.io-client
```

### 2. Update Development Scripts

The `package.json` has been updated to use the custom server:

```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "NODE_ENV=production node server.js"
  }
}
```

### 3. Environment Variables

No new environment variables required! The system uses existing email configuration:
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `NEXTAUTH_URL`

### 4. Start the Application

```bash
npm install
npm run dev
```

The server will start on `http://localhost:3000` with Socket.io initialized on `/api/socket`.

## Usage Guide

### For Business Owners

1. **Starting a Conversation**
   - Go to the Vendors page
   - Find a public vendor in "My Vendors" tab
   - Click "Message Vendor" button
   - You'll be redirected to the messages page with the conversation open

2. **Viewing Messages**
   - Access Messages from the sidebar navigation
   - See all conversations in the left panel
   - Unread conversations show a badge with count
   - Click any conversation to open it

3. **Sending Messages**
   - Type your message in the text area
   - Press Enter to send (Shift+Enter for new line)
   - Messages appear instantly with typing indicators

### For Public Vendors

1. **Accessing Messages**
   - Navigate to Messages from the sidebar
   - See all clients who have messaged you
   - Unread messages are highlighted

2. **Responding**
   - Click on a conversation to open
   - Type and send replies
   - Client receives instant notification

### Notifications

- **Online**: Messages appear instantly in the chat window
- **Offline**: Email notification sent automatically with:
  - Sender name
  - Message preview (first 100 characters)
  - Direct link to conversation

## Security & Access Control

- **Authentication Required**: All endpoints protected by NextAuth
- **Authorization Checks**: Users can only access their own conversations
- **Vendor Type Validation**: Messaging only available for public vendors
- **Read/Write Permissions**: Verified on every message operation
- **Socket Authentication**: User ID verified on socket connection

## Performance Considerations

### Database Indexes
- Compound index on `ownerId` + `vendorId` for unique conversations
- Indexed `lastMessageAt` for efficient sorting
- Message queries indexed by `conversationId` + `createdAt`
- Read status queries optimized with compound indexes

### Pagination
- Messages paginated (50 per page default)
- Load on scroll can be implemented in future
- Reduces initial load time for long conversations

### Socket.io Efficiency
- Room-based broadcasting for targeted message delivery
- Connection pooling and reuse
- Automatic cleanup on disconnect

## Future Enhancements

### Potential Features
1. **File Attachments**: Schema supports attachments array
2. **Message Search**: Full-text search across conversations
3. **Archive Conversations**: Move old conversations to archive
4. **Bulk Actions**: Mark all as read, delete conversations
5. **Push Notifications**: Browser push notifications
6. **Message Reactions**: Quick emoji reactions
7. **Voice Messages**: Audio message support
8. **Video Calls**: Integrate video calling
9. **Auto-Responses**: Automated replies for vendors
10. **Message Templates**: Quick response templates

### Scalability Considerations
- As user base grows, consider Redis for Socket.io adapter
- Message archiving strategy for old conversations
- CDN for file attachments
- Separate microservice for real-time communication

## Testing Checklist

### Functional Testing
- [ ] Owner can start conversation with public vendor
- [ ] Vendor receives messages in real-time
- [ ] Offline users receive email notifications
- [ ] Typing indicators work correctly
- [ ] Read receipts update properly
- [ ] Unread counts are accurate
- [ ] Pagination loads correctly
- [ ] Socket reconnects after disconnect

### Security Testing
- [ ] Cannot access other users' conversations
- [ ] Cannot message non-public vendors
- [ ] API endpoints reject unauthenticated requests
- [ ] Socket connections require authentication

### UI/UX Testing
- [ ] Responsive on mobile devices
- [ ] Messages scroll to bottom on new message
- [ ] Typing indicator displays correctly
- [ ] Empty states show helpful messages
- [ ] Loading states provide feedback
- [ ] Error messages are clear

## Troubleshooting

### Socket Connection Issues
- Verify custom server is running (`node server.js`)
- Check browser console for connection errors
- Ensure `/api/socket` path is accessible
- Check firewall/proxy settings

### Messages Not Sending
- Verify API route is accessible
- Check database connection
- Ensure user has proper permissions
- Check browser network tab for errors

### Email Notifications Not Working
- Verify EMAIL_HOST environment variable is set
- Check SMTP credentials
- Review email logs in console
- Test with existing email functionality

### Performance Issues
- Review database indexes
- Check Socket.io connection count
- Monitor message payload size
- Consider pagination adjustments

## Conclusion

The Direct Vendor-Owner Messaging System provides a robust, real-time communication channel that enhances the efficiency of business operations within Genie BMS. By keeping all communications within the platform, it ensures better record-keeping and streamlines the vendor management workflow.

For questions or support, refer to existing documentation or contact the development team.
