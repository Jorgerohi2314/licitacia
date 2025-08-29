// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginApi } from '../services/authService';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
    
        try {
            const response = await loginApi(email, password);
            // Guardar token en localStorage
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            // Redirigir al dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }   
    };

    return (
        <div className="login-container">
        <h2>Iniciar Sesión</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
            <div className="form-group">
            <label>Email:</label>
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
            </div>
            <div className="form-group">
            <label>Contraseña:</label>
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
            />
            </div>
            <button type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </button>
        </form>
        </div>
    );
    };

    export default Login;