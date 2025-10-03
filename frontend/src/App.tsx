import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import About from './pages/About'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Documents from './pages/Documents'
import Chat from './pages/Chat'
import Medications from './pages/Medications'
import Appointments from './pages/Appointments'
import Game from './pages/Game'
import Sudoku from './pages/Sudoku'
import TicTacToe from './pages/TicTacToe'
import Memory from './pages/Memory'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          
          {/* Redirect old auth routes to home */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medications"
            element={
              <ProtectedRoute>
                <Medications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game"
            element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/sudoku"
            element={
              <ProtectedRoute>
                <Sudoku />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/tictactoe"
            element={
              <ProtectedRoute>
                <TicTacToe />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/memory"
            element={
              <ProtectedRoute>
                <Memory />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
