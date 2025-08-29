// src/services/authService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const loginApi = async (email, password) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
    };

    export const registerApi = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/auth/register`, userData);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al registrarse');
    }
    };

    // Configuración de axios para peticiones autenticadas
    export const apiWithAuth = axios.create({
    baseURL: API_URL,
    });

    // Interceptor para añadir el token a las peticiones
    apiWithAuth.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
    );

    // Manejo de errores de autenticación
    apiWithAuth.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        }
        return Promise.reject(error);
    }
    );