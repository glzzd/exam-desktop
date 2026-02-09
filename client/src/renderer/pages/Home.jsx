import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user, logout } = useAuth();
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Welcome, {user?.username}!</h1>
      <p>You are now logged in.</p>
      
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>

      <button onClick={logout} style={{ marginTop: '20px' }}>
        Logout
      </button>
    </div>
  );
};

export default Home;
