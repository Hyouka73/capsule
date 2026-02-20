// Re-export centralizado del hook de autenticación.
// Importar desde aquí en lugar de desde el contexto directamente
// para consistencia y para no acoplar los módulos al path del context.

export { useAuth } from '../context/AuthContext';
