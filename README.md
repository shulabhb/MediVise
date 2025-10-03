# MediVise - AI-Powered Medical Assistant

A comprehensive full-stack web application that provides AI-powered medical assistance with chat functionality, document processing, and user management.

## 🚀 Features

### Frontend (React + TypeScript)
- **Modern UI/UX**: Sleek, responsive design with beautiful animations
- **User Authentication**: Firebase Auth integration with secure login/logout
- **Chat Interface**: Real-time chat with AI assistant
- **Document Upload**: PDF processing and analysis capabilities
- **User Dashboard**: Comprehensive user profile and settings management
- **Responsive Design**: Mobile-first approach with modern CSS

### Backend (FastAPI + Python)
- **RESTful API**: Complete REST API with FastAPI framework
- **Database Integration**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: Firebase Admin SDK integration
- **Document Processing**: PDF parsing and text extraction
- **Cloud Database**: Supabase PostgreSQL for data persistence
- **CORS Support**: Cross-origin resource sharing configuration

### Database (PostgreSQL + Supabase)
- **User Management**: User profiles with Firebase UID integration
- **Conversation History**: Persistent chat conversations
- **Message Storage**: Individual message tracking and retrieval
- **Document Storage**: File metadata and processing status
- **Real-time Sync**: Cloud database with instant updates

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Firebase Auth** for authentication
- **React Router** for navigation
- **CSS3** with modern styling
- **Axios** for API communication

### Backend
- **FastAPI** for API framework
- **SQLAlchemy** for ORM
- **PostgreSQL** for database
- **Supabase** for cloud database hosting
- **Firebase Admin** for authentication
- **Uvicorn** for ASGI server

### Database
- **PostgreSQL** with Supabase cloud hosting
- **SQLAlchemy ORM** for database operations
- **Connection pooling** for performance
- **SSL encryption** for security

## 📁 Project Structure

```
MediVise/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── lib/            # Utility libraries
│   │   └── routes/         # Route components
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── main.py         # FastAPI application
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── database.py    # Database configuration
│   │   └── auth.py        # Authentication utilities
│   ├── requirements.txt    # Python dependencies
│   └── run.sh             # Backend startup script
└── README.md              # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Git

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Environment Variables
Create a `.env` file in the backend directory:
```env
DATABASE_URL=postgresql+psycopg://your-supabase-connection-string
```

## 🔧 Configuration

### Database Setup
1. Create a Supabase project
2. Get your connection string
3. Update `DATABASE_URL` in `backend/app/database.py`
4. Run the application to auto-create tables

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication
3. Download service account key
4. Place in `backend/secrets/firebase-admin.json`

## 📊 API Endpoints

### Authentication
- `POST /users` - Create user profile
- `GET /users/me` - Get current user

### Chat
- `GET /chat/conversations` - List user conversations
- `POST /chat/conversations` - Create new conversation
- `GET /chat/conversations/{id}` - Get conversation details
- `POST /chat/message` - Send message
- `PATCH /chat/conversations/{id}` - Update conversation
- `DELETE /chat/conversations/{id}` - Delete conversation

### Health
- `GET /health` - Application health check

## 🎨 UI Components

### Chat Interface
- **Sidebar**: Conversation history with search
- **Message Area**: Real-time chat with AI responses
- **Input**: Message composition with file upload
- **Status**: Typing indicators and message status

### User Dashboard
- **Profile Management**: User information and settings
- **Conversation History**: Past chat sessions
- **Document Library**: Uploaded files and analysis
- **Settings**: Application preferences

## 🔒 Security Features

- **Firebase Authentication**: Secure user authentication
- **CORS Protection**: Cross-origin request security
- **Database Encryption**: SSL-encrypted database connections
- **Input Validation**: Pydantic model validation
- **SQL Injection Protection**: SQLAlchemy ORM protection

## 🚀 Deployment

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting service
```

### Backend Deployment
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 📈 Performance Features

- **Connection Pooling**: Database connection optimization
- **Lazy Loading**: Component-based code splitting
- **Caching**: API response caching
- **Compression**: Gzip compression for responses
- **CDN Ready**: Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- **Real-time Chat**: WebSocket integration
- **File Processing**: Advanced document analysis
- **AI Integration**: GPT/Claude API integration
- **Mobile App**: React Native application
- **Analytics**: User behavior tracking
- **Notifications**: Push notification system

---

**MediVise** - Empowering healthcare with AI technology 🏥✨