import { useSocketContext } from '../context/useSocketContext';

export function useSocket() {
  return useSocketContext();
}
