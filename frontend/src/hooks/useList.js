import { useCallback, useEffect, useRef, useState } from 'react';

export function useList(load) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentRequestRef = useRef(null);

  const reload = useCallback(async () => {
    const requestToken = {};
    currentRequestRef.current = requestToken;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (currentRequestRef.current !== requestToken) return;
      setItems(result);
    } catch (requestError) {
      if (currentRequestRef.current !== requestToken) return;
      setError(requestError);
      setItems([]);
    } finally {
      if (currentRequestRef.current === requestToken) setLoading(false);
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
