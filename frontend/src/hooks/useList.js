import { useCallback, useEffect, useRef, useState } from 'react';

export function useList(load) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);
  const loadingRef = useRef(true);

  const reload = useCallback(async ({ quiet = false, keepOnError = quiet } = {}) => {
    const background = quiet && !loadingRef.current;
    const requestToken = {};
    currentRequestRef.current = requestToken;
    if (!background) {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
    }
    try {
      const result = await load();
      if (currentRequestRef.current !== requestToken) return;
      setItems(result);
      setError(null);
    } catch (requestError) {
      if (currentRequestRef.current !== requestToken) return;
      if (background && keepOnError) return;
      setError(requestError);
      setItems([]);
    } finally {
      if (currentRequestRef.current === requestToken) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [load]);

  useEffect(() => {
    function sync() {
      reload();
    }
    sync();
  }, [reload]);

  return { items, setItems, loading, error, reload };
}
