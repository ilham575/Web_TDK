import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../../css/pages/default/signin.css';

// Mock user data
const mockUsers = [
  { email: 'student@example.com', password: '123456', role: 'student' },
  { email: 'teacher@example.com', password: '123456', role: 'teacher' },
  { email: 'admin@example.com', password: '123456', role: 'admin' },
];

// Custom close button for toast
const CustomCloseButton = ({ closeToast }) => (
  <button
    onClick={closeToast}
    style={{
      background: 'none',
      border: 'none',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#fff',
      marginLeft: '16px',
      cursor: 'pointer',
      alignSelf: 'center'
    }}
    aria-label="close"
  >
    ✖
  </button>
);

function SigninPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.signedOut) {
      toast.success('Signed out successfully!', {
        position: "top-center",
        hideProgressBar: false,
        theme: "colored"
      });
    }
  }, [location.state]);

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
        toast.error('Invalid email or password', {
          position: "top-center",
          hideProgressBar: false,
          theme: "colored"
        });
      } else {
        // สร้าง token ปลอมและเก็บใน localStorage
        // Redirect by role
        if (user.role === 'student') {
          localStorage.setItem('token', 'dummy-token-student');
          navigate('/student');
        } else if (user.role === 'teacher') {
          localStorage.setItem('token', 'dummy-token-teacher');
          navigate('/teacher');
        } else if (user.role === 'admin') {
          localStorage.setItem('token', 'dummy-token-admin');
          navigate('/admin');
        }
        toast.success('Sign in successful!', {
          position: "top-center",
          hideProgressBar: false,
          theme: "colored"
        });
      }
    } catch (err) {
      setError('Signin failed. Please try again.');
      toast.error('Signin failed. Please try again.', {
        position: "top-center",
        hideProgressBar: false,
        theme: "colored"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <ToastContainer
        position="top-center"
        hideProgressBar={false}
        theme="colored"
        toastClassName="toast-align-center"
        closeButton={CustomCloseButton}
      />
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
          <button type="submit" disabled={isLoading} className='button-signin'>
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