import DrawerDropzone from './DrawerDropzone';
import Content from '../Content';

export default function PageLayout() {
  return (
    <div style={{ maxHeight: 'calc(100vh - 68px)', display: 'flex' }}>
      <DrawerDropzone />
      <Content />
    </div>
  );
}