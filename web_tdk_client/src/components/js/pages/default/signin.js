import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../css/pages/default/signin.css';

// Mock user data
const mockUsers = [
  { email: 'student@example.com', password: '123456', role: 'student' },
  { email: 'teacher@example.com', password: '123456', role: 'teacher' },
  { email: 'admin@example.com', password: '123456', role: 'admin' },
];

function SigninPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      // Mock authentication
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = mockUsers.find(
        u => u.email === email && u.password === password
      );
      if (!user) {
        setError('Invalid email or password');
      } else {
        // Redirect by role
        if (user.role === 'student') {
          navigate('/student');
        } else if (user.role === 'teacher') {
          navigate('/teacher');
        } else if (user.role === 'admin') {
          navigate('/admin');
        }
      }
    } catch (err) {
      setError('Signin failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-form">
        <h2>Sign In</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <div className="signin-links">
          <a href="#">Forgot Password?</a>
          <span> | </span>
          <a href="#">Don't have an account? Sign Up</a>
        </div>
      </div>
    </div>
  );
}

export default SigninPage;