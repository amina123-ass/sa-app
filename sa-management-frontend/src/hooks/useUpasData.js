import { useState, useEffect } from 'react';
import { upasService } from '../services/upasService';

export const useUpasData = () => {
  const [dictionary, setDictionary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const data = await upasService.getDictionary();
        setDictionary(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadDictionary();
  }, []);

  return { dictionary, loading, error };
};

export const useAssistances = (params = {}) => {
  const [assistances, setAssistances] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAssistances = async (newParams = {}) => {
    setLoading(true);
    try {
      const data = await upasService.getAssistances({ ...params, ...newParams });
      setAssistances(data.data);
      setPagination({
        current_page: data.current_page,
        last_page: data.last_page,
        per_page: data.per_page,
        total: data.total
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des assistances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssistances();
  }, []);

  return { assistances, pagination, loading, error, reload: loadAssistances };
};