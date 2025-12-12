import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
import { Account } from './pages/Account';
import { Plan } from './pages/Plan';

const App = () => {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/account" element={<Account />} />
            <Route path="/plan" element={<Plan />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
