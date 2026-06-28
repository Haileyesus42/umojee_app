import { ClipLoader } from 'react-spinners';
import useColorMode from '../../hooks/useColorMode';

export const Loader = ({ color, size }: { color: string; size: number }) => {
  const [colorMode] = useColorMode();

  return (
    <ClipLoader
      color={colorMode === 'dark' ? '#3498db' : color ? color : '#3498db'}
      size={size ? size : 40}
    />
  );
};
