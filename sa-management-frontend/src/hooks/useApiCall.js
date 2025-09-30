import { useState, useCallback } from 'react';

export const useApiCall = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Exécution API call:', apiFunction.name, 'avec args:', args);
      
      const result = await apiFunction(...args);
      
      console.log('✅ API call réussi:', result);
      setData(result);
      
      return result;
    } catch (err) {
      console.error('❌ API call échoué:', err);
      setError(err.message || 'Une erreur est survenue');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
};